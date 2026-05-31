const Document = require('../models/Document');
const { validateAndDeduct } = require('../services/creditService');

/**
 * Helper: call OpenAI API
 * CONFIGURATION: Using OpenAI with the provided key and target model 'gpt-5'
 * Current Shineshop configuration (commented out as requested):
 * OPENAI_API_BASE=https://api.shineshop.dev/v1
 * OPENAI_MODEL=kr/claude-sonnet-4.5
 * OPENAI_API_KEY=sk-Z6BXKCB3tmbk2LnTZHObW3GnZQmDuTruRTL6_Bivots
 */
async function callAI(prompt, systemPrompt = null, options = {}) {
  // CONFIGURATION: Using environment variables for security
  const apiKey = process.env.OPENAI_API_KEY;
  const apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'gpt-5';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY chưa được cấu hình trong backend .env');
  }

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const body = {
    model,
    messages,
    max_tokens: options.max_tokens || 2000,
    temperature: 0,
  };

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
      errJson?.error?.message ||
        errText ||
        `AI API lỗi HTTP ${response.status}`,
    );
  }

  const raw = await response.text();
  let data = null;
  let content = '';

  try {
    data = JSON.parse(raw);
    content = data?.choices?.[0]?.message?.content || "";
  } catch (_) {
    // Support SSE style responses, e.g. "data: {...}"
    const chunks = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.replace(/^data:\s*/, ""))
      .filter((line) => line && line !== "[DONE]")
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);

    if (!chunks.length) {
      throw new Error("Phản hồi AI không hợp lệ (không parse được JSON/SSE)");
    }

    content = chunks
      .map(
        (chunk) =>
          chunk.choices?.[0]?.delta?.content ||
          chunk.choices?.[0]?.message?.content ||
          "",
      )
      .join("");
    
    // For SSE, usage info might be in the last chunk or not available
    data = chunks[chunks.length - 1];
  }

  return {
    content,
    usage: {
      promptTokens: data?.usage?.prompt_tokens || 0,
      completionTokens: data?.usage?.completion_tokens || 0,
    }
  };
}

// Helper logic tóm tắt (dùng được cả ở upload và request thủ công)
const generateSummaryFromText = async (docName, content) => {
  // Dự phòng: Nếu content quá ngắn hoặc rỗng, sử dụng tên file để AI suy luận
  const hasEnoughContent = content && content.trim().length > 20;
  const processedContent = hasEnoughContent
    ? content.substring(0, 10000)
    : `(Không trích xuất được đủ văn bản trực tiếp. Hãy tóm tắt dựa trên tên tài liệu: "${docName}")`;

  const prompt = `Bạn là một trợ lý phân tích tài liệu chuyên nghiệp. Hãy tóm tắt nội dung của tài liệu sau đây bằng Tiếng Việt.
  
TÊN TÀI LIỆU: "${docName}"
NỘI DUNG TRÍCH XUẤT:
${processedContent}

Yêu cầu tóm tắt:
1. Trình bày chi tiết nhưng súc tích, đi thẳng vào vấn đề.
2. Mô tả tài liệu này về chủ đề gì và các điểm chính.
3. KHÔNG sử dụng các ký tự Markdown như dấu sao (**) để in đậm văn bản. Hãy dùng văn bản thuần túy.
4. Nếu nội dung trích xuất không đủ, hãy dựa vào tên tài liệu để tóm tắt các khái niệm liên quan.`;

  return await callAI(
    prompt,
    "Bạn là một trợ lý AI tóm tắt tài liệu. Bạn LUÔN trả về văn bản sạch, KHÔNG chứa các ký tự định dạng Markdown như ** để in đậm.",
    { max_tokens: 1500 },
  );
};

// @desc  Tóm tắt tài liệu
// @route POST /api/ai/summarize
const summarizeDocument = async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) return res.status(400).json({ message: 'Thiếu documentId' });

    const doc = await Document.findOne({ _id: documentId, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });

    // 1. Trả về ngay nếu đã có tóm tắt lưu sẵn
    if (doc.summary && !doc.summary.startsWith("Tài liệu không có đủ nội dung")) {
      return res.json({ summary: doc.summary });
    }

    // Check credits (Cost: 10)
    await validateAndDeduct(req.user.id, 10, 'Summarize', { checkOnly: true });

    // 2. Tạo mới
    const result = await generateSummaryFromText(doc.name, doc.content);

    // Save summary
    doc.summary = result.content;
    await doc.save();

    // Deduct credits on success (Cost: 10)
    await validateAndDeduct(req.user.id, 10, 'Summarize', {
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      model: 'gpt-5'
    });

    res.json({ summary: result.content });
  } catch (error) {
    console.error('AI Summarize error:', error);
    res.status(error.message.includes('Credit') ? 402 : 500).json({ message: error.message });
  }
};

