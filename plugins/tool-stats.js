import toolSystem from "../lib/tool-system.js"

/**
 * Tool Stats Viewer
 * View detailed stats of all your tools and items
 */

let handler = async (m, { conn, args, usedPrefix }) => {
    let user = global.db.data.users[m.sender]
    
    const toolName = (args[0] || '').toLowerCase()
    
    if (!toolName) {
        // Show menu
        let menu = `
${toolSystem.tools.fishingrod.emoji} *TOOL STATS VIEWER*
━━━━━━━━━━━━━━━━━━━

View detailed stats of your tools:

${Object.entries(toolSystem.tools).map(([key, data]) => {
    const level = user[key] || 0
    const status = level === 0 ? '❌ Not owned' : `${level}/${data.maxLevel}`
    return `${data.emoji} ${data.name.padEnd(12)} ${status}`
}).join('\n')}

📝 *Usage:*
${usedPrefix}toolstats [tool_name]

*Examples:*
${usedPrefix}toolstats fishingrod
${usedPrefix}toolstats sword
${usedPrefix}toolstats atm
        `.trim()
        
        return m.reply(menu)
    }
    
    // Find tool
    const tool = Object.keys(toolSystem.tools).find(t => t.toLowerCase() === toolName)
    if (!tool) {
        return m.reply(`❌ Tool not found!\n\nAvailable: ${Object.keys(toolSystem.tools).join(', ')}`)
    }
    
    const toolData = toolSystem.tools[tool]
    const level = user[tool] || 0
    
    if (level === 0) {
        return m.reply(`❌ You don't have ${toolData.emoji} ${toolData.name} yet!\n\nCraft it with: ${usedPrefix}craft ${tool}`)
    }
    
    // Get current stats with animation
    let statusMsg = await conn.sendMessage(m.chat, { text: '⏳ Loading tool data...' }, { quoted: m })

    try {
        await conn.sendMessage(m.chat, {
            text: '⏳ Calculating stats...',
            edit: statusMsg.key
        })

        const stats = toolSystem.getStats(tool, level)
        const tier = toolSystem.getTierEmoji(level, toolData.maxLevel)
        const levelPercent = (level / toolData.maxLevel) * 100
        const levelBar = '█'.repeat(Math.floor(levelPercent / 5)) + '░'.repeat(20 - Math.floor(levelPercent / 5))

        await conn.sendMessage(m.chat, {
            text: '⏳ Computing upgrade costs...',
            edit: statusMsg.key
        })

        // Calculate cost for next level
        let nextUpgradeCost = null
        if (level < toolData.maxLevel) {
            nextUpgradeCost = toolSystem.getUpgradeCost(tool, level)
        }

        let display = `
${tier} *${toolData.emoji} ${toolData.name}*
━━━━━━━━━━━━━━━━━━━
*Level: ${level}/${toolData.maxLevel}*
${levelBar} ${levelPercent.toFixed(0)}%

*Description:*
${toolData.description}

*📊 Current Statistics:*
`
        
        for (const [stat, value] of Object.entries(stats)) {
            const formatted = typeof value === 'number' ? value.toLocaleString('id-ID') : value
            display += `├─ ${stat}: ${formatted}\n`
        }
        
        if (nextUpgradeCost) {
            display += `
*Next Level Upgrade Cost:*
`
            for (const [item, amount] of Object.entries(nextUpgradeCost)) {
                const have = user[item] || 0
                const canAfford = have >= amount
                display += `${canAfford ? '✅' : '❌'} ${item}: ${amount.toLocaleString('id-ID')} (have ${have.toLocaleString('id-ID')})\n`
            }
            
            display += `\n✨ Use ${usedPrefix}upgrade ${tool} to upgrade`
        } else {
            display += `\n👑 You have reached maximum level!`
        }
        
        display += `\n━━━━━━━━━━━━━━━━━━━`

        await conn.sendMessage(m.chat, {
            text: display.trim(),
            edit: statusMsg.key
        })

    } catch (error) {
        console.error('Error in tool stats:', error)
        await conn.sendMessage(m.chat, {
            text: '❌ Error loading tool stats',
            edit: statusMsg.key
        })
    }
}
}

handler.help = ['toolstats'].map(v => v + ' [tool_name]')
handler.tags = ['rpg']
handler.command = /^tool(stats)?$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler
