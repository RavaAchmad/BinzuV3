import { MONSTERS } from '../rpg.constants.js'
import { randomInt, weightedPick } from '../rpg.utils.js'
import { consumeEnergy } from './energySystem.js'
import { createBattle } from './battleSystem.js'

const EXPLORE_TABLE = [
  { type: 'monster', weight: 65 },
  { type: 'material', weight: 15 },
  { type: 'chest', weight: 10 },
  { type: 'trap', weight: 5 },
  { type: 'rare', weight: 5 }
]

export function explore(player) {
  const energy = consumeEnergy(player, 1)
  if (!energy.ok) return { ok: false, text: energy.message }

  const encounter = weightedPick(EXPLORE_TABLE)?.type || 'monster'
  if (encounter === 'monster') {
    const monsterId = pickMonster(player.level)
    return {
      ok: true,
      type: 'battle',
      battle: createBattle(player, monsterId),
      text: `⚔️ *Battle!*\n\nKamu bertemu ${MONSTERS[monsterId].name}.\nPilih aksi: Attack / Skill / Item / Run`
    }
  }

  if (encounter === 'material') {
    return { ok: true, type: 'reward', text: '⛏️ Kamu menemukan material di hutan.', reward: { exp: 8, gold: 0, items: { iron_ore: randomInt(1, 2) } } }
  }

  if (encounter === 'chest') {
    return { ok: true, type: 'reward', text: '🎁 Kamu menemukan chest kecil.', reward: { exp: 12, gold: randomInt(25, 60), items: { potion: 1 } } }
  }

  if (encounter === 'trap') {
    const damage = randomInt(5, 18)
    player.hp = Math.max(1, player.hp - damage)
    return { ok: true, type: 'text', text: `🪤 Kamu kena trap. HP -${damage}\nHP: ${player.hp}/${player.maxHp}` }
  }

  return { ok: true, type: 'reward', text: '✨ Rare encounter! NPC misterius memberimu bekal.', reward: { exp: 25, gold: 80, items: { energy_potion: 1 } } }
}

function pickMonster(level = 1) {
  const pool = Object.values(MONSTERS).filter(monster => monster.level <= Math.max(1, level + 1))
  return (pool[Math.floor(Math.random() * pool.length)] || MONSTERS.slime).id
}
