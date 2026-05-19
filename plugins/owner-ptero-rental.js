import '../config.js'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const AUTOMATION_VERSION = 1

let handler = async (m, { conn, args, text, usedPrefix, command, isROwner }) => {
  if (!isROwner) return global.dfail('rowner', m, conn)
  await startPteroRentalAutomation(conn)

  const sub = (args[0] || 'menu').toLowerCase()
  const cfg = getPanelConfig()
  const store = ensureRentalStore()

  try {
    switch (sub) {
      case 'menu':
      case 'help':
        return m.reply(helpText(usedPrefix, command))
      case 'add':
        return addRental(m, conn, cfg, text, usedPrefix, command)
      case 'set':
        return setRental(m, conn, cfg, text, usedPrefix, command)
      case 'extend':
      case 'perpanjang':
        return extendRental(m, conn, cfg, text, usedPrefix, command)
      case 'list':
        return listRentals(m, store)
      case 'info':
        return rentalInfo(m, store, args[1])
      case 'delete':
      case 'del':
      case 'remove':
        return deleteRental(m, store, args[1], usedPrefix, command)
      case 'check':
      case 'run':
        await runRentalScan(conn, { force: true })
        return m.reply('Scan rental panel selesai.')
      case 'enable':
        store.enabled = true
        await writeDb()
        return m.reply('Automation rental panel diaktifkan.')
      case 'disable':
        store.enabled = false
        await writeDb()
        return m.reply('Automation rental panel dimatikan.')
      default:
        return m.reply(`Sub-command tidak dikenal.\n\n${helpText(usedPrefix, command)}`)
    }
  } catch (error) {
    return m.reply(formatError(error))
  }
}

handler.before = async function () {
  await startPteroRentalAutomation(this)
}

handler.help = ['pterosewa <add|set|extend|list|info|delete|check|enable|disable>']
handler.tags = ['owner']
handler.command = /^(pterosewa|panelrent|pterorent)$/i
handler.rowner = true

export default handler

async function startPteroRentalAutomation(conn) {
  if (global.__pteroRentalAutomation?.started && global.__pteroRentalAutomation.version === AUTOMATION_VERSION) return
  if (global.__pteroRentalAutomation?.timer) clearInterval(global.__pteroRentalAutomation.timer)

  const cfg = getRentalConfig()
  global.__pteroRentalAutomation = {
    started: true,
    version: AUTOMATION_VERSION,
    running: false,
    timer: null
  }

  const run = () => runRentalScan(conn).catch(error => {
    console.error('[ptero-rental]', error)
  })

  global.__pteroRentalAutomation.timer = setInterval(run, cfg.checkIntervalMinutes * 60 * 1000)
  setTimeout(run, 5000)
}

async function runRentalScan(conn, options = {}) {
  const runtime = global.__pteroRentalAutomation
  if (!runtime || runtime.running) return

  const cfg = getPanelConfig()
  const rentalCfg = getRentalConfig()
  const store = ensureRentalStore()
  if (!options.force && (store.enabled === false || !rentalCfg.enabled)) return
  if (!cfg.domain || !cfg.apikey) return

  runtime.running = true
  store.lastScan = Date.now()

  try {
    const now = Date.now()
    const entries = Object.values(store.entries || {})
      .filter(item => item && item.status !== 'cancelled' && item.expiresAt > 0)
      .sort((a, b) => a.expiresAt - b.expiresAt)

    for (const rental of entries) {
      try {
        await processRentalEntry(conn, cfg, rentalCfg, rental, now)
      } catch (error) {
        rental.lastError = error?.message || String(error)
        rental.lastErrorAt = Date.now()
        if (rental.expiresAt <= now) rental.suspendError = rental.lastError
        console.error('[ptero-rental:entry]', rental.serverId, error)
      }
    }
  } finally {
    runtime.running = false
    await writeDb()
  }
}

