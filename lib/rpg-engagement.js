import { GAME_CONFIG } from './rpg-core-engine.js'
import missionGenerator from './mission-generator.js'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const CLAIMS = [
  { id: 'daily', label: 'Daily reward', command: 'daily', field: 'lastclaim', cooldown: 79200000, priority: 100 },
  { id: 'weekly', label: 'Weekly reward', command: 'weekly', field: 'lastweekly', cooldown: 7 * DAY, priority: 95 },
  { id: 'monthly', label: 'Monthly reward', command: 'monthly', field: 'lastmonthly', cooldown: 30 * DAY, priority: 90 }
]

const ACTIVITIES = [
  { id: 'hunt', label: 'Hunt', command: 'hunt', cooldownKey: 'hunt', legacy: ['lastberburu', 'lasthunt'], minLevel: 1, priority: 80, role: 'exp' },
  { id: 'fish', label: 'Fish', command: 'fish', cooldownKey: 'fishing', legacy: ['lastmancing', 'lastfish'], minLevel: 1, priority: 72, role: 'steady' },
  { id: 'mine', label: 'Mine', command: 'mine', cooldownKey: 'mining', legacy: ['lastmining', 'lastmine'], minLevel: 5, priority: 74, role: 'money' },
  { id: 'work', label: 'Work', command: 'work', cooldownKey: 'work', legacy: ['lastkerja', 'lastwork'], minLevel: 1, priority: 70, role: 'money' },
  { id: 'adventure', label: 'Adventure', command: 'adventure', cooldownKey: 'adventure', legacy: ['lastadventure'], minLevel: 10, priority: 78, role: 'exp' },
  { id: 'dungeon', label: 'Dungeon', command: 'dungeon easy', cooldownKey: 'dungeon', legacy: ['lastdungeon'], minLevel: 1, priority: 76, role: 'combat' }
]

const GAME_STARTERS = [
  { label: 'Family100', command: 'family100', reason: 'ramai-ramai, gampang bikin grup hidup' },
  { label: 'Math medium', command: 'math medium', reason: 'cepat, kompetitif, reward XP jelas' },
  { label: 'Tebak Bom', command: 'tebakbom', reason: 'tegang singkat, cocok buat idle group' },
  { label: 'TicTacToe', command: 'tictactoe', reason: 'butuh dua pemain, bagus buat ngajak lawan' }
]

export function getDefaultPrefix(value = global.prefix) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.find(v => typeof v === 'string') || '.'
  return '.'
}

export function ensureEngagementState(user = {}) {
  if (!user.rpgEngagement || typeof user.rpgEngagement !== 'object') {
    user.rpgEngagement = {
      notifier: true,
      lastNotifyAt: 0,
      lastNotifyChat: {},
      nudgesSent: 0,
      mutedUntil: 0
    }
  }
  if (!user.rpgEngagement.lastNotifyChat || typeof user.rpgEngagement.lastNotifyChat !== 'object') {
    user.rpgEngagement.lastNotifyChat = {}
  }
  return user.rpgEngagement
}

export function setRpgNotifier(user, enabled) {
  const state = ensureEngagementState(user)
  state.notifier = Boolean(enabled)
  state.mutedUntil = 0
  return state
}

export function buildRpgSnapshot(user = {}, prefix = '.', context = {}) {
  const now = Date.now()
  const level = Math.max(1, Number(user.level || 1))
  const money = Number(user.money || 0)
  const health = Number(user.health || user.stats?.hp || 100)

  const claims = CLAIMS.map(claim => {
    const last = Number(user[claim.field] || 0)
    const remaining = Math.max(0, claim.cooldown - (now - last))
    return {
      ...claim,
      ready: remaining <= 0,
      remaining,
      fullCommand: prefix + claim.command
    }
  })

  missionGenerator.initMissions(user)
  const missions = summarizeMissions(user, prefix)

  const activities = ACTIVITIES.map(activity => {
    const remaining = getActivityRemaining(user, activity, now)
    const locked = level < activity.minLevel
    return {
      ...activity,
      ready: !locked && remaining <= 0,
      locked,
      remaining,
      fullCommand: prefix + activity.command
    }
  })

  const games = buildGameSuggestions(prefix, context)
  const topAction = pickTopAction({ claims, activities, missions, games, level, money, health })
  const plan = buildShortPlan({ topAction, claims, activities, missions, games, level, money, health })

  return {
    level,
    exp: Number(user.exp || 0),
    money,
    health,
    skill: user.skill?.name || user.job || 'none',
    claims,
    missions,
    activities,
    games,
    topAction,
    plan
  }
}

export function formatRpgDashboard(snapshot, name = 'Player') {
  const readyClaims = snapshot.claims.filter(v => v.ready)
  const readyActivities = snapshot.activities.filter(v => v.ready)
  const unavailable = formatRpgUnavailableText(snapshot)
  const missionLines = snapshot.missions.items.slice(0, 3).map(mission => {
    const status = mission.done ? 'DONE' : `${mission.current}/${mission.target}`
    return `- ${mission.name}: ${status}`
  })

  return [
    `*RPG Director - ${name}*`,
    '',
    `Level: ${snapshot.level} | EXP: ${snapshot.exp.toLocaleString('id-ID')}`,
    `Money: ${snapshot.money.toLocaleString('id-ID')} | HP: ${snapshot.health}`,
    `Skill: ${snapshot.skill}`,
    '',
    '*Next best action*',
    `${snapshot.topAction.label}: ${snapshot.topAction.reason}`,
    `Command: ${snapshot.topAction.command}`,
    '',
    '*Ready now*',
    readyClaims.length ? readyClaims.map(v => `- ${v.label}: ${v.fullCommand}`).join('\n') : '- Claim: belum ada yang ready',
    readyActivities.length ? readyActivities.map(v => `- ${v.label}: ${v.fullCommand}`).join('\n') : '- Activity: semua sedang cooldown / locked',
    '',
    '*Cooldown / locked*',
    unavailable || '- Tidak ada',
    '',
    '*Daily missions*',
    missionLines.length ? missionLines.join('\n') : '- Belum ada mission',
    `Progress: ${snapshot.missions.completed}/${snapshot.missions.total}`,
    '',
    '*Plan pendek*',
    snapshot.plan.map((line, i) => `${i + 1}. ${line}`).join('\n')
  ].filter(Boolean).join('\n')
}

export function formatRpgNudge(snapshot, prefix = '.') {
  return [
    '*RPG siap jalan lagi*',
    '',
    `${snapshot.topAction.label}: ${snapshot.topAction.reason}`,
    `Ketik: ${snapshot.topAction.command}`,
    '',
    `Lihat rute main: ${prefix}rpggo`,
    `Matikan pengingat: ${prefix}rpgnotify off`
  ].join('\n')
}

export function buildRpgSelectionSections(snapshot, prefix = '.') {
  const sections = []
  const claimRows = snapshot.claims
    .filter(claim => claim.ready)
    .map(claim => ({
      id: claim.fullCommand,
      title: claim.label,
      description: 'Reward siap diklaim'
    }))

  const activityRows = snapshot.activities
    .filter(activity => activity.ready)
    .map(activity => ({
      id: activity.fullCommand,
      title: activity.label,
      description: reasonForActivity(activity, snapshot)
    }))

  const gameRows = snapshot.games
    .slice(0, 4)
    .map(game => ({
      id: game.fullCommand,
      title: game.label,
      description: game.reason
    }))

  if (claimRows.length) sections.push({ title: 'Reward siap', rows: claimRows })
  if (activityRows.length) sections.push({ title: 'RPG siap', rows: activityRows })
  if (gameRows.length) sections.push({ title: 'Games', rows: gameRows })

  return sections
}

export function buildRpgActionButtons(snapshot, prefix = '.', options = {}) {
  const sections = buildRpgSelectionSections(snapshot, prefix)
  const selectableIds = new Set(sections.flatMap(section => section.rows.map(row => row.id)))
  const buttons = []

  if (selectableIds.has(snapshot.topAction.command)) {
    buttons.push({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: 'Next action', id: snapshot.topAction.command })
    })
  }

  if (sections.length) {
    buttons.push({
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
        title: options.title || 'Pilih aktivitas',
        sections
      })
    })
  }

  if (options.dashboard !== false) {
    buttons.push({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: 'Dashboard', id: `${prefix}rpggo` })
    })
  }

  return buttons
}

export function buildRpgPostUseMenu(user = {}, prefix = '.', context = {}) {
  const snapshot = buildRpgSnapshot(user, prefix, context)
  const unavailable = formatRpgUnavailableText(snapshot)
  const buttons = buildRpgActionButtons(snapshot, prefix, { title: 'Lanjut main' })

  return {
    snapshot,
    buttons,
    text: [
      '*Mau lanjut apa?*',
      '',
      'Action barusan sudah diproses. Tombol di bawah hanya berisi pilihan yang siap dipakai.',
      '',
      '*Cooldown / locked (teks saja)*',
      unavailable || '- Tidak ada',
      '',
      `Buka rute lengkap: ${prefix}rpggo`,
      `Matikan follow-up: ${prefix}rpgnotify off`
    ].join('\n')
  }
}

export function formatRpgUnavailableText(snapshot) {
  const claimLines = snapshot.claims
    .filter(claim => !claim.ready)
    .map(claim => `- ${claim.label}: cooldown ${formatDuration(claim.remaining)}`)

  const activityLines = snapshot.activities
    .filter(activity => !activity.ready)
    .map(activity => activity.locked
      ? `- ${activity.label}: locked Lv.${activity.minLevel}`
      : `- ${activity.label}: cooldown ${formatDuration(activity.remaining)}`
    )

  return [...claimLines, ...activityLines].join('\n')
}

export function shouldSendRpgNudge({ m, user, chat, prefix = '.', now = Date.now() }) {
  if (!m?.isGroup || !user || !chat) return { send: false, reason: 'not-group' }
  if (m.fromMe || m.isBaileys || !m.text) return { send: false, reason: 'bot-message' }
  if (chat.isBanned || (!chat.rpg && !chat.game)) return { send: false, reason: 'feature-disabled' }

  const text = String(m.text || '').trim()
  if (!text || isCommandText(text, prefix)) return { send: false, reason: 'command' }

  const state = ensureEngagementState(user)
  if (state.notifier === false) return { send: false, reason: 'disabled' }
  if (state.mutedUntil && state.mutedUntil > now) return { send: false, reason: 'muted' }
  if (now - Number(state.lastNotifyAt || 0) < 6 * HOUR) return { send: false, reason: 'user-cooldown' }
  if (now - Number(state.lastNotifyChat?.[m.chat] || 0) < 90 * 60 * 1000) return { send: false, reason: 'chat-cooldown' }

  const snapshot = buildRpgSnapshot(user, prefix, { chat })
  const hasReadyClaim = snapshot.claims.some(v => v.ready)
  const hasReadyActivity = snapshot.activities.some(v => v.ready)
  const hasMissionProgress = snapshot.missions.items.some(v => !v.done && v.current > 0)

  if (!hasReadyClaim && !hasReadyActivity && !hasMissionProgress) {
    return { send: false, reason: 'nothing-ready' }
  }

  const key = snapshot.topAction.command
  if (state.lastPromptKey === key && now - Number(state.lastPromptAt || 0) < 24 * HOUR) {
    return { send: false, reason: 'same-prompt' }
  }

  return { send: true, snapshot, key }
}

export function markRpgNudgeSent(user, chatId, key, now = Date.now()) {
  const state = ensureEngagementState(user)
  state.lastNotifyAt = now
  state.lastNotifyChat[chatId] = now
  state.nudgesSent = Number(state.nudgesSent || 0) + 1
  state.lastPromptKey = key
  state.lastPromptAt = now
  return state
}

function summarizeMissions(user, prefix) {
  const tracker = missionGenerator.initMissions(user)
  const items = (tracker.dailyMissions || []).map(mission => ({
    id: mission.id,
    name: mission.name,
    type: mission.type,
    current: Number(mission.current || 0),
    target: Number(mission.target || 1),
    done: tracker.completedToday?.includes(mission.id),
    command: prefix + commandForMission(mission.type)
  }))

  return {
    total: items.length,
    completed: items.filter(v => v.done).length,
    items
  }
}

function commandForMission(type) {
  const map = {
    dungeonRuns: 'dungeon easy',
    dungeonWins: 'dungeon easy',
    bossKills: 'worldboss attack',
    mining: 'mine',
    fishing: 'fish',
    crafting: 'craft',
    garden: 'berkebon',
    expGain: 'hunt',
    moneyGain: 'work',
    skillLevelup: 'selectskill',
    gamePlayed: 'family100'
  }
  return map[type] || 'rpggo'
}

function getActivityRemaining(user, activity, now) {
  const configured = GAME_CONFIG.COOLDOWNS[activity.cooldownKey] || 0
  const candidates = [user.cooldowns?.[activity.cooldownKey], ...activity.legacy.map(key => user[key])]
    .map(Number)
    .filter(value => Number.isFinite(value) && value > 0)

  if (!candidates.length) return 0
  const lastUsed = Math.max(...candidates)
  return Math.max(0, configured - (now - lastUsed))
}

function pickTopAction(state) {
  const readyClaim = state.claims.filter(v => v.ready).sort((a, b) => b.priority - a.priority)[0]
  if (readyClaim) {
    return {
      label: readyClaim.label,
      command: readyClaim.fullCommand,
      reason: 'reward gratis sudah bisa diklaim'
    }
  }

  const activeMission = state.missions.items.find(v => !v.done && v.current > 0) || state.missions.items.find(v => !v.done)
  if (activeMission) {
    return {
      label: 'Daily mission',
      command: activeMission.command,
      reason: `lanjutkan mission ${activeMission.current}/${activeMission.target}`
    }
  }

  const readyActivities = state.activities.filter(v => v.ready)
  if (readyActivities.length) {
    const preferred = chooseActivity(readyActivities, state)
    return {
      label: preferred.label,
      command: preferred.fullCommand,
      reason: reasonForActivity(preferred, state)
    }
  }

  const nextActivity = state.activities
    .filter(v => !v.locked)
    .sort((a, b) => a.remaining - b.remaining)[0]

  if (nextActivity) {
    return {
      label: nextActivity.label,
      command: nextActivity.fullCommand,
      reason: `cooldown sisa ${formatDuration(nextActivity.remaining)}`
    }
  }

  const game = state.games[0]
  return {
    label: game?.label || 'RPG menu',
    command: game?.fullCommand || '.rpggo',
    reason: game?.reason || 'lihat menu dan pilih aktivitas'
  }
}

function chooseActivity(activities, state) {
  if (state.health < 45) return activities.find(v => v.id === 'work') || activities[0]
  if (state.level < 5) return activities.find(v => v.id === 'hunt') || activities[0]
  if (state.money < 10000) return activities.find(v => v.role === 'money') || activities[0]
  if (state.level >= 10) return activities.find(v => v.id === 'adventure') || activities.find(v => v.id === 'dungeon') || activities[0]
  return activities.sort((a, b) => b.priority - a.priority)[0]
}

function reasonForActivity(activity, state) {
  if (state.health < 45 && activity.id === 'work') return 'HP rendah, cari income aman dulu'
  if (state.level < 5 && activity.id === 'hunt') return 'awal game paling jelas untuk EXP'
  if (state.money < 10000 && activity.role === 'money') return 'uang masih tipis, bagus untuk modal upgrade'
  if (activity.id === 'adventure') return 'level sudah cukup untuk reward lebih besar'
  if (activity.id === 'dungeon') return 'combat siap dan cooldown tersedia'
  return 'cooldown sudah siap'
}

function buildShortPlan(state) {
  const lines = []
  lines.push(`${state.topAction.command} - ${state.topAction.reason}`)

  const nextReady = state.activities
    .filter(v => v.ready && v.fullCommand !== state.topAction.command)
    .slice(0, 2)
  for (const activity of nextReady) lines.push(`${activity.fullCommand} - isi rotasi cooldown`)

  const incomplete = state.missions.items.find(v => !v.done)
  if (incomplete) lines.push(`${incomplete.command} - kejar daily mission ${incomplete.current}/${incomplete.target}`)

  if (state.games[0]) lines.push(`${state.games[0].fullCommand} - ${state.games[0].reason}`)
  return [...new Set(lines)].slice(0, 4)
}

function buildGameSuggestions(prefix, context = {}) {
  const chat = context.chat || {}
  if (context.conn && context.chatId && hasActiveGame(context.conn, context.chatId)) {
    return [{ label: 'Lanjutkan game aktif', fullCommand: prefix + 'nyerah', reason: 'ada sesi game yang belum selesai' }]
  }
  if (chat.game === false) {
    return [{ label: 'Enable game', fullCommand: prefix + 'enable game', reason: 'fitur game belum aktif di grup' }]
  }
  return GAME_STARTERS.map(game => ({ ...game, fullCommand: prefix + game.command }))
}

function hasActiveGame(conn, chatId) {
  const keys = Object.keys(conn.game || {})
  if (keys.some(key => key.includes(chatId))) return true
  if (conn.tebakbom?.[chatId]) return true
  return false
}

function isCommandText(text, prefix) {
  if (prefix && text.startsWith(prefix)) return true
  return /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©]/i.test(text)
}

function formatDuration(ms) {
  if (ms <= 0) return '0s'
  const total = Math.ceil(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  if (minutes <= 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}
