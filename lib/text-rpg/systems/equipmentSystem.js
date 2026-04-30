import { EQUIPMENT_SLOTS, ITEMS } from '../rpg.constants.js'
import { findItemId, formatNumber, itemName, safeNumber } from '../rpg.utils.js'
import { hasItem } from './inventorySystem.js'

export function ensureEquipment(player) {
  if (!player.equipment || typeof player.equipment !== 'object') player.equipment = {}
  for (const slot of EQUIPMENT_SLOTS) if (!(slot in player.equipment)) player.equipment[slot] = null
  return player.equipment
}

export function equipItem(player, input) {
  const itemId = findItemId(input)
  const item = ITEMS[itemId]
  if (!item) return { ok: false, message: 'Equipment tidak ditemukan.' }
  if (item.type !== 'equipment' || !item.slot) return { ok: false, message: `${item.name} bukan equipment.` }
  if (!hasItem(player, itemId)) return { ok: false, message: `${item.name} belum ada di inventory.` }

  ensureEquipment(player)[item.slot] = itemId
  return { ok: true, message: `${item.name} dipakai di slot ${item.slot}.` }
}

export function getEquipmentStats(player) {
  const total = { atk: 0, def: 0, int: 0, agi: 0, luk: 0, maxHp: 0, maxMp: 0 }
  const equipment = ensureEquipment(player)
  for (const itemId of Object.values(equipment)) {
    const stats = ITEMS[itemId]?.stats || {}
    for (const key of Object.keys(total)) total[key] += safeNumber(stats[key])
  }
  return total
}

export function formatEquipment(player) {
  const equipment = ensureEquipment(player)
  return EQUIPMENT_SLOTS.map(slot => {
    const itemId = equipment[slot]
    const item = ITEMS[itemId]
    const stats = item?.stats
      ? Object.entries(item.stats).map(([key, value]) => `${key}+${formatNumber(value)}`).join(', ')
      : ''
    return `- ${slot}: ${itemId ? `${itemName(itemId)}${stats ? ` (${stats})` : ''}` : '-'}`
  }).join('\n')
}
