import toolSystem from "../lib/tool-system.js"

let handler = async (m, { conn, command, args, usedPrefix }) => { 
    let user = global.db.data.users[m.sender]
    let type = (args[0] || '').toLowerCase()
    
    // Create menu if no type specified
    if (!type) {
        let menu = `
${toolSystem.tools.fishingrod.emoji} *TOOL & ITEM UPGRADE SYSTEM*
━━━━━━━━━━━━━━━━━━━

📝 *Usage:*
${usedPrefix}upgrade [tool_name]

🛠️ *Available Tools:*
${Object.entries(toolSystem.tools).map(([key, data]) => 
    `${data.emoji} ${data.name.padEnd(15)} → *${usedPrefix}upgrade ${key}*`
).join('\n')}

💡 *How Upgrades Work:*
• Each level increases stats exponentially
• Higher levels cost more materials
• Stats show exact improvements before upgrading
• 10 levels for tools, 100 levels for ATM

⭐ *Tier System:*
🟢 Common (1-25%)
🔵 Rare (25-50%)
⚫ Epic (50-70%)
💎 Mythic (70-90%)
👑 Legendary (90-100%)

Type: ${usedPrefix}upgrade [tool] to preview upgrade
        `.trim()

        return m.reply(menu)
    }

    // Find tool
    const tool = Object.keys(toolSystem.tools).find(t => t.toLowerCase() === type.toLowerCase())
    if (!tool) {
        return m.reply(`❌ Tool *${type}* not found!\n\nAvailable: ${Object.keys(toolSystem.tools).join(', ')}`)
    }

    const toolData = toolSystem.tools[tool]
    const currentLevel = user[tool] || 0

    // Check if tool exists
    if (currentLevel === 0) {
        return m.reply(`❌ You don't have *${toolData.emoji} ${toolData.name}* yet!\n\nCraft it first with: ${usedPrefix}craft ${tool}`)
    }

    // Check if max level
    if (currentLevel >= toolData.maxLevel) {
        return m.reply(`
✨ *${toolData.emoji} ${toolData.name}* - LEVEL MAX!

You've reached maximum level (${toolData.maxLevel})
All stats are fully upgraded!
${toolSystem.formatToolStats(tool, currentLevel)}`)
    }

    // Get cost and check materials
    const cost = toolSystem.getUpgradeCost(tool, currentLevel)
    let missingMaterials = []

    for (const [item, amount] of Object.entries(cost)) {
        const userHas = user[item] || 0
        if (userHas < amount) {
            missingMaterials.push(`${item}: need ${(amount - userHas).toLocaleString('id-ID')} more`)
        }
    }

    // If missing materials, show preview with requirements
    if (missingMaterials.length > 0) {
        return m.reply(`
${toolSystem.formatUpgradePreview(tool, currentLevel, user)}

❌ *Missing Materials:*
${missingMaterials.map(m => `• ${m}`).join('\n')}
`)
    }

    // Perform upgrade with animation
    let statusMsg = await conn.sendMessage(m.chat, { text: '⏳ Validating materials...' }, { quoted: m })

    try {
        await conn.sendMessage(m.chat, {
            text: '⏳ Verifying cost calculation...',
            edit: statusMsg.key
        })

        const oldStats = toolSystem.getStats(tool, currentLevel)
        const newStats = toolSystem.getStats(tool, currentLevel + 1)

        await conn.sendMessage(m.chat, {
            text: '⏳ Processing upgrade...',
            edit: statusMsg.key
        })

        // Deduct costs
        for (const [item, amount] of Object.entries(cost)) {
            user[item] = (user[item] || 0) - amount
        }

        await conn.sendMessage(m.chat, {
            text: '⏳ Updating tool stats...',
            edit: statusMsg.key
        })

        // Upgrade tool
        user[tool]++

        // Update durability (scales exponentially)
        const tooltier = toolSystem.getTierEmoji(user[tool], toolData.maxLevel)
        user[`${tool}durability`] = Math.floor(oldStats.durability * (1 + (newStats.durability - oldStats.durability) / oldStats.durability * 1.5))

        // Calculate stat improvements
        let improvements = []
        for (const [stat, oldValue] of Object.entries(oldStats)) {
            if (typeof oldValue === 'number') {
                const newValue = newStats[stat]
                const diff = newValue - oldValue
                const percent = ((diff / oldValue) * 100).toFixed(1)
                improvements.push(`├─ ${stat}: ${oldValue} → ${newValue.toLocaleString('id-ID')} (+${percent}%)`)
            }
        }

        let result = `
${tooltier} *${toolData.emoji} ${toolData.name} Upgraded!*
━━━━━━━━━━━━━━━━━━━

Level: ${currentLevel} → ${user[tool]}
Status: ${currentLevel + 1 === toolData.maxLevel ? '🔴 NEXT LEVEL IS MAX!' : ''}

*Stat Improvements:*
${improvements.join('\n')}

💰 *Materials Used:*
${Object.entries(cost).map(([item, amount]) => `• ${item}: ${amount.toLocaleString('id-ID')}`).join('\n')}

🎯 *Improvement Score: ${toolSystem.calculateImprovementScore(oldStats, newStats).toFixed(2)}%*

${user[tool] < toolData.maxLevel ? `\n✨ Next level: ${usedPrefix}upgrade ${tool}` : '\n👑 You have reached maximum level!'}
`.trim()

        await conn.sendMessage(m.chat, {
            text: result,
            edit: statusMsg.key
        })

    } catch (error) {
        console.error('Error in upgrade:', error)
        await conn.sendMessage(m.chat, {
            text: '❌ Error during upgrade',
            edit: statusMsg.key
        })
    }
}

handler.help = ['upgrade'].map(v => v + ' [tool]')
handler.tags = ['rpg']
handler.command = /^(up(grade)?)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler
