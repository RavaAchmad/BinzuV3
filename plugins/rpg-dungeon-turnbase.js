/**
 * Turn-Based Dungeon Combat System
 * Requires skill, items, and strategic combat
 */

import combatSystem from '../lib/combat-system.js'
import skillSystem from '../lib/skill-system.js'

let activeCombats = {} // Stores ongoing combats by user JID

const dungeonDifficulties = {
    EASY: {
        name: 'Training Ground',
        emoji: '🟢',
        minReq: 1,
        enemy: { name: 'Goblin', health: 50, damage: 15, defense: 5 },
        rewards: { exp: 500, money: 1000, itemChance: 0.2 }
    },
    NORMAL: {
        name: 'Dark Forest',
        emoji: '🔵',
        minReq: 10,
        enemy: { name: 'Orc Warrior', health: 100, damage: 25, defense: 8 },
        rewards: { exp: 1500, money: 3000, itemChance: 0.3 }
    },
    HARD: {
        name: 'Demon\'s Castle',
        emoji: '🔴',
        minReq: 25,
        enemy: { name: 'Demon Lord', health: 200, damage: 40, defense: 10 },
        rewards: { exp: 3500, money: 7500, itemChance: 0.4 }
    },
    NIGHTMARE: {
        name: 'Abyss of Destruction',
        emoji: '💜',
        minReq: 50,
        enemy: { name: 'Abyssal Horror', health: 400, damage: 60, defense: 15 },
        rewards: { exp: 8000, money: 20000, itemChance: 0.5 }
    }
}

let handler = async (m, { conn, usedPrefix, text, args }) => {
    let user = global.db.data.users[m.sender]

    if (!user.skill || !user.skill.name) {
        return m.reply('❌ You must select a skill first!\n' +
            `Use ${usedPrefix}selectskill to choose your skill`)
    }

    const subcommand = (text || '').split(' ')[0].toLowerCase()

    switch(subcommand) {
        case 'enter':
        case 'start':
            return await startDungeon(m, conn, user, usedPrefix)

        case 'attack':
        case 'atk':
            return await executeTurn(m, conn, user, 'attack')

        case 'item':
        case 'use':
            return await executeTurn(m, conn, user, 'item', args[1])

        case 'status':
        case 'info':
            return getDungeonStatus(m, user)

        case 'flee':
        case 'escape':
            return fleeDungeon(m, user)

        default:
            return showDungeonMenu(m, usedPrefix, user)
    }
}

/**
 * Show dungeon menu
 */
function showDungeonMenu(m, usedPrefix, user) {
    let menu = `*⚔️ TURN-BASED DUNGEON SYSTEM*\n━━━━━━━━━━━━━━━━━━━\n\n`
    menu += `*Your Level:* ${user.level}\n`
    menu += `*Your Skill:* ${user.skill?.name || 'None'}\n\n`
    menu += `*Available Dungeons:*\n\n`

    Object.entries(dungeonDifficulties).forEach(([key, dungeon]) => {
        const canEnter = user.level >= dungeon.minReq
        const status = canEnter ? '✅' : '❌'
        menu += `${status} ${dungeon.emoji} *${dungeon.name}*\n`
        menu += `   Level Req: ${dungeon.minReq}\n`
        menu += `   Enemy: ${dungeon.enemy.name}\n`
        menu += `   Rewards: ${dungeon.rewards.exp} Exp, ${dungeon.rewards.money} Money\n`
        menu += `   Command: ${usedPrefix}dungeon enter ${key.toLowerCase()}\n\n`
    })

    menu += `*Combat Commands:*\n`
    menu += `${usedPrefix}dungeon attack\n`
    menu += `${usedPrefix}dungeon item <index>\n`
    menu += `${usedPrefix}dungeon status\n`
    menu += `${usedPrefix}dungeon flee\n`

    return m.reply(menu)
}

/**
 * Start dungeon combat
 */
