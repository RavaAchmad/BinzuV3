/**
 * INTEGRATION EXAMPLES
 * How to hook existing plugins into new RPG systems
 */

// ============================================================
// EXAMPLE 1: Hook Mining Plugin into Mission Tracker
// ============================================================

// File: plugins/rpg-mining.js (snippet)

import { trackMissionActivity } from '../plugins/rpg-missions.js'

let handler = async (m, { conn, usedPrefix }) => {
    let user = global.db.data.users[m.sender]

    // ... existing mining logic ...

    // ADD THIS LINE after successful mining session:
    trackMissionActivity(user, 'mining', amountMined)

    // Example:
    // amountMined = 50
    // trackMissionActivity(user, 'mining', 50)
    // → Auto-completes "Mine 50 resources" mission if needed
}

// ============================================================
// EXAMPLE 2: Use Combat System in Custom Raid
// ============================================================

// File: plugins/boss-raid.js (custom)

import combatSystem from '../lib/combat-system.js'
import skilSystem from '../lib/skill-system.js'

let handler = async (m, { conn, usedPrefix, args }) => {
    let user = global.db.data.users[m.sender]

    // Initialize boss raid
    const bossStats = {
        name: 'Dark Overlord',
        health: 500,
        damage: 80,
        defense: 20
    }

    const combat = combatSystem.initCombat(
        {
            name: user.registered ? user.name : 'Player',
            health: user.health,
            skill: user.skill,
            stats: user.skill?.stats || {}
        },
        bossStats,
        'HARD'  // difficulty
    )

    // Combat loop would go here
    // m.reply(combatSystem.getStatus(combat))
    // Execute turns with: combatSystem.executeTurn(combat, 'player')
}

// ============================================================
// EXAMPLE 3: Enhance Fishing with Skill Bonuses
// ============================================================

// File: plugins/rpg-fishing.js (enhanced snippet)

import skilSystem from '../lib/skill-system.js'
import { trackMissionActivity } from '../plugins/rpg-missions.js'

let handler = async (m, { conn, usedPrefix }) => {
    let user = global.db.data.users[m.sender]

    // Get catch amount based on skill
    let baseCatch = 5
    let skillBonus = 0

    if (user.skill) {
        const skillInfo = skilSystem.getSkillInfo(user.skill.name, user.skill.level)
        
        // Different skills give different bonuses to fishing
        if (user.skill.name === 'archer') {
            skillBonus = Math.floor(skillInfo.abilities.pierce_chance / 5)
            // High AGI helps with precision fishing
        } else if (user.skill.name === 'witch') {
            skillBonus = Math.floor(skillInfo.stats.MAG / 15)
            // Magic helps attract fish
        }
    }

    const totalCatch = baseCatch + skillBonus
    user.fish = (user.fish || 0) + totalCatch

    // Track for missions
    trackMissionActivity(user, 'fishing', totalCatch)

    m.reply(`🎣 Caught ${totalCatch} fish (Base: ${baseCatch} + Skill: ${skillBonus})`)
}

// ============================================================
// EXAMPLE 4: Create Boss Fight Using Combat System
// ============================================================

// File: plugins/battle-custom.js (new feature)

import combatSystem from '../lib/combat-system.js'
import skilSystem from '../lib/skill-system.js'

const activeBattles = {}

let handler = async (m, { conn, args }) => {
    let user = global.db.data.users[m.sender]

    if (!user.skill) {
        return m.reply('Select a skill first!')
    }

    const opponent = args[0] // 'goblin', 'troll', etc
    const enemies = {
        goblin: { name: '🟢 Goblin', health: 30, damage: 10 },
        troll: { name: '🟡 Troll', health: 60, damage: 20 },
        dragon: { name: '🔴 Dragon', health: 150, damage: 50 }
    }

    const enemyData = enemies[opponent]
    if (!enemyData) return m.reply('Enemy not found')

    // Start combat
    const combat = combatSystem.initCombat(
        {
            name: user.registered ? user.name : 'Player',
            health: user.health || 100,
            skill: user.skill,
            stats: user.skill?.stats || {}
        },
        enemyData,
        'NORMAL'
    )

    // Store ongoing battle
    activeBattles[m.sender] = combat

    m.reply(combatSystem.getStatus(combat) + 
            `\n\nUse: .battle attack`)
}

handler.command = /^battle$/i

// ============================================================
// EXAMPLE 5: Skill-Based Crafting with Leveling
// ============================================================

// File: plugins/rpg-craft.js (enhanced)

import skilSystem from '../lib/skill-system.js'
import { trackMissionActivity } from '../plugins/rpg-missions.js'

