import { CLASSES } from '../rpg.constants.js'
import { clamp, formatNumber, normalizeId, requiredExp, safeNumber } from '../rpg.utils.js'
import { addItem } from './inventorySystem.js'
import { ensureEquipment, getEquipmentStats } from './equipmentSystem.js'

export function normalizeClass(input = '') {
  const id = normalizeId(input)
  return CLASSES[id] ? id : ''
}

export function createPlayer(userId, name, classId = 'warrior') {
  const klass = CLASSES[classId] || CLASSES.warrior
  const player = {
    userId,
    name: String(name || 'Player').slice(0, 32),
    class: klass.id,
    level: 1,
    exp: 0,
    gold: 100,
    hp: 100,
    maxHp: 100,
    mp: 30,
    maxMp: 30,
    energy: 30,
    maxEnergy: 30,
    stats: { ...klass.stats },
    location: 'beginner_forest',
    inventory: {},
    equipment: {},
    quests: {},
    cooldowns: {},
    lastEnergyRegenAt: Date.now(),
    lastDailyClaimAt: 0,
    dailyStreak: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  addItem(player, 'potion', 3)
  addItem(player, 'mana_potion', 1)
  addItem(player, 'wooden_sword', 1)
  addItem(player, 'leather_armor', 1)
  ensureEquipment(player).weapon = 'wooden_sword'
  ensureEquipment(player).armor = 'leather_armor'
  player.quests.tutorial_slime = { id: 'tutorial_slime', current: 0, completed: false, claimed: false }
  return player
}

export function sanitizePlayer(player) {
  if (!player || typeof player !== 'object') return null
  player.level = Math.max(1, Math.floor(safeNumber(player.level, 1)))
  player.exp = Math.max(0, safeNumber(player.exp))
  player.gold = Math.max(0, safeNumber(player.gold))
  player.maxHp = Math.max(1, safeNumber(player.maxHp, 100))
  player.maxMp = Math.max(0, safeNumber(player.maxMp, 30))
  player.maxEnergy = Math.max(1, safeNumber(player.maxEnergy, 30))
  player.hp = clamp(player.hp, 0, player.maxHp)
  player.mp = clamp(player.mp, 0, player.maxMp)
  player.energy = clamp(player.energy, 0, player.maxEnergy)
  if (!player.stats || typeof player.stats !== 'object') player.stats = { atk: 10, def: 5, int: 3, agi: 5, luk: 5 }
  for (const key of ['atk', 'def', 'int', 'agi', 'luk']) player.stats[key] = Math.max(0, safeNumber(player.stats[key]))
  if (!player.inventory || typeof player.inventory !== 'object') player.inventory = {}
  ensureEquipment(player)
  if (!player.quests || typeof player.quests !== 'object') player.quests = {}
  if (!player.cooldowns || typeof player.cooldowns !== 'object') player.cooldowns = {}
  if (!player.location) player.location = 'beginner_forest'
  return player
}

export function getEffectiveStats(player) {
  sanitizePlayer(player)
  const equip = getEquipmentStats(player)
  return {
    atk: safeNumber(player.stats.atk) + equip.atk,
    def: safeNumber(player.stats.def) + equip.def,
    int: safeNumber(player.stats.int) + equip.int,
    agi: safeNumber(player.stats.agi) + equip.agi,
    luk: safeNumber(player.stats.luk) + equip.luk,
    maxHp: safeNumber(player.maxHp) + equip.maxHp,
    maxMp: safeNumber(player.maxMp) + equip.maxMp
  }
}

export function calculatePower(player) {
  const stats = getEffectiveStats(player)
  return Math.floor(
    safeNumber(player.level) * 35 +
    stats.atk * 5 +
    stats.def * 4 +
    stats.int * 4 +
    stats.agi * 3 +
    stats.luk * 2 +
    stats.maxHp * 0.5 +
    stats.maxMp * 0.4
  )
}

export function formatProfile(player) {
  sanitizePlayer(player)
  const stats = getEffectiveStats(player)
  const crit = Math.min(30, stats.luk * 0.5).toFixed(1).replace('.0', '')
  return [
    '👤 *PROFILE*',
    '',
    `Nama: ${player.name}`,
    `Class: ${CLASSES[player.class]?.name || player.class}`,
    `Level: ${player.level}`,
    `EXP: ${formatNumber(player.exp)}/${formatNumber(requiredExp(player.level))}`,
    `Gold: ${formatNumber(player.gold)}`,
    '',
    `HP: ${formatNumber(player.hp)}/${formatNumber(stats.maxHp)}`,
    `MP: ${formatNumber(player.mp)}/${formatNumber(stats.maxMp)}`,
    `Energy: ${formatNumber(player.energy)}/${formatNumber(player.maxEnergy)}`,
    '',
    `ATK: ${formatNumber(stats.atk)}`,
    `DEF: ${formatNumber(stats.def)}`,
    `INT: ${formatNumber(stats.int)}`,
    `AGI: ${formatNumber(stats.agi)}`,
    `CRIT: ${crit}%`,
    `POWER: ${formatNumber(calculatePower(player))}`
  ].join('\n')
}
