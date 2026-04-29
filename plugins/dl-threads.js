import axios from 'axios'

const API_URL = 'https://ravaja.my.id/api/download/threads/v1'
const API_KEY = 'ravaja'
const MAX_MEDIA_SEND = 10

function isThreadsUrl(url = '') {
    return /^https?:\/\//i.test(url) && /threads\.(com|net)/i.test(url)
}

function trimCaption(text = '') {
    const normalized = String(text || '').trim()
    return normalized.length > 1200 ? normalized.slice(0, 1197) + '...' : normalized
}

function getUrl(item = {}) {
    if (typeof item === 'string') return item
    return item.url || item.link || item.href || item.download_url || item.downloadUrl || ''
}

function getMediaScore(item = {}) {
    const width = Number(item.width || item.original_width || 0)
    const height = Number(item.height || item.original_height || 0)
    return width * height
}

function pickBestCandidate(candidates = []) {
    return candidates
        .filter(item => getUrl(item))
        .sort((a, b) => getMediaScore(b) - getMediaScore(a))[0] || null
}

function pickBestVideo(media = {}) {
    const candidates = [
        ...(Array.isArray(media.video_versions) ? media.video_versions : []),
        ...(Array.isArray(media.videoVersions) ? media.videoVersions : []),
        media.video_url ? { url: media.video_url } : null,
        media.video ? { url: media.video } : null,
        media.download_url ? { url: media.download_url } : null
    ].filter(Boolean)

    return pickBestCandidate(candidates)
}

function pickBestImage(media = {}) {
    const candidates = [
        ...(Array.isArray(media.image_versions2?.candidates) ? media.image_versions2.candidates : []),
        ...(Array.isArray(media.image_versions?.candidates) ? media.image_versions.candidates : []),
        ...(Array.isArray(media.images) ? media.images : []),
        media.image ? { url: media.image } : null,
        media.thumbnail_url ? { url: media.thumbnail_url } : null,
        media.display_url ? { url: media.display_url } : null
    ].filter(Boolean)

    return pickBestCandidate(candidates)
}

function extractMediaFromItem(item = {}) {
    const video = pickBestVideo(item)
    if (video) {
        return {
            type: 'video',
            url: getUrl(video),
            width: video.width,
            height: video.height
        }
    }

    const image = pickBestImage(item)
    if (image) {
        return {
            type: 'image',
            url: getUrl(image),
            width: image.width,
            height: image.height
        }
    }

    const directUrl = getUrl(item)
    if (!directUrl) return null

    const isVideo = /\.(mp4|mov|webm)(\?|$)/i.test(directUrl) || item.type === 'video'
    return {
        type: isVideo ? 'video' : 'image',
        url: directUrl
    }
}

function collectPosts(result = {}) {
    if (Array.isArray(result?.thread_items)) {
        return result.thread_items.map(item => item?.post).filter(Boolean)
    }
    if (Array.isArray(result?.items)) {
        return result.items.map(item => item?.post || item).filter(Boolean)
    }
    if (result?.post) return [result.post]
    if (Array.isArray(result)) return result
    return [result].filter(item => item && typeof item === 'object')
}

function collectMedia(posts = [], result = {}) {
    const media = []
    const seen = new Set()

    const pushMedia = item => {
        const parsed = extractMediaFromItem(item)
        if (!parsed?.url || seen.has(parsed.url)) return
        seen.add(parsed.url)
        media.push(parsed)
    }

    for (const post of posts) {
        if (Array.isArray(post.carousel_media)) {
            post.carousel_media.forEach(pushMedia)
        }
        if (Array.isArray(post.media)) {
            post.media.forEach(pushMedia)
        }
        pushMedia(post)
    }

    const fallbackMedia = [
        ...(Array.isArray(result.media) ? result.media : []),
        ...(Array.isArray(result.images) ? result.images.map(url => typeof url === 'string' ? { image: url } : url) : []),
        ...(Array.isArray(result.videos) ? result.videos.map(url => typeof url === 'string' ? { video: url } : url) : []),
        result.image ? { image: result.image } : null,
        result.video ? { video: result.video } : null,
        result.url ? { url: result.url } : null,
        result.download ? { url: result.download } : null
    ].filter(Boolean)

    fallbackMedia.forEach(pushMedia)
    return media
}

