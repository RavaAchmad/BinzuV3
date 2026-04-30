import { CLASSES } from './rpg.constants.js'
import { getBattle, getPlayer, listPlayers, saveBattle, savePlayer, deleteBattle } from './rpg.storage.js'
import { normalizeId } from './rpg.utils.js'
import { battleButtons, classButtons, formatRpgMenu, helpText, menuButtons } from './rpg.menu.js'
import { performBattleAction, isBattleExpired } from './systems/battleSystem.js'
import { claimDaily } from './systems/dailySystem.js'
import { equipItem, formatEquipment } from './systems/equipmentSystem.js'
import { explore } from './systems/exploreSystem.js'
import { buyItem, formatShop, sellItem } from './systems/shopSystem.js'
import { formatInventory, useItem } from './systems/inventorySystem.js'
import { createPlayer, formatProfile, normalizeClass, sanitizePlayer } from './systems/playerSystem.js'
import { claimQuest, ensureQuests, formatQuestList, progressQuest } from './systems/questSystem.js'
import { formatLeaderboard } from './systems/leaderboardSystem.js'
import { formatReward, grantRewards, rollMonsterRewards } from './systems/rewardSystem.js'
import { regenerateEnergy } from './systems/energySystem.js'

export function isTextRpgSubcommand(args = []) {
  const sub = normalizeId(args[0] || 'menu')
  return [
    'menu', 'start', 'profile', 'explore', 'hunt', 'quest', 'claim', 'inv', 'inventory',
    'equipment', 'equip', 'shop', 'buy', 'sell', 'daily', 'top', 'leaderboard',
    'help', 'attack', 'skill', 'item', 'use', 'run'
  ].includes(sub)
}

export async function handleRpgService({ db = global.db, userId, userName, args = [], prefix = '.' }) {
  const sub = normalizeId(args[0] || 'menu')
  const player = getPlayer(db, userId)

  if (sub === 'help') return response(helpText(prefix), menuButtons(prefix, player), 'RPG Help')
  if (sub === 'top' || sub === 'leaderboard') return response(formatLeaderboard(listPlayers(db)), menuButtons(prefix, player), 'RPG Leaderboard')
  if (sub === 'menu' || sub === '') return menuResponse(player, prefix)
  if (sub === 'start') return startPlayer(db, userId, userName, args, prefix)

  if (!player) {
    return response(
      `Kamu belum punya karakter RPG.\n\nKetik ${prefix}rpg start atau pilih class di bawah.`,
      classButtons(prefix),
      'RPG Start'
    )
  }

  sanitizePlayer(player)
  regenerateEnergy(player)
  ensureQuests(player)

  switch (sub) {
    case 'profile':
      savePlayer(db, player)
      return response(formatProfile(player), menuButtons(prefix, player), 'RPG Profile')
    case 'explore':
    case 'hunt':
      return exploreCommand(db, player, prefix)
    case 'attack':
    case 'skill':
    case 'item':
    case 'run':
      return battleCommand(db, player, sub, args.slice(1), prefix)
    case 'quest':
      savePlayer(db, player)
      return response(`📜 *QUEST*\n\n${formatQuestList(player)}\n\nClaim: ${prefix}rpg claim quest`, menuButtons(prefix, player), 'RPG Quest')
    case 'claim':
      return claimQuestCommand(db, player, args.slice(1), prefix)
    case 'inv':
    case 'inventory':
      savePlayer(db, player)
      return response(`🎒 *INVENTORY*\n\n${formatInventory(player)}\n\nUse: ${prefix}rpg use potion`, menuButtons(prefix, player), 'RPG Inventory')
    case 'use':
      return useItemCommand(db, player, args.slice(1), prefix)
    case 'equipment':
      savePlayer(db, player)
      return response(`🛡️ *EQUIPMENT*\n\n${formatEquipment(player)}\n\nEquip: ${prefix}rpg equip wooden_sword`, menuButtons(prefix, player), 'RPG Equipment')
    case 'equip':
      return equipCommand(db, player, args.slice(1), prefix)
    case 'shop':
      return response(formatShop(), menuButtons(prefix, player), 'RPG Shop')
    case 'buy':
      return buyCommand(db, player, args.slice(1), prefix)
    case 'sell':
      return sellCommand(db, player, args.slice(1), prefix)
    case 'daily':
      return dailyCommand(db, player, prefix)
    default:
      return response(`Command RPG tidak dikenal.\n\n${helpText(prefix)}`, menuButtons(prefix, player), 'RPG Help')
  }
}

function menuResponse(player, prefix) {
  return response(formatRpgMenu(player, prefix), menuButtons(prefix, player), 'RPG Menu')
}

