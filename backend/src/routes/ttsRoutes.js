const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

/**
 * GET /api/tts
 * Parameters:
 *  - text: The text to speak
 *  - lang: Language code, e.g. 'vi', 'en', 'fr', 'ja', 'ko' (defaults to 'vi')
 *  - speaker: Optional speaker keyword (e.g. 'male', 'female')
 */
router.get('/', async (req, res, next) => {
  try {
    const text = req.query.text;
    const lang = req.query.lang || 'vi';
    const speaker = req.query.speaker || 'female';

    if (!text) {
      return res.status(400).json({ message: 'Thiếu nội dung text cần đọc' });
    }

    const cleanText = text.trim();
    let langCode = lang.toLowerCase();
    if (langCode.startsWith('vi')) {
      langCode = 'vi';
    }

    // ==========================================
    // 1. ELEVENLABS TTS API INTEGRATION
    // (Active if ELEVENLABS_API_KEY is configured in backend/.env)
    // ==========================================
    if (process.env.ELEVENLABS_API_KEY) {
      console.log('Using ElevenLabs TTS engine...');
      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
      
      // Map voices (ElevenLabs voice IDs)
      // Defaults to natural Vietnamese-capable female/male voices
      const voiceId = speaker === 'male' 
        ? (process.env.ELEVENLABS_VOICE_MALE || 'N2lVS1wZa5z9cNhpc84w') // Liam
        : (process.env.ELEVENLABS_VOICE_FEMALE || 'EXAVITQu4vr4xnSDxMaL'); // Bella

      const postData = JSON.stringify({
        text: cleanText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      });

      const options = {
        hostname: 'api.elevenlabs.io',
        path: `/v1/text-to-speech/${voiceId}`,
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsApiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const elevenReq = https.request(options, (elevenRes) => {
        if (elevenRes.statusCode === 200) {
          res.setHeader('Content-Type', 'audio/mpeg');
          return elevenRes.pipe(res);
        } else {
          console.error(`ElevenLabs returned status: ${elevenRes.statusCode}`);
          // Fallback to free Google proxy
          return fallbackToFreeProxy(cleanText, langCode, res, next);
        }
      });

      elevenReq.on('error', (err) => {
        console.error('ElevenLabs request error, falling back...', err);
        fallbackToFreeProxy(cleanText, langCode, res, next);
      });

      elevenReq.write(postData);
      elevenReq.end();
      return;
    }

    // ==========================================
    // 2. FPT.AI / VBEE / AZURE CUSTOM IMPLEMENTATION HOOKS
    // Feel free to configure these when you have key certificates.
    // ==========================================
    // (Add custom routing here if needed)

    // ==========================================
    // 3. SECURE SERVER-SIDE FREE CLOUD PROXY (No API Key Required)
    // Resolves all CORS / Referrer blocks natively from the server side!
    // ==========================================
    return fallbackToFreeProxy(cleanText, langCode, res, next);

  } catch (err) {
    next(err);
  }
});

const googleTTS = require('google-tts-api');

function fallbackToFreeProxy(text, langCode, res, next) {
  console.log(`TTS Server Proxy: Routing request for [${langCode}] using google-tts-api...`);

  // google-tts-api automatically handles chunking for text > 200 chars and bypasses browser blocks!
  googleTTS.getAllAudioBase64(text, {
    lang: langCode,
    slow: false,
    host: 'https://translate.google.com',
    splitPunct: ',.?',
    timeout: 10000,
  })
  .then(results => {
    // results is an array of objects containing the base64 chunks
    const buffers = results.map(res => Buffer.from(res.base64, 'base64'));
    const audioBuffer = Buffer.concat(buffers);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.send(audioBuffer);
  })
  .catch(err => {
    console.error('Server-side TTS proxy failed:', err);
    res.status(500).json({ message: 'Không thể tạo giọng nói từ Google Translate.' });
  });
}

module.exports = router;
