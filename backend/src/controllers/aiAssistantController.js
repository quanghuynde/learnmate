const { callXAI } = require('./aiController');
const UsageLog = require('../models/UsageLog');

const PAGE_HINTS = {
  dashboard: { label: 'Trang tong quan', selector: '[data-tour="dashboard-overview"], main', target: 'dashboard_overview' },
  planner: { label: 'Ke hoach hoc', selector: '[data-tour="planner-list"], main', target: 'planner_list' },
  documents: { label: 'Tai lieu', selector: '[data-tour="documents-list"], main', target: 'documents_list' },
  quiz: { label: 'Kiem tra', selector: '[data-tour="quiz-builder"], main', target: 'quiz_builder' },
  readiness: { label: 'San sang thi', selector: '[data-tour="exam-readiness"], main', target: 'exam_readiness' },
  progress: { label: 'Tien do', selector: '[data-tour="progress-overview"], main', target: 'progress_overview' },
  community: { label: 'Cong dong', selector: '[data-tour="community-feed"], main', target: 'community_feed' },
  video: { label: 'Doi thoai AI', selector: '[data-tour="ai-dialogue"], main', target: 'ai_dialogue' },
};

function heuristicByMessage(message, semanticTargets) {
  const q = message.toLowerCase();
  
  // 1. Tài liệu / Upload
  if (q.includes('tài liệu') || q.includes('tai lieu') || q.includes('upload') || q.includes('pdf') || q.includes('docx') || q.includes('json')) {
    return {
      message: 'Bạn có thể tải lên tài liệu (PDF, DOCX, Hình ảnh, JSON...) tại trang Tài liệu. Sau khi tải, AI sẽ tóm tắt nội dung để bạn có thể chat hoặc tạo Quiz ôn tập.',
      actions: [{ type: 'highlight', target: 'documents_list', durationMs: 5000 }],
    };
  }
  
  // 2. Kế hoạch học
  if (q.includes('kế hoạch') || q.includes('ke hoach') || q.includes('lịch học') || q.includes('lich hoc')) {
    return {
      message: 'Tính năng Kế hoạch học giúp bạn sắp xếp thời gian ôn tập khoa học. Bạn có thể tạo lộ trình học cho từng môn học tại đây.',
      actions: [{ type: 'highlight', target: 'planner_list', durationMs: 5000 }],
    };
  }

  // 3. Bản đồ kiến thức
  if (q.includes('bản đồ') || q.includes('ban do') || q.includes('mindmap') || q.includes('sơ đồ') || q.includes('so do')) {
    return {
      message: 'Bản đồ kiến thức tự động chuyển đổi tài liệu của bạn thành dạng sơ đồ tư duy (mindmap) 3 tầng, giúp bạn dễ dàng nắm bắt cấu trúc nội dung.',
      actions: [{ type: 'highlight', target: 'main', durationMs: 5000 }],
    };
  }

  // 4. Đối thoại AI (AI Dialogue)
  if (q.includes('đối thoại') || q.includes('doi thoai') || q.includes('luyện nói')) {
    return {
      message: 'Đối thoại AI giúp bạn luyện tập giao tiếp ngoại ngữ hoặc thảo luận sâu về tài liệu qua cả văn bản và âm thanh. Đây là cách tuyệt vời để ghi nhớ kiến thức.',
      actions: [{ type: 'highlight', target: 'ai_dialogue', durationMs: 5000 }],
    };
  }

  // 5. Kiểm tra / Quiz
  if (q.includes('quiz') || q.includes('kiểm tra') || q.includes('kiem tra') || q.includes('làm bài')) {
    return {
      message: 'Tại trang Kiểm tra, bạn có thể tạo các câu hỏi Trắc nghiệm, Đúng/Sai hoặc Tự luận từ chính những tài liệu bạn đã tải lên để tự ôn luyện.',
      actions: [{ type: 'highlight', target: 'quiz_builder', durationMs: 5000 }],
    };
  }

  // 6. Độ sẵn sàng thi
  if (q.includes('sẵn sàng') || q.includes('san sang') || q.includes('đậu') || q.includes('dau') || q.includes('pass')) {
    return {
      message: 'Độ sẵn sàng thi phân tích kết quả làm bài của bạn để đưa ra con số % dự đoán khả năng vượt qua kỳ thi thực tế.',
      actions: [{ type: 'highlight', target: 'exam_readiness', durationMs: 5000 }],
    };
  }

  // 7. Gamification / XP / Bảng xếp hạng
  if (q.includes('xp') || q.includes('level') || q.includes('cấp') || q.includes('xếp hạng') || q.includes('bxh') || q.includes('streak')) {
    return {
      message: 'Hệ thống Gamification theo dõi sự chăm chỉ của bạn qua XP, Level và Streak. Hãy học tập mỗi ngày để thăng hạng trên bảng xếp hạng cùng cộng đồng nhé!',
      actions: [{ type: 'highlight', target: 'main', durationMs: 5000 }],
    };
  }

  // 8. Tiến độ
  if (q.includes('tiến độ') || q.includes('tien do') || q.includes('biểu đồ') || q.includes('bieu do') || q.includes('thống kê')) {
    return {
      message: 'Trang Tiến độ hiển thị chi tiết lịch sử học tập và biểu đồ phát triển của bạn theo thời gian.',
      actions: [{ type: 'highlight', target: 'progress_overview', durationMs: 5000 }],
    };
  }

  // 9. Cộng đồng
  if (q.includes('cộng đồng') || q.includes('cong dong') || q.includes('chia sẻ')) {
    return {
      message: 'Cộng đồng LearnMate là nơi bạn có thể thảo luận, đặt câu hỏi và chia sẻ tài liệu hữu ích với những người học khác.',
      actions: [{ type: 'highlight', target: 'community_feed', durationMs: 5000 }],
    };
  }

  // 9b. Hội thảo / Workshop
  if (q.includes('hội thảo') || q.includes('hoi thao') || q.includes('workshop') || q.includes('tổ chức')) {
    return {
      message: 'Tính năng Hội thảo học thuật (Workshop Hub) giúp bạn tạo các buổi trao đổi chia sẻ kiến thức (được tặng +20 Credits) hoặc đăng ký tham gia các buổi học do người chuyên môn khác tổ chức bằng Credits. Bạn cũng có thể hủy đăng ký để được hoàn lại credits, và thực hiện chấm điểm đánh giá (1-5 sao) kèm nhận xét sau khi buổi học kết thúc.',
      actions: [{ type: 'highlight', target: 'community_feed', durationMs: 5000 }],
    };
  }

  // 10. Gói Credit / Nạp tiền
  if (q.includes('gói') || q.includes('goi') || q.includes('credit') || q.includes('tài khoản') || q.includes('tai khoan') || q.includes('nạp tiền')) {
    return {
      message: 'system_info_request',
      actions: [],
    };
  }

  // 11. Trang chủ / Dashboard
  if (q.includes('trang chủ') || q.includes('trang chu') || q.includes('tổng quan') || q.includes('tong quan')) {
    return {
      message: 'Trang chủ cung cấp cái nhìn tổng quát về nhiệm vụ hôm nay, lộ trình học tập và kết quả gần đây của bạn.',
      actions: [{ type: 'highlight', target: 'dashboard_overview', durationMs: 5000 }],
    };
  }

  return null;
}

function buildFallbackReply(message, uiContext) {
  const pageKey = uiContext?.currentPage || 'dashboard';
  const hint = PAGE_HINTS[pageKey] || { label: 'màn hình hiện tại', selector: 'main', target: 'main' };
  const semanticTargets = uiContext?.semanticTargets || {};
  const heuristic = heuristicByMessage(message, semanticTargets);
  if (heuristic) return heuristic;

  const target = semanticTargets[hint.target] ? hint.target : 'main';
  return {
    message: `Xin lỗi, mình chưa thể xử lý yêu cầu này. Hãy thử hỏi về cách sử dụng các tính năng của LearnMate nhé! 😊`,
    actions: [{ type: 'highlight', target, selector: hint.selector, durationMs: 5000 }],
  };
}

/**
 * Detect if the question is too complex / outside LearnMate scope
 */
function isOutOfScope(message) {
  const q = message.toLowerCase();
  const complexPatterns = [
    'giải phương trình', 'viết code', 'lập trình', 'giải bài', 'tính toán',
    'dịch bài', 'viết bài luận', 'soạn email', 'phân tích dữ liệu',
    'giải thích lý thuyết', 'chứng minh', 'so sánh', 'write code', 'solve',
  ];
  return complexPatterns.some(p => q.includes(p));
}

