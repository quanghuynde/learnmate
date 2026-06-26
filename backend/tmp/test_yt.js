const axios = require('axios');
const cheerio = require('cheerio');

async function testYoutubeMetadata(url) {
    try {
        console.log('Testing oEmbed...');
        const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const oEmbedRes = await axios.get(oEmbedUrl);
        console.log('oEmbed Title:', oEmbedRes.data.title);
        console.log('oEmbed Author:', oEmbedRes.data.author_name);

        console.log('\nTesting HTML Parsing...');
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        const title = $('meta[property="og:title"]').attr('content') || $('title').text();
        const description = $('meta[property="og:description"]').attr('content');
        
        console.log('HTML Title:', title);
        console.log('HTML Description:', description?.substring(0, 200) + '...');
    } catch (err) {
        console.error('Error:', err.message);
    }
}

const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
testYoutubeMetadata(url);
