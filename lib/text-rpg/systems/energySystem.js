import { ENERGY_REGEN_MS } from '../rpg.constants.js'
import { clamp, safeNumber } from '../rpg.utils.js'

export function regenerateEnergy(player, time = Date.now()) {
  player.maxEnergy = Math.max(1, safeNumber(player.maxEnergy, 30))
  player.energy = clamp(player.energy, 0, player.maxEnergy)
  player.lastEnergyRegenAt = safeNumber(player.lastEnergyRegenAt, time)

  if (player.energy >= player.maxEnergy) {
    player.lastEnergyRegenAt = time
    return 0
  }

  const ticks = Math.floor((time - player.lastEnergyRegenAt) / ENERGY_REGEN_MS)
  if (ticks <= 0) return 0

  const before = player.energy
  player.energy = Math.min(player.maxEnergy, player.energy + ticks)
  player.lastEnergyRegenAt += ticks * ENERGY_REGEN_MS
  if (player.energy >= player.maxEnergy) player.lastEnergyRegenAt = time
  return player.energy - before
}

export function consumeEnergy(player, amount = 1) {
  regenerateEnergy(player)
  amount = Math.max(1, safeNumber(amount, 1))
  if (player.energy < amount) {
    return {
      ok: false,
      message: `Energy kurang. Butuh ${amount}, energy kamu ${player.energy}/${player.maxEnergy}.`
    }
  }
  player.energy -= amount
  return { ok: true }
}