async function startDungeon(m, conn, user, usedPrefix) {
    if (activeCombats[m.sender]) {
        return m.reply('❌ You are already in combat! Use ' + usedPrefix + 'dungeon flee to escape')
    }

    const difficulty = (arguments[3] || '').toUpperCase() || 'NORMAL'
    const dungeon = dungeonDifficulties[difficulty]

    if (!dungeon) {
        return m.reply('Invalid difficulty. Use: easy, normal, hard, nightmare')
    }

    if (user.level < dungeon.minReq) {
        return m.reply(`❌ You need level ${dungeon.minReq} to enter this dungeon (You are level ${user.level})`)
    }

    // Initialize combat
    const combat = combatSystem.initCombat(
        {
            name: user.registered ? user.name : conn.getName(m.sender),
            health: user.health || 100,
            skill: user.skill,
            stats: user.skill?.stats || {},
            items: user.items || []
        },
        dungeon.enemy,
        difficulty
    )

    activeCombats[m.sender] = {
        combat,
        dungeon,
        startTime: Date.now()
    }

    let msg = `*⚔️ DUNGEON ENTERED*\n━━━━━━━━━━━━━━━\n\n`
    msg += `Dungeon: ${dungeon.name} ${dungeon.emoji}\n`
    msg += `Difficulty: ${difficulty}\n`
    msg += `Enemy: ${dungeon.enemy.name}\n\n`
    msg += combatSystem.getStatus(combat)
    msg += `\n*Commands:*\n`
    msg += `${usedPrefix}dungeon attack - Attack enemy\n`
    msg += `${usedPrefix}dungeon status - Check status\n`
    msg += `${usedPrefix}dungeon flee - Try to escape\n`

    return m.reply(msg)
}

/**
 * Execute turn in combat
 */
async function executeTurn(m, conn, user, action, itemIndex = 0) {
    if (!activeCombats[m.sender]) {
        return m.reply('❌ You are not in a dungeon!')
    }

    const { combat, dungeon } = activeCombats[m.sender]
    
    if (combat.state !== 'ongoing') {
        delete activeCombats[m.sender]
        return m.reply('Combat has ended. Type .dungeon enter to start a new one')
    }

    // Execute turn
    const result = combatSystem.executeTurn(combat, 'player', action === 'item' ? itemIndex : null)

    if (!result) {
        return m.reply('❌ Turn execution failed')
    }

    let msg = combatSystem.getStatus(combat)
    msg += `\n*Last Actions:*\n`
    result.log?.forEach(log => {
        msg += `• ${log}\n`
    })

    if (combat.state === 'player_win') {
        msg += `\n✅ *VICTORY!*\n`
        
        // Apply rewards
        const rewards = combat.rewards
        user.exp = (user.exp || 0) + rewards.exp
        user.money = (user.money || 0) + rewards.money
        user.health = Math.min((user.health || 100), 100)
        
        // Skill exp
        if (user.skill) {
            skillSystem.addSkillExp(user, rewards.skillExp || 50)
        }

        msg += `💰 +${rewards.exp} Exp\n`
        msg += `💹 +${rewards.money} Money\n`

        delete activeCombats[m.sender]
    } else if (combat.state === 'player_lose') {
        msg += `\n❌ *DEFEAT!*\n`
        msg += `You were defeated...\n`
        
        // Penalty
        const penalty = Math.floor(user.money * 0.05)
        user.money = Math.max(0, (user.money || 0) - penalty)
        user.health = 50

        msg += `📉 -${penalty} Money (5% penalty)`

        delete activeCombats[m.sender]
    }

    return m.reply(msg)
}

/**
 * Get combat status
 */
function getDungeonStatus(m, user) {
    if (!activeCombats[m.sender]) {
        return m.reply('❌ You are not in a dungeon')
    }

    const { combat } = activeCombats[m.sender]
    return m.reply(combatSystem.getStatus(combat))
}

/**
 * Escape dungeon
 */
function fleeDungeon(m, user) {
    if (!activeCombats[m.sender]) {
        return m.reply('❌ You are not in a dungeon')
    }

    const { combat, dungeon } = activeCombats[m.sender]
    
    // 50% chance to escape
    const escaped = Math.random() > 0.5
    
    if (escaped) {
        m.reply(`✅ You escaped from ${dungeon.enemy.name}!`)
    } else {
        // Enemy gets free hit
        const damage = Math.floor(combat.enemy.damage * 1.2)
        combat.player.hp = Math.max(0, combat.player.hp - damage)
        m.reply(`❌ Failed to escape! Took ${damage} damage from ${combat.enemy.name}!`)
        
        if (combat.player.hp <= 0) {
            m.reply(`💀 You were defeated!`)
            delete activeCombats[m.sender]
        }
    }
    
    delete activeCombats[m.sender]
}

handler.help = ['dungeon <enter|attack|status|flee>']
handler.tags = ['rpg']
handler.command = /^dungeon$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler
