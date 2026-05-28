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
  // Case 1: Tai tai lieu
  if (
    q.includes('tai tai lieu') ||
    q.includes('tải tài liệu') ||
    q.includes('upload') ||
    q.includes('pdf') ||
    q.includes('docx')
  ) {
    return {
      message: 'Bạn vào trang Tài liệu, bấm nút Tải lên để thêm file PDF/DOCX. Sau khi xử lý xong, chuyển sang trang Quiz để tạo câu hỏi.',
      actions: [
        { type: 'scroll_to', target: semanticTargets.documents_list ? 'documents_list' : 'main', instruction: 'Cuộn đến khu vực tài liệu.', durationMs: 3500 },
        { type: 'highlight', target: semanticTargets.documents_list ? 'documents_list' : 'main', instruction: 'Bấm Tải lên để chọn file.', durationMs: 5000 },
      ],
    };
  }
  // Case 2: Hoc gi hom nay
  if (q.includes('học gì hôm nay') || q.includes('hom nay') || q.includes('nen hoc gi')) {
    return {
      message: 'Hôm nay bạn nên ưu tiên các mục chưa hoàn thành trong Nhiệm vụ học hôm nay, sau đó làm 1 bài quiz ngắn để kiểm tra.',
      actions: [
        { type: 'scroll_to', target: semanticTargets.today_tasks ? 'today_tasks' : 'main', instruction: 'Cuộn đến danh sách nhiệm vụ hôm nay.', durationMs: 3500 },
        { type: 'highlight', target: semanticTargets.today_tasks ? 'today_tasks' : 'main', instruction: 'Chọn nhiệm vụ đang ở trạng thái chưa làm hoặc đang làm.', durationMs: 5000 },
      ],
    };
  }
  // Case 3: Lam quiz / kiem tra
  if (q.includes('quiz') || q.includes('kiem tra') || q.includes('kiểm tra') || q.includes('làm quiz')) {
    return {
      message: 'Để làm quiz, bạn mở trang Kiểm tra, chọn tài liệu đã tải và số lượng câu, rồi bấm tạo đề.',
      actions: [
        { type: 'scroll_to', target: semanticTargets.quiz_builder ? 'quiz_builder' : 'main', instruction: 'Cuộn đến khu vực tạo quiz.', durationMs: 3500 },
        { type: 'highlight', target: semanticTargets.quiz_builder ? 'quiz_builder' : 'main', instruction: 'Thiết lập thông số và bấm tạo đề.', durationMs: 5000 },
      ],
    };
  }
  return null;
}

function buildFallbackReply(message, uiContext, reason) {
  const pageKey = uiContext?.currentPage || 'dashboard';
  const hint = PAGE_HINTS[pageKey] || { label: 'man hinh hien tai', selector: 'main', target: 'main' };
  const semanticTargets = uiContext?.semanticTargets || {};
  const heuristic = heuristicByMessage(message, semanticTargets);
  if (heuristic) return heuristic;

  const target = semanticTargets[hint.target] ? hint.target : 'main';
  return {
    message: `Dang o che do fallback (${reason}). Ban thao tac tai ${hint.label} truoc, neu can minh se dan tiep tung buoc.`,
    actions: [{ type: 'highlight', target, selector: hint.selector, durationMs: 5000 }],
  };
}

async function askAssistant(req, res) {
  try {
    const { message, uiContext } = req.body || {};
    const userMessage = typeof message === 'string' ? message.trim() : '';
    if (!userMessage) return res.status(400).json({ message: 'message la bat buoc' });

    const semanticTargets = uiContext?.semanticTargets || {};
    const mock = heuristicByMessage(userMessage, semanticTargets);
    if (mock) return res.json(mock);
    return res.json(buildFallbackReply(userMessage, uiContext, 'mock_no_keyword_match'));
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Loi tro ly AI' });
  }
}

module.exports = { askAssistant };
