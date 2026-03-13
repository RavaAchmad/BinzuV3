/**
 * Admin Ads Management System
 * Control advertisements shown after menu display
 */

import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

const ADS_DIR = './src/ads'

// Ensure ads directory exists
if (!fs.existsSync(ADS_DIR)) {
    fs.mkdirSync(ADS_DIR, { recursive: true })
}

let handler = async (m, { conn, args, usedPrefix, command, text }) => {
    // Owner/admin check
    if (!global.xmaze?.some(number => m.sender.includes(number))) {
        return m.reply('This command is for *OWNER* only')
    }

    const subcommand = (args[0] || '').toLowerCase()

    switch(subcommand) {
        case 'set':
            return await setAdsText(m, conn, text, usedPrefix, command)

        case 'upload':
            // Format: .setads upload <filename> [caption text]
            const uploadArgs = text.split(' ').slice(1) // Remove 'upload'
            const filename = uploadArgs[0]
            const caption = uploadArgs.slice(1).join(' ') || ''
            return await uploadAdsImage(m, conn, filename, caption, usedPrefix, command)

        case 'remove':
            return await removeAds(m, conn, args[1])

        case 'list':
            return listAds(m, conn)

        case 'preview':
            return previewAds(m, conn)

        default:
            return showAdsMenu(m, usedPrefix, command)
    }
}

/**
 * Set text-based ads
 */
async function setAdsText(m, conn, text, usedPrefix, command) {
    if (!text.includes(' ')) {
        return conn.reply(m.chat, 
            `Format: ${usedPrefix}${command} set <name> <text>\n` +
            `Example: ${usedPrefix}${command} set banner1 Check out our new features!`,
            m
        )
    }

    const [name, ...contentParts] = text.split(' ')
    const content = contentParts.join(' ')

    const adsConfig = loadAdsConfig()
    adsConfig[name] = {
        type: 'text',
        content: content,
        createdAt: new Date().toISOString(),
        active: true
    }

    saveAdsConfig(adsConfig)
    conn.reply(m.chat, `✅ Ad "${name}" created successfully!`, m)
}

/**
 * Upload image for ads with optional caption
 */
async function uploadAdsImage(m, conn, filename, caption = '', usedPrefix, command) {
    if (!filename) {
        return conn.reply(m.chat, 
            `*Ad Image Upload - Format:*\n` +
            `${usedPrefix}${command} upload <filename.jpg> [optional caption]\n\n` +
            `*Example:*\n` +
            `${usedPrefix}${command} upload banner.jpg Check our new premium features!\n\n` +
            `*Then reply to the image to upload*`,
            m
        )
    }

    // Check if quoted message has media
    if (m.quoted && m.quoted.mimetype) {
        try {
            const media = await m.quoted.download?.()
            if (media) {
                const adName = filename.replace(/\.[^.]+$/, '')
                const filePath = path.join(ADS_DIR, filename)

                // Remove old file if exists
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath)
                }

                fs.writeFileSync(filePath, media)

                const adsConfig = loadAdsConfig()
                adsConfig[adName] = {
                    type: 'image',
                    filename: filename,
                    path: filePath,
                    caption: caption || undefined, // Only add if not empty
                    createdAt: new Date().toISOString(),
                    active: true
                }

                saveAdsConfig(adsConfig)
                
                let msg = `✅ Image ad "${adName}" uploaded!\n`
                msg += `File: ${filename}\n`
                if (caption) msg += `Caption: "${caption}"\n`
                msg += `Location: ${filePath}`
                
                return conn.reply(m.chat, msg, m)
            }
        } catch (e) {
            return conn.reply(m.chat, `Error uploading image: ${e.message}`, m)
        }
    } else {
        return conn.reply(m.chat, 
            `Please *reply to an image* first, then use the upload command`,
            m
        )
    }
}

/**
 * Remove ads
 */
