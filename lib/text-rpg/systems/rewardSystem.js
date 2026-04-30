import { MONSTERS } from '../rpg.constants.js'
import { formatNumber, itemName, randomInt, rollChance, safeNumber } from '../rpg.utils.js'
import { addItem } from './inventorySystem.js'
import { addExp } from './levelingSystem.js'

export function grantRewards(player, reward = {}) {
  const exp = Math.max(0, safeNumber(reward.exp))
  const gold = Math.max(0, safeNumber(reward.gold))
  const items = reward.items || {}
  const drops = []

  player.gold = Math.max(0, safeNumber(player.gold) + gold)
  const levelUps = addExp(player, exp)

  for (const [itemId, qty] of Object.entries(items)) {
    const amount = Math.max(1, Math.floor(safeNumber(qty, 1)))
    if (addItem(player, itemId, amount)) drops.push({ itemId, qty: amount })
  }

  return { exp, gold, drops, levelUps }
}

export function rollMonsterRewards(monsterId) {
  const monster = MONSTERS[monsterId]
  if (!monster) return { exp: 0, gold: 0, items: {} }
  const items = {}
  for (const drop of monster.drops || []) {
    if (!rollChance(drop.chance)) continue
    items[drop.itemId] = (items[drop.itemId] || 0) + randomInt(drop.min || 1, drop.max || 1)
  }
  return { exp: monster.exp, gold: monster.gold, items }
}

export function formatReward(result) {
  const lines = [
    `EXP +${formatNumber(result.exp)}`,
    `Gold +${formatNumber(result.gold)}`
  ]
  if (result.drops?.length) {
    lines.push('', 'Drop:')
    for (const drop of result.drops) lines.push(`- ${itemName(drop.itemId)} x${formatNumber(drop.qty)}`)
  }
  if (result.levelUps?.length) {
    lines.push('', `Level Up! Sekarang level ${result.levelUps[result.levelUps.length - 1]}`)
  }
  return lines.join('\n')
}
