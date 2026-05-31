const Document = require('../models/Document');
const { deductCredits, hasEnoughCredits } = require('../services/creditService');

/**
 * Helper: call OpenAI API
 */
async function callAI(prompt, systemPrompt = null, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-4o'; // Use gpt-4o as default base, env overrides it

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY chưa được cấu hình trong backend .env');
  }

  const modelLower = model.toLowerCase();
  const isReasoningModel = 
    modelLower.startsWith('o') || // o1, o3, etc.
    modelLower.includes('gpt-5') || 
    modelLower.includes('reasoning') ||
    (modelLower.includes('mini') && !modelLower.includes('gpt-4') && !modelLower.includes('gpt-3.5'));

  console.log(`[DEBUG] AI Call Initiated - Model: "${model}", Reasoning: ${isReasoningModel}`);

  const messages = [];
  if (systemPrompt) {
    if (isReasoningModel) {
      // Reasonings models like o1 often don't support 'system' role, or handle it differently.
      // We convert it to a user prompt prefix for safety.
      messages.push({ role: "user", content: `[System Instruction]\n${systemPrompt}\n\n[User Request]\n${prompt}` });
    } else {
      messages.push({ role: "system", content: systemPrompt });
      messages.push({ role: "user", content: prompt });
    }
  } else {
    messages.push({ role: "user", content: prompt });
  }

  // Build body EXPLICITLY to avoid any hidden properties from options
  const body = {
    model: model,
    messages: messages,
  };

  if (isReasoningModel) {
    body.max_completion_tokens = options.max_tokens || 4000;
    // DO NOT include max_tokens, temperature, top_p, etc. for reasoning models
  } else {
    body.max_tokens = options.max_tokens || 4000;
    body.temperature = options.temperature ?? 0;
  }

  if (options.response_format) {
    // Only older and some newer models support json_object, o1-mini might not support it yet depending on version/proxy
    body.response_format = options.response_format;
  }


  const response = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    let errJson = {};
    try {
      errJson = JSON.parse(errText || "{}");
    } catch (_) {
      errJson = {};
    }
    throw new Error(
      errJson?.error?.message || errText || `AI API lỗi HTTP ${response.status}`
    );
  }

  const data = await response.json();
  return {
    content: data?.choices?.[0]?.message?.content || "",
    usage: {
      promptTokens: data?.usage?.prompt_tokens || 0,
      completionTokens: data?.usage?.completion_tokens || 0,
      totalTokens: data?.usage?.total_tokens || 0
    }
  };
}

// Helper logic tóm tắt
const generateSummaryFromText = async (docName, content) => {
  const hasEnoughContent = content && content.trim().length > 20;
  const processedContent = hasEnoughContent
    ? content.substring(0, 10000)
    : `(Không trích xuất được đủ văn bản trực tiếp. Hãy tóm tắt dựa trên tên tài liệu: "${docName}")`;

  const prompt = `Bạn là một trợ lý phân tích tài liệu chuyên nghiệp. Hãy tóm tắt nội dung của tài liệu sau đây bằng Tiếng Việt.
  
TÊN TÀI LIỆU: "${docName}"
NỘI DUNG TRÍCH XUẤT:
${processedContent}`;

  return await callAI(
    prompt,
    "Bạn là một trợ lý AI tóm tắt tài liệu. Bạn trả về văn bản thuần túy, súc tích.",
    { max_tokens: 1500 }
  );
};

