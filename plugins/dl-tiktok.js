import { binzuDownload } from '../lib/binzu-api.js';
import moment from 'moment-timezone';

let handler = async (m, { conn, args, usedPrefix, text, command }) => {
    if (!args || !args[0]) throw `✳️ Contoh :\n${usedPrefix + command} https://www.tiktok.com/xxxxx`
    if (!(args[0].includes('http://') || args[0].includes('https://'))) return m.reply('URL invalid, masukkan URL yang valid.')
    if (!args[0].includes('tiktok.com')) return m.reply('URL TikTok tidak valid.')

    await conn.sendMessage(m.chat, { react: { text: '⚡', key: m.key } })

    switch (command) {
        case 'tt':
        case 'ttv': {
            try {
                const data = await binzuDownload('tiktok', text)
                const r = data.result
                const images = r?.images || r?.image_post || r?.slides || []
                if (Array.isArray(images) && images.length > 0) {
                    await m.reply(`🖼️ Terdeteksi ${images.length} gambar`)
                    for (const img of images) {
                        const imgUrl = typeof img === 'string' ? img : img.url || img.src
                        if (imgUrl) await conn.sendMessage(m.chat, { image: { url: imgUrl }, caption: r.title || '' }, { quoted: m })
                    }
                    return
                }
                const videoUrl = r?.play || r?.hdplay || r?.wmplay || r?.video || r?.url || r?.download?.video
                if (!videoUrl) throw 'Video URL tidak ditemukan'
                const time = r.create_time ? moment.unix(r.create_time).tz('Asia/Jakarta').format('dddd, D MMMM YYYY [pukul] HH:mm:ss') : '-'
                const caption = `🎬 *TikTok Download*\n\n✨ *Judul* : ${r.title || '-'}\n⏳ *Durasi* : ${r.duration || '-'} detik\n📅 *Upload* : ${time}\n\n👀 ${formatK(r.play_count || 0)} views • ❤️ ${formatK(r.digg_count || 0)} likes\n💬 ${formatK(r.comment_count || 0)} komentar\n\n🧑‍🎤 @${r.author?.unique_id || '-'}`
                await conn.sendMessage(m.chat, { video: { url: videoUrl }, caption }, { quoted: m })
            } catch (e) {
                console.log('TikTok error:', e.message)
                m.reply('❌ Gagal download TikTok: ' + e.message)
            }
            break
        }
        case 'tta': {
            try {
                const data = await binzuDownload('tiktok', text)
                const r = data.result
                const musicUrl = r?.music || r?.music_info?.play || r?.audio || r?.download?.audio
                if (!musicUrl) throw 'Audio tidak ditemukan'
                await conn.sendMessage(m.chat, { audio: { url: musicUrl }, mimetype: 'audio/mpeg' }, { quoted: m })
            } catch (e) {
                m.reply('❌ Gagal download audio: ' + e.message)
            }
            break
        }
    }
}

handler.command = ['ttv', 'tta', 'tt'];
handler.xmaze = true;
handler.limit = true;
export default handler

function formatK(num) {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num)
}
