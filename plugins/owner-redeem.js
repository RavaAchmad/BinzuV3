/**
 * Redeem Code Management System (Admin)
 * Generate and manage redemption codes
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const REDEEM_DIR = './src/redeem'

// Ensure redeem directory exists
if (!fs.existsSync(REDEEM_DIR)) {
    fs.mkdirSync(REDEEM_DIR, { recursive: true })
}

let handler = async (m, { conn, args, usedPrefix, command, text }) => {
    // Owner/admin check
    if (!global.xmaze?.some(number => m.sender.includes(number))) {
        return m.reply('This command is for *OWNER* only')
    }

    const subcommand = (args[0] || '').toLowerCase()

    switch(subcommand) {
        case 'generate':
        case 'create':
            return generateCode(m, conn, text, usedPrefix, command)

        case 'delete':
        case 'remove':
            return deleteCode(m, conn, args[1])

        case 'list':
            return listCodes(m, conn)

        case 'info':
            return codeInfo(m, conn, args[1])

        case 'stats':
            return codeStats(m, conn)

        default:
            return showRedeemMenu(m, usedPrefix, command)
    }
}

/**
 * Generate new redeem code
 * Format: .redeem-gen generate <exp> <money> <diamond> [max-claims]
 */
function generateCode(m, conn, text, usedPrefix, command) {
    if (!text || text.split(' ').length < 2) {
        return conn.reply(m.chat, 
            `*Generate Redeem Code*\n` +
            `Format: ${usedPrefix}${command} generate <exp> <money> <diamond> [max-claims]\n\n` +
            `Example: ${usedPrefix}${command} generate 5000 10000 5\n` +
            `Example: ${usedPrefix}${command} generate 10000 20000 10 50\n\n` +
            `*Parameters:*\n` +
            `• exp: Experience reward\n` +
            `• money: Money reward\n` +
            `• diamond: Diamond reward\n` +
            `• max-claims: Optional, limit claims (default unlimited)`,
            m
        )
    }

    const parts = text.split(' ')
    const [, exp, money, diamond, maxClaims] = parts

    if (!exp || !money || !diamond) {
        return conn.reply(m.chat, 'Missing reward parameters', m)
    }

    const code = generateRandomCode()
    const redeemConfig = loadRedeemConfig()

    redeemConfig[code] = {
        code: code,
        rewards: {
            exp: parseInt(exp) || 0,
            money: parseInt(money) || 0,
            diamond: parseInt(diamond) || 0
        },
        maxClaims: maxClaims ? parseInt(maxClaims) : -1, // -1 = unlimited
        claims: 0,
        claimedBy: [],
        createdAt: new Date().toISOString(),
        expiresAt: null,
        active: true
    }

    saveRedeemConfig(redeemConfig)

    let msg = `✅ *Redeem Code Generated!*\n\n`
    msg += `🔑 Code: \`${code}\`\n`
    msg += `💰 Exp: +${exp}\n`
    msg += `💹 Money: +${money}\n`
    msg += `💎 Diamond: +${diamond}\n`
    msg += `📊 Max Claims: ${maxClaims ? maxClaims + 'x' : 'Unlimited'}`

    conn.reply(m.chat, msg, m)
}

/**
 * Delete redeem code
 */
function deleteCode(m, conn, code) {
    if (!code) {
        return conn.reply(m.chat, 
            `Usage: ${usedPrefix}${command} delete <code>`,
            m
        )
    }

    const redeemConfig = loadRedeemConfig()

    if (!redeemConfig[code]) {
        return conn.reply(m.chat, `❌ Code "${code}" not found`, m)
    }

    delete redeemConfig[code]
    saveRedeemConfig(redeemConfig)

    conn.reply(m.chat, `✅ Code "${code}" deleted!`, m)
}

/**
 * List all redeem codes
 */
function listCodes(m, conn) {
    const redeemConfig = loadRedeemConfig()
    const codes = Object.values(redeemConfig)

    if (codes.length === 0) {
        return conn.reply(m.chat, 'No redeem codes yet', m)
    }

    let list = `*🔑 REDEEM CODES*\n━━━━━━━━━━━━━━━━━━\n\n`

    codes.forEach((entry, idx) => {
        const status = entry.active ? '✅' : '❌'
        const claimStatus = entry.maxClaims === -1 
            ? `${entry.claims} claims`
            : `${entry.claims}/${entry.maxClaims}`

        list += `${status} **Code ${idx + 1}:**\n`
        list += `   \`${entry.code}\`\n`
        list += `   Exp: ${entry.rewards.exp}, Money: ${entry.rewards.money}, Diamond: ${entry.rewards.diamond}\n`
        list += `   Claims: ${claimStatus}\n`
        list += `   Created: ${new Date(entry.createdAt).toLocaleDateString('id-ID')}\n\n`
    })

    conn.reply(m.chat, list, m)
}

