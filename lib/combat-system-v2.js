/**
 * ============================================
 * ADVANCED COMBAT SYSTEM v2.0
 * ============================================
 * Professional turn-based combat with full RPG integration
 * 
 * Features:
 * - Skill-based ability system
 * - Realistic damage calculation
 * - Status effects (bleed, stun, slow, heal)
 * - Multiplayer dungeon sync
 * - Dynamic difficulty scaling
 */

import { GAME_CONFIG, SKILL_DATABASE, EQUIPMENT_DATABASE, GameBalance } from './rpg-core-engine.js'

class CombatSession {
  constructor(players = [], enemy = {}, difficulty = 'NORMAL') {
    this.id = Date.now() + Math.random()
    this.state = 'preparing' // preparing, ongoing, finished
    this.startTime = Date.now()
    this.difficulty = difficulty
    this.turn = 0
    this.maxTurns = 50

    // Participants
    this.players = players.map((p, i) => ({
      ...p,
      combatId: i,
      isPlayer: true,
      hp: p.stats.hp,
      mana: p.stats.mana,
      status: {
        stun: 0,
        heal_over_time: 0,
        damage_shield: 0,
        dodge: 0
      },
      stats: { ...p.stats },
      combatLog: []
    }))

    this.enemy = {
      id: enemy.id || 'enemy_' + Date.now(),
      name: enemy.name || 'Monster',
      level: enemy.level || 10,
      hp: enemy.hp || 100,
      maxHp: enemy.hp || 100,
      mana: 100,
      maxMana: 100,
      isPlayer: false,
      stats: {
        hp: 100,
        mana: 100,
        str: 10,
        agi: 10,
        def: 10,
        mag: 10,
        crit: 5
      },
      status: {
        stun: 0,
        bleed: 0,
        slow: 0
      },
      combatLog: [],
      abilities: enemy.abilities || ['attack'],
      nextAction: null
    }

    this.log = []
    this.rewards = null
  }

  /**
   * Start the combat session
   */
  start() {
    this.state = 'ongoing'
    this.log.push(`⚔️ Combat started! ${this.players.map(p => p.name).join(', ')} vs ${this.enemy.name}`)
    return this.getStatus()
  }

  /**
   * Get current combat status
   */
  getStatus() {
    return {
      id: this.id,
      state: this.state,
      turn: this.turn,
      difficulty: this.difficulty,
      players: this.players.map(p => ({
        id: p.userId,
        name: p.name,
        hp: p.hp,
        maxHp: p.stats.hp,
        mana: p.mana,
        maxMana: p.stats.mana,
        level: p.level,
        status: p.status,
        isAlive: p.hp > 0
      })),
      enemy: {
        name: this.enemy.name,
        level: this.enemy.level,
        hp: this.enemy.hp,
        maxHp: this.enemy.maxHp,
        status: this.enemy.status,
        isAlive: this.enemy.hp > 0
      },
      recentLog: this.log.slice(-5)
    }
  }

  /**
   * Player action: Attack
   */
  playerAttack(playerId, abilityName = 'slash') {
    if (this.state !== 'ongoing') return { error: 'Combat not ongoing' }
    
    const player = this.players.find(p => p.userId === playerId)
    if (!player || !player.hp > 0) return { error: 'Player not found or dead' }

    const skillData = SKILL_DATABASE[player.skill.name]
    const ability = (skillData && (skillData.abilities && skillData.abilities[abilityName])) || (skillData && skillData.abilities && skillData.abilities['slash'])
    
    if (!ability) return { error: 'Ability not found' }
    if (ability.manaCost && player.mana < ability.manaCost) return { error: 'Not enough mana' }
    if (ability.levelReq && player.skill.level < ability.levelReq) return { error: 'Skill level too low' }

    // Deduct mana
    if (ability.manaCost) player.mana -= ability.manaCost

    // Calculate damage
    const { damage, isCrit } = GameBalance.calcDamage(
      player.stats,
      this.enemy.stats,
      ((EQUIPMENT_DATABASE.weapons[player.equipment.weapon] && EQUIPMENT_DATABASE.weapons[player.equipment.weapon].dmgBonus) || 10),
      ability.dmgMult || 1
    )

    this.enemy.hp = Math.max(0, this.enemy.hp - damage)

    const action = `${player.name} uses ${ability.name}! [${Math.floor(damage)} damage]${isCrit ? ' 💥 CRIT!' : ''}`
    this.log.push(action)
    player.combatLog.push(action)

    // Enemy AI counter attack
    this.enemyTurn()

    // Check combat end
    if (this.enemy.hp <= 0) {
      this.finishCombat(true)
    } else if (this.players.every(p => p.hp <= 0)) {
      this.finishCombat(false)
    }

    return this.getStatus()
  }