function getPostText(posts = [], result = {}) {
    for (const post of posts) {
        const text = post?.caption?.text ||
            post?.caption ||
            post?.text ||
            post?.text_post_app_info?.text ||
            post?.accessibility_caption
        if (typeof text === 'string' && text.trim()) return text.trim()
    }

    return String(result?.text || result?.caption || '').trim()
}

function getAuthor(posts = [], result = {}) {
    const user = posts.find(post => post?.user)?.user || result?.user || {}
    return user.username || user.full_name || user.name || ''
}

function extractThreadsResult(data) {
    const candidates = [
        data?.result,
        data?.data?.result,
        data?.data,
        data?.response?.result,
        data?.response,
        data
    ]

    return candidates.find(item => item && typeof item === 'object') || null
}

async function getThreadsMedia(url) {
    const { data } = await axios.get(API_URL, {
        params: {
            apikey: API_KEY,
            url
        },
        timeout: 30000,
        validateStatus: status => status >= 200 && status < 500
    })

    const result = extractThreadsResult(data)
    if (!result || Number(data?.status || data?.code || 200) >= 400) {
        const status = data?.status || data?.code || data?.statusCode || 'unknown'
        throw new Error(data?.message || data?.error || `API tidak mengembalikan result. Status: ${status}`)
    }

    const posts = collectPosts(result)
    const media = collectMedia(posts, result)

    return {
        author: getAuthor(posts, result),
        text: getPostText(posts, result),
        media,
        raw: result
    }
}

async function sendThreadsMedia(conn, m, media, caption) {
    if (media.type === 'video') {
        return conn.sendMessage(m.chat, {
            video: { url: media.url },
            caption
        }, { quoted: m })
    }

    return conn.sendMessage(m.chat, {
        image: { url: media.url },
        caption
    }, { quoted: m })
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const url = args[0]
    if (!url) throw `Gunakan contoh ${usedPrefix}${command} https://www.threads.com/@user/post/xxxxx`
    if (!isThreadsUrl(url)) throw 'Link Threads tidak valid.'

    const statusMsg = await conn.sendMessage(m.chat, {
        text: 'Mencari media Threads...'
    }, { quoted: m })

    try {
        const result = await getThreadsMedia(url)
        const media = result.media.slice(0, MAX_MEDIA_SEND)

        if (!media.length && !result.text) {
            throw new Error('Tidak ditemukan media atau teks dari API.')
        }

        const baseCaption = [
            '*Threads Downloader*',
            result.author ? `Author: @${result.author}` : '',
            media.length ? `Media: ${media.length}${result.media.length > MAX_MEDIA_SEND ? `/${result.media.length}` : ''}` : '',
            '',
            result.text ? trimCaption(result.text) : ''
        ].filter(Boolean).join('\n')

        if (!media.length) {
            await conn.sendMessage(m.chat, {
                text: baseCaption
            }, { quoted: m })
        }

        for (let i = 0; i < media.length; i++) {
            const caption = i === 0
                ? baseCaption
                : `*Threads Downloader*\nMedia ${i + 1}/${media.length}`
            await sendThreadsMedia(conn, m, media[i], caption)
        }

        await conn.sendMessage(m.chat, { delete: statusMsg.key })
    } catch (error) {
        console.error('[Threads-DL Error]', error)

        const errorMessage = [
            'Gagal mengunduh media Threads.',
            '',
            error?.message || String(error),
            '',
            'Kemungkinan:',
            '- Post private/terhapus',
            '- Link tidak valid',
            '- API sedang maintenance'
        ].join('\n')

        try {
            await conn.sendMessage(m.chat, {
                text: errorMessage,
                edit: statusMsg.key
            })
        } catch {
            m.reply(errorMessage)
        }
    }
}

handler.help = ['threads', 'threadsdl'].map(v => v + ' <url>')
handler.tags = ['downloader']
handler.command = /^(threads|threadsdl|threaddl|dlthreads)$/i
handler.limit = true

export default handler