let handler = async (m, { conn, args }) => {
    let user = global.db.data.users[m.sender]
    const itemToCraft = args[0] // 'potion', 'sword', etc

    // Skill can affect crafting success rate
    let successChance = 0.7 // 70% base

    if (user.skill) {
        if (user.skill.name === 'witch' && itemToCraft === 'potion') {
            // Witch is good at potions
            successChance += user.skill.level * 0.01 // +1% per level
        } else if (user.skill.name === 'magicswordmaster' && itemToCraft === 'sword') {
            // Magic swordmaster good at weapons
            successChance += user.skill.level * 0.015
        }
    }

    successChance = Math.min(0.99, successChance) // Max 99%

    if (Math.random() < successChance) {
        user.inventory[itemToCraft] = (user.inventory[itemToCraft] || 0) + 1
        
        // Track crafting for missions
        trackMissionActivity(user, 'crafting', 1)
        
        // Add skill exp
        if (user.skill) {
            skilSystem.addSkillExp(user, 50)
        }

        m.reply(`✅ Successfully crafted: ${itemToCraft}`)
    } else {
        m.reply(`❌ Crafting failed, materials wasted`)
    }
}

// ============================================================
// EXAMPLE 6: Daily Dungeon with Mission Integration
// ============================================================

// File: plugins/rpg-dungeon.js (existing - add mission tracking)

import { trackMissionActivity } from '../plugins/rpg-missions.js'

// In your existing dungeon code, add after dungeon completion:
if (userWon) {
    trackMissionActivity(user, 'dungeonWins', 1)  // Track wins
    
    // If it was a boss:
    if (isDungeonBoss) {
        trackMissionActivity(user, 'bossKills', 1)
    }
}

// ============================================================
// EXAMPLE 7: Monitor Player for Pacaran Bonus
// ============================================================

// File: _pacaranBonus.js (already implemented)
// Just make sure it's loaded before game starts

// The system automatically:
// 1. Checks if user has partner
// 2. Gives 150 exp/day bonus
// 3. Tracks relationship stats
// NO MANUAL INTEGRATION NEEDED

// ============================================================
// EXAMPLE 8: Custom Admin Command Using Skill System
// ============================================================

// File: plugins/admin-skill-reset.js (custom)

import skilSystem from '../lib/skill-system.js'

let handler = async (m, { conn, args }) => {
    // This is admin only
    if (!global.xmaze.some(number => m.sender.includes(number))) {
        return m.reply('Admin only!')
    }

    const targetUser = args[0]
    const newSkill = args[1]
    
    if (!targetUser || !newSkill) {
        return m.reply('Usage: .skilreset <user> <skill>')
    }

    const user = global.db.data.users[targetUser]
    if (!user) return m.reply('User not found')

    // Reset skill
    const skillInfo = skilSystem.getSkillInfo(newSkill)
    if (!skillInfo) return m.reply('Skill not found')

    user.skill = {
        name: newSkill,
        level: 1,
        exp: 0,
        stats: skillInfo.stats
    }

    m.reply(`✅ Reset ${targetUser} skill to ${newSkill} Lv1`)
}

handler.owner = true
handler.command = /^skillreset$/i

// ============================================================
// INTEGRATION CHECKLIST FOR EXISTING PLUGINS
// ============================================================

/*
When enhancing existing plugins, add these lines:

1. IMPORT (at top):
   import { trackMissionActivity } from '../plugins/rpg-missions.js'
   import skilSystem from '../lib/skill-system.js'

2. ON SUCCESS:
   trackMissionActivity(user, 'activityType', amount)

3. FOR SKILL BONUSES:
   const skillBonus = user.skill?.level ? (user.skill.level * multiplier) : 0
   const totalReward = baseReward + skillBonus

4. FOR NEW MECHANICS:
   Use combatSystem.calculateDamage() for attack calculations
   Use skilSystem.getSkillInfo() for stat lookups

5. OPTIONAL:
   Add skill exp gain: skilSystem.addSkillExp(user, amount)
   Show skill bonuses in UI: skilSystem.getAbilityBonus(name, level, type)
*/

// ============================================================
// ACTIVITY TYPE REFERENCE
// ============================================================

const validActivities = [
    'dungeonRuns',        // Single dungeon entry
    'dungeonWins',        // Successfully beat dungeon
    'bossKills',          // Boss defeated
    'mining',             // Mining session
    'fishing',            // Fishing catch
    'crafting',           // Items crafted
    'garden',             // Plants grown
    'expGain',            // Experience earned
    'moneyGain',          // Money earned
    'skillLevelup',       // Skill leveled
    'relationships',      // Relationship points
    'gamePlayed'          // Games played
]

// Usage example:
// trackMissionActivity(user, 'dungeonWins', 1)
// trackMissionActivity(user, 'mining', 50)

export default handler
