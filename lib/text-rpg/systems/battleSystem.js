import { BATTLE_EXPIRE_MS, MONSTERS } from '../rpg.constants.js'
import { clamp, randomInt, safeNumber } from '../rpg.utils.js'
import { useItem } from './inventorySystem.js'
import { getEffectiveStats } from './playerSystem.js'

export function createBattle(player, monsterId) {
  const base = MONSTERS[monsterId] || MONSTERS.slime
  return {
    userId: player.userId,
    monsterId: base.id,
    monster: { ...base, hp: base.hp, maxHp: base.hp },
    turn: 1,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

export function isBattleExpired(battle) {
  return !battle?.updatedAt || Date.now() - battle.updatedAt > BATTLE_EXPIRE_MS
}

export function performBattleAction(player, battle, action = 'attack', input = '') {
  if (!battle || isBattleExpired(battle)) return { ok: false, expired: true, text: 'Battle sudah expired. Mulai lagi dengan rpg explore.' }
  const monster = battle.monster
  const lines = []

  if (action === 'run') {
    if (Math.random() < 0.65) return { ok: true, escaped: true, text: '🏃 Kamu berhasil kabur dari battle.' }
    lines.push('Gagal kabur!')
  } else if (action === 'item') {
    const used = useItem(player, input || 'potion')
    if (!used.ok) return { ok: false, text: used.message }
    lines.push(used.message)
  } else {
    const result = action === 'skill' ? skillDamage(player, monster) : attackDamage(player, monster)
    if (!result.ok) return { ok: false, text: result.message }
    monster.hp = Math.max(0, monster.hp - result.damage)
    lines.push(`${result.label} memberi ${result.damage} damage${result.crit ? ' CRIT!' : ''}`)
  }

  if (monster.hp <= 0) {
    return { ok: true, victory: true, monsterId: battle.monsterId, text: lines.join('\n') }
  }

  const monsterDamage = getMonsterDamage(player, monster)
  player.hp = clamp(player.hp - monsterDamage, 0, player.maxHp)
  lines.push(`${monster.name} menyerang balik: ${monsterDamage} damage.`)

  if (player.hp <= 0) {
    player.hp = Math.max(1, Math.floor(player.maxHp * 0.25))
    return { ok: true, defeated: true, text: `${lines.join('\n')}\n\n💀 Kamu kalah. HP dipulihkan sedikit, coba lagi setelah siap.` }
  }

  battle.turn += 1
  battle.updatedAt = Date.now()
  return {
    ok: true,
    text: `${lines.join('\n')}\n\n${monster.name}: ${monster.hp}/${monster.maxHp} HP\nKamu: ${player.hp}/${player.maxHp} HP`
  }
}

function attackDamage(player, monster) {
  const stats = getEffectiveStats(player)
  let damage = Math.max(1, stats.atk + randomInt(1, 5) - safeNumber(monster.def))
  const crit = Math.random() * 100 < Math.min(30, stats.luk * 0.5)
  if (crit) damage = Math.floor(damage * 1.5)
  return { ok: true, label: 'Attack', damage, crit }
}

function skillDamage(player, monster) {
  const stats = getEffectiveStats(player)
  const cost = 5
  if (player.mp < cost) return { ok: false, message: 'MP kurang untuk skill. Pakai rpg item mana_potion atau attack biasa.' }
  player.mp -= cost

  let base = stats.atk + randomInt(3, 8)
  let label = 'Skill'
  if (player.class === 'mage') {
    base = stats.int + randomInt(8, 14)
    label = 'Fire Bolt'
  } else if (player.class === 'cleric') {
    const heal = Math.min(player.maxHp - player.hp, 18 + Math.floor(stats.int * 0.6))
    player.hp += heal
    label = `Smite + Heal ${heal}`
    base = Math.floor(stats.int * 0.7) + randomInt(4, 9)
  } else if (player.class === 'rogue') {
    base = stats.atk + stats.agi + randomInt(3, 8)
    label = 'Backstab'
  } else {
    base = stats.atk + randomInt(6, 12)
    label = 'Power Slash'
  }

  const damage = Math.max(1, base - Math.floor(safeNumber(monster.def) * 0.5))
  return { ok: true, label, damage, crit: false }
}

function getMonsterDamage(player, monster) {
  const stats = getEffectiveStats(player)
  return Math.max(1, safeNumber(monster.atk) + randomInt(1, 4) - stats.def)
}