async function processRentalEntry(conn, cfg, rentalCfg, rental, now) {
  const remaining = rental.expiresAt - now
  const reminderBefore = rentalCfg.reminderBeforeHours * HOUR
  const reminderInterval = rentalCfg.reminderIntervalHours * HOUR

  if (remaining > 0 && remaining <= reminderBefore) {
    const lastReminder = Number(rental.lastReminderAt || 0)
    if (now - lastReminder >= reminderInterval) {
      await sendRentalReminder(conn, rental, remaining)
      rental.lastReminderAt = now
      rental.reminderCount = Number(rental.reminderCount || 0) + 1
    }
    return
  }

  if (remaining > 0 || rental.status === 'suspended') return

  const server = await getAppServer(cfg, rental.serverId)
  rental.serverName = server.attributes.name
  rental.identifier = serverIdentifier(server.attributes)
  rental.ownerUserId = server.attributes.user

  if (!server.attributes.suspended) {
    await appApi(cfg, `/servers/${rental.serverId}/suspend`, { method: 'POST' })
  }

  rental.status = 'suspended'
  rental.suspendedAt = now
  rental.suspendError = ''
  await sendSuspendNotice(conn, rental)
}

async function addRental(m, conn, cfg, text, usedPrefix, command) {
  assertPanelConfig(cfg)
  const payload = splitPipePayload(text, 'add', 5)
  if (payload.length < 3) {
    throw new Error([
      `Format: ${usedPrefix + command} add <serverId>|<nomor/tag>|<hari>|[groupJid]|[note]`,
      `Contoh: ${usedPrefix + command} add 12|6281212345678|30`,
      `Contoh group: ${usedPrefix + command} add 12|@tag|30|-|VPS NodeJS`
    ].join('\n'))
  }

  const [serverId, ownerInput, daysInput, groupInput, note] = payload
  const days = parsePositiveNumber(daysInput, 'hari')
  const ownerJid = resolveJid(ownerInput, m)
  const groupJid = resolveGroupJid(groupInput, m)
  const server = await getAppServer(cfg, serverId)
  const now = Date.now()
  const existing = ensureRentalStore().entries[String(serverId)]
  const base = existing?.expiresAt > now ? existing.expiresAt : now

  const rental = upsertRental(server, {
    ownerJid,
    groupJid,
    expiresAt: base + days * DAY,
    note,
    status: 'active',
    lastReminderAt: 0,
    suspendedAt: 0,
    suspendError: ''
  })

  await writeDb()
  return m.reply(formatRentalSaved('SEWA PANEL DITAMBAHKAN', rental), null, {
    mentions: [ownerJid]
  })
}

async function setRental(m, conn, cfg, text, usedPrefix, command) {
  assertPanelConfig(cfg)
  const payload = splitPipePayload(text, 'set', 5)
  if (payload.length < 3) {
    throw new Error([
      `Format: ${usedPrefix + command} set <serverId>|<YYYY-MM-DD HH:mm>|<nomor/tag>|[groupJid]|[note]`,
      `Contoh: ${usedPrefix + command} set 12|2026-06-15 23:59|6281212345678`
    ].join('\n'))
  }

  const [serverId, dateInput, ownerInput, groupInput, note] = payload
  const expiresAt = parseDateTime(dateInput)
  const ownerJid = resolveJid(ownerInput, m)
  const groupJid = resolveGroupJid(groupInput, m)
  const server = await getAppServer(cfg, serverId)
  const rental = upsertRental(server, {
    ownerJid,
    groupJid,
    expiresAt,
    note,
    status: 'active',
    lastReminderAt: 0,
    suspendedAt: 0,
    suspendError: ''
  })

  await writeDb()
  return m.reply(formatRentalSaved('SEWA PANEL DISET', rental), null, {
    mentions: [ownerJid]
  })
}

