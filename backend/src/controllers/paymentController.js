const crypto = require('crypto');
const querystring = require('qs');
const Payment = require('../models/Payment');
const Package = require('../models/Package');
const { addCredits } = require('../services/creditService');
const vnp_Config = require('../config/vnpayConfig');

/**
 * @desc Get available packages
 */
const getPackages = async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true });
    res.json({ packages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Create VNPay payment URL
 */
const createVNPayUrl = async (req, res) => {
  try {
    const { packageId, bankCode } = req.body;
    const pkg = await Package.findById(packageId);
    if (!pkg) return res.status(404).json({ message: 'Gói tài khoản không tồn tại' });

    const userId = req.user.id;
    const amount = pkg.price;
    const date = new Date();
    const createDate = formatDate(date);
    const txnRef = formatDate(date, true) + Math.floor(Math.random() * 1000);

    // Create pending payment record
    await Payment.create({
      userId,
      packageId,
      amount,
      vnp_TxnRef: txnRef,
      status: 'pending'
    });

    let vnp_Params = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = vnp_Config.vnp_TmnCode;
    vnp_Params['vnp_Amount'] = amount * 100;
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = txnRef;
    vnp_Params['vnp_OrderInfo'] = `Thanh toan goi ${pkg.name} - Learnmate`;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_ReturnUrl'] = vnp_Config.vnp_ReturnUrl;
    vnp_Params['vnp_IpAddr'] = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    vnp_Params['vnp_CreateDate'] = createDate;

    if (bankCode) {
      vnp_Params['vnp_BankCode'] = bankCode;
    }

    vnp_Params = sortObject(vnp_Params);

    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', vnp_Config.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnp_Params['vnp_SecureHash'] = signed;

    const vnpUrl = vnp_Config.vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: false });

    res.json({ paymentUrl: vnpUrl });
  } catch (error) {
    console.error('Create VNPay URL Error:', error);
    res.status(500).json({ message: 'Lỗi khi tạo URL thanh toán' });
  }
};

/**
 * @desc VNPay IPN (Webhook) handler
 */
const vnpayIPN = async (req, res) => {
  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', vnp_Config.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash === signed) {
      const txnRef = vnp_Params['vnp_TxnRef'];
      const responseCode = vnp_Params['vnp_ResponseCode'];

      const payment = await Payment.findOne({ vnp_TxnRef: txnRef });
      if (!payment) return res.status(200).json({ RspCode: '01', Message: 'Order not found' });

      if (payment.status !== 'pending') return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });

      // Cần kiểm tra số tiền khớp hay không
      const vnp_Amount = parseInt(vnp_Params['vnp_Amount']) / 100;
      if (payment.amount !== vnp_Amount) {
        return res.status(200).json({ RspCode: '04', Message: 'Amount mismatch' });
      }

      if (responseCode === '00') {
        payment.status = 'completed';
        payment.transactionCode = vnp_Params['vnp_TransactionNo'];
        await payment.save();

        // Add credits to user
        const pkg = await Package.findById(payment.packageId);
        if (pkg) {
          await addCredits(payment.userId, pkg.credits, `Mua gói ${pkg.name}`, payment._id);
        }

        res.status(200).json({ RspCode: '00', Message: 'Success' });
      } else {
        payment.status = 'failed';
        await payment.save();
        res.status(200).json({ RspCode: '00', Message: 'Success (Payment Failed)' });
      }
    } else {
      res.status(200).json({ RspCode: '97', Message: 'Invalid signature' });
    }
  } catch (error) {
    console.error('VNPay IPN Error:', error);
    res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};

// Utils
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
  }
  return sorted;
}

function formatDate(date, compact = false) {
  const y = date.getFullYear();
  const m = ('0' + (date.getMonth() + 1)).slice(-2);
  const d = ('0' + date.getDate()).slice(-2);
  const h = ('0' + date.getHours()).slice(-2);
  const mi = ('0' + date.getMinutes()).slice(-2);
  const s = ('0' + date.getSeconds()).slice(-2);

  return `${y}${m}${d}${h}${mi}${s}`;
}

module.exports = {
  getPackages,
  createVNPayUrl,
  vnpayIPN
};
