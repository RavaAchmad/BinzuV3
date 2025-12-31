import fetch from 'node-fetch';
import axios from 'axios';

// ============================================================
// YOUTUBE SCRAPER - EZCONV
// ============================================================

async function downloadYoutubeShort(videoUrl) {
    try {
        const cfApiUrl = 'https://api.nekolabs.web.id/tools/bypass/cf-turnstile';
        const cfPayload = {
            url: 'https://ezconv.cc',
            siteKey: '0x4AAAAAAAi2NuZzwS99-7op'
        };
        
        const { data: cfResponse } = await axios.post(cfApiUrl, cfPayload);
        
        if (!cfResponse.success || !cfResponse.result) {
            return {
                success: false,
                error: 'No se pudo obtener el token de captcha'
            };
        }
        
        const captchaToken = cfResponse.result;
        
        const convertApiUrl = 'https://ds1.ezsrv.net/api/convert';
        const convertPayload = {
            url: videoUrl,
            quality: '320',
            trim: false,
            startT: 0,
            endT: 0,
            captchaToken: captchaToken
        };
        
        const { data: convertResponse } = await axios.post(convertApiUrl, convertPayload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (convertResponse.status !== 'done') {
            return {
                success: false,
                error: `La conversión falló. Estado: ${convertResponse.status}`
            };
        }
        
        return {
            success: true,
            data: {
                title: convertResponse.title,
                downloadUrl: convertResponse.url,
                status: convertResponse.status
            }
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.response?.data ? error.response.data : error.message
        };
    }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) throw `*Example:* ${usedPrefix + command} https://www.youtube.com/watch?v=Z28dtg_QmFw`;
  m.reply(wait)
  try {
    let result;
    
    // PRIMARY: EZCONV Scraper
    console.log('[YTA] Trying EZCONV scraper...');
    const scraperResult = await downloadYoutubeShort(text);
    
    if (scraperResult.success && scraperResult.data.downloadUrl) {
      console.log('[YTA] EZCONV scraper success');
      result = {
        status: true,
        result: {
          mp3: scraperResult.data.downloadUrl
        }
      };
    } else {
      // SECONDARY: Fallback API
      console.log('[YTA] Trying fallback API...');
      const response = await fetch(`https://api.botcahx.eu.org/api/dowloader/yt?url=${encodeURIComponent(text)}&apikey=${btc}`);
      result = await response.json();
    }

    if (result.status && result.result && result.result.mp3) {
      await conn.sendMessage(m.chat, { 
        audio: { url: result.result.mp3 }, 
        mimetype: 'audio/mpeg' 
      }, { quoted: m });
    } else {
      throw 'Error: Unable to fetch audio';
    }
  } catch (error) {
    throw eror
  }
};

handler.help = handler.command = ['ytmp3', 'yta'];
handler.tags = ['downloader'];
handler.limit = true;

export default handler;