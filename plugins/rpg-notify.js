import { ensureEngagementState, setRpgNotifier } from '../lib/rpg-engagement.js'

let handler = async (m, { args, usedPrefix }) => {
  const user = global.db.data.users[m.sender]
  const state = ensureEngagementState(user)
  const action = (args[0] || 'status').toLowerCase()

  if (['on', 'enable', 'aktif'].includes(action)) {
    setRpgNotifier(user, true)
    return m.reply('RPG follow-up aktif. Bot akan kasih pilihan lanjut sekali setelah kamu memakai command RPG.')
  }

  if (['off', 'disable', 'mati'].includes(action)) {
    setRpgNotifier(user, false)
    return m.reply('RPG follow-up dimatikan untuk akun kamu.')
  }

  if (action === 'pause') {
    const hours = Math.min(72, Math.max(1, Number(args[1]) || 6))
    state.notifier = true
    state.mutedUntil = Date.now() + hours * 60 * 60 * 1000
    return m.reply(`RPG follow-up dipause ${hours} jam.`)
  }

  const status = state.mutedUntil > Date.now()
    ? state.notifier === false ? 'OFF' : 'PAUSED'
    : 'ON'
  const pulse = state.followup?.armed ? 'ARMED ONCE' : 'IDLE'
  return m.reply([
    '*RPG Follow-up*',
    `Status: ${status}`,
    `Pulse: ${pulse}`,
    `Follow-up terkirim: ${state.nudgesSent || 0}`,
    '',
    `Atur: ${usedPrefix}rpgnotify on`,
    `Matikan: ${usedPrefix}rpgnotify off`,
    `Pause: ${usedPrefix}rpgnotify pause 6`
  ].join('\n'))
}

handler.help = ['rpgnotify']
handler.tags = ['rpg']
handler.command = /^(rpgnotify|rpgnotif)$/i
handler.register = true
handler.group = true

export default handler