// @desc  Tạo câu hỏi quiz từ nhiều tài liệu
// @route POST /api/ai/generate-quiz
const generateQuiz = async (req, res) => {
  try {
    const { documentIds, format, numQuestions, difficulty } = req.body;
    if (!documentIds || !documentIds.length) return res.status(400).json({ message: 'Thiếu documentIds' });

    const docs = await Document.find({ _id: { $in: documentIds }, user: req.user.id });
    if (!docs.length) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });

    // Check credits (Cost: 5)
    await validateAndDeduct(req.user.id, 5, 'Generate Quiz', { checkOnly: true });

    const combinedContent = docs.map((d) => d.content || '').join('\n\n---\n\n').slice(0, 10000);
    const hintNames = docs.map((d) => d.name).join(', ');
    const count = parseInt(numQuestions) || 10;
    const diff = difficulty || 'Trung bình';

    // Bloom Taxonomy integration from main
    const countRecall = Math.floor(count * 0.3);
    const countApply = Math.floor(count * 0.4);
    const countAdvanced = count - countRecall - countApply;

    let formatInstruction = "";
    let jsonFormat = "";

    if (format === "Trắc nghiệm") {
      formatInstruction = `tạo ra một bộ gồm đúng ${count} câu hỏi trắc nghiệm 4 lựa chọn chất lượng bằng tiếng Việt theo định dạng "Trắc nghiệm" dựa trên tài liệu.`;
      jsonFormat = `"options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],\n    "correctIndex": 0,`;
    } else if (format === "Đúng/Sai") {
      formatInstruction = `tạo ra một bộ gồm đúng ${count} câu hỏi Đúng/Sai chất lượng bằng tiếng Việt theo định dạng "Đúng/Sai" dựa trên tài liệu.`;
      jsonFormat = `"options": ["Đúng", "Sai"],\n    "correctIndex": 1,`; // Corrected index for Đúng/Sai usually 0/1
    } else {
      formatInstruction = `tạo ra một bộ gồm đúng ${count} câu hỏi tự luận chất lượng bằng tiếng Việt theo định dạng "Tự luận" dựa trên tài liệu.`;
      jsonFormat = `"options": ["Gợi ý đáp án mẫu chi tiết"],\n    "correctIndex": 0,`;
    }

    const quizPrompt = `Bạn là một chuyên gia giáo dục thiết lập đề kiểm tra thích ứng AI.
Nhiệm vụ của bạn là ${formatInstruction} Độ khó yêu cầu: ${diff}.

NỘI DUNG TÀI LIỆU TRÍCH XUẤT (từ ${hintNames}):
---
${combinedContent || `DO KHÔNG CÓ NỘI DUNG TRỰC TIẾP, HÃY DỰA VÀO TÊN CÁC TÀI LIỆU: "${hintNames}"`}
---
Yêu cầu: Hãy bám sát nội dung trên để tạo câu hỏi phù hợp với độ khó ${diff}.

YÊU CẦU PHÂN BỔ NHẬN THỨC (BẮT BUỘC):
- Mức 1 - Nhận biết (Recall): ${countRecall} câu
- Mức 2 - Vận dụng (Application): ${countApply} câu
- Mức 3 - Nâng cao (Advanced): ${countAdvanced} câu
Thêm trường "level" với giá trị "Nhận biết", "Vận dụng", hoặc "Nâng cao".

Định dạng phản hồi bắt buộc (mảng JSON thuần):
[
  {
    "question": "Nội dung câu hỏi...",
    ${jsonFormat}
    "explanation": "Giải thích chi tiết...",
    "level": "Nhận biết"
  }
]
Không được chứa bất kỳ text nào ngoài mảng JSON.`;

    const result = await callAI(
      quizPrompt,
      "You are an educational AI assistant. You MUST respond with ONLY a valid JSON array of question objects, no markdown, no explanation, no code fences — just the raw JSON array starting with [ and ending with ].",
      { max_tokens: 4000 },
    );

    // Deduct credits on success (Cost: 5)
    await validateAndDeduct(req.user.id, 5, 'Generate Quiz', {
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      model: 'gpt-5'
    });

    res.json({ text: result.content, hintNames });
  } catch (error) {
    console.error('AI Generate Quiz error:', error);
    res.status(error.message.includes('Credit') ? 402 : 500).json({ message: error.message });
  }
};

// @desc  Tạo đối thoại AI (6 câu thoại)
// @route POST /api/ai/generate-dialogue
const generateDialogue = async (req, res) => {
  try {
    const { documentId, language, speakerFemaleName, speakerMaleName } = req.body;
    if (!documentId) return res.status(400).json({ message: 'Thiếu documentId' });

    const doc = await Document.findOne({ _id: documentId, user: req.user.id });
    if (!doc) return res.status(404).json({ message: 'Không tìm thấy tài liệu' });

    // Step 1: Check credit (Cost: 6 - 1 for each turn generated)
    await validateAndDeduct(req.user.id, 6, 'Chat AI', { checkOnly: true });

    const prompt = `Tạo một kịch bản đối thoại gồm đúng 6 câu thoại xoay quanh nội dung của tài liệu "${doc.name}".
    Ngôn ngữ: ${language}.
    Nhân vật Nữ: ${speakerFemaleName} (speaker: female).
    Nhân vật Nam: ${speakerMaleName} (speaker: male).
    Phản hồi DUY NHẤT một mảng JSON các object {id, speaker, speakerName, text}.`;

    // Step 2: Call AI
    const result = await callAI(
      prompt,
      'You are an educational AI assistant that outputs structured valid JSON arrays containing dialogues.',
      { max_tokens: 2000 }
    );

    // Step 3: Deduct credits on success
    await validateAndDeduct(req.user.id, 6, 'Chat AI', {
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      model: 'gpt-5'
    });

    res.json({ dialogue: result.content });
  } catch (error) {
    console.error('AI Generate Dialogue error:', error);
    res.status(error.message.includes('Credit') ? 402 : 500).json({ message: error.message });
  }
};

module.exports = { summarizeDocument, generateQuiz, generateDialogue, generateSummaryFromText };