  /**
   * Enemy AI turn
   */
  enemyTurn() {
    if (this.enemy.hp <= 0) return

    // Simple AI: attack random player
    const alivePlayer = this.players.filter(p => p.hp > 0)[0]
    if (!alivePlayer) return

    const baseDamage = 20 + (this.enemy.level * 1.5)
    const variance = baseDamage * (0.85 + Math.random() * 0.3)
    const { damage: finalDamage } = GameBalance.calcDamage(
      this.enemy.stats,
      alivePlayer.stats,
      baseDamage,
      1
    )

    alivePlayer.hp = Math.max(0, alivePlayer.hp - finalDamage)
    
    const action = `${this.enemy.name} attacks ${alivePlayer.name}! [${Math.floor(finalDamage)} damage]`
    this.log.push(action)
  }

  /**
   * Finish combat and calculate rewards
   */
  finishCombat(playerWon) {
    this.state = 'finished'

    if (playerWon) {
      const expPerPlayer = GameBalance.calcActivityExp('dungeon', (this.players[0] && this.players[0].level) || 10, (this.players[0] && this.players[0].skill && this.players[0].skill.level) || 1)
      const moneyPerPlayer = Math.floor(50 * this.getDifficultyMultiplier())
      const drops = this.generateDrops()

      this.rewards = {
        won: true,
        expPerPlayer,
        moneyPerPlayer,
        drops,
        messages: [
          `🎉 Victory! Enemy defeated!`,
          `💰 Each player gained ${expPerPlayer} exp and ${moneyPerPlayer} money`,
          drops.length > 0 ? `📦 Items dropped: ${drops.join(', ')}` : '📭 No items dropped'
        ]
      }
    } else {
      const expPenalty = Math.floor((this.players[0] && this.players[0].stats && this.players[0].stats.str) * 5 || 50)
      this.rewards = {
        won: false,
        expLoss: expPenalty,
        moneyLoss: Math.floor((this.players[0] && this.players[0].money) * 0.1 || 0),
        messages: [
          `💀 Defeat! You were overwhelmed`,
          `⚠️ Lost ${expPenalty} experience`
        ]
      }
    }

    this.log.push(`Combat finished: ${playerWon ? 'VICTORY' : 'DEFEAT'}`)
    return this.rewards
  }

  /**
   * Get difficulty multiplier
   */
  getDifficultyMultiplier() {
    const multipliers = {
      'EASY': 0.7,
      'NORMAL': 1,
      'HARD': 1.8,
      'NIGHTMARE': 3,
      'INFERNO': 5
    }
    return multipliers[this.difficulty] || 1
  }

  /**
   * Generate item drops
   */
  generateDrops() {
    const drops = []
    const dropChance = GameBalance.getDropRate(this.getDifficultyMultiplier(), (this.players[0] && this.players[0].stats && this.players[0].stats.luck) || 1)
    
    if (Math.random() * 100 < dropChance) {
      drops.push('Common Loot')
    }
    if (Math.random() * 100 < dropChance * 0.5) {
      drops.push('Rare Loot')
    }

    return drops
  }
}

// ============= BOSS RAID SYSTEM =============
class BossRaidSession extends CombatSession {
  constructor(boss, players = []) {
    const bossStats = {
      id: boss.id,
      name: boss.name,
      level: boss.level || 50,
      hp: boss.maxHp || 1000,
      abilities: ['heavy_attack', 'mass_attack', 'special_ability']
    }

    super(players, bossStats, 'NIGHTMARE')
    this.boss = boss
    this.maxTurns = 100
    this.enrageAt = Math.floor(this.boss.maxHp * 0.25) // Boss gets angry at 25% HP
    this.isEnraged = false
  }

  /**
   * Override enemy turn for boss behavior
   */
  enemyTurn() {
    if (this.enemy.hp <= 0) return

    const alivePlayer = this.players.filter(p => p.hp > 0)[0]
    if (!alivePlayer) return

    // Boss uses different attacks based on HP
    let multiplier = 1
    if (this.enemy.hp < this.enrageAt && !this.isEnraged) {
      this.isEnraged = true
      this.log.push(`🔴 ${this.enemy.name} ENRAGES! STR +50%!`)
    }

    if (this.isEnraged) multiplier = 1.5

    const baseDamage = 50 + (this.enemy.level * 2)
    const { damage: finalDamage } = GameBalance.calcDamage(
      { ...this.enemy.stats, str: this.enemy.stats.str * multiplier },
      alivePlayer.stats,
      baseDamage,
      multiplier
    )

    alivePlayer.hp = Math.max(0, alivePlayer.hp - finalDamage)
    this.log.push(`🐉 ${this.enemy.name} unleashes a powerful attack on ${alivePlayer.name}! [${Math.floor(finalDamage)} damage]`)
  }
}

// ============= EXPORTS =============
export { CombatSession, BossRaidSession }
