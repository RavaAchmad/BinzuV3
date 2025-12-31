import fetch from 'node-fetch';
import axios from 'axios';
import cheerio from 'cheerio';
import moment from 'moment-timezone';
import FormData from "form-data";

let handler = async (m, { conn, args, usedPrefix, text, command }) => {
    var delay = time => new Promise(res => setTimeout(res, time))
    if (!args || !args[0]) throw `✳️ Contoh :\n${usedPrefix + command} https://www.tiktok.com/xxxxx`
    if (!(args[0].includes('http://') || args[0].includes('https://'))) return m.reply(`url invalid, please input a valid url. Try with add http:// or https://`)
    if (!args[0].includes('tiktok.com')) return m.reply(`Invalid Tiktok URL.`)

    await conn.sendMessage(m.chat, {
        react: {
            text: "⚡",
            key: m.key,
        }
    })
    var body = text.replace(/\s+/g, '+')
    switch (command) {
        case 'tt':
        case 'ttv':

 try {
    let res
    let images = []

    const dataV1 = await tiktokV1(text)
    if (dataV1?.data) {
      const d = dataV1.data
      if (Array.isArray(d.images) && d.images.length > 0) {
        images = d.images
      } else if (Array.isArray(d.image_post) && d.image_post.length > 0) {
        images = d.image_post
      }
      res = {
        title: d.title,
        region: d.region,
        duration: d.duration,
        create_time: d.create_time,
        play_count: d.play_count,
        digg_count: d.digg_count,
        comment_count: d.comment_count,
        share_count: d.share_count,
        download_count: d.download_count,
        author: {
          unique_id: d.author?.unique_id,
          nickname: d.author?.nickname
        },
        music_info: {
          title: d.music_info?.title,
          author: d.music_info?.author
        },
        cover: d.cover,
        play: d.play,
        hdplay: d.hdplay,
        wmplay: d.wmplay
      }
    }

    const dataV2 = await tiktokV2(text)
    if ((!res?.play && images.length === 0) && dataV2.video_url) {
      res = res || { play: dataV2.video_url }
    }
    if (Array.isArray(dataV2.slide_images) && dataV2.slide_images.length > 0) {
      images = dataV2.slide_images
    }

    if (images.length > 0) {
      await m.reply(`terdeteksi gambar ${images.length} wett`)
      for (const img of images) {
        await conn.sendMessage(m.chat, {
          image: { url: img },
          caption: res.title || ''
        }, { quoted: m })
      }
      return
    }

const time = res.create_time
  ? moment.unix(res.create_time).tz('Asia/Jakarta').format('dddd, D MMMM YYYY [pukul] HH:mm:ss')
  : '-'

const caption = `🎬 *Video TikTok Info*  

✨ *Judul*      : ${res.title || '-'}  
🌍 *Region*     : ${res.region || 'N/A'}  
⏳ *Durasi*     : ${res.duration || '-'} detik  
📅 *Upload*     : ${time}  

───────────────  
📊 *Statistik*  
👀 *Views*      : ${formatK(res.play_count || 0)}  
❤️ *Likes*      : ${formatK(res.digg_count || 0)}  
💬 *Komentar*   : ${formatK(res.comment_count || 0)}  
🔗 *Share*      : ${formatK(res.share_count || 0)}  
⬇️ *Downloads*  : ${formatK(res.download_count || 0)}  

───────────────  
🧑‍🎤 *Author*  
🔖 *Username*   : ${res.author?.unique_id || '-'}  
💎 *Nama*       : ${res.author?.nickname || '-'}  
`

const videoUrl = res.play || res.hdplay || res.wmplay
if (videoUrl) {
  await conn.sendMessage(m.chat, { video: { url: videoUrl }, caption }, { quoted: m })
} else if (res.cover) {
  await conn.sendMessage(m.chat, { image: { url: res.cover }, caption: '🎨 Cover Video' }, { quoted: m })
}
  } catch (e) {
    console.log(`Eror kak : ${e.message}`)
            try {
                const response = await axios.get(`https://api.botcahx.eu.org/api/dowloader/tiktok?url=${text}&apikey=${btc}`);
                const res = await response.data.result;
                if (res) {
                    var { video, title, title_audio, audio } = res;

                    const videoUrl = Array.isArray(video) ? video[0] : video;
                    let isVideo = false;

                    try {
                        const contentCheck = await axios.head(videoUrl);
                        const contentType = contentCheck.headers['content-type'];
                        isVideo = contentType && (contentType.includes('video/') || contentType.includes('application/octet-stream'));
                    } catch (verifyError) {
                        console.log('Content verification failed:', verifyError);
                    }

                    let capt = `乂 *T I K T O K*\n\n`;
                    capt += `◦ *Title* : ${title || 'No Title'}\n`;
                    capt += `◦ *Audio* : ${title_audio || 'No Audio Title'}\n\n`;

                    if (isVideo) {
                        await conn.sendFile(m.chat, videoUrl, null, capt, m);
                    } else {
                        if (Array.isArray(video)) {
                            await conn.sendFile(m.chat, video[0], null, capt, m);
                            for (let i = 1; i < video.length; i++) {
                                await conn.sendFile(m.chat, video[i], null, '', m);
                            }
                        } else {
                            await conn.sendFile(m.chat, video, null, capt, m);
                        }
                    }

                    if (audio && audio[0]) {
                        conn.sendMessage(m.chat, { audio: { url: audio[0] }, mimetype: 'audio/mpeg' }, { quoted: m });
                    }
                }
            } catch (e) {
                console.log(e);
                m.reply('❌ Error: Failed to process TikTok download');
            }
        }
            break;
        case 'tta':
            try {
                const response = await fetch(`https://zenzxz.dpdns.org/downloader/tiktok?url=${args[0]}`, {
                    method: 'GET',
                });
                const data = await response.json();

                const musicUrl = data.result?.data?.music;
                await conn.sendMessage(m.chat, {
                    audio: { url: musicUrl },
                }, { quoted: m });
            } catch (e) {
                console.log(e);
                m.reply('Silahkan pilih video saja kak, lalu ketik commannd ".tomp4" pada video tersebut');
            }
            break;
    }
}

handler.command = ['ttv', 'tta', 'tt'];
handler.xmaze = true;
handler.limit = true;
export default handler

function formatK(num) {
    return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(num)
}

async function tiktokV1(query) {
  const encodedParams = new URLSearchParams()
  encodedParams.set('url', query)
  encodedParams.set('hd', '1')

  const { data } = await axios.post('https://tikwm.com/api/', encodedParams, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Cookie: 'current_language=en',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
    }
  })

  return data
}

async function tiktokV2(query) {
  const form = new FormData()
  form.append('q', query)

  const { data } = await axios.post('https://savetik.co/api/ajaxSearch', form, {
    headers: {
      ...form.getHeaders(),
      'Accept': '*/*',
      'Origin': 'https://savetik.co',
      'Referer': 'https://savetik.co/en2',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })

  const rawHtml = data.data
  const $ = cheerio.load(rawHtml)
  const title = $('.thumbnail .content h3').text().trim()
  const thumbnail = $('.thumbnail .image-tik img').attr('src')
  const video_url = $('video#vid').attr('data-src')

  const slide_images = []
  $('.photo-list .download-box li').each((_, el) => {
    const imgSrc = $(el).find('.download-items__thumb img').attr('src')
    if (imgSrc) slide_images.push(imgSrc)
  })

  return { title, thumbnail, video_url, slide_images }
}