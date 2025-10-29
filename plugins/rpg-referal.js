// ref.js
import crypto from 'crypto'

const GROUP_JID = '6281371753464-1592310529@g.us' // grup official lo
const OWNER_JID = '6281212035575@s.whatsapp.net' // notif ke lu pribadi
const XP_FIRST_TIME = 2500
const XP_LINK_CREATOR = 15000
const XP_BONUS = {
  5: 40000,
  10: 100000,
  20: 250000,
  50: 1000000,
  100: 10000000,
}
const PENDING_TIMEOUT = 23 * 60 * 60 * 1000 // 23 jam
const ONE_DAY = 24 * 60 * 60 * 1000

function genRefCode(len = 10) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  return Array.from({ length: len }, () => chars[crypto.randomInt(chars.length)]).join('')
}
function getNextMilestone(count) {
  const keys = Object.keys(XP_BONUS).map(Number).sort((a, b) => a - b)
  const next = keys.find(n => count < n)
  return next ? { target: next, reward: XP_BONUS[next] } : null
}

let handler = async (m, { conn, usedPrefix, text }) => {
  const users = global.db.data.users = global.db.data.users || {}
  const pending = global.db.data.pendingRefs = global.db.data.pendingRefs || {} // { jid: { refCreator, group, expiresAt, createdAt } }

  // ensure user record
  users[m.sender] = users[m.sender] || {}
  const me = users[m.sender]

  // init common fields
  me.ref_code = me.ref_code || genRefCode()
  me.ref_count = Number(me.ref_count || 0)
  me.bonusClaimed = Array.isArray(me.bonusClaimed) ? me.bonusClaimed : []
  me.exp = Number(me.exp || 0)
  me.premiumTime = Number(me.premiumTime || 0)
  me.ref_used = Boolean(me.ref_used || false)

  // === if user supplied a code: create pending ref (must join group within 23 hours) ===
  if (text) {
    const code = text.trim()
    // validate code owner
    const targetId = Object.keys(users).find(id => users[id]?.ref_code === code)
    if (!targetId) throw 'Kode referral tidak valid.'
    if (targetId === m.sender) throw 'Gak bisa pakai kode sendiri.'
    if (me.ref_used) throw 'Kamu sudah pernah pakai kode referral sebelumnya.'

    // create pending record keyed by user's jid (the one who must join)
    const now = Date.now()
    const expiresAt = now + PENDING_TIMEOUT

    pending[m.sender] = {
      refCreator: targetId,
      group: GROUP_JID,
      expiresAt,
      createdAt: now,
      used: false
    }

    // schedule cleanup (best-effort; also cleanup on startup/db load should be considered)
    setTimeout(() => {
      try {
        const p = global.db.data.pendingRefs || {}
        if (p[m.sender] && p[m.sender].expiresAt <= Date.now()) {
          delete p[m.sender]
        }
      } catch (e) { /* ignore */ }
    }, PENDING_TIMEOUT + 1000)

    // send group link (the user must join using this link within 23 hours)
    const inviteLink = 'https://chat.whatsapp.com/IzdHOmj7n8gGJQhHzf3GyU'
    await m.reply(
      `✅ Kode valid. Untuk dapat premium & XP, kamu harus **bergabung ke grup official** dalam 23 jam.\n\n` +
      `Link grup: ${inviteLink}\n\n` +
      `Catatan: Jika kamu sudah bergabung dalam 23 jam, sistem akan mendeteksi dan memberikan reward otomatis.\n` +
      `Kalau kamu tidak join dalam 23 jam, klaim akan dibatalkan.`
    )

    // notify owner that pending ref created (opsional)
    await conn.sendMessage(OWNER_JID, { text: `Pending referral: ${m.sender} => kode dari ${targetId}\nExpires: ${new Date(expiresAt).toLocaleString()}` })

    return
  }

  // === .ref tanpa arg: tampilkan kode dan progress ===
  const code = me.ref_code
  const count = me.ref_count
  const next = getNextMilestone(count)
  const waLink = `wa.me/${conn.user.jid.split('@')[0]}?text=${encodeURIComponent(`${usedPrefix}ref ${code}`)}`
  const shareText = `Gunakan kode referral ini untuk dapat ${XP_FIRST_TIME} XP:\n${code}\n${waLink}`

  const premiumLeft = me.premiumTime && me.premiumTime > Date.now()
    ? Math.max(0, Math.ceil((me.premiumTime - Date.now()) / ONE_DAY))
    : 0

  let message =
    `Kode referral kamu: ${code}\n` +
    `Total referral: ${count}\n` +
    `${next ? `Target berikut: ${next.target} orang (+${next.reward} XP)\n` : 'Tidak ada milestone berikutnya atau semua milestone tercapai.\n'}` +
    `Premium aktif: ${premiumLeft} hari tersisa\n\n` +
    `Bagikan link ini ke teman:\n${waLink}\n\n` +
    `Atau kirim pesan:\nwa.me/?text=${encodeURIComponent(shareText)}\n\n` +
    `Untuk dapat 1 hari premium sebagai pengguna baru, kirim .ref <kode> ke bot lalu JOIN grup official menggunakan link yang diberikan dalam 23 jam.`

  m.reply(message)
}

handler.help = ['ref [kode]']
handler.tags = ['xp', 'referral']
handler.command = ['ref']
handler.register = true

export default handler
