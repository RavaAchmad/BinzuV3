import { CLASSES } from '../rpg.constants.js'
import { requiredExp, safeNumber } from '../rpg.utils.js'

export function addExp(player, amount = 0) {
  player.exp = safeNumber(player.exp) + Math.max(0, safeNumber(amount))
  const levelUps = []

  while (player.exp >= requiredExp(player.level)) {
    player.exp -= requiredExp(player.level)
    player.level += 1
    applyLevelGrowth(player)
    levelUps.push(player.level)
  }

  return levelUps
}

function applyLevelGrowth(player) {
  const growth = CLASSES[player.class]?.growth || CLASSES.warrior.growth
  for (const [stat, amount] of Object.entries(growth)) {
    if (player.stats && stat in player.stats) {
      player.stats[stat] = safeNumber(player.stats[stat]) + safeNumber(amount)
      continue
    }
    player[stat] = safeNumber(player[stat]) + safeNumber(amount)
    if (stat === 'maxHp') player.hp = Math.min(player.maxHp, safeNumber(player.hp) + safeNumber(amount))
    if (stat === 'maxMp') player.mp = Math.min(player.maxMp, safeNumber(player.mp) + safeNumber(amount))
  }
}
