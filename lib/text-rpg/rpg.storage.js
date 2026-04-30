import { RPG_NS } from './rpg.constants.js'
import { asObject } from './rpg.utils.js'

export function getRpgStore(db = global.db) {
  if (!db.data || typeof db.data !== 'object') db.data = {}
  for (const key of Object.values(RPG_NS)) {
    if (!db.data[key] || typeof db.data[key] !== 'object') db.data[key] = {}
  }
  return {
    players: db.data[RPG_NS.players],
    battles: db.data[RPG_NS.battles],
    sessions: db.data[RPG_NS.sessions],
    meta: db.data[RPG_NS.meta]
  }
}

export function battleKey(userId) {
  return `rpg:battle:${userId}`
}

export function sessionKey(type, userId) {
  return `rpg:${type}:${userId}`
}

export function getPlayer(db, userId) {
  return getRpgStore(db).players[userId] || null
}

export function savePlayer(db, player) {
  if (!player?.userId) return null
  player.updatedAt = Date.now()
  getRpgStore(db).players[player.userId] = player
  return player
}

export function listPlayers(db) {
  return Object.values(getRpgStore(db).players).filter(Boolean)
}

export function getBattle(db, userId) {
  return getRpgStore(db).battles[battleKey(userId)] || null
}

export function saveBattle(db, userId, battle) {
  if (!battle) return null
  battle.key = battleKey(userId)
  battle.userId = userId
  battle.updatedAt = Date.now()
  getRpgStore(db).battles[battle.key] = battle
  return battle
}

export function deleteBattle(db, userId) {
  delete getRpgStore(db).battles[battleKey(userId)]
}

export function getSession(db, type, userId) {
  return getRpgStore(db).sessions[sessionKey(type, userId)] || null
}

export function saveSession(db, type, userId, value) {
  getRpgStore(db).sessions[sessionKey(type, userId)] = asObject(value)
}

export function deleteSession(db, type, userId) {
  delete getRpgStore(db).sessions[sessionKey(type, userId)]
}