// @desc  Tóm tắt tài liệu
// @route POST /api/ai/summarize
// @access Private
const summarizeDocument = async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) return res.status(400).json({ message: 'Thiếu documentId' });

    // Check credits
    const canProceed = await hasEnoughCredits(req.user.id, 'SUMMARIZE_DOCUMENT');
    if (!canProceed) {
      return res.status(402).json({ message: 'Bạn không đủ Credit để thực hiện tóm tắt. Vui lòng nạp thêm.' });
    }

    const doc = await Document.findOne({ _id: documentId, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });

    // If summary already exists and is not too short, return it (to save credits)
    // Optional: Only return if less than X days old or allow forced refresh
    if (doc.summary && doc.summary.length > 50) {
      // return res.json({ summary: doc.summary }); 
      // User requirement says "Only deduct when success", but if we reuse, we should probably not deduct.
      // However, usually users want a FRESH summary if they click it again. 
      // For now, let's always generate a new one unless we want to cache.
    }

    const result = await generateSummaryFromText(doc.name, doc.content);
    
    // Save to doc
    doc.summary = result.content;
    await doc.save();

    // Deduct credits on success
    await deductCredits(req.user.id, 'SUMMARIZE_DOCUMENT', { 
      documentId, 
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens
    });

    res.json({ summary: result.content });
  } catch (error) {
    console.error('AI Summarize error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc  Tạo câu hỏi quiz từ nhiều tài liệu
// @route POST /api/ai/generate-quiz
// @access Private
const generateQuiz = async (req, res) => {
  try {
    const { documentIds, format, numQuestions, difficulty } = req.body;
    if (!documentIds || !documentIds.length) return res.status(400).json({ message: 'Thiếu documentIds' });

    // Check credits
    const canProceed = await hasEnoughCredits(req.user.id, 'GENERATE_QUIZ');
    if (!canProceed) {
      return res.status(402).json({ message: 'Bạn không đủ Credit để thực hiện tạo Quiz.' });
    }

    const docs = await Document.find({ _id: { $in: documentIds }, user: req.user.id });
    if (!docs.length) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });

    const combinedContent = docs.map((d) => d.content || '').join('\n\n---\n\n').trim().slice(0, 15000);
    if (!combinedContent || combinedContent.length < 20) {
      return res.status(400).json({ message: 'Tài liệu chưa được xử lý xong hoặc không chứa nội dung văn bản để tạo câu hỏi.' });
    }
    const hintNames = docs.map((d) => d.name).join(', ');
    const count = parseInt(numQuestions) || 10;
    const diff = difficulty || 'Trung bình';

    let formatInstruction = "";
    let jsonFormat = "";

    if (format === 'Trắc nghiệm') {
      formatInstruction = `tạo ra ${count} câu hỏi trắc nghiệm 4 lựa chọn.`;
      jsonFormat = `"options": ["A", "B", "C", "D"], "correctIndex": 0,`;
    } else if (format === 'Đúng/Sai') {
      formatInstruction = `tạo ra ${count} câu hỏi Đúng/Sai.`;
      jsonFormat = `"options": ["Đúng", "Sai"], "correctIndex": 0,`;
    } else {
      formatInstruction = `tạo ra ${count} câu hỏi tự luận.`;
      jsonFormat = `"options": ["Gợi ý"], "correctIndex": 0,`;
    }

    const prompt = `Bạn là một chuyên gia khảo thí bài tập sừng sỏ. 
Dựa trên tài liệu được cung cấp dưới đây, hãy ${formatInstruction} Độ khó: ${diff}.

CHÚ Ý QUAN TRỌNG:
1. NỘI DUNG TÀI LIỆU CẢNH BÁO: Chỉ sử dụng thông tin có trong phần "TÀI LIỆU" bên dưới. Tuyệt đối không tự bịa ra thông tin không có trong tài liệu.
2. Nếu tài liệu chứa các ký tự vô nghĩa, mã binary hoặc không đủ thông tin để tạo câu hỏi hay, hãy trả về một JSON Array rỗng [] và không trả thêm bất kỳ văn bản nào khác.
3. Giải thích (explanation) phải chi tiết và trích dẫn logic từ tài liệu.

TÀI LIỆU:
---
${combinedContent}
---

Yêu cầu định dạng JSON Array:
[{ "question": "...", ${jsonFormat} "explanation": "...", "level": "Nhận biết/Thông hiểu/Vận dụng" }]`;

    const result = await callAI(
      prompt,
      "Bạn là một trợ lý AI giáo dục chuyên tạo câu hỏi kiểm tra. Bạn chỉ làm việc dựa trên nội dung được cung cấp và trả về định dạng JSON Array chính xác. Nếu không có đủ nội dung hợp lệ, bạn trả về [].",
      { max_tokens: 4000, response_format: { type: "json_object" } }
    );

    // Deduct credits
    await deductCredits(req.user.id, 'GENERATE_QUIZ', { 
      documentIds, 
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens
    });

    res.json({ text: result.content, hintNames });
  } catch (error) {
    console.error('AI Generate Quiz error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc  Tạo hội thoại từ tài liệu
// @route POST /api/ai/generate-dialogue
// @access Private
const generateDialogue = async (req, res) => {
  try {
    const { documentId, language, speakerFemaleName, speakerMaleName } = req.body;
    if (!documentId) return res.status(400).json({ message: 'Thiếu documentId' });

    const Document = require('../models/Document');
    const doc = await Document.findOne({ _id: documentId, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });

    const langLabel = language === 'en' ? 'tiếng Anh' : language === 'zh' ? 'tiếng Trung' : 'tiếng Việt';
    const female = speakerFemaleName || 'Linh';
    const male = speakerMaleName || 'Nam';

    const prompt = `Bạn là một trợ lý AI giáo dục. Hãy tạo một hội thoại tự nhiên bằng ${langLabel} giữa hai người ${female} (nữ) và ${male} (nam) đang thảo luận về nội dung tài liệu sau.

TÊN TÀI LIỆU: "${doc.name}"
NỘI DUNG: ${(doc.content || doc.summary || 'Không có nội dung').substring(0, 8000)}

Yêu cầu:
- Khoảng 10-15 lượt trao đổi
- Tự nhiên, dễ hiểu, có tính giáo dục
- Định dạng: "${female}: ..." và "${male}: ..."`;

    const result = await callAI(prompt, 'Bạn là AI tạo hội thoại giáo dục.', { max_tokens: 2000 });

    res.json({ dialogue: result.content });
  } catch (error) {
    console.error('AI Dialogue error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { summarizeDocument, generateQuiz, generateSummaryFromText, generateDialogue };