function startPlayer(db, userId, userName, args, prefix) {
  const existing = getPlayer(db, userId)
  if (existing) {
    sanitizePlayer(existing)
    regenerateEnergy(existing)
    savePlayer(db, existing)
    return response(`${formatProfile(existing)}\n\nKarakter sudah ada.`, menuButtons(prefix, existing), 'RPG Profile')
  }

  const classId = normalizeClass(args[1] || '')
  if (!classId) {
    return response([
      '⚔️ *START RPG*',
      '',
      'Pilih class awal:',
      ...Object.values(CLASSES).map(klass => `- ${klass.name}: ${klass.description}`),
      '',
      `Contoh: ${prefix}rpg start warrior`
    ].join('\n'), classButtons(prefix), 'RPG Start')
  }

  const customName = args.slice(2).join(' ').trim()
  const player = createPlayer(userId, customName || userName, classId)
  ensureQuests(player)
  savePlayer(db, player)
  return response([
    '✅ *Karakter dibuat!*',
    '',
    `Nama: ${player.name}`,
    `Class: ${CLASSES[player.class].name}`,
    'Starter item: Potion x3, Mana Potion x1, Wooden Sword, Leather Armor',
    '',
    'Tutorial quest aktif: Slime Problem',
    `Mulai main: ${prefix}rpg explore`
  ].join('\n'), menuButtons(prefix, player), 'RPG Start')
}

function exploreCommand(db, player, prefix) {
  const activeBattle = getBattle(db, player.userId)
  if (activeBattle && !isBattleExpired(activeBattle)) {
    return response('Kamu masih dalam battle.\nPilih aksi di bawah.', battleButtons(prefix), 'RPG Battle')
  }
  if (activeBattle) deleteBattle(db, player.userId)

  const result = explore(player)
  if (!result.ok) {
    savePlayer(db, player)
    return response(result.text, menuButtons(prefix, player), 'RPG Explore')
  }

  if (result.type === 'battle') {
    saveBattle(db, player.userId, result.battle)
    savePlayer(db, player)
    return response(`${result.text}\n\nEnergy: ${player.energy}/${player.maxEnergy}`, battleButtons(prefix), 'RPG Battle')
  }

  if (result.type === 'reward') {
    const rewards = grantRewards(player, result.reward)
    savePlayer(db, player)
    return response(`${result.text}\n\n🎁 *Reward*\n${formatReward(rewards)}`, menuButtons(prefix, player), 'RPG Explore')
  }

  savePlayer(db, player)
  return response(result.text, menuButtons(prefix, player), 'RPG Explore')
}

function battleCommand(db, player, action, args, prefix) {
  const battle = getBattle(db, player.userId)
  if (!battle || isBattleExpired(battle)) {
    if (battle) deleteBattle(db, player.userId)
    return response(`Tidak ada battle aktif.\nMulai dengan ${prefix}rpg explore`, menuButtons(prefix, player), 'RPG Battle')
  }

  const result = performBattleAction(player, battle, action, args.join(' '))
  if (!result.ok) return response(result.text, battleButtons(prefix), 'RPG Battle')

  if (result.escaped || result.defeated) {
    deleteBattle(db, player.userId)
    savePlayer(db, player)
    return response(result.text, menuButtons(prefix, player), 'RPG Battle')
  }

  if (result.victory) {
    deleteBattle(db, player.userId)
    const reward = rollMonsterRewards(result.monsterId)
    const rewardResult = grantRewards(player, reward)
    const questLines = progressQuest(player, 'kill', result.monsterId)
    savePlayer(db, player)
    return response([
      `${result.text}`,
      '',
      '✅ *Victory!*',
      '',
      formatReward(rewardResult),
      questLines.length ? `\nQuest:\n${questLines.join('\n')}` : ''
    ].filter(Boolean).join('\n'), menuButtons(prefix, player), 'RPG Victory')
  }

  saveBattle(db, player.userId, battle)
  savePlayer(db, player)
  return response(result.text, battleButtons(prefix), 'RPG Battle')
}

function claimQuestCommand(db, player, args, prefix) {
  if (normalizeId(args[0] || '') === 'quest') args = args.slice(1)
  const claim = claimQuest(player, args.join(' '))
  if (!claim.ok) {
    savePlayer(db, player)
    return response(claim.message, menuButtons(prefix, player), 'RPG Quest')
  }
  const rewards = grantRewards(player, claim.quest.reward)
  savePlayer(db, player)
  return response(`✅ Quest diklaim: ${claim.quest.name}\n\n${formatReward(rewards)}`, menuButtons(prefix, player), 'RPG Quest')
}

function useItemCommand(db, player, args, prefix) {
  const result = useItem(player, args.join(' '))
  savePlayer(db, player)
  return response(result.message, menuButtons(prefix, player), 'RPG Inventory')
}

function equipCommand(db, player, args, prefix) {
  const result = equipItem(player, args.join(' '))
  savePlayer(db, player)
  return response(result.message, menuButtons(prefix, player), 'RPG Equipment')
}

function buyCommand(db, player, args, prefix) {
  const result = buyItem(player, args[0], args[1])
  savePlayer(db, player)
  return response(result.message, menuButtons(prefix, player), 'RPG Shop')
}

function sellCommand(db, player, args, prefix) {
  const result = sellItem(player, args[0], args[1])
  savePlayer(db, player)
  return response(result.message, menuButtons(prefix, player), 'RPG Shop')
}

function dailyCommand(db, player, prefix) {
  const result = claimDaily(player)
  savePlayer(db, player)
  return response(result.ok ? result.text : result.message, menuButtons(prefix, player), 'RPG Daily')
}

function response(text, buttons = [], footer = 'RPG') {
  return { text, buttons, footer }
}
