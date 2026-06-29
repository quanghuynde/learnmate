const Document = require('../models/Document');
const KnowledgeMap = require('../models/KnowledgeMap');
const { deductCredits, hasEnoughCredits } = require('../services/creditService');
const UsageLog = require('../models/UsageLog');
const sendEmail = require('../services/emailService');
const fs = require('fs');
const path = require('path');

// Rate limit email throttle (1 hour)
let lastRateLimitEmailSent = 0;
const EMAIL_THROTTLE_MS = 3600000;

async function notifyAdminRateLimit(provider, errorMsg) {
  const now = Date.now();
  if (now - lastRateLimitEmailSent < EMAIL_THROTTLE_MS) return;

  lastRateLimitEmailSent = now;
  sendEmail({
    email: 'learnmate196@gmail.com',
    subject: `[LearnMate Alert] AI API Rate Limit Reached (${provider})`,
    message: `Cảnh báo: API của ${provider} đã đạt giới hạn (HTTP 429).\nThời gian: ${new Date().toLocaleString('vi-VN')}\nLỗi chi tiết: ${errorMsg}\n\nVui lòng kiểm tra lại tài khoản hoặc nạp thêm tiền cho API Key.`,
  }).catch(err => {
    console.error('Failed to send rate limit alert email:', err.message);
  });
}

/**
 * Helper: call OpenAI API
 */
