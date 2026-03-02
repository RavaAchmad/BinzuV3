/**
 * Boss Raid System - Ultimate Challenge
 * Co-op atau Solo raid dengan difficulty scaling
 */

const bosses = {
    dragon: {
        id: 'dragon',
        name: '🐉 Fire Dragon',
        emoji: '🐉',
        description: 'Ancient dragon guarding treasure',
        minLevel: 50,
        health: 500,
        damage: 45,
        defense: 20,
        spells: ['fireball', 'tail_swipe', 'roar'],
        rewards: {
            exp: 100000,
            money: 150000,
            diamond: 10,
            legendary: 2,
            special: 'Dragon Scale'
        },
        rarity: '🔴 LEGENDARY'
    },
    darkLord: {
        id: 'darkLord',
        name: '👹 Dark Lord',
        emoji: '👹',
        description: 'Ruler of darkness and shadows',
        minLevel: 100,
        health: 800,
        damage: 65,
        defense: 40,
        spells: ['dark_curse', 'shadow_strike', 'void_step'],
        rewards: {
            exp: 250000,
            money: 500000,
            diamond: 25,
            legendary: 5,
            special: 'Cursed Amulet'
        },
        rarity: '💜 MYTHIC'
    },
    golem: {
        id: 'golem',
        name: '⚫ Stone Golem',
        emoji: '⚫',
        description: 'Guardian made of solid rock',
        minLevel: 30,
        health: 400,
        damage: 30,
        defense: 60,
        spells: ['ground_slam', 'rock_throw', 'fortify'],
        rewards: {
            exp: 50000,
            money: 75000,
            diamond: 5,
            legendary: 1,
            special: 'Golem Badge'
        },
        rarity: '🔵 EPIC'
    },
    shadowBeast: {
        id: 'shadowBeast',
        name: '🦋 Shadow Beast',
        emoji: '🦋',
        description: 'Creature of pure darkness',
        minLevel: 70,
        health: 600,
        damage: 55,
        defense: 25,
        spells: ['shadow_clone', 'drain_life', 'void_burst'],
        rewards: {
            exp: 150000,
            money: 250000,
            diamond: 15,
            legendary: 3,
            special: 'Shadow Essence'
        },
        rarity: '🟣 EPIC'
    }
}

const bossRaidSystem = {
    activeRaids: {},

    startRaid(raidId, players = []) {
        if (!players.length) return null

        const boss = bosses[Object.keys(bosses)[Math.floor(Math.random() * Object.keys(bosses).length)]]
        
        this.activeRaids[raidId] = {
            id: raidId,
            boss: { ...boss },
            players: players.map(p => ({
                id: p,
                health: 100,
                damage: 0,
                dodge: 0,
                alive: true
            })),
            round: 0,
            status: 'ONGOING',
            startTime: Date.now(),
            log: []
        }

        return this.activeRaids[raidId]
    },

    playerAttack(raidId, playerId) {
        const raid = this.activeRaids[raidId]
        if (!raid || raid.status !== 'ONGOING') return null

        const player = raid.players.find(p => p.id === playerId)
        if (!player || !player.alive) return null

        const damage = Math.floor(Math.random() * 30) + 10
        const isCritical = Math.random() < 0.2
        const finalDamage = isCritical ? damage * 1.5 : damage

        raid.boss.health -= finalDamage
        player.damage += finalDamage

        const message = `${isCritical ? '💥 CRITICAL HIT!' : '⚔️ HIT!'} ${playerId.split('@')[0]} deals ${finalDamage.toFixed(0)} damage!`
        raid.log.push(message)

        if (raid.boss.health <= 0) {
            this.endRaid(raidId, 'WIN')
        }

        return { damage: finalDamage, isCritical, bossHealth: Math.max(0, raid.boss.health) }
    },

    bossAttack(raidId) {
        const raid = this.activeRaids[raidId]
        if (!raid || raid.status !== 'ONGOING') return

        const aliveePlayers = raid.players.filter(p => p.alive)
        if (!aliveePlayers.length) {
            this.endRaid(raidId, 'LOSS')
            return
        }

        const target = aliveePlayers[Math.floor(Math.random() * aliveePlayers.length)]
        const damage = Math.floor(Math.random() * raid.boss.damage)
        target.health -= damage

        const message = `💢 Boss attacks @${target.id.split('@')[0]} for ${damage} damage!`
        raid.log.push(message)

        if (target.health <= 0) {
            target.alive = false
        }

        if (!aliveePlayers.length) {
            this.endRaid(raidId, 'LOSS')
        }
    },

    endRaid(raidId, result = 'LOSS') {
        const raid = this.activeRaids[raidId]
        if (!raid) return null

        raid.status = result
        raid.endTime = Date.now()

        return raid
    },

    getRaidRewards(raid) {
        const alivePlayers = raid.players.filter(p => p.alive).length
        const multiplier = alivePlayers > 0 ? 1 + (alivePlayers * 0.5) : 0

        return {
            exp: Math.floor(raid.boss.rewards.exp * multiplier),
            money: Math.floor(raid.boss.rewards.money * multiplier),
            diamond: Math.floor(raid.boss.rewards.diamond * multiplier),
            legendary: Math.floor(raid.boss.rewards.legendary * multiplier)
        }
    },

    formatRaidStatus(raid) {
        let text = `
╭━━━━━━━━━━━━━━━ ⚔️ ━━━━━━━━━━━━━━╮
┃ ${raid.boss.emoji} ${raid.boss.name} - ${raid.boss.rarity}
┃ Health: ${raid.boss.health}/${raid.boss.healthMax || 500}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

${raid.boss.description}

👥 *SQUAD STATUS:*
`
        raid.players.forEach(p => {
            const status = p.alive ? '✅' : '💀'
            text += `${status} @${p.id.split('@')[0]}: ${p.health}% | Damage: ${p.damage}\n`
        })

        text += `\n⏱️ Round: ${raid.round}`
        return text
    }
}

export default bossRaidSystem
