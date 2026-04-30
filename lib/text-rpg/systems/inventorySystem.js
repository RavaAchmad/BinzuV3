import { ITEMS } from '../rpg.constants.js'
import { findItemId, formatNumber, itemName, limitLines, safeNumber } from '../rpg.utils.js'

export function ensureInventory(player) {
  if (!player.inventory || typeof player.inventory !== 'object') player.inventory = {}
  return player.inventory
}

export function addItem(player, itemId, qty = 1) {
  if (!ITEMS[itemId]) return false
  const inventory = ensureInventory(player)
  const amount = Math.max(1, Math.floor(safeNumber(qty, 1)))
  inventory[itemId] = safeNumber(inventory[itemId]) + amount
  return true
}

export function removeItem(player, itemId, qty = 1) {
  const inventory = ensureInventory(player)
  const amount = Math.max(1, Math.floor(safeNumber(qty, 1)))
  if (safeNumber(inventory[itemId]) < amount) return false
  inventory[itemId] -= amount
  if (inventory[itemId] <= 0) delete inventory[itemId]
  return true
}

export function hasItem(player, itemId, qty = 1) {
  return safeNumber(ensureInventory(player)[itemId]) >= Math.max(1, Math.floor(safeNumber(qty, 1)))
}

export function useItem(player, input) {
  const itemId = findItemId(input)
  const item = ITEMS[itemId]
  if (!item) return { ok: false, message: 'Item tidak ditemukan.' }
  if (item.type !== 'consumable') return { ok: false, message: `${item.name} bukan consumable.` }
  if (!hasItem(player, itemId)) return { ok: false, message: `${item.name} tidak ada di inventory.` }

  removeItem(player, itemId, 1)
  const healedHp = item.use?.hp ? Math.min(player.maxHp, player.hp + item.use.hp) - player.hp : 0
  const healedMp = item.use?.mp ? Math.min(player.maxMp, player.mp + item.use.mp) - player.mp : 0
  const restoredEnergy = item.use?.energy ? Math.min(player.maxEnergy, player.energy + item.use.energy) - player.energy : 0
  player.hp += healedHp
  player.mp += healedMp
  player.energy += restoredEnergy

  const effects = []
  if (healedHp) effects.push(`HP +${healedHp}`)
  if (healedMp) effects.push(`MP +${healedMp}`)
  if (restoredEnergy) effects.push(`Energy +${restoredEnergy}`)
  return { ok: true, itemId, message: `Memakai ${item.name}. ${effects.join(', ') || 'Tidak ada efek.'}` }
}

export function formatInventory(player) {
  const inventory = ensureInventory(player)
  const entries = Object.entries(inventory).filter(([, qty]) => safeNumber(qty) > 0)
  if (!entries.length) return 'Inventory kosong.'

  const lines = entries.map(([itemId, qty]) => {
    const item = ITEMS[itemId] || {}
    const price = item.sellPrice ? ` | sell ${formatNumber(item.sellPrice)}` : ''
    return `- ${itemName(itemId)} x${formatNumber(qty)} (${item.type || 'unknown'}${price})`
  })
  return limitLines(lines, 18).join('\n')
}