async function callAI(prompt, systemPrompt = null, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  // Allow callers to override the model via options.model
  const model = options.model || process.env.OPENAI_MODEL || 'gpt-4o';

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
      messages.push({ role: "user", content: `[System Instruction]\n${systemPrompt}\n\n[User Request]\n${typeof prompt === 'string' ? prompt : JSON.stringify(prompt)}` });
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

    if (response.status === 429) {
      await notifyAdminRateLimit('OpenAI', errJson?.error?.message || errText);
      throw new Error('Bạn đã dùng hết lượt hỏi trong hôm nay. Vui lòng quay lại sau.');
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

/**
 * Helper: call XAI API (Grok)
 */
async function callXAI(messages, options = {}) {
  const apiKey = process.env.XAI_API_KEY;
  const apiBase = 'https://api.x.ai/v1';
  const model = 'grok-4.3-latest';

  if (!apiKey) {
    throw new Error('XAI_API_KEY chưa được cấu hình trong backend .env');
  }

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: options.temperature ?? 0,
      max_tokens: options.max_tokens || 2000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsed = {};
    try { parsed = JSON.parse(errText || '{}'); } catch (_) {}
    if (response.status === 429) {
      await notifyAdminRateLimit('XAI', parsed?.error?.message || parsed?.error || errText);
      throw new Error('Bạn đã dùng hết lượt hỏi trong hôm nay. Vui lòng quay lại sau.');
    }
    throw new Error(parsed?.error?.message || parsed?.error || `XAI API lỗi HTTP ${response.status}`);
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
// Helper logic tóm tắt dùng XAI
const generateSummaryFromText = async (docName, content) => {
  const hasEnoughContent = content && content.trim().length > 20;
  const processedContent = hasEnoughContent
    ? content.substring(0, 10000)
    : `(Không trích xuất được đủ văn bản trực tiếp. Hãy tóm tắt dựa trên tên tài liệu: "${docName}")`;

  const messages = [
    { role: "system", content: "Bạn là một trợ lý AI tóm tắt tài liệu chuyên nghiệp. Hãy trả về văn bản có định dạng Markdown: sử dụng danh sách gạch đầu dòng (bullet points) cho các ý chính, in đậm (bold) các thuật ngữ quan trọng. Trình bày rõ ràng, dễ đọc. Trả lời bằng Tiếng Việt." },
    { role: "user", content: `Hãy phân tích và tóm tắt nội dung của tài liệu sau đây một cách súc tích nhưng đầy đủ ý.\n\nTÊN TÀI LIỆU: "${docName}"\nNỘI DUNG TRÍCH XUẤT:\n${processedContent}` }
  ];

  return await callXAI(messages, { max_tokens: 1500 });
};

// @desc  Tóm tắt tài liệu
// @route POST /api/ai/summarize
// @access Private
const summarizeDocument = async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) return res.status(400).json({ message: 'Thiếu documentId' });

    const doc = await Document.findOne({ _id: documentId, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });

    // If doc already has a cached summary, return it immediately
    if (doc.summary && doc.summary.trim().length > 20) {
      return res.json({
        summary: doc.summary,
        history: [{ role: 'assistant', content: doc.summary }],
        cached: true
      });
    }

    // No cached summary → need to generate via AI
    const canProceed = await hasEnoughCredits(req.user.id, 'SUMMARIZE_DOCUMENT');
    if (!canProceed) {
      return res.status(402).json({ message: 'Bạn không đủ Credit để thực hiện tóm tắt. Vui lòng nạp thêm.' });
    }

    let result;
    const isImage = ['jpg', 'jpeg', 'png', 'bmp', 'webp'].includes(doc.type?.toLowerCase());

    if (isImage && doc.fileUrl) {
      try {
        console.log(`[AI] Multimodal summarize for image: ${doc.name}`);
        const relativePath = doc.fileUrl.replace(/^\//, '');
        const filePath = path.resolve(process.cwd(), relativePath);
        
        if (fs.existsSync(filePath)) {
          const imageBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
          const mimeType = `image/${doc.type === 'jpg' ? 'jpeg' : doc.type}`;
          
          const multimodalPrompt = [
            { type: "text", text: `Hãy phân tích kỹ hình ảnh tài liệu có tên "${doc.name}" và cung cấp bản tóm tắt nội dung chính xác. Trả lời bằng Tiếng Việt.` },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
          ];
          
          const systemPrompt = "Bạn là một trợ lý AI tóm tắt tài liệu chuyên nghiệp. Bạn có khả năng phân tích hình ảnh cực tốt. Trình bày bằng Markdown, súc tích.";
          result = await callAI(multimodalPrompt, systemPrompt, { model: 'gpt-4o-mini', max_tokens: 1500 });
        } else {
          throw new Error('File not found for multimodal processing');
        }
      } catch (imgError) {
        console.error('Multimodal summarize failed, falling back to text:', imgError.message);
        result = await generateSummaryFromText(doc.name, doc.content);
      }
    } else {
      try {
        result = await generateSummaryFromText(doc.name, doc.content);
      } catch (aiError) {
        console.error('AI Summarize XAI call failed, trying OpenAI fallback:', aiError.message);
        const prompt = `Bạn là một trợ lý phân tích tài liệu chuyên nghiệp. Hãy tóm tắt nội dung của tài liệu sau đây.\n\nTÊN TÀI LIỆU: "${doc.name}"\nNỘI DUNG TRÍCH XUẤT:\n${doc.content?.substring(0, 10000)}`;
        const systemPrompt = "Bạn là một trợ lý AI tóm tắt tài liệu. Bạn trả về văn bản bằng Tiếng Việt, súc tích, định dạng Markdown.";
        result = await callAI(prompt, systemPrompt, { max_tokens: 1500 });
      }
    }
    
    doc.summary = result.content;
    await doc.save();

    await deductCredits(req.user.id, 'SUMMARIZE_DOCUMENT', { 
      documentId, 
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens
    });

    res.json({ 
      summary: result.content,
      history: [
        { role: 'assistant', content: result.content }
      ]
    });
  } catch (error) {
    console.error('AI Summarize error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc  Chat với tài liệu (hỏi thêm sau khi tóm tắt)
// @route POST /api/ai/chat-document
// @access Private
const chatWithDocument = async (req, res) => {
  try {
    const { documentId, message, history = [] } = req.body;
    if (!documentId || !message) {
      return res.status(400).json({ message: 'Thiếu documentId hoặc message' });
    }

    const doc = await Document.findOne({ _id: documentId, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });

    const systemPrompt = `Bạn là một trợ lý AI phân tích tài liệu. Bạn đang trò chuyện với người dùng về tài liệu "${doc.name}".
Dưới đây là nội dung của tài liệu:
---
${(doc.content || "").substring(0, 15000)}
---
Hãy trả lời các câu hỏi của người dùng dựa trên nội dung tài liệu. Nếu thông tin không có trong tài liệu, hãy nói rằng bạn không biết dựa trên tài liệu này. Trả lời bằng Tiếng Việt.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: message }
    ];

    // Check credits (Cost: 1)
    const canProceed = await hasEnoughCredits(req.user.id, 'AI_CHAT');
    if (!canProceed) {
      return res.status(402).json({ message: 'Bạn không đủ Credit để chat với tài liệu. Vui lòng nạp thêm.' });
    }

    let result;
    try {
      result = await callXAI(messages, { max_tokens: 1000 });
    } catch (aiError) {
      console.error('AI Chat Document XAI call failed, trying OpenAI fallback:', aiError.message);
      try {
        result = await callAI(message, systemPrompt, { max_tokens: 1000 });
      } catch (fallbackError) {
        console.error('AI Chat Document OpenAI fallback also failed:', fallbackError.message);
        return res.status(503).json({ message: 'Dịch vụ AI hiện tại không khả dụng. Vui lòng thử lại sau.' });
      }
    }

    // Deduct credits
    await deductCredits(req.user.id, 'AI_CHAT', { 
      documentId,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens
    });

    res.json({ content: result.content });
  } catch (error) {
    console.error('AI Chat Document error:', error);
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
2. Nếu tài liệu chứa các ký tự vô nghĩa, mã binary hoặc không đủ thông tin để tạo câu hỏi hay, hãy trả về {"questions": []} và không trả thêm bất kỳ văn bản nào khác.
3. Giải thích (explanation) phải chi tiết và trích dẫn logic từ tài liệu.

TÀI LIỆU:
---
${combinedContent}
---

Yêu cầu định dạng JSON (Chỉ trả về 1 Object duy nhất):
{
  "questions": [
    { "question": "...", ${jsonFormat} "explanation": "...", "level": "Nhận biết/Thông hiểu/Vận dụng" }
  ]
}`;

    const result = await callAI(
      prompt,
      "Bạn là một trợ lý AI giáo dục chuyên tạo câu hỏi kiểm tra. Bạn trả về một JSON Object chứa khóa 'questions' là một mảng các câu hỏi. Nếu không có mã hợp lệ, trả về {'questions': []}.",
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

    const doc = await Document.findOne({ _id: documentId, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });

    // Check dialogue limit based on subscription tier
    let tier = req.user.subscriptionTier || 'Basic';
    if (tier !== 'Basic' && req.user.subscriptionExpiresAt && new Date(req.user.subscriptionExpiresAt) < new Date()) {
      tier = 'Basic';
    }

    const dialogueCount = await UsageLog.countDocuments({ 
      userId: req.user.id, 
      feature: 'AI_DIALOGUE',
      status: 'success'
    });

    const limits = { 'Basic': 10, 'Pro': 30, 'Premium': Infinity };
    const userLimit = limits[tier] || 10;

    if (dialogueCount >= userLimit) {
      return res.status(403).json({ 
        message: `Bạn đã đạt giới hạn tạo đối thoại tối đa (${userLimit} cuộc) cho gói ${tier}. Vui lòng nâng cấp gói để tiếp tục.` 
      });
    }

    // Check credits (Cost: 5)
    try {
      const canProceed = await hasEnoughCredits(req.user.id, 'AI_DIALOGUE');
      if (!canProceed) {
        return res.status(402).json({ message: 'Bạn không đủ Credit để tạo đối thoại AI. Vui lòng nạp thêm.' });
      }
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }

    const langLabel = language === 'en' ? 'tiếng Anh' : language === 'zh' ? 'tiếng Trung' : 'tiếng Việt';
    const female = speakerFemaleName || 'Linh';
    const male = speakerMaleName || 'Nam';

    const prompt = `Bạn là một trợ lý AI giáo dục. Hãy tạo một hội thoại tự nhiên bằng ${langLabel} giữa hai người ${female} (nữ) và ${male} (nam) đang thảo luận về nội dung tài liệu sau.

TÊN TÀI LIỆU: "${doc.name}"
NỘI DUNG: ${(doc.content || doc.summary || 'Không có nội dung').substring(0, 8000)}

Yêu cầu:
- Khoảng 10-15 lượt trao đổi
- Tự nhiên, dễ hiểu, có tính giáo dục
- Trả về kết quả dưới định dạng JSON duy nhất, là một mảng các đối tượng lượt thoại.
- Mỗi đối tượng lượt thoại có các thuộc tính: id (số nguyên tăng dần), speaker ('female' hoặc 'male'), speakerName (tên người nói), text (nội dung nói).

ĐỊNH DẠNG JSON MẪU:
{
  "dialogue": [
    { "id": 1, "speaker": "female", "speakerName": "${female}", "text": "..." },
    { "id": 2, "speaker": "male", "speakerName": "${male}", "text": "..." }
  ]
}`;

    const result = await callAI(
      prompt, 
      'Bạn là AI tạo hội thoại giáo dục chuyên nghiệp. Bạn chỉ trả về nội dung dưới định dạng JSON object với khóa "dialogue".', 
      { max_tokens: 2000, response_format: { type: "json_object" } }
    );

    // Deduct credits and log usage on success
    try {
      await deductCredits(req.user.id, 'AI_DIALOGUE', { 
        documentId,
        language,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens
      });
    } catch (err) {
      console.error('Failed to deduct credits for dialogue:', err.message);
      // We still return the dialogue since it was generated, but this shouldn't normally happen
    }

    res.json({ dialogue: result.content });
  } catch (error) {
    console.error('AI Dialogue error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc  Tạo bản đồ kiến thức từ nhiều tài liệu
// @route POST /api/ai/generate-knowledge-map
// @access Private
const generateKnowledgeMap = async (req, res) => {
  try {
    const { documentIds, title } = req.body;
    if (!documentIds || !documentIds.length) {
      return res.status(400).json({ message: 'Thiếu documentIds' });
    }

    // Check knowledge map limit based on subscription tier
    let tier = req.user.subscriptionTier || 'Basic';
    if (tier !== 'Basic' && req.user.subscriptionExpiresAt && new Date(req.user.subscriptionExpiresAt) < new Date()) {
      tier = 'Basic';
    }

    const currentMapsCount = await KnowledgeMap.countDocuments({ user: req.user.id });
    const limits = { 'Basic': 10, 'Pro': 30, 'Premium': Infinity };
    const userLimit = limits[tier] || 10;

    if (currentMapsCount >= userLimit) {
      return res.status(403).json({ 
        message: `Bạn đã đạt giới hạn tạo bản đồ tri thức tối đa (${userLimit} bản đồ) cho gói ${tier}. Vui lòng xóa bớt bản đồ cũ hoặc nâng cấp gói để tiếp tục.` 
      });
    }

    // Check credits
    const canProceed = await hasEnoughCredits(req.user.id, 'KNOWLEDGE_MAP');
    if (!canProceed) {
      return res.status(402).json({ message: 'Bạn không đủ Credit để tạo bản đồ kiến thức.' });
    }

    const docs = await Document.find({ _id: { $in: documentIds }, user: req.user.id });
    if (!docs.length) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });

    const combinedContent = docs.map((d) => d.content || '').join('\n\n---\n\n').trim().slice(0, 15000);
    if (!combinedContent || combinedContent.length < 50) {
      return res.status(400).json({ message: 'Tài liệu chưa được xử lý xong hoặc không có đủ nội dung để phân tích kiến thức.' });
    }

    const docNames = docs.map(d => d.name);

    const prompt = `Bạn là một chuyên gia phân tích giáo dục. Dựa trên nội dung tài liệu sau, hãy tạo một SƠ ĐỒ TRI THỨC dạng CÂY PHÂN CẤP (TREE) 3 tầng.

TÀI LIỆU:
---
${combinedContent}
---

YÊU CẦU CẤU TRÚC:
- Tầng 1 (Root): 1 nút gốc tổng hợp toàn bộ nội dung
- Tầng 2 (Chương/chủ đề lớn): 3-6 chương hoặc chủ đề chính
- Tầng 3 (Mục/khái niệm): Mỗi chương có 2-5 mục con
- Tầng 4 (Kiến thức trọng tâm): Mỗi mục có 1-3 kiến thức trọng tâm cụ thể (câu ngắn, súc tích)

YÊU CẦU ĐỊNH DẠNG JSON (Chỉ trả về JSON, không thêm bất kỳ văn bản nào khác):
{
  "tree": {
    "id": "root",
    "label": "Tên tổng hợp",
    "children": [
      {
        "id": "c1",
        "label": "Chương/Chủ đề 1",
        "children": [
          {
            "id": "c1-1",
            "label": "Mục con 1.1",
            "children": [
              { "id": "c1-1-1", "label": "Kiến thức: nội dung cụ thể, súc tích" }
            ]
          }
        ]
      }
    ]
  },
  "aiInsight": "Nhận xét ngắn (1-2 câu) về điểm thú vị hoặc liên hệ kiến thức trong tài liệu."
}`;

    const result = await callAI(
      prompt,
      'Bạn là chuyên gia phân tích kiến thức. CHỈ trả về dữ liệu JSON hợp lệ theo cấu trúc yêu cầu. Không thêm giải thích hay markdown.',
      { max_tokens: 4000, response_format: { type: 'json_object' } }
    );

    // Parse result
    let mapData;
    try {
      mapData = JSON.parse(result.content);
    } catch (e) {
      console.error('Failed to parse AI Knowledge Map response:', e);
      return res.status(500).json({ message: 'Lỗi định dạng dữ liệu từ AI. Vui lòng thử lại.' });
    }

    // Attach document sources info
    mapData.documentSources = docNames;

    // Deduct credits
    await deductCredits(req.user.id, 'KNOWLEDGE_MAP', { 
      documentIds, 
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens
    });

    // Save to DB
    const newMap = await KnowledgeMap.create({
      user: req.user.id,
      title: title || docs.map(d => d.name).join(', ').substring(0, 50) || 'Bản đồ kiến thức không tên',
      documentIds,
      mapData
    });

    // Await notification
    const { createUserNotification } = require('../services/notificationService');
    await createUserNotification(req.user.id, {
      title: 'Bản đồ kiến thức đã sẵn sàng',
      message: `Bản đồ tri thức "${newMap.title}" đã được tạo xong.`,
      type: 'knowledge_map_created',
      emailSubject: 'LearnMate - Bản đồ tri thức mới',
      metadata: {
        title: newMap.title,
        documentSources: docNames,
        mapId: newMap._id.toString()
      },
    });

    res.json({ mapData: newMap.mapData, mapId: newMap._id, title: newMap.title });
  } catch (error) {
    console.error('AI Knowledge Map error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc  Lấy danh sách bản đồ kiến thức đã lưu
// @route GET /api/ai/knowledge-maps
// @access Private
const getKnowledgeMaps = async (req, res) => {
  try {
    const maps = await KnowledgeMap.find({ user: req.user.id })
      .select('title createdAt documentIds')
      .sort({ createdAt: -1 });
    res.json({ maps });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Lấy chi tiết một bản đồ kiến thức
// @route GET /api/ai/knowledge-maps/:id
// @access Private
const getKnowledgeMapById = async (req, res) => {
  try {
    const map = await KnowledgeMap.findOne({ _id: req.params.id, user: req.user.id });
    if (!map) return res.status(404).json({ message: 'Không tìm thấy bản đồ' });
    res.json({ mapData: map.mapData, title: map.title });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Xóa bản đồ kiến thức
// @route DELETE /api/ai/knowledge-maps/:id
// @access Private
const deleteKnowledgeMap = async (req, res) => {
  try {
    const map = await KnowledgeMap.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!map) return res.status(404).json({ message: 'Không tìm thấy bản đồ để xóa' });
    res.json({ message: 'Đã xóa bản đồ kiến thức thành công' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
  summarizeDocument, 
  chatWithDocument,
  generateQuiz, 
  generateSummaryFromText, 
  generateDialogue, 
  generateKnowledgeMap,
  getKnowledgeMaps,
  getKnowledgeMapById,
  deleteKnowledgeMap,
  callXAI
};