async function extendRental(m, conn, cfg, text, usedPrefix, command) {
  assertPanelConfig(cfg)
  const payload = splitPipePayload(text, /^(extend|perpanjang)$/i, 2)
  if (payload.length < 2) {
    throw new Error([
      `Format: ${usedPrefix + command} extend <serverId>|<hari>`,
      `Contoh: ${usedPrefix + command} extend 12|30`
    ].join('\n'))
  }

  const [serverId, daysInput] = payload
  const store = ensureRentalStore()
  const rental = store.entries[String(serverId)]
  if (!rental) throw new Error('Data sewa server belum ada. Pakai add/set dulu.')

  const days = parsePositiveNumber(daysInput, 'hari')
  const now = Date.now()
  const base = rental.expiresAt > now ? rental.expiresAt : now
  rental.expiresAt = base + days * DAY
  rental.status = 'active'
  rental.lastReminderAt = 0
  rental.suspendError = ''

  const server = await getAppServer(cfg, serverId)
  rental.serverName = server.attributes.name
  rental.identifier = serverIdentifier(server.attributes)
  rental.ownerUserId = server.attributes.user

  if (server.attributes.suspended) {
    await appApi(cfg, `/servers/${serverId}/unsuspend`, { method: 'POST' })
    rental.unsuspendedAt = now
  }

  await writeDb()
  return m.reply(formatRentalSaved('SEWA PANEL DIPERPANJANG', rental), null, {
    mentions: [rental.ownerJid].filter(Boolean)
  })
}

function listRentals(m, store) {
  const rows = Object.values(store.entries || {})
    .sort((a, b) => a.expiresAt - b.expiresAt)
    .map(item => {
      const owner = item.ownerJid ? `@${item.ownerJid.split('@')[0]}` : '-'
      return [
        `${item.serverId}. ${item.serverName || '-'}`,
        `Owner: ${owner}`,
        `Expired: ${formatDate(item.expiresAt)} (${timeLeft(item.expiresAt - Date.now())})`,
        `Status: ${item.status || 'active'}`
      ].join('\n')
    })

  if (!rows.length) return m.reply('Belum ada data sewa panel.')
  const mentions = Object.values(store.entries || {}).map(item => item.ownerJid).filter(Boolean)
  return m.reply(`*LIST SEWA PANEL*\n\n${rows.join('\n\n')}`, null, { mentions })
}

function rentalInfo(m, store, serverId) {
  if (!serverId) throw new Error('Format: .pterosewa info <serverId>')
  const rental = store.entries[String(serverId)]
  if (!rental) throw new Error('Data sewa server tidak ditemukan.')
  return m.reply(formatRentalSaved('DETAIL SEWA PANEL', rental), null, {
    mentions: [rental.ownerJid].filter(Boolean)
  })
}

async function deleteRental(m, store, serverId, usedPrefix, command) {
  if (!serverId) throw new Error(`Format: ${usedPrefix + command} delete <serverId>`)
  if (!store.entries[String(serverId)]) throw new Error('Data sewa server tidak ditemukan.')
  delete store.entries[String(serverId)]
  await writeDb()
  return m.reply(`Data sewa panel server ${serverId} dihapus.`)
}

function upsertRental(server, values) {
  const store = ensureRentalStore()
  const s = server.attributes
  const serverId = String(s.id)
  const current = store.entries[serverId] || {}
  const rental = {
    ...current,
    serverId,
    identifier: serverIdentifier(s),
    serverName: s.name,
    ownerUserId: s.user,
    createdAt: current.createdAt || Date.now(),
    updatedAt: Date.now(),
    ...values
  }
  store.entries[serverId] = rental
  return rental
}

async function sendRentalReminder(conn, rental, remaining) {
  if (!conn?.sendMessage) return
  const mentions = [rental.ownerJid].filter(Boolean)
  const text = [
    '*REMINDER SEWA PANEL*',
    '',
    `${mentionText(rental.ownerJid)} masa sewa server hampir habis.`,
    `Server: ${rental.serverName || rental.serverId}`,
    `Server ID: ${rental.serverId}`,
    `Sisa waktu: ${timeLeft(remaining)}`,
    `Expired: ${formatDate(rental.expiresAt)}`,
    '',
    `Reminder otomatis setiap ${getRentalConfig().reminderIntervalHours} jam sampai diperpanjang.`
  ].join('\n')

  if (rental.groupJid) {
    await conn.sendMessage(rental.groupJid, { text, mentions })
    return
  }
  if (rental.ownerJid) await conn.sendMessage(rental.ownerJid, { text, mentions })
}

