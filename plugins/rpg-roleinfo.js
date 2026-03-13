/**
 * Advanced Role & Tier Information Display
 * Shows current role, tier, and progression to next tier
 */

import { roleDatabase, getRoleByLevel, getTierByLevel } from './rpg-role.js'

let handler = async (m, { conn, usedPrefix }) => {
    let user = global.db.data.users[m.sender]
    const level = user.level || 1
    const tier = getTierByLevel(level)
    const tierData = Object.values(roleDatabase)[tier - 1]

    // Calculate progress to next tier
    const currentTierStart = tierData.levels[0]
    const currentTierEnd = tierData.levels[1]
    const maxLevel = 500
    
    const progressInTier = level - currentTierStart
    const tierLength = currentTierEnd - currentTierStart + 1
    const tierProgress = Math.floor((progressInTier / tierLength) * 100)

    const nextTier = tier < 7 ? Object.values(roleDatabase)[tier] : null
    const levelToNextTier = (currentTierEnd + 1) - level

    let msg = `*👑 ROLE & TIER INFORMATION*\n`
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
    
    msg += `*Current Status:*\n`
    msg += `${tierData.emoji} Tier ${tier} - ${tierData.name}\n`
    msg += `📊 Level: ${level} / 500\n`
    msg += `🎖️ Role: ${user.role || 'Unknown'}\n\n`

    msg += `*Tier Progress:*\n`
    msg += `${progressBar(tierProgress)} ${tierProgress}%\n`
    msg += `Progress: ${progressInTier} / ${tierLength}\n\n`

    if (nextTier) {
        msg += `*Next Tier:*\n`
        msg += `${nextTier.emoji} Tier ${tier + 1} - ${nextTier.name}\n`
        msg += `📈 Levels ${nextTier.levels[0]} - ${nextTier.levels[1]}\n`
        msg += `⏳ Need ${levelToNextTier} more levels\n\n`
    } else {
        msg += `*🌟 YOU HAVE REACHED MAXIMUM TIER!*\n\n`
    }

    // Tier benefits
    msg += `*Tier Benefits:*\n`
    msg += `💰 Reward: ${tierData.reward.money.toLocaleString('id-ID')} Money\n`
    msg += `💎 Reward: ${tierData.reward.diamond} Diamond\n\n`

    // All tiers overview
    msg += `*All Tiers:*\n`
    Object.entries(roleDatabase).forEach(([key, data], idx) => {
        const tierNum = idx + 1
        const isCurrent = tierNum === tier
        const isUnlocked = tierNum <= tier
        const status = isUnlocked ? (isCurrent ? '▶️' : '✅') : '🔒'
        msg += `${status} Tier ${tierNum} ${data.emoji} ${data.name} (Lv ${data.levels[0]}-${data.levels[1]})\n`
    })

    return m.reply(msg)
}

function progressBar(percent, length = 15) {
    const fill = Math.floor((percent / 100) * length)
    const empty = length - fill
    return `[${'█'.repeat(fill)}${'░'.repeat(empty)}]`
}

handler.help = ['roleinfo']
handler.tags = ['rpg']
handler.command = /^(roleinfo|tierinfo|role info)$/i
handler.register = true
handler.group = true

export default handler
