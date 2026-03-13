/**
 * Bot Updates & Announcements Plugin
 * Shows update information when no ads are available
 * Displayed automatically by menu after menu display
 */

import fs from 'fs'
import path from 'path'

const UPDATES_DIR = './src/updates'

// Ensure updates directory exists
if (!fs.existsSync(UPDATES_DIR)) {
    fs.mkdirSync(UPDATES_DIR, { recursive: true })
}

let handler = async (m, { conn, args, usedPrefix, command, text }) => {
    // Owner/admin check
    if (!global.xmaze?.some(number => m.sender.includes(number))) {
        return m.reply('This command is for *OWNER* only')
    }

    const subcommand = (args[0] || '').toLowerCase()

    switch(subcommand) {
        case 'set':
            return setUpdate(m, conn, text, usedPrefix, command)

        case 'append':
            return appendUpdate(m, conn, text)

        case 'clear':
            return clearUpdate(m, conn)

        case 'view':
            return viewUpdate(m, conn)

        case 'list':
            return listUpdates(m, conn)

        default:
            return showUpdateMenu(m, usedPrefix, command)
    }
}

/**
 * Set/replace current update message
 */
function setUpdate(m, conn, text, usedPrefix, command) {
    if (!text || text.split(' ').length < 2) {
        return conn.reply(m.chat, 
            `Format: ${usedPrefix}${command} set <update message>\n` +
            `Example: ${usedPrefix}${command} set 🎉 Version 2.1 Released - New RPG System Added!`,
            m
        )
    }

    const [, ...messageParts] = text.split(' ')
    const message = messageParts.join(' ')

    const update = {
        content: message,
        version: new Date().getTime().toString().slice(-6), // Simple version ID
        createdAt: new Date().toISOString(),
        active: true
    }

    saveUpdateConfig(update)
    conn.reply(m.chat, `✅ Update message set!\n\n${message}`, m)
}

/**
 * Append to existing update message
 */
function appendUpdate(m, conn, text) {
    if (!text || text.split(' ').length < 2) {
        return conn.reply(m.chat, 
            `Format: ${usedPrefix}${command} append <additional text>`,
            m
        )
    }

    const [, ...textParts] = text.split(' ')
    const additionalText = textParts.join(' ')

    const update = loadUpdateConfig()
    if (!update.content) {
        return conn.reply(m.chat, 'No update set yet. Use "set" first.', m)
    }

    update.content += `\n${additionalText}`
    update.updatedAt = new Date().toISOString()

    saveUpdateConfig(update)
    conn.reply(m.chat, `✅ Update appended!`, m)
}

/**
 * Clear current update
 */
function clearUpdate(m, conn) {
    const configPath = path.join(UPDATES_DIR, 'update.json')
    
    if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath)
    }

    conn.reply(m.chat, `✅ Update message cleared`, m)
}

/**
 * View current update
 */
function viewUpdate(m, conn) {
    const update = loadUpdateConfig()

    if (!update.content) {
        return conn.reply(m.chat, 'No update message configured yet', m)
    }

    let msg = `*📢 CURRENT UPDATE*\n━━━━━━━━━━━━━━━\n\n`
    msg += `${update.content}\n\n`
    msg += `━━━━━━━━━━━━━━━\n`
    msg += `Version: ${update.version}\n`
    msg += `Posted: ${new Date(update.createdAt).toLocaleDateString('id-ID')}`

    if (update.updatedAt) {
        msg += `\nUpdated: ${new Date(update.updatedAt).toLocaleDateString('id-ID')}`
    }

    conn.reply(m.chat, msg, m)
}

/**
 * List update history
 */
function listUpdates(m, conn) {
    const historyPath = path.join(UPDATES_DIR, 'history.json')
    let history = []

    try {
        if (fs.existsSync(historyPath)) {
            history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'))
        }
    } catch (e) {
        console.error('Error loading update history:', e)
    }

    if (history.length === 0) {
        return conn.reply(m.chat, 'No update history yet', m)
    }

    let list = `*📋 UPDATE HISTORY*\n━━━━━━━━━━━━━━━\n\n`

    history.slice(-10).reverse().forEach((update, idx) => {
        list += `${idx + 1}. *v${update.version}*\n`
        list += `   ${update.content.substring(0, 60)}${update.content.length > 60 ? '...' : ''}\n`
        list += `   ${new Date(update.createdAt).toLocaleDateString('id-ID')}\n\n`
    })

    conn.reply(m.chat, list, m)
}

/**
 * Show admin menu
 */
function showUpdateMenu(m, usedPrefix, command) {
    const menu = `
*📢 UPDATE MANAGEMENT SYSTEM*
━━━━━━━━━━━━━━━━━━━━━━━━

${usedPrefix}${command} set <message>
   Set new update message

${usedPrefix}${command} append <text>
   Add to current message

${usedPrefix}${command} view
   View current update

${usedPrefix}${command} clear
   Remove update

${usedPrefix}${command} list
   Update history (last 10)

*Features:*
• Fallback when no ads
• Version tracking
• History kept
• Easy to manage
`.trim()

    return m.reply(menu)
}

/**
 * Load update configuration
 */
function loadUpdateConfig() {
    const configPath = path.join(UPDATES_DIR, 'update.json')
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        }
    } catch (e) {
        console.error('Error loading update config:', e)
    }
    return {}
}

/**
 * Save update configuration
 */
function saveUpdateConfig(update) {
    const configPath = path.join(UPDATES_DIR, 'update.json')
    const historyPath = path.join(UPDATES_DIR, 'history.json')

    // Save current update
    fs.writeFileSync(configPath, JSON.stringify(update, null, 2))

    // Add to history
    let history = []
    try {
        if (fs.existsSync(historyPath)) {
            history = JSON.parse(fs.readFileSync(historyPath, 'utf-8'))
        }
    } catch (e) {}

    history.push(update)

    // Keep last 50 updates
    if (history.length > 50) {
        history = history.slice(-50)
    }

    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2))
}

/**
 * Display update notification (called when no ads)
 * Used by yula-menu.js displayUpdateNotification()
 */
export function displayUpdateNotification(m, conn) {
    try {
        const update = loadUpdateConfig()

        if (!update.content) {
            return // No update to show
        }

        conn.sendMessage(m.chat, {
            text: `\n${'━'.repeat(30)}\n📢 *LATEST UPDATE*\n${'━'.repeat(30)}\n\n${update.content}\n\n${'━'.repeat(30)}`
        }, { quoted: m })
    } catch (e) {
        console.error('Error displaying update:', e)
    }
}

handler.help = ['setupdates <set|append|clear|view|list>']
handler.tags = ['owner']
handler.command = /^setupdates$/i
handler.owner = true
handler.mods = false

export default handler
export { loadUpdateConfig, displayUpdateNotification }
