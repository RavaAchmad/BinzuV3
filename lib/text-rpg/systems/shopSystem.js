import { ITEMS, SHOP_ITEMS } from '../rpg.constants.js'
import { findItemId, formatNumber, itemName, safeNumber } from '../rpg.utils.js'
import { addItem, hasItem, removeItem } from './inventorySystem.js'

export function formatShop() {
  return [
    '🏪 *RPG SHOP*',
    '',
    ...SHOP_ITEMS.map(itemId => {
      const item = ITEMS[itemId]
      return `- ${item.name}: ${formatNumber(item.price)} gold (${item.type})`
    }),
    '',
    'Beli: rpg buy potion',
    'Jual: rpg sell slime_gel'
  ].join('\n')
}

export function buyItem(player, input, qty = 1) {
  const itemId = findItemId(input)
  const item = ITEMS[itemId]
  const amount = Math.max(1, Math.floor(safeNumber(qty, 1)))
  if (!item || !SHOP_ITEMS.includes(itemId)) return { ok: false, message: 'Item tidak ada di shop.' }
  const cost = safeNumber(item.price) * amount
  if (safeNumber(player.gold) < cost) return { ok: false, message: `Gold kurang. Butuh ${formatNumber(cost)}.` }
  player.gold -= cost
  addItem(player, itemId, amount)
  return { ok: true, message: `Membeli ${item.name} x${amount} seharga ${formatNumber(cost)} gold.` }
}

export function sellItem(player, input, qty = 1) {
  const itemId = findItemId(input)
  const item = ITEMS[itemId]
  const amount = Math.max(1, Math.floor(safeNumber(qty, 1)))
  if (!item) return { ok: false, message: 'Item tidak ditemukan.' }
  if (!hasItem(player, itemId, amount)) return { ok: false, message: `${itemName(itemId)} tidak cukup.` }
  const value = safeNumber(item.sellPrice) * amount
  if (value <= 0) return { ok: false, message: `${item.name} tidak bisa dijual.` }
  removeItem(player, itemId, amount)
  player.gold += value
  return { ok: true, message: `Menjual ${item.name} x${amount}. Gold +${formatNumber(value)}.` }
}
