import { ITEMS } from './rpg.constants.js'

export function now() {
  return Date.now()
}

export function safeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, safeNumber(value, min)))
}

export function randomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function rollChance(percent) {
  return Math.random() * 100 < safeNumber(percent)
}

export function weightedPick(entries = []) {
  const safeEntries = entries.filter(entry => entry && safeNumber(entry.weight) > 0)
  const total = safeEntries.reduce((sum, entry) => sum + safeNumber(entry.weight), 0)
  if (!total) return null
  let roll = Math.random() * total
  for (const entry of safeEntries) {
    roll -= safeNumber(entry.weight)
    if (roll <= 0) return entry
  }
  return safeEntries[safeEntries.length - 1] || null
}

export function requiredExp(level) {
  return Math.max(100, safeNumber(level, 1) * 100)
}

export function formatNumber(value) {
  return safeNumber(value).toLocaleString('id-ID')
}

export function todayKey(time = now()) {
  return new Date(time).toISOString().slice(0, 10)
}

export function normalizeId(text = '') {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export function findItemId(input = '') {
  const query = normalizeId(input)
  if (!query) return ''
  if (ITEMS[query]) return query
  return Object.keys(ITEMS).find(itemId => normalizeId(ITEMS[itemId].name) === query) || ''
}

export function itemName(itemId) {
  return ITEMS[itemId]?.name || itemId || 'Unknown Item'
}

export function asObject(value) {
  return value && typeof value === 'object' ? value : {}
}

export function limitLines(lines = [], max = 10) {
  const visible = lines.slice(0, max)
  if (lines.length > max) visible.push(`...dan ${lines.length - max} lagi`)
  return visible
}
