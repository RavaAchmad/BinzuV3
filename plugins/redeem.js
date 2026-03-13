/**
 * Redeem Code Claim System (User)
 * Users claim redeem codes for rewards
 */

import fs from 'fs'
import path from 'path'

const REDEEM_DIR = './src/redeem'

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const code = (args[0] || '').toUpperCase()

    if (!code) {
        return conn.reply(m.chat, 
            `*Claim Redeem Code*\n` +
            `Usage: ${usedPrefix}${command} <code>\n` +
            `Example: ${usedPrefix}${command} ABC12345`,
            m
        )
    }

    const user = global.db.data.users[m.sender]
    const redeemConfig = loadRedeemConfig()

    // Check if code exists
    if (!redeemConfig[code]) {
        return conn.reply(m.chat, `❌ Redeem code \\\`${code}\\\` not found!`, m)
    }

    const codeEntry = redeemConfig[code]

    // Check if code is active
    if (!codeEntry.active) {
        return conn.reply(m.chat, `❌ Redeem code is no longer active`, m)
    }

    // Check if user already claimed this code
    if (codeEntry.claimedBy.some(claim => claim.sender === m.sender)) {
        return conn.reply(m.chat, `❌ You already claimed this code!`, m)
    }

    // Check max claims
    if (codeEntry.maxClaims !== -1 && codeEntry.claims >= codeEntry.maxClaims) {
        return conn.reply(m.chat, `❌ This code has reached max claims (${codeEntry.maxClaims})`, m)
    }

    // Apply rewards
    try {
        user.exp = (user.exp || 0) + codeEntry.rewards.exp
        user.money = (user.money || 0) + codeEntry.rewards.money
        user.diamond = (user.diamond || 0) + codeEntry.rewards.diamond

        // Record claim
        codeEntry.claims++
        codeEntry.claimedBy.push({
            sender: m.sender,
            user: conn.getName(m.sender),
            claimedAt: new Date().toISOString()
        })

        saveRedeemConfig(redeemConfig)

        // Send success message
        let msg = `✅ *REDEEM CODE CLAIMED!*\n━━━━━━━━━━━━━━━━━━━\n\n`
        msg += `Code: \\\`${code}\\\`\n\n`
        msg += `*Rewards Received:*\n`
        if (codeEntry.rewards.exp > 0) {
            msg += `💰 Exp: +${codeEntry.rewards.exp.toLocaleString('id-ID')}\n`
        }
        if (codeEntry.rewards.money > 0) {
            msg += `💹 Money: +${codeEntry.rewards.money.toLocaleString('id-ID')}\n`
        }
        if (codeEntry.rewards.diamond > 0) {
            msg += `💎 Diamond: +${codeEntry.rewards.diamond}\n`
        }
        msg += `\n━━━━━━━━━━━━━━━━━━\n`
        msg += `Total claims: ${codeEntry.claims}/${codeEntry.maxClaims === -1 ? '∞' : codeEntry.maxClaims}`

        conn.reply(m.chat, msg, m)

    } catch (e) {
        console.error('Error redeeming code:', e)
        conn.reply(m.chat, `❌ Error claiming code: ${e.message}`, m)
    }
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

handler.help = ['redeem <code>']
handler.tags = ['rpg']
handler.command = /^redeem$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler
