const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Package = require('../src/models/Package');

const packages = [
  {
    name: 'Free',
    credits: 100,
    price: 0,
    description: 'Dành cho người dùng mới. Hồi 100 Credit mỗi tuần.',
  },
  {
    name: 'Basic',
    credits: 1000,
    price: 49000,
    description: 'Gói cơ bản để trải nghiệm AI.',
  },
  {
    name: 'Premium',
    credits: 5000,
    price: 69000,
    description: 'Gói tối ưu cho việc học tập cường độ cao.',
  },
];

const seedPackages = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not defined in .env');
    
    await mongoose.connect(uri);
    console.log('MongoDB connected for seeding...');

    for (const pkg of packages) {
      await Package.findOneAndUpdate(
        { name: pkg.name },
        pkg,
        { upsert: true, new: true }
      );
    }

    console.log('Packages seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedPackages();
