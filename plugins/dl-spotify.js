import axios from 'axios'

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

        await conn.sendMessage(m.chat, {
            audio: {
                url: r.audio
            },
            mimetype: 'audio/mpeg',
            fileName: `${r.title}.mp3`,
            contextInfo: {
                externalAdReply: {
                    title: r.title,
                    body: r.artist,
                    thumbnailUrl: r.thumbnail,
                    sourceUrl: r.spotify,
                    mediaType: 2,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })

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