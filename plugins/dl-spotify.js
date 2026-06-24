import axios from 'axios'
import {
    getUrlBuffer,
    generateWAMessageContent
} from 'baileys_helpers'

let handler = async (m, { conn, args, usedPrefix, command }) => {
    if (!args[0]) {
        throw `*Contoh:* ${usedPrefix}${command} https://open.spotify.com/track/xxxxx`
    }

    await m.reply('🔍 Sedang memproses...')

    try {
        const data = await spotifydl(args[0])

        console.log(JSON.stringify(data, null, 2))
        if (!data?.status) {
            throw new Error(data?.message || 'Download gagal')
        }

        const r = data.result

        const thumb = await getUrlBuffer(r.thumbnail)
        await conn.sendMessage(m.chat, {
            text:
        `🎵 *Spotify Downloader*

        📀 ${r.title}
        👤 ${r.artist}
        ⏱ ${(r.duration / 1000).toFixed(0)} detik

        ⬇️ Sedang mengunggah audio...`,
            contextInfo: {
                externalAdReply: {
                    title: r.title,
                    body: r.artist,
                    thumbnailUrl: thumb,
                    sourceUrl: r.spotify,
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: false
                }
            }
        }, { quoted: m });

        await sendSpotify(conn, m.chat, m, r);

    } catch (e) {
        await m.reply(`❌ Gagal: ${e.message}`)
    }
}

handler.help = ['spotify']
handler.tags = ['downloader']
handler.command = /^(spotify)$/i
handler.limit = true

export default handler

async function spotifydl(spotifyUrl) {
    const api_base = 'https://ravaja.my.id/api/download/spotify/v18'

    try {
        const response = await axios.get(api_base, {
            params: {
                url: spotifyUrl,
                apikey: 'ravaja'
            },
            timeout: 30000
        })

        const data = response.data

        if (!data || typeof data !== 'object') {
            throw new Error('Response API tidak valid')
        }

        if (data.status !== 200) {
            throw new Error(`API Error (${data.status})`)
        }

        if (!data.result?.status) {
            throw new Error(data.result?.message || 'Download gagal')
        }

        const result = data.result
        const metadata = result.metadata || {}

        if (!result.result) {
            throw new Error('Audio tidak ditemukan')
        }

        return {
            status: true,
            result: {
                audio: result.result,
                title: metadata.name || '',
                artist: metadata.artists?.map(v => v.name).join(', ') || '',
                thumbnail: metadata.album?.images?.[0]?.url || '',
                duration: metadata.duration_ms || 0,
                spotify: metadata.external_urls?.spotify || spotifyUrl
            }
        }

    } catch (err) {
        return {
            status: false,
            message: err.message
        }
    }
}

async function sendSpotify(conn, chat, m, r) {
    try {
        await conn.sendMessage(chat, {
            audio: {
                url: r.audio
            },
            mimetype: 'audio/mpeg',
            fileName: `${r.title}.mp3`,
            ptt: false
        }, { quoted: m })

        return true

    } catch (e) {
        console.error('Audio failed, fallback document')

        await conn.sendMessage(chat, {
            document: {
                url: r.audio
            },
            mimetype: 'audio/mpeg',
            fileName: `${r.title}.mp3`,
            caption:
`🎵 ${r.title}

👤 ${r.artist}`
        }, { quoted: m })

        return false
    }
}