const Document = require("../models/Document");

// Helper: call OpenAI-compatible API
async function callAI(prompt, systemPrompt = null, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const apiBase = process.env.OPENAI_API_BASE || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "openai/gpt-4o-mini";

  if (!apiKey)
    throw new Error("OPENAI_API_KEY chưa được cấu hình trong backend .env");

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
  try {
    data = JSON.parse(raw);
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

    return chunks
      .map(
        (chunk) =>
          chunk.choices?.[0]?.delta?.content ||
          chunk.choices?.[0]?.message?.content ||
          "",
      )
      .join("");
  }

  return data?.choices?.[0]?.message?.content || "";
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
// @access Private
const summarizeDocument = async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) {
      return res.status(400).json({ message: "Thiếu documentId" });
    }

    const doc = await Document.findOne({ _id: documentId, user: req.user.id });
    if (!doc) {
      return res.status(404).json({ message: "Không tìm thấy tài liệu" });
    }

    // 1. Trả về ngay nếu đã có tóm tắt lưu sẵn (và không phải là thông báo lỗi cũ)
    const errorPrefix = "Tài liệu không có đủ nội dung";
    if (doc.summary && !doc.summary.startsWith(errorPrefix)) {
      return res.json({ summary: doc.summary });
    }

    // 2. Nếu chưa có (cho các file cũ), tạo mới và lưu lại
    const summary = await generateSummaryFromText(doc.name, doc.content);

    doc.summary = summary;
    await doc.save();

    res.json({ summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Tạo câu hỏi quiz từ nhiều tài liệu
// @route POST /api/ai/generate-quiz
// @access Private
const generateQuiz = async (req, res) => {
  try {
    const { documentIds, format, numQuestions, difficulty } = req.body;

    if (!documentIds || !documentIds.length) {
      return res.status(400).json({ message: "Thiếu documentIds" });
    }

    // Load documents belonging to this user
    const docs = await Document.find({
      _id: { $in: documentIds },
      user: req.user.id,
    });

    if (!docs.length) {
      return res.status(404).json({ message: "Không tìm thấy tài liệu" });
    }

    const combinedContent = docs
      .map((d) => d.content || "")
      .join("\n\n---\n\n")
      .slice(0, 10000);
    const hintNames = docs.map((d) => d.name).join(", ");

    const count = parseInt(numQuestions) || 10;
    const diff = difficulty || "Trung bình";

    const countRecall = Math.round(count * 0.5);
    const countApply = Math.round(count * 0.4);
    const countAdvanced = count - countRecall - countApply;

    let formatInstruction = "";
    let jsonFormat = "";

    if (format === "Trắc nghiệm") {
      formatInstruction = `tạo ra một bộ gồm đúng ${count} câu hỏi trắc nghiệm 4 lựa chọn chất lượng bằng tiếng Việt theo định dạng "Trắc nghiệm" dựa trên tài liệu.`;
      jsonFormat = `"options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],\n    "correctIndex": 0,`;
    } else if (format === "Đúng/Sai") {
      formatInstruction = `tạo ra một bộ gồm đúng ${count} câu hỏi Đúng/Sai chất lượng bằng tiếng Việt theo định dạng "Đúng/Sai" dựa trên tài liệu.`;
      jsonFormat = `"options": ["Đúng", "Sai"],\n    "correctIndex": 0,`;
    } else {
      formatInstruction = `tạo ra một bộ gồm đúng ${count} câu hỏi tự luận chất lượng bằng tiếng Việt theo định dạng "Tự luận" dựa trên tài liệu.`;
      jsonFormat = `"options": ["Gợi ý đáp án mẫu chi tiết"],\n    "correctIndex": 0,`;
    }

    const prompt = `Bạn là một chuyên gia giáo dục thiết lập đề kiểm tra thích ứng AI.
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

    const textResponse = await callAI(
      prompt,
      "You are an educational AI assistant. You MUST respond with ONLY a valid JSON array of question objects, no markdown, no explanation, no code fences — just the raw JSON array starting with [ and ending with ].",
      { max_tokens: 4000 },
    );

    res.json({ text: textResponse, hintNames });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { summarizeDocument, generateQuiz, generateSummaryFromText };
