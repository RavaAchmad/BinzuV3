import '../config.js'
import { sizeFormatter } from 'human-readable'

const formatSize = sizeFormatter()
const jsonHeaders = (token) => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`
})

let handler = async (m, { conn, args, text, usedPrefix, command, isROwner }) => {
  if (!isROwner) return global.dfail('rowner', m, conn)

  const cfg = getPanelConfig()
  if (!cfg.domain || !cfg.apikey) {
    return m.reply([
      '*Config panel belum lengkap.*',
      '',
      'Set di config.js atau environment:',
      '- PTERO_DOMAIN',
      '- PTERO_APPLICATION_KEY',
      '- PTERO_CLIENT_KEY untuk resource/power/backup'
    ].join('\n'))
  }

  const sub = (args[0] || 'menu').toLowerCase()
  const rest = args.slice(1)

  try {
    switch (sub) {
      case 'menu':
      case 'help':
        return m.reply(helpText(usedPrefix, command))
      case 'status':
        return statusPanel(m, cfg)
      case 'list':
        return listResource(m, cfg, rest)
      case 'info':
        return serverInfo(m, cfg, rest[0])
      case 'limits':
        return updateLimits(m, cfg, text, usedPrefix, command)
      case 'details':
        return updateDetails(m, cfg, text, usedPrefix, command)
      case 'startup':
        return updateStartup(m, cfg, text, usedPrefix, command)
      case 'power':
        return powerAction(m, cfg, rest, usedPrefix, command)
      case 'suspend':
      case 'unsuspend':
      case 'reinstall':
        return serverAdminAction(m, cfg, sub, rest[0], usedPrefix, command)
      case 'backup':
        return backupAction(m, cfg, rest, usedPrefix, command)
      default:
        return m.reply(`Sub-command tidak dikenal.\n\n${helpText(usedPrefix, command)}`)
    }
  } catch (error) {
    return m.reply(formatError(error))
  }
}

handler.help = ['ptero <menu|status|list|info|limits|details|startup|power|backup>']
handler.tags = ['owner']
handler.command = /^(ptero|pteroadmin|panelx)$/i
handler.rowner = true

export default handler

function getPanelConfig() {
  const source = global.panel || global.pterodactyl || {}
  return {
    domain: normalizeDomain(source.domain),
    apikey: source.apikey || source.applicationKey || source.appKey || '',
    c_apikey: source.c_apikey || source.clientKey || '',
    defaultNest: Number(source.defaultNest || source.nest || 6),
    defaultEgg: Number(source.defaultEgg || source.egg || 0),
    defaultLocation: Number(source.defaultLocation || source.location || 1),
    dockerImage: source.dockerImage || 'ghcr.io/xm4ze/xmpanels:20',
    startup: source.startup || 'node run.js'
  }
}

function normalizeDomain(domain = '') {
  return String(domain).trim().replace(/\/+$/, '')
}

async function statusPanel(m, cfg) {
  const [servers, users, nodes, locations] = await Promise.all([
    appApi(cfg, '/servers?per_page=1'),
    appApi(cfg, '/users?per_page=1'),
    appApi(cfg, '/nodes?per_page=1'),
    appApi(cfg, '/locations?per_page=1')
  ])

  return m.reply([
    '*PTERODACTYL PANEL STATUS*',
    '',
    `Domain: ${cfg.domain}`,
    `Servers: ${countOf(servers)}`,
    `Users: ${countOf(users)}`,
    `Nodes: ${countOf(nodes)}`,
    `Locations: ${countOf(locations)}`,
    `Client API: ${cfg.c_apikey ? 'Ready' : 'Not configured'}`
  ].join('\n'))
}

async function listResource(m, cfg, args) {
  const type = (args[0] || 'servers').toLowerCase()
  const page = Number(args[1] || 1)

  if (type === 'servers') {
    const res = await appApi(cfg, `/servers?page=${page}&per_page=15`)
    const rows = (res.data || []).map(({ attributes: s }) => {
      const suspended = s.suspended ? 'suspended' : 'active'
      return `${s.id}. ${s.name} | ${s.identifier || shortUuid(s.uuid)} | ${s.limits.memory}MB/${s.limits.disk}MB/${s.limits.cpu}% | ${suspended}`
    })
    return m.reply(pagedText('SERVERS', rows, res))
  }

  if (type === 'users') {
    const res = await appApi(cfg, `/users?page=${page}&per_page=15`)
    const rows = (res.data || []).map(({ attributes: u }) => {
      return `${u.id}. ${u.username} | ${u.email} | admin=${Boolean(u.root_admin)}`
    })
    return m.reply(pagedText('USERS', rows, res))
  }

  if (type === 'nodes') {
    const res = await appApi(cfg, `/nodes?page=${page}&per_page=15`)
    const rows = (res.data || []).map(({ attributes: n }) => {
      return `${n.id}. ${n.name} | ${n.fqdn} | ${n.memory}MB/${n.disk}MB`
    })
    return m.reply(pagedText('NODES', rows, res))
  }

  if (type === 'locations') {
    const res = await appApi(cfg, `/locations?page=${page}&per_page=15`)
    const rows = (res.data || []).map(({ attributes: l }) => `${l.id}. ${l.short} | ${l.long || '-'}`)
    return m.reply(pagedText('LOCATIONS', rows, res))
  }

  if (type === 'eggs') {
    const nestId = Number(args[1] || cfg.defaultNest)
    const res = await appApi(cfg, `/nests/${nestId}/eggs?include=variables&per_page=100`)
    const rows = (res.data || []).map(({ attributes: e }) => `${e.id}. ${e.name} | ${e.docker_image || '-'}`)
    return m.reply(pagedText(`EGGS NEST ${nestId}`, rows, res))
  }

  throw new Error('List type valid: servers, users, nodes, locations, eggs')
}

async function serverInfo(m, cfg, serverId) {
  if (!serverId) throw new Error('Format: .ptero info <serverId>')

  const server = await getAppServer(cfg, serverId)
  const s = server.attributes
  let resourceText = 'Client resource: skipped'

  if (cfg.c_apikey) {
    try {
      const resources = await clientApi(cfg, `/servers/${serverIdentifier(s)}/resources`)
      const r = resources.attributes.resources
      resourceText = [
        `State: ${resources.attributes.current_state}`,
        `CPU: ${Number(r.cpu_absolute || 0).toFixed(2)}% / ${s.limits.cpu || 'unlimited'}%`,
        `RAM: ${formatSize(r.memory_bytes || 0)} / ${s.limits.memory ? `${s.limits.memory} MB` : 'unlimited'}`,
        `Disk: ${formatSize(r.disk_bytes || 0)} / ${s.limits.disk ? `${s.limits.disk} MB` : 'unlimited'}`,
        `Network: down ${formatSize(r.network_rx_bytes || 0)} / up ${formatSize(r.network_tx_bytes || 0)}`
      ].join('\n')
    } catch (error) {
      resourceText = `Client resource error: ${error.message}`
    }
  }

  return m.reply([
    `*SERVER ${s.id} - ${s.name}*`,
    '',
    `UUID: ${s.uuid}`,
    `Identifier: ${serverIdentifier(s)}`,
    `Owner user ID: ${s.user}`,
    `Description: ${s.description || '-'}`,
    `Suspended: ${Boolean(s.suspended)}`,
    `Limits: ${s.limits.memory}MB RAM / ${s.limits.disk}MB disk / ${s.limits.cpu}% CPU`,
    `Features: db ${s.feature_limits.databases}, backups ${s.feature_limits.backups}, allocations ${s.feature_limits.allocations}`,
    `Created: ${s.created_at}`,
    '',
    resourceText
  ].join('\n'))
}

async function updateLimits(m, cfg, text, usedPrefix, command) {
  const payload = splitPipePayload(text, 'limits', 8)
  if (payload.length < 2) {
    throw new Error([
      `Format: ${usedPrefix + command} limits <serverId>|<ram>|<disk>|<cpu>|<backups>|<databases>|<allocations>|<swap>`,
      `Contoh: ${usedPrefix + command} limits 12|1024|2048|100|2|1|1|0`,
      'Pakai - untuk mempertahankan nilai lama.'
    ].join('\n'))
  }

  const [serverId, memory, disk, cpu, backups, databases, allocations, swap] = payload
  const current = (await getAppServer(cfg, serverId)).attributes
  const body = {
    allocation: current.allocation,
    memory: pickNumber(memory, current.limits.memory),
    swap: pickNumber(swap, current.limits.swap || 0),
    disk: pickNumber(disk, current.limits.disk),
    io: current.limits.io || 500,
    cpu: pickNumber(cpu, current.limits.cpu),
    threads: current.limits.threads || null,
    feature_limits: {
      databases: pickNumber(databases, current.feature_limits.databases),
      backups: pickNumber(backups, current.feature_limits.backups),
      allocations: pickNumber(allocations, current.feature_limits.allocations)
    }
  }

  const res = await appApi(cfg, `/servers/${serverId}/build`, { method: 'PATCH', body })
  const s = res.attributes
  return m.reply([
    '*LIMIT SERVER UPDATED*',
    '',
    `ID: ${s.id}`,
    `Name: ${s.name}`,
    `RAM: ${s.limits.memory} MB`,
    `Disk: ${s.limits.disk} MB`,
    `CPU: ${s.limits.cpu}%`,
    `Backups: ${s.feature_limits.backups}`,
    `Databases: ${s.feature_limits.databases}`,
    `Allocations: ${s.feature_limits.allocations}`
  ].join('\n'))
}

async function updateDetails(m, cfg, text, usedPrefix, command) {
  const payload = splitPipePayload(text, 'details', 4)
  if (payload.length < 4) {
    throw new Error([
      `Format: ${usedPrefix + command} details <serverId>|<name>|<ownerUserId>|<description>`,
      `Contoh: ${usedPrefix + command} details 12|Bot Customer|5|expired 30 hari`,
      'Pakai - untuk mempertahankan name/owner/description lama.'
    ].join('\n'))
  }

  const [serverId, name, ownerId, description] = payload
  const current = (await getAppServer(cfg, serverId)).attributes
  const body = {
    name: pickText(name, current.name),
    user: pickNumber(ownerId, current.user),
    external_id: current.external_id || null,
    description: pickText(description, current.description || '')
  }

  const res = await appApi(cfg, `/servers/${serverId}/details`, { method: 'PATCH', body })
  const s = res.attributes
  return m.reply([
    '*DETAIL SERVER UPDATED*',
    '',
    `ID: ${s.id}`,
    `Name: ${s.name}`,
    `Owner user ID: ${s.user}`,
    `Description: ${s.description || '-'}`
  ].join('\n'))
}

async function updateStartup(m, cfg, text, usedPrefix, command) {
  const payload = splitPipePayload(text, 'startup', 6)
  if (payload.length < 2) {
    throw new Error([
      `Format: ${usedPrefix + command} startup <serverId>|<eggId>|<image>|<startup>|<ENV=VALUE,ENV2=VALUE2>|<skipScripts>`,
      `Contoh: ${usedPrefix + command} startup 12|-|ghcr.io/parkervcp/yolks:nodejs_20|npm start|USER_UPLOAD=0,AUTO_UPDATE=1|false`,
      'Pakai - untuk mempertahankan nilai lama.'
    ].join('\n'))
  }

  const [serverId, eggId, image, startup, envText, skipScripts] = payload
  const current = (await getAppServer(cfg, serverId)).attributes
  const env = parseEnv(envText)
  const egg = pickNumber(eggId, current.egg)
  const eggData = await appApi(cfg, `/nests/${current.nest || cfg.defaultNest}/eggs/${egg}?include=variables`)
  const defaultEnv = envFromEgg(eggData)

  const body = {
    startup: pickText(startup, current.container?.startup_command || cfg.startup),
    environment: { ...defaultEnv, ...env },
    egg,
    image: pickText(image, current.container?.image || cfg.dockerImage),
    skip_scripts: /^true|1|yes$/i.test(String(skipScripts || 'false'))
  }

  const res = await appApi(cfg, `/servers/${serverId}/startup`, { method: 'PATCH', body })
  const s = res.attributes
  return m.reply([
    '*STARTUP SERVER UPDATED*',
    '',
    `ID: ${s.id}`,
    `Name: ${s.name}`,
    `Egg: ${s.egg}`,
    `Image: ${s.container?.image || body.image}`,
    `Startup: ${s.container?.startup_command || body.startup}`,
    `Env changed: ${Object.keys(env).length ? Object.keys(env).join(', ') : 'default only'}`
  ].join('\n'))
}

async function powerAction(m, cfg, args, usedPrefix, command) {
  if (!cfg.c_apikey) throw new Error('PTERO_CLIENT_KEY/PANEL_CLIENT_KEY belum diset.')
  const [serverId, action] = args
  if (!serverId || !action) throw new Error(`Format: ${usedPrefix + command} power <serverId> <start|stop|restart|kill>`)

  const signal = normalizePower(action)
  const server = await getAppServer(cfg, serverId)
  await clientApi(cfg, `/servers/${serverIdentifier(server.attributes)}/power`, {
    method: 'POST',
    body: { signal }
  })
  return m.reply(`Power signal terkirim: ${signal} -> ${server.attributes.name}`)
}

async function serverAdminAction(m, cfg, action, serverId, usedPrefix, command) {
  if (!serverId) throw new Error(`Format: ${usedPrefix + command} ${action} <serverId>`)
  const server = await getAppServer(cfg, serverId)
  await appApi(cfg, `/servers/${serverId}/${action}`, { method: 'POST' })
  return m.reply(`${action.toUpperCase()} terkirim ke server ${server.attributes.name}`)
}

async function backupAction(m, cfg, args, usedPrefix, command) {
  if (!cfg.c_apikey) throw new Error('PTERO_CLIENT_KEY/PANEL_CLIENT_KEY belum diset.')
  const action = (args[0] || '').toLowerCase()
  const serverId = args[1]
  if (!action || !serverId) {
    throw new Error([
      `Format: ${usedPrefix + command} backup <list|create|download|delete> <serverId> [uuid/index/name]`,
      `Contoh: ${usedPrefix + command} backup create 12 backup-harian`
    ].join('\n'))
  }

  const server = await getAppServer(cfg, serverId)
  const identifier = serverIdentifier(server.attributes)

  if (action === 'list') {
    const res = await clientApi(cfg, `/servers/${identifier}/backups?per_page=10`)
    const rows = (res.data || []).map((item, index) => {
      const b = item.attributes
      return `${index + 1}. ${b.name} | ${b.uuid} | ${formatSize(b.bytes || 0)} | locked=${Boolean(b.is_locked)}`
    })
    return m.reply(pagedText(`BACKUPS ${server.attributes.name}`, rows, res))
  }

  if (action === 'create') {
    const name = args.slice(2).join(' ') || `backup-${new Date().toISOString().slice(0, 10)}`
    const res = await clientApi(cfg, `/servers/${identifier}/backups`, {
      method: 'POST',
      body: { name, ignored: '', is_locked: false }
    })
    return m.reply(`Backup dibuat: ${res.attributes.name}\nUUID: ${res.attributes.uuid}`)
  }

  const backupId = args[2]
  if (!backupId) throw new Error(`Masukkan uuid/index backup. Cek: ${usedPrefix + command} backup list ${serverId}`)
  const backup = await resolveBackup(cfg, identifier, backupId)

  if (action === 'download') {
    const res = await clientApi(cfg, `/servers/${identifier}/backups/${backup.uuid}/download`)
    return m.reply(`Download URL:\n${res.attributes.url}`)
  }

  if (action === 'delete') {
    await clientApi(cfg, `/servers/${identifier}/backups/${backup.uuid}`, { method: 'DELETE' })
    return m.reply(`Backup dihapus: ${backup.name} (${backup.uuid})`)
  }

  throw new Error('Action backup valid: list, create, download, delete')
}

async function resolveBackup(cfg, identifier, value) {
  const res = await clientApi(cfg, `/servers/${identifier}/backups?per_page=50`)
  const list = (res.data || []).map(item => item.attributes)
  const index = Number(value)
  if (Number.isInteger(index) && index > 0 && list[index - 1]) return list[index - 1]
  const found = list.find(item => item.uuid === value || item.name === value)
  if (!found) throw new Error('Backup tidak ditemukan.')
  return found
}

async function getAppServer(cfg, serverId) {
  if (!serverId) throw new Error('Server ID kosong.')
  const res = await appApi(cfg, `/servers/${serverId}`)
  if (!res?.attributes) throw new Error('Server tidak ditemukan.')
  return res
}

async function appApi(cfg, path, options = {}) {
  return request(`${cfg.domain}/api/application${path}`, cfg.apikey, options)
}

async function clientApi(cfg, path, options = {}) {
  return request(`${cfg.domain}/api/client${path}`, cfg.c_apikey, options)
}

async function request(url, token, options = {}) {
  const method = options.method || 'GET'
  const init = { method, headers: jsonHeaders(token) }
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

function safeJson(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return { raw }
  }
}

function splitPipePayload(text, subCommand, maxParts) {
  const raw = String(text || '').trim()
  const prefix = new RegExp(`^${escapeRegex(subCommand)}\\s+`, 'i')
  const payload = raw.replace(prefix, '')
  return payload.split('|').map(v => v.trim()).slice(0, maxParts)
}

function escapeRegex(value) {
  return String(value).replace(/[|\\{}()[\]^$+*?.-]/g, '\\$&')
}

function pickNumber(value, fallback) {
  if (value === undefined || value === '' || value === '-') return Number(fallback || 0)
  const num = Number(value)
  if (!Number.isFinite(num)) throw new Error(`Nilai angka tidak valid: ${value}`)
  return num
}

function pickText(value, fallback) {
  if (value === undefined || value === '' || value === '-') return fallback
  return value
}

function parseEnv(value = '') {
  if (!value || value === '-') return {}
  return Object.fromEntries(
    value.split(',')
      .map(pair => pair.trim())
      .filter(Boolean)
      .map(pair => {
        const idx = pair.indexOf('=')
        if (idx === -1) throw new Error(`Format env invalid: ${pair}`)
        return [pair.slice(0, idx).trim(), pair.slice(idx + 1).trim()]
      })
  )
}

function envFromEgg(eggData) {
  const variables = eggData.attributes?.relationships?.variables?.data || []
  return Object.fromEntries(variables.map(item => {
    const v = item.attributes
    return [v.env_variable, v.default_value || '']
  }).filter(([key]) => key))
}

function normalizePower(action = '') {
  const value = String(action).toLowerCase()
  if (['start', 'stop', 'restart', 'kill'].includes(value)) return value
  throw new Error('Power action valid: start, stop, restart, kill')
}

function serverIdentifier(server) {
  return server.identifier || shortUuid(server.uuid)
}

function shortUuid(uuid = '') {
  return String(uuid).split('-')[0]
}

function countOf(res) {
  return res.meta?.pagination?.total ?? res.meta?.pagination?.count ?? (res.data || []).length
}

function pagedText(title, rows, res) {
  const page = res.meta?.pagination
  return [
    `*${title}*`,
    page ? `Page: ${page.current_page}/${page.total_pages} | Total: ${page.total}` : '',
    '',
    rows.length ? rows.join('\n') : 'Data kosong.'
  ].filter(Boolean).join('\n')
}

function formatError(error) {
  const message = error?.message || String(error)
  return `*Pterodactyl error:*\n${message}`
}

function helpText(prefix, command) {
  const base = `${prefix + command}`
  return [
    '*PTERODACTYL ADVANCED PANEL*',
    '',
    `${base} status`,
    `${base} list servers [page]`,
    `${base} list users [page]`,
    `${base} list nodes [page]`,
    `${base} list locations [page]`,
    `${base} list eggs [nestId]`,
    `${base} info <serverId>`,
    '',
    '*Modification*',
    `${base} details <serverId>|<name>|<ownerUserId>|<description>`,
    `${base} limits <serverId>|<ram>|<disk>|<cpu>|<backups>|<databases>|<allocations>|<swap>`,
    `${base} startup <serverId>|<eggId>|<image>|<startup>|<ENV=VALUE,ENV2=VALUE2>|<skipScripts>`,
    '',
    '*Admin Action*',
    `${base} power <serverId> <start|stop|restart|kill>`,
    `${base} suspend <serverId>`,
    `${base} unsuspend <serverId>`,
    `${base} reinstall <serverId>`,
    '',
    '*Backup*',
    `${base} backup list <serverId>`,
    `${base} backup create <serverId> [name]`,
    `${base} backup download <serverId> <uuid/index>`,
    `${base} backup delete <serverId> <uuid/index>`,
    '',
    'Tip: pakai tanda - untuk mempertahankan nilai lama pada details/limits/startup.'
  ].join('\n')
}
