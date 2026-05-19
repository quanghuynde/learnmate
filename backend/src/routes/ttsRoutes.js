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
    const langCode = lang.split('-')[0].toLowerCase();

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

// Helper function to call Youdao or Google TTS securely server-side
function fallbackToFreeProxy(text, langCode, res, next) {
  // Use Youdao as primary proxy as it has superb response speed and no limits
  const isVi = langCode === 'vi';
  const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&le=${langCode === 'en' ? 'eng' : langCode}`;
  
  // Use Google Translate TTS as backup
  const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(text)}`;

  console.log(`TTS Server Proxy: Routing request for [${langCode}] using Youdao TTS...`);

  const requestUrl = isVi ? youdaoUrl : googleUrl; // Youdao has amazing Vietnamese accents

  https.get(requestUrl, (apiRes) => {
    if (apiRes.statusCode === 200) {
      res.setHeader('Content-Type', 'audio/mpeg');
      return apiRes.pipe(res);
    } else {
      console.warn(`Primary proxy failed (${apiRes.statusCode}), falling back to Google Translate...`);
      // Try Google Translate
      https.get(googleUrl, (googleRes) => {
        if (googleRes.statusCode === 200) {
          res.setHeader('Content-Type', 'audio/mpeg');
          return googleRes.pipe(res);
        } else {
          return res.status(500).json({ message: 'Tất cả các cổng TTS đám mây đều bận. Vui lòng thử lại sau.' });
        }
      }).on('error', (err) => next(err));
    }
  }).on('error', (err) => {
    console.error('Server-side TTS proxy failed:', err);
    next(err);
  });
}

module.exports = router;
