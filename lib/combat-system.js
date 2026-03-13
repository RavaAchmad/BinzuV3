/**
 * Turn-Based Combat System for Dungeons
 * Manages combat flow, stat calculations, and rewards
 */

import skillSystem from './skill-system.js'

const combatSystem = {
    /**
     * Initialize a combat session
     */
    initCombat(playerStats, enemyStats, difficulty = 'NORMAL') {
        const difficultyMultiplier = {
            'EASY': 0.7,
            'NORMAL': 1,
            'HARD': 1.5,
            'NIGHTMARE': 2.5
        }

        return {
            state: 'ongoing',
            turn: 0,
            difficulty,
            multiplier: difficultyMultiplier[difficulty] || 1,
            player: {
                name: playerStats.name,
                hp: playerStats.health || 100,
                maxHp: playerStats.health || 100,
                skill: playerStats.skill,
                stats: playerStats.stats || { STR: 10, DEF: 10, MAG: 10, AGI: 10 },
                items: playerStats.items || []
            },
            enemy: {
                name: enemyStats.name,
                hp: Math.floor(enemyStats.health * difficultyMultiplier[difficulty]),
                maxHp: Math.floor(enemyStats.health * difficultyMultiplier[difficulty]),
                damage: enemyStats.damage,
                defense: enemyStats.defense || 5
            },
            log: [],
            rewards: null
        }
    },

    /**
     * Calculate turn damage with skill integration
     */
    executeTurn(combat, attacker = 'player', itemUsed = null) {
        if (combat.state !== 'ongoing') return null

        combat.turn++
        const isPlayer = attacker === 'player'
        const attacker_data = isPlayer ? combat.player : combat.enemy
        const defender_data = isPlayer ? combat.enemy : combat.player

        let damage = 0
        let action = 'attack'

        if (isPlayer && itemUsed) {
            // Item use logic
            const item = attacker_data.items[itemUsed]
            if (item?.type === 'heal') {
                attacker_data.hp = Math.min(attacker_data.hp + item.effect, attacker_data.maxHp)
                combat.log.push(`${attacker_data.name} used ${item.name}! Healed ${item.effect} HP`)
                action = 'heal'
            }
        } else {
            // Calculate attack damage
            const baseAttack = attacker_data.damage || 50
            const damageCalc = skillSystem.calculateDamage(
                { skill: attacker_data.skill, stats: attacker_data.stats },
                { skill: defender_data.skill },
                baseAttack
            )

            damage = Math.floor(damageCalc.damage * combat.multiplier)
            defender_data.hp = Math.max(0, defender_data.hp - damage)

            const critText = damageCalc.isCrit ? ' 💥 CRIT!' : ''
            combat.log.push(`${attacker_data.name} attacks ${defender_data.name} for ${damage} damage${critText}`)
            action = 'attack'
        }

        // Check combat state
        if (defender_data.hp <= 0) {
            combat.state = 'player_win'
            return this.calculateRewards(combat, true)
        }

        // Enemy turn (if player attacked)
        if (isPlayer && action !== 'heal') {
            const enemyDamage = Math.floor((combat.enemy.damage * (0.9 + Math.random() * 0.2)) * combat.multiplier)
            combat.player.hp = Math.max(0, combat.player.hp - enemyDamage)
            combat.log.push(`${combat.enemy.name} counter-attacks for ${enemyDamage} damage!`)

            if (combat.player.hp <= 0) {
                combat.state = 'player_lose'
                return this.calculateRewards(combat, false)
            }
        }

        return {
            state: 'ongoing',
            turn: combat.turn,
            playerHP: combat.player.hp,
            playerMaxHP: combat.player.maxHp,
            enemyHP: combat.enemy.hp,
            enemyMaxHP: combat.enemy.maxHp,
            lastAction: action,
            log: combat.log.slice(-3) // Last 3 actions
        }
    },

    /**
     * Calculate rewards based on combat results
     */
    calculateRewards(combat, playerWon) {
        if (!playerWon) {
            // Loss penalty
            return {
                won: false,
                exp: 0,
                money: 0,
                penalty: Math.floor(combat.player.stats.STR * 10),
                message: 'You were defeated!'
            }
        }

        // Win rewards - scaled to difficulty and enemy stats
        const baseExp = 1000 + (combat.enemy.maxHp / 10)
        const baseMoney = 500 + (combat.enemy.defense * 100)
        
        const rewards = {
            won: true,
            exp: Math.floor(baseExp * combat.multiplier),
            money: Math.floor(baseMoney * combat.multiplier),
            itemChance: 0.3,
            message: 'Victory!'
        }

        // Skill exp gain
        if (combat.player.skill) {
            rewards.skillExp = Math.floor(100 * (1 + (combat.difficulty === 'HARD' ? 0.5 : 0)))
        }

        combat.rewards = rewards
        return rewards
    },

    /**
     * Get combat status display
     */
    getStatus(combat) {
        const playerBar = this.healthBar(combat.player.hp, combat.player.maxHp)
        const enemyBar = this.healthBar(combat.enemy.hp, combat.enemy.maxHp)

        return `
╭━━━ ⚔️ COMBAT ━━━━━━━━╮
┃ *Turn ${combat.turn}*
┃
┃ ${combat.player.name}
┃ ${playerBar} ${combat.player.hp}/${combat.player.maxHp}
┃
┃ vs
┃
┃ ${combat.enemy.name}
┃ ${enemyBar} ${combat.enemy.hp}/${combat.enemy.maxHp}
╰━━━━━━━━━━━━━━━━━━━━╯
`
    },

    /**
     * Helper: Create health bar
     */
    healthBar(current, max, length = 10) {
        const fill = Math.floor((current / max) * length)
        const empty = length - fill
        const bar = '█'.repeat(fill) + '░'.repeat(empty)
        const percent = Math.floor((current / max) * 100)
        return `[${bar}] ${percent}%`
    }
}

export default combatSystem