async function askAssistant(req, res) {
  try {
    const { message, uiContext, history = [] } = req.body || {};
    const userMessage = typeof message === 'string' ? message.trim() : '';
    if (!userMessage) return res.status(400).json({ message: 'message la bat buoc' });

    const semanticTargets = uiContext?.semanticTargets || {};
    const mock = heuristicByMessage(userMessage, semanticTargets);
    if (mock && mock.message !== 'system_info_request') return res.json(mock);

    // Scope guard: if question is too complex, return polite notice
    if (isOutOfScope(userMessage)) {
      return res.json({
        message: '🤔 Câu hỏi này vượt quá khả năng của mình rồi! Mình chỉ hỗ trợ hướng dẫn sử dụng LearnMate thôi. Bạn có thể hỏi về cách tải tài liệu, tạo quiz, xem tiến độ... nhé!',
        actions: [],
      });
    }

    // Build user context from auth data
    const userTier = req.user?.subscriptionTier || 'Basic';
    const userCredits = req.user?.currentCredits ?? 'không rõ';
    const userName = req.user?.name || 'bạn';

    // Check daily limits for AI Assistant
    if (userTier !== 'Premium') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const todayUsageCount = await UsageLog.countDocuments({
        userId: req.user.id,
        feature: 'AI_ASSISTANT_GUIDE',
        status: 'success',
        createdAt: { $gte: startOfToday }
      });

      const limits = { 'Basic': 20, 'Pro': 80 };
      const limit = limits[userTier] || 20;

      if (todayUsageCount >= limit) {
        return res.json({
          message: `Dừng lại chút nào! Bạn đã dùng hết ${limit} lượt hỏi của gói ${userTier} trong hôm nay rồi. Lượt dùng sẽ hồi lại vào ngày mai nhé! 😊`,
          actions: [{ type: 'highlight', target: 'pricing' }]
        });
      }
    }

    // Call XAI for intelligent response
    const systemPrompt = `Bạn là trợ lý AI hướng dẫn sử dụng của LearnMate. Bạn giúp người dùng điều hướng ứng dụng và giải thích các tính năng.
Bối cảnh hiện tại:
- Trang: ${uiContext?.currentPage || 'dashboard'}
- Các mục tiêu trên màn hình: ${JSON.stringify(semanticTargets)}

Thông tin người dùng:
- Tên: ${userName}
- Gói hiện tại: ${userTier}
- Credit còn lại: ${userCredits}

Danh sách tính năng LearnMate:
1. Trang chủ: Hiển thị nhiệm vụ hôm nay, streak học tập, và đếm ngược ngày thi.
2. Kế hoạch học: Nơi tạo và quản lý lịch học cá nhân hóa cho từng môn học.
3. Tài liệu: Tải lên (PDF, DOCX, JSON...), tóm tắt và chat với nội dung tài liệu (Phí: 1 Credit/tin nhắn chat).
4. Bản đồ kiến thức: Tự động sơ đồ hóa kiến thức từ tài liệu (Dạng mindmap).
5. Kiểm tra (Quiz): Tạo bài kiểm tra trắc nghiệm, đúng sai, tự luận từ các tài liệu đã chọn.
6. Độ sẵn sàng thi: Phân tích tiến độ để cho biết bạn đã sẵn sàng bao nhiêu % cho kỳ thi.
7. Gamification: Hệ thống XP, Level và danh hiệu giúp tăng động lực học tập.
8. Tiến độ: Thống kê chi tiết biểu đồ học tập qua thời gian.
9. Cộng đồng: Thảo luận và chia sẻ tài liệu với những người học khác.
10. Đối thoại AI: Luyện giao tiếp ngoại ngữ hoặc thảo luận sâu qua âm thanh/văn bản.
11. Gói Credit: Trang nạp Credit và mua các gói subscription (Pro/Premium).
12. Lịch sử Credit: Theo dõi các giao dịch nạp và sử dụng credit.
13. Hội thảo học thuật (Workshop): Cho phép tổ chức hội thảo chia sẻ kiến thức (nhận +20 Credits khi host) hoặc học từ người khác (learner tham gia đóng phí bằng Credits tùy ý host. Có thể hủy đăng ký để hoàn tiền trước khi diễn ra, và đánh giá/rate sau khi kết thúc).

Quy tắc:
- Trả lời ngắn gọn, thân thiện bằng Tiếng Việt.
- Nếu người dùng hỏi về tính năng, hãy hướng dẫn cụ thể theo danh sách trên.
- Nếu người dùng hỏi về gói cước (Basic/Pro/Premium) hoặc số dư Credit, hãy sử dụng thông tin cụ thể ở trên để trả lời chính xác cho họ.
- Nếu câu hỏi không liên quan đến LearnMate, hãy lịch sự từ chối và gợi ý hỏi về tính năng ứng dụng.
- Tuyệt đối không nói rằng bạn "không thể xử lý" nếu thông tin gói cước và credit đã được cung cấp ở trên.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(h => ({ role: h.isAi ? 'assistant' : 'user', content: h.text })),
      { role: "user", content: userMessage }
    ];

    const result = await callXAI(messages, { max_tokens: 500 });

    // Log successful usage
    await UsageLog.create({
      userId: req.user.id,
      feature: 'AI_ASSISTANT_GUIDE',
      creditsUsed: 0, // Assistant guide is currently free in terms of credits, but limited by count
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
      status: 'success'
    });

    return res.json({
      message: result.content,
      actions: []
    });
  } catch (error) {
    console.error('AI Assistant Error:', error);
    // Rate limit detection
    if (error.statusCode === 429 || error.message?.includes('giới hạn') || error.message?.includes('lượt hỏi')) {
      return res.json({
        message: '⚠️ Trợ lý AI đang tạm thời quá tải hoặc đã hết lượt dùng. Vui lòng thử lại sau nhé!',
        actions: [],
      });
    }
    return res.json(buildFallbackReply(req.body?.message, req.body?.uiContext));
  }
}

module.exports = { askAssistant };
