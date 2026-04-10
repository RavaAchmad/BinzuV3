/**
 * Easter Event Plugin — Theme: Easter 🥚
 * .paskah — Tukar telur paskah dengan rewards
 * Obtained from: .explore (25% chance, 3-5 telur)
 * 
 * Exchange rates adjusted to bot economy
 */
import { listMenu } from '../lib/buttons.js'

const EASTER_SHOP = {
  // Money & Chip exchanges
  money: { cost: 5, reward: { money: 500000 }, emoji: '💰', desc: '500K Money' },
  chip: { cost: 3, reward: { chip: 50 }, emoji: '🎰', desc: '50 Chip' },
  diamond: { cost: 10, reward: { diamond: 25 }, emoji: '💎', desc: '25 Diamond' },
  emerald: { cost: 8, reward: { emerald: 15 }, emoji: '💚', desc: '15 Emerald' },
  potion: { cost: 2, reward: { potion: 10 }, emoji: '🧪', desc: '10 Potion' },
  petfood: { cost: 2, reward: { petfood: 15 }, emoji: '🍖', desc: '15 Pet Food' },
  crate: { cost: 15, reward: { legendary: 1 }, emoji: '📦', desc: '1 Legendary Crate' },
  // SP Gear — Egg Hunter Sword (Special Rarity, event-only)
  egghunter: { cost: 50, reward: { gear: 'egg_hunter' }, emoji: '🥚🗡️', desc: 'Egg Hunter (SP Weapon)', oneTime: true },
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender]
  let telur = user.paskah || 0

  if (!args[0] || args[0].toLowerCase() === 'shop') {
    let text = `🐰 *EVENT PASKAH — Easter Shop* 🥚\n\n`
    text += `🥚 Telur kamu: *${telur}*\n\n`
    text += `📋 *Tukar Telur:*\n`
    
    for (let [key, item] of Object.entries(EASTER_SHOP)) {
      let owned = ''
      if (item.oneTime && user.easterRedeemed?.[key]) owned = ' ✅ (sudah dimiliki)'
      text += `${item.emoji} *${key}* — ${item.desc} (${item.cost} 🥚)${owned}\n`
    }

    // Interactive list
    const rows = Object.entries(EASTER_SHOP).map(([key, item]) => {
      let owned = (item.oneTime && user.easterRedeemed?.[key]) ? ' ✅' : ''
      return {
        id: `${usedPrefix}paskah ${key}`,
        title: `${item.emoji} ${key}${owned}`,
        description: `${item.desc} — ${item.cost} 🥚`
      }
    })

    return await listMenu(conn, m.chat, text.trim(), `Dapatkan telur dari .explore (25%)`, '🥚 Pilih Item', [{
      title: 'Easter Shop',
      rows
    }])
  }

  const itemKey = args[0].toLowerCase()
  const amount = Math.max(1, parseInt(args[1]) || 1)
  const item = EASTER_SHOP[itemKey]

  if (!item) return m.reply(`❌ Item tidak ditemukan!\nKetik ${usedPrefix}paskah untuk lihat shop.`)

  // One-time check for SP gear
  if (item.oneTime) {
    if (!user.easterRedeemed) user.easterRedeemed = {}
    if (user.easterRedeemed[itemKey]) return m.reply('❌ Kamu sudah pernah menukar item ini! (SP item hanya bisa 1x)')
  }

  const totalCost = item.cost * (item.oneTime ? 1 : amount)
  if (telur < totalCost) return m.reply(`❌ Telur kurang!\nButuh: *${totalCost}* 🥚 | Punya: *${telur}* 🥚`)

  // Deduct eggs
  user.paskah -= totalCost

  // Apply rewards
  if (item.reward.gear) {
    // SP Gear reward — store in user's gear inventory
    if (!user.gearInventory) user.gearInventory = []
    user.gearInventory.push({
      id: item.reward.gear,
      name: '🥚🗡️ Egg Hunter',
      type: 'weapon',
      rarity: 'SP',
      dmgBonus: 80,
      obtained: 'Easter Event',
      timestamp: Date.now()
    })
    if (!user.easterRedeemed) user.easterRedeemed = {}
    user.easterRedeemed[itemKey] = true
    return m.reply(`✅ *Easter Reward Claimed!*\n\n🥚🗡️ *Egg Hunter* (SP Weapon)\n_"Senjata Pemburu Telur Legendaris!"_\n\nDMG Bonus: +80\nRarity: ⚜️ Special\n\n🥚 Sisa telur: ${user.paskah}`)
  }

  // Normal item rewards
  let rewardText = []
  for (let [key, val] of Object.entries(item.reward)) {
    let totalVal = val * amount
    user[key] = (user[key] || 0) + totalVal
    rewardText.push(`${item.emoji} +${totalVal.toLocaleString('id-ID')} ${key}`)
  }

  m.reply(`✅ *Easter Exchange!*\n\n🥚 -${totalCost} Telur\n${rewardText.join('\n')}\n\n🥚 Sisa telur: ${user.paskah}`)
}

handler.help = ['paskah']
handler.tags = ['event']
handler.command = /^(paskah|easter)$/i
handler.register = true
handler.group = true
handler.rpg = true

export default handler
