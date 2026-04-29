import { jidDecode, areJidsSameUser } from 'baileys'

/**
 * JID/LID Helper - Native compatibility layer for Baileys 7.x+
 * Handles both @s.whatsapp.net (PN) and @lid (LID) formats transparently
 */

const S_WHATSAPP_NET = '@s.whatsapp.net'
const LID_SUFFIX = '@lid'
const GROUP_SUFFIX = '@g.us'

/**
 * Check if JID is a phone-number based user
 */
export function isPnJid(jid) {
  return typeof jid === 'string' && jid.endsWith(S_WHATSAPP_NET)
}

/**
 * Check if JID is a LID-based user
 */
export function isLidJid(jid) {
  return typeof jid === 'string' && jid.endsWith(LID_SUFFIX)
}

/**
 * Check if JID is a group
 */
export function isGroupJid(jid) {
  return typeof jid === 'string' && jid.endsWith(GROUP_SUFFIX)
}

/**
 * Extract the raw number/id part from any JID format
 */
export function extractNumber(jid) {
  if (!jid || typeof jid !== 'string') return ''
  const decoded = jidDecode(jid)
  return decoded?.user || jid.split('@')[0] || ''
}

/**
 * Normalize a JID - decode and clean up
 */
export function normalizeJid(jid) {
  if (!jid || typeof jid !== 'string') return ''
  try {
    const decoded = jidDecode(jid)
    if (decoded?.user && decoded?.server) {
      return `${decoded.user}@${decoded.server}`
    }
  } catch {}
  return jid.trim()
}

/**
 * Convert phone number to JID format
 */
export function numberToJid(number) {
  if (!number) return ''
  const clean = String(number).replace(/[^0-9]/g, '')
  return clean + S_WHATSAPP_NET
}

/**
 * Extract a usable JID from Baileys participant shapes.
 * Baileys versions may expose participants as strings, { id }, { jid },
 * { phoneNumber }, or LID-based objects.
 */
export function getParticipantJid(participant, conn = null) {
  if (!participant) return ''

  let raw = ''
  let fromPhoneNumber = false
  if (typeof participant === 'string' || typeof participant === 'number') {
    raw = participant
  } else if (typeof participant === 'object') {
    fromPhoneNumber = Boolean(participant.phoneNumber)
    raw = [
      participant.phoneNumber,
      participant.jid,
      participant.id,
      participant.lid,
      participant.participant,
      participant.user
    ].find(value => (typeof value === 'string' || typeof value === 'number') && value) || ''
  }

  if ((typeof raw !== 'string' && typeof raw !== 'number') || !raw) return ''
  raw = String(raw)

  let jid = raw.includes('@') ? raw : numberToJid(raw)

  if (!fromPhoneNumber) {
    try {
      const resolved = conn?.getJid?.(jid) || conn?.getJid?.(raw)
      if (typeof resolved === 'string' && resolved) jid = resolved
    } catch {}
  }

  return normalizeJid(jid)
}

/**
 * Extract unique participant JIDs from a group metadata participant list.
 */
export function getParticipantJids(participants = [], conn = null) {
  const seen = new Set()
  const result = []

  for (const participant of participants || []) {
    const jid = getParticipantJid(participant, conn)
    if (!jid || seen.has(jid)) continue
    seen.add(jid)
    result.push(jid)
  }

  return result
}

export function formatMention(jid) {
  const id = extractNumber(getParticipantJid(jid) || jid)
  return id ? `@${id}` : '@unknown'
}

export function isBadDisplayName(name) {
  if (typeof name !== 'string') return true
  const value = name.trim()
  return !value ||
    value === '[object Object]' ||
    value === '[object Promise]' ||
    value.toLowerCase() === 'no name' ||
    value.toLowerCase() === 'no push name' ||
    value.toLowerCase() === 'undefined' ||
    value.toLowerCase() === 'null'
}

export function safeDisplayName(name, fallback = '') {
  return isBadDisplayName(name) ? fallback : name.trim()
}

/**
 * Multi-format JID comparison - works across PN and LID
 * Uses conn to resolve LID↔PN if available
 */
export function jidEqual(jid1, jid2, conn = null) {
  if (!jid1 || !jid2) return false
  
  // Direct comparison
  if (areJidsSameUser(jid1, jid2)) return true
  
  // Cross-format: try resolving via conn
  if (conn) {
    try {
      const resolved1 = conn.getJid?.(jid1) || jid1
      const resolved2 = conn.getJid?.(jid2) || jid2
      if (areJidsSameUser(resolved1, resolved2)) return true
    } catch {}
  }
  
  return false
}

/**
 * Check if a JID is in an admin/owner list, handling LID↔PN
 */
export function isJidInList(jid, list, conn = null) {
  if (!jid || !Array.isArray(list)) return false
  
  for (const item of list) {
    // Direct match
    if (areJidsSameUser(jid, item)) return true
    
    // Number-only match (config might store just numbers)
    const jidNum = extractNumber(jid)
    const itemNum = extractNumber(item)
    if (jidNum && itemNum && jidNum === itemNum) return true
    
    // Cross-format via conn  
    if (conn) {
      try {
        const resolvedJid = conn.getJid?.(jid) || jid
        const resolvedItem = conn.getJid?.(item) || item
        if (areJidsSameUser(resolvedJid, resolvedItem)) return true
      } catch {}
    }
  }
  
  return false
}

/**
 * Resolve LID to PN using all available methods
 * Returns original JID if can't resolve
 */
export async function resolveLid(conn, lid) {
  if (!lid || !isLidJid(lid)) return lid
  
  // 1. Check storeLid cache
  if (conn?.storeLid?.[lid]) return conn.storeLid[lid]
  
  // 2. Check signalRepository
  try {
    const pn = conn?.signalRepository?.lidMapping?.getPNForLID?.(lid)
    if (pn) {
      const jid = pn.includes('@') ? pn : pn + S_WHATSAPP_NET
      if (!conn.storeLid) conn.storeLid = {}
      conn.storeLid[lid] = jid
      return jid
    }
  } catch {}
  
  // 3. Search group participants
  try {
    for (const chat of Object.values(conn?.chats || {})) {
      const participants = chat?.metadata?.participants || chat?.participants
      if (!participants) continue
      
      const found = participants.find(p => p.id === lid || p.lid === lid)
      if (found) {
        const pn = found.phoneNumber
          ? (found.phoneNumber.includes('@') ? found.phoneNumber : found.phoneNumber + S_WHATSAPP_NET)
          : found.id?.endsWith(S_WHATSAPP_NET) ? found.id : null
        
        if (pn) {
          if (!conn.storeLid) conn.storeLid = {}
          conn.storeLid[lid] = pn
          return pn
        }
      }
    }
  } catch {}
  
  return lid
}

/**
 * Batch resolve multiple LIDs
 */
export async function resolveLids(conn, lids) {
  return Promise.all(lids.map(lid => resolveLid(conn, lid)))
}

/**
 * Get preferred JID for sending messages
 * v7+ prefers LID but PN still works
 */
export function getSendableJid(jid) {
  if (!jid || typeof jid !== 'string') return jid
  // Both formats work for sending
  return normalizeJid(jid)
}

export default {
  isPnJid,
  isLidJid,
  isGroupJid,
  extractNumber,
  normalizeJid,
  numberToJid,
  getParticipantJid,
  getParticipantJids,
  formatMention,
  isBadDisplayName,
  safeDisplayName,
  jidEqual,
  isJidInList,
  resolveLid,
  resolveLids,
  getSendableJid
}