async function sendSuspendNotice(conn, rental) {
  if (!conn?.sendMessage) return
  const mentions = [rental.ownerJid].filter(Boolean)
  const text = [
    '*SEWA PANEL EXPIRED*',
    '',
    `${mentionText(rental.ownerJid)} server disuspend otomatis karena masa sewa selesai.`,
    `Server: ${rental.serverName || rental.serverId}`,
    `Server ID: ${rental.serverId}`,
    `Expired: ${formatDate(rental.expiresAt)}`,
    '',
    'Perpanjang dengan command owner:',
    `.pterosewa extend ${rental.serverId}|30`
  ].join('\n')

  if (rental.groupJid) await conn.sendMessage(rental.groupJid, { text, mentions })
  if (rental.ownerJid) await conn.sendMessage(rental.ownerJid, { text, mentions }).catch(() => {})
}

function ensureRentalStore() {
  if (!global.db?.data) return { enabled: true, entries: {} }
  if (!global.db.data.pteroRentals || typeof global.db.data.pteroRentals !== 'object') {
    global.db.data.pteroRentals = {}
  }
  const store = global.db.data.pteroRentals
  if (typeof store.enabled !== 'boolean') store.enabled = true
  if (!store.entries || typeof store.entries !== 'object') store.entries = {}
  if (!Number.isFinite(store.lastScan)) store.lastScan = 0
  return store
}

function getPanelConfig() {
  const source = global.panel || global.pterodactyl || {}
  return {
    domain: normalizeDomain(source.domain),
    apikey: source.apikey || source.applicationKey || source.appKey || '',
    c_apikey: source.c_apikey || source.clientKey || ''
  }
}

function getRentalConfig() {
  const source = global.pteroRental || {}
  return {
    enabled: source.enabled !== false,
    checkIntervalMinutes: Math.max(1, Number(source.checkIntervalMinutes || 10)),
    reminderBeforeHours: Math.max(1, Number(source.reminderBeforeHours || 24)),
    reminderIntervalHours: Math.max(1, Number(source.reminderIntervalHours || 5))
  }
}

function assertPanelConfig(cfg) {
  if (!cfg.domain || !cfg.apikey) {
    throw new Error('Config panel belum lengkap: isi PTERO_DOMAIN dan PTERO_APPLICATION_KEY di config/env.')
  }
}

async function getAppServer(cfg, serverId) {
  if (!serverId) throw new Error('Server ID kosong.')
  const res = await appApi(cfg, `/servers/${serverId}`)
  if (!res?.attributes) throw new Error('Server panel tidak ditemukan.')
  return res
}

async function appApi(cfg, path, options = {}) {
  return request(`${cfg.domain}/api/application${path}`, cfg.apikey, options)
}

async function request(url, token, options = {}) {
  const method = options.method || 'GET'
  const init = {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  }
  if (options.body !== undefined && method !== 'GET') init.body = JSON.stringify(options.body)

  const res = await fetch(url, init)
  if (res.status === 204) return { ok: true }

  const raw = await res.text()
  const data = raw ? safeJson(raw) : {}
  if (!res.ok || data.errors) {
    const message = data.errors?.[0]?.detail || data.errors?.[0]?.title || data.message || `HTTP ${res.status}`
    throw new Error(message)
  }
  return data
}

function splitPipePayload(text, subCommand, maxParts) {
  const raw = String(text || '').trim()
  let payload = raw
  if (subCommand instanceof RegExp) {
    const firstWord = raw.split(/\s+/, 1)[0] || ''
    if (subCommand.test(firstWord)) payload = raw.slice(firstWord.length).trim()
  } else {
    payload = raw.replace(new RegExp(`^${escapeRegex(subCommand)}\\s+`, 'i'), '')
  }
  return payload.split('|').map(v => v.trim()).slice(0, maxParts)
}

