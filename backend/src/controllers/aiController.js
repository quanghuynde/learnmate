const Document = require('../models/Document');

// Helper: call OpenAI-compatible API
async function callAI(prompt, systemPrompt = null, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  const apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'openai/gpt-4o-mini';

  if (!apiKey) throw new Error('OPENAI_API_KEY chưa được cấu hình trong backend .env');

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const body = {
    model,
    messages,
    max_tokens: options.max_tokens || 2000,
    ...(options.response_format ? { response_format: options.response_format } : {}),
  };

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    let errJson = {};
    try {
      errJson = JSON.parse(errText || '{}');
    } catch (_) {
      errJson = {};
    }
    throw new Error(errJson?.error?.message || errText || `AI API lỗi HTTP ${response.status}`);
  }

  const raw = await response.text();
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch (_) {
    // Support SSE style responses, e.g. "data: {...}"
    const chunks = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.replace(/^data:\s*/, ''))
      .filter((line) => line && line !== '[DONE]')
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);

    if (!chunks.length) {
      throw new Error('Phản hồi AI không hợp lệ (không parse được JSON/SSE)');
    }

    return chunks
      .map((chunk) => chunk.choices?.[0]?.delta?.content || chunk.choices?.[0]?.message?.content || '')
      .join('');
  }

  return data?.choices?.[0]?.message?.content || '';
}

// @desc  TÃ³m táº¯t tÃ i liá»‡u
// @route POST /api/ai/summarize
// @access Private
const summarizeDocument = async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) {
      return res.status(400).json({ message: 'Thiáº¿u documentId' });
    }

    const doc = await Document.findOne({ _id: documentId, user: req.user.id });
    if (!doc) {
      return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y tÃ i liá»‡u' });
    }

    const prompt = `TÃ³m táº¯t chi tiáº¿t nhÆ°ng sÃºc tÃ­ch ná»™i dung cá»§a tÃ i liá»‡u (tÃ i liá»‡u nÃ y lÃ  gÃ¬, chá»§ Ä‘á», nhá»¯ng Ä‘iá»ƒm chÃ­nh): "${doc.name}"\n\nNá»™i dung trÃ­ch xuáº¥t:\n${doc.content ? doc.content.substring(0, 10000) : 'KhÃ´ng cÃ³ ná»™i dung'}`;

    const summary = await callAI(prompt, null, { max_tokens: 1500 });

    res.json({ summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Táº¡o cÃ¢u há»i quiz tá»« nhiá»u tÃ i liá»‡u
// @route POST /api/ai/generate-quiz
// @access Private
const generateQuiz = async (req, res) => {
  try {
    const { documentIds, format, numQuestions, difficulty } = req.body;

    if (!documentIds || !documentIds.length) {
      return res.status(400).json({ message: 'Thiáº¿u documentIds' });
    }

    // Load documents belonging to this user
    const docs = await Document.find({
      _id: { $in: documentIds },
      user: req.user.id,
    });

    if (!docs.length) {
      return res.status(404).json({ message: 'KhÃ´ng tÃ¬m tháº¥y tÃ i liá»‡u' });
    }

    const combinedContent = docs
      .map((d) => d.content || '')
      .join('\n\n---\n\n')
      .slice(0, 20000);
    const hintNames = docs.map((d) => d.name).join(', ');

    const count = parseInt(numQuestions) || 10;
    const diff = difficulty || 'Trung bÃ¬nh';

    const countRecall = Math.round(count * 0.5);
    const countApply = Math.round(count * 0.4);
    const countAdvanced = count - countRecall - countApply;

    let formatInstruction = '';
    let jsonFormat = '';

    if (format === 'Tráº¯c nghiá»‡m') {
      formatInstruction = `táº¡o ra má»™t bá»™ gá»“m Ä‘Ãºng ${count} cÃ¢u há»i tráº¯c nghiá»‡m 4 lá»±a chá»n cháº¥t lÆ°á»£ng báº±ng tiáº¿ng Viá»‡t theo Ä‘á»‹nh dáº¡ng "Tráº¯c nghiá»‡m" dá»±a trÃªn tÃ i liá»‡u.`;
      jsonFormat = `"options": ["Lá»±a chá»n A", "Lá»±a chá»n B", "Lá»±a chá»n C", "Lá»±a chá»n D"],\n    "correctIndex": 0,`;
    } else if (format === 'ÄÃºng/Sai') {
      formatInstruction = `táº¡o ra má»™t bá»™ gá»“m Ä‘Ãºng ${count} cÃ¢u há»i ÄÃºng/Sai cháº¥t lÆ°á»£ng báº±ng tiáº¿ng Viá»‡t theo Ä‘á»‹nh dáº¡ng "ÄÃºng/Sai" dá»±a trÃªn tÃ i liá»‡u.`;
      jsonFormat = `"options": ["ÄÃºng", "Sai"],\n    "correctIndex": 0,`;
    } else {
      formatInstruction = `táº¡o ra má»™t bá»™ gá»“m Ä‘Ãºng ${count} cÃ¢u há»i tá»± luáº­n cháº¥t lÆ°á»£ng báº±ng tiáº¿ng Viá»‡t theo Ä‘á»‹nh dáº¡ng "Tá»± luáº­n" dá»±a trÃªn tÃ i liá»‡u.`;
      jsonFormat = `"options": ["Gá»£i Ã½ Ä‘Ã¡p Ã¡n máº«u chi tiáº¿t"],\n    "correctIndex": 0,`;
    }

    const prompt = `Báº¡n lÃ  má»™t chuyÃªn gia giÃ¡o dá»¥c thiáº¿t láº­p Ä‘á» kiá»ƒm tra thÃ­ch á»©ng AI.
Nhiá»‡m vá»¥ cá»§a báº¡n lÃ  ${formatInstruction} Äá»™ khÃ³ yÃªu cáº§u: ${diff}.

Ná»˜I DUNG TÃ€I LIá»†U TRÃCH XUáº¤T (tá»« ${hintNames}):
---
${combinedContent || `DO KHÃ”NG CÃ“ Ná»˜I DUNG TRá»°C TIáº¾P, HÃƒY Dá»°A VÃ€O TÃŠN CÃC TÃ€I LIá»†U: "${hintNames}"`}
---
YÃªu cáº§u: HÃ£y bÃ¡m sÃ¡t ná»™i dung trÃªn Ä‘á»ƒ táº¡o cÃ¢u há»i phÃ¹ há»£p vá»›i Ä‘á»™ khÃ³ ${diff}.

YÃŠU Cáº¦U PHÃ‚N Bá»” NHáº¬N THá»¨C (Báº®T BUá»˜C):
- Má»©c 1 â€“ Nháº­n biáº¿t (Recall): ${countRecall} cÃ¢u
- Má»©c 2 â€“ Váº­n dá»¥ng (Application): ${countApply} cÃ¢u
- Má»©c 3 â€“ NÃ¢ng cao (Advanced): ${countAdvanced} cÃ¢u
ThÃªm trÆ°á»ng "level" vá»›i giÃ¡ trá»‹ "Nháº­n biáº¿t", "Váº­n dá»¥ng", hoáº·c "NÃ¢ng cao".

Äá»‹nh dáº¡ng pháº£n há»“i báº¯t buá»™c (máº£ng JSON thuáº§n):
[
  {
    "question": "Ná»™i dung cÃ¢u há»i...",
    ${jsonFormat}
    "explanation": "Giáº£i thÃ­ch chi tiáº¿t...",
    "level": "Nháº­n biáº¿t"
  }
]
KhÃ´ng Ä‘Æ°á»£c chá»©a báº¥t ká»³ text nÃ o ngoÃ i máº£ng JSON.`;

    const textResponse = await callAI(
      prompt,
      'You are an educational AI assistant that outputs structured valid JSON arrays containing questions.',
      { max_tokens: 4000, response_format: { type: 'json_object' } }
    );

    res.json({ text: textResponse, hintNames });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { summarizeDocument, generateQuiz };