/**
 * Get info about specific code
 */
function codeInfo(m, conn, code) {
    if (!code) {
        return conn.reply(m.chat, 
            `Usage: ${usedPrefix}${command} info <code>`,
            m
        )
    }

    const redeemConfig = loadRedeemConfig()
    const entry = redeemConfig[code]

    if (!entry) {
        return conn.reply(m.chat, `Code "${code}" not found`, m)
    }

    let msg = `*🔑 CODE INFO: ${code}*\n━━━━━━━━━━━━━━━━━━\n\n`
    msg += `Status: ${entry.active ? '✅ Active' : '❌ Inactive'}\n`
    msg += `Rewards:\n`
    msg += `  💰 Exp: ${entry.rewards.exp}\n`
    msg += `  💹 Money: ${entry.rewards.money}\n`
    msg += `  💎 Diamond: ${entry.rewards.diamond}\n\n`
    msg += `Claims: ${entry.claims}/${entry.maxClaims === -1 ? '∞' : entry.maxClaims}\n`
    msg += `Created: ${new Date(entry.createdAt).toLocaleDateString('id-ID')}\n`

    if (entry.claimedBy.length > 0) {
        msg += `\nClaimed by:\n`
        entry.claimedBy.slice(-5).forEach((user, idx) => {
            msg += `  ${idx + 1}. ${user.user} (${new Date(user.claimedAt).toLocaleDateString('id-ID')})\n`
        })
        if (entry.claimedBy.length > 5) {
            msg += `  ... and ${entry.claimedBy.length - 5} more\n`
        }
    }

    conn.reply(m.chat, msg, m)
}

/**
 * Code statistics
 */
function codeStats(m, conn) {
    const redeemConfig = loadRedeemConfig()
    const codes = Object.values(redeemConfig)

    if (codes.length === 0) {
        return conn.reply(m.chat, 'No redeem codes yet', m)
    }

    let totalClaims = 0
    let activeCount = 0
    let totalRewards = {
        exp: 0,
        money: 0,
        diamond: 0
    }

    codes.forEach(code => {
        if (code.active) activeCount++
        totalClaims += code.claims
        totalRewards.exp += code.rewards.exp * code.claims
        totalRewards.money += code.rewards.money * code.claims
        totalRewards.diamond += code.rewards.diamond * code.claims
    })

    let msg = `*📊 REDEEM CODES STATISTICS*\n━━━━━━━━━━━━━━━━━━\n\n`
    msg += `Total Codes: ${codes.length}\n`
    msg += `Active: ${activeCount}\n`
    msg += `Total Claims: ${totalClaims}\n\n`
    msg += `*Total Distributed:*\n`
    msg += `💰 Exp: ${totalRewards.exp.toLocaleString('id-ID')}\n`
    msg += `💹 Money: ${totalRewards.money.toLocaleString('id-ID')}\n`
    msg += `💎 Diamond: ${totalRewards.diamond}\n`

    conn.reply(m.chat, msg, m)
}

/**
 * Show admin menu
 */
function showRedeemMenu(m, usedPrefix, command) {
    const menu = `
*🔑 REDEEM CODE MANAGEMENT*
━━━━━━━━━━━━━━━━━━━━━━━━

**GENERATE:**
${usedPrefix}${command} generate <exp> <money> <diamond> [max-claims]
   Create new redeem code

**MANAGE:**
${usedPrefix}${command} delete <code>
   Remove redeem code

${usedPrefix}${command} list
   List all codes

${usedPrefix}${command} info <code>
   Code details & claims

${usedPrefix}${command} stats
   All codes statistics

*Example:*
${usedPrefix}${command} generate 5000 10000 5 100
   → 5k exp, 10k money, 5 diamond, max 100 claims

*User Command:*
Say \\\`.redeem <code>\\\` to claim
`.trim()

    return m.reply(menu)
}

/**
 * Generate random code
 */
function generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

/**
 * Load redeem configuration
 */
function loadRedeemConfig() {
    const configPath = path.join(REDEEM_DIR, 'codes.json')
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        }
    } catch (e) {
        console.error('Error loading redeem config:', e)
    }
    return {}
}

/**
 * Save redeem configuration
 */
function saveRedeemConfig(config) {
    const configPath = path.join(REDEEM_DIR, 'codes.json')
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}

handler.help = ['redeemcode <generate|delete|list|info|stats>']
handler.tags = ['owner']
handler.command = /^redeemcode$/i
handler.owner = true
handler.mods = false

export default handler
export { loadRedeemConfig, generateRandomCode }