function resolveJid(value, m) {
  const mentioned = m.mentionedJid?.[0]
  if ((!value || value === '@tag') && mentioned) return mentioned
  if (value && value.includes('@s.whatsapp.net')) return value
  const number = String(value || '').replace(/[^0-9]/g, '')
  if (!number) throw new Error('Nomor/tag user WhatsApp tidak valid.')
  return `${number}@s.whatsapp.net`
}

function resolveGroupJid(value, m) {
  if (!value || value === '-') return m.isGroup ? m.chat : ''
  if (value.endsWith('@g.us')) return value
  throw new Error('groupJid harus kosong, -, atau berakhiran @g.us.')
}

function parsePositiveNumber(value, label) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} harus angka lebih dari 0.`)
  return number
}

function parseDateTime(value) {
  const normalized = String(value || '').trim().replace(' ', 'T')
  const date = new Date(normalized)
  const time = date.getTime()
  if (!Number.isFinite(time)) throw new Error('Tanggal tidak valid. Format: YYYY-MM-DD HH:mm')
  return time
}

function formatRentalSaved(title, rental) {
  return [
    `*${title}*`,
    '',
    `Server: ${rental.serverName || '-'}`,
    `Server ID: ${rental.serverId}`,
    `Identifier: ${rental.identifier || '-'}`,
    `Panel owner user ID: ${rental.ownerUserId || '-'}`,
    `WA user: ${mentionText(rental.ownerJid)}`,
    `Group tag: ${rental.groupJid || '-'}`,
    `Expired: ${formatDate(rental.expiresAt)}`,
    `Sisa: ${timeLeft(rental.expiresAt - Date.now())}`,
    `Status: ${rental.status || 'active'}`,
    `Note: ${rental.note || '-'}`
  ].join('\n')
}

function formatDate(ms) {
  if (!ms) return '-'
  return new Date(ms).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function timeLeft(ms) {
  if (!Number.isFinite(ms)) return '-'
  if (ms <= 0) return 'expired'
  const days = Math.floor(ms / DAY)
  const hours = Math.floor((ms % DAY) / HOUR)
  const minutes = Math.floor((ms % HOUR) / 60000)
  if (days > 0) return `${days} hari ${hours} jam`
  if (hours > 0) return `${hours} jam ${minutes} menit`
  return `${minutes} menit`
}

function mentionText(jid) {
  return jid ? `@${jid.split('@')[0]}` : '-'
}

function normalizeDomain(domain = '') {
  return String(domain).trim().replace(/\/+$/, '')
}

function serverIdentifier(server) {
  return server.identifier || shortUuid(server.uuid)
}

function shortUuid(uuid = '') {
  return String(uuid).split('-')[0]
}

function safeJson(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return { raw }
  }
}

function escapeRegex(value) {
  return String(value).replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&')
}

function formatError(error) {
  return `*Ptero rental error:*\n${error?.message || String(error)}`
}

async function writeDb() {
  if (global.db?.write) await global.db.write().catch(console.error)
}

function helpText(usedPrefix, command) {
  const cmd = usedPrefix + command
  return [
    '*PTERODACTYL RENTAL AUTOMATION*',
    '',
    `${cmd} add <serverId>|<nomor/tag>|<hari>|[groupJid]|[note]`,
    `${cmd} set <serverId>|<YYYY-MM-DD HH:mm>|<nomor/tag>|[groupJid]|[note]`,
    `${cmd} extend <serverId>|<hari>`,
    `${cmd} list`,
    `${cmd} info <serverId>`,
    `${cmd} delete <serverId>`,
    `${cmd} check`,
    `${cmd} enable`,
    `${cmd} disable`,
    '',
    'Automation:',
    '- Reminder mulai H-1 sebelum expired.',
    '- Reminder dikirim setiap 5 jam.',
    '- Jika groupJid ada, user akan ditag di grup.',
    '- Saat expired, server disuspend via Application API panel.'
  ].join('\n')
}

startPteroRentalAutomation(global.conn).catch(error => {
  console.error('[ptero-rental:init]', error)
})