async function removeAds(m, conn, adName) {
    if (!adName) {
        return conn.reply(m.chat, 
            `Please specify ad name to remove\n` +
            `Usage: .setads remove <name>`,
            m
        )
    }

    const adsConfig = loadAdsConfig()

    if (!adsConfig[adName]) {
        return conn.reply(m.chat, `Ad "${adName}" not found`, m)
    }

    const ad = adsConfig[adName]
    
    // Delete file if it's an image
    if (ad.type === 'image' && ad.path && fs.existsSync(ad.path)) {
        fs.unlinkSync(ad.path)
    }

    delete adsConfig[adName]
    saveAdsConfig(adsConfig)

    conn.reply(m.chat, `✅ Ad "${adName}" removed!`, m)
}

/**
 * List all ads
 */
function listAds(m, conn) {
    const adsConfig = loadAdsConfig()
    
    if (Object.keys(adsConfig).length === 0) {
        return conn.reply(m.chat, 'No ads configured yet', m)
    }

    let list = `*📢 CURRENT ADS*\n━━━━━━━━━━━━━━━\n\n`

    Object.entries(adsConfig).forEach(([name, ad]) => {
        const status = ad.active ? '✅' : '❌'
        const type = ad.type === 'image' ? '🖼️' : '📝'
        list += `${status} *${name}* ${type}\n`
        
        if (ad.type === 'text') {
            list += `   Content: ${ad.content.substring(0, 50)}...\n`
        } else {
            list += `   File: ${ad.filename}\n`
            if (ad.caption) {
                list += `   Caption: ${ad.caption.substring(0, 50)}${ad.caption.length > 50 ? '...' : ''}\n`
            }
        }
        list += `   Created: ${new Date(ad.createdAt).toLocaleDateString('id-ID')}\n\n`
    })

    conn.reply(m.chat, list, m)
}

/**
 * Preview ads display
 */
function previewAds(m, conn) {
    const adsConfig = loadAdsConfig()
    const activeAds = Object.values(adsConfig).filter(ad => ad.active)

    if (activeAds.length === 0) {
        return conn.reply(m.chat, 'No active ads to preview', m)
    }

    let preview = `*📢 ADS PREVIEW*\n━━━━━━━━━━━━━━━\n\n`
    
    activeAds.forEach((ad, idx) => {
        if (ad.type === 'text') {
            preview += `${ad.content}\n\n`
        } else if (ad.type === 'image') {
            preview += `🖼️ Image Ad #${idx + 1}`
            if (ad.caption) {
                preview += `\n📝 Caption: ${ad.caption}`
            }
            preview += `\n\n`
        }
    })

    conn.reply(m.chat, preview, m)
}

/**
 * Show main menu
 */
function showAdsMenu(m, usedPrefix, command) {
    const menu = `
*📢 ADS MANAGEMENT SYSTEM*
━━━━━━━━━━━━━━━━━━━━━

**TEXT ADS:**
${usedPrefix}${command} set <name> <text>
   Create text advertisement
   
**IMAGE ADS (with optional caption):**
${usedPrefix}${command} upload <filename> [caption text]
   1. Reply to the image you want to upload
   2. Use this command with filename and optional caption
   
   *Example:*
   ${usedPrefix}${command} upload banner.jpg Check our new premium features!

**MANAGEMENT:**
${usedPrefix}${command} list
   Show all ads

${usedPrefix}${command} preview
   Preview active ads

${usedPrefix}${command} remove <name>
   Remove ad

*Features:*
• Multiple ads support (text & image)
• Image ads support captions
• Automatic rotation
• Easy on/off toggle
`.trim()

    return m.reply(menu)
}

/**
 * Load ads configuration
 */
function loadAdsConfig() {
    const configPath = path.join(ADS_DIR, 'config.json')
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        }
    } catch (e) {
        console.error('Error loading ads config:', e)
    }
    return {}
}

/**
 * Save ads configuration
 */
function saveAdsConfig(config) {
    const configPath = path.join(ADS_DIR, 'config.json')
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}

handler.help = ['setads <set|upload|remove|list|preview>']
handler.tags = ['owner']
handler.command = /^setads$/i
handler.owner = true
handler.mods = false

export default handler
export { loadAdsConfig, ADS_DIR }
