import fetch from 'node-fetch'

const API_BASE = 'https://ravaja.my.id' // Ganti dengan domain API kamu
const WEBHOOK_SECRET = process.env.MY_PASSWORD || 'internal' // Sama dengan MY_PASSWORD atau MY_WEBHOOK_SECRET di .env binzu-api

async function apiCall(action, body = {}) {
  const res = await fetch(`${API_BASE}/api/premium/manage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': WEBHOOK_SECRET
    },
    body: JSON.stringify({ action, ...body })
  })
  return res.json()
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  // Only allow owner/xmaze
  if (!global.xmaze.some(number => m.sender.includes(number))) {
    return m.reply('⚠️ Perintah ini hanya untuk *Owner*.')
  }

  const args = text?.trim().split(/\s+/) || []
  const sub = args[0]?.toLowerCase()

  switch (sub) {
    // ====== CREATE KEY ======
    case 'create':
    case 'buat': {
      // .apikey create [plan] [days] [owner]
      // .apikey create pro 30 6281212035575
      const plan = args[1] || 'basic'
      const days = parseInt(args[2]) || 30
      const owner = args[3] || null

      if (!['free', 'trial', 'starter', 'basic', 'pro', 'business'].includes(plan)) {
        return m.reply(`❌ Plan tidak valid.\nPilihan: free, trial, starter, basic, pro, business`)
      }

      const result = await apiCall('create', { plan, days, owner })
      if (!result.status) return m.reply(`❌ Gagal: ${result.message}`)

      const d = result.data
      let msg = `✅ *API KEY CREATED*\n\n`
      msg += `🔑 Key: \`${d.key}\`\n`
      msg += `📦 Plan: ${d.plan}\n`
      msg += `📊 Limit: ${d.limit}/hari\n`
      msg += `⏰ Expires: ${d.expiresAt ? new Date(d.expiresAt).toLocaleDateString('id-ID') : 'Tidak ada'}\n`
      if (d.owner) msg += `👤 Owner: ${d.owner}\n`
      msg += `\n_Copy key di atas untuk diberikan ke user._`

      return conn.reply(m.chat, msg, m)
    }

    // ====== CHECK KEY ======
    case 'check':
    case 'cek': {
      const key = args[1]
      if (!key) return m.reply(`❗ Format: ${usedPrefix}${command} check <key>`)

      const result = await apiCall('check', { key })
      if (!result.status) return m.reply(`❌ ${result.message}`)

      const d = result.data
      let msg = `📋 *API KEY INFO*\n\n`
      msg += `🔑 Key: ${d.key}\n`
      msg += `👤 Owner: ${d.owner || '-'}\n`
      msg += `📦 Plan: ${d.plan}\n`
      msg += `📊 Usage: ${d.used}/${d.limit} (sisa: ${d.remaining})\n`
      msg += `📈 Total Used: ${d.totalUsed}\n`
      msg += `✅ Active: ${d.isActive ? 'Ya' : 'Tidak'}\n`
      msg += `⏰ Expired: ${d.isExpired ? 'Ya' : 'Tidak'}\n`
      msg += `📅 Expires: ${d.expiresAt ? new Date(d.expiresAt).toLocaleDateString('id-ID') : 'Tidak ada'}\n`
      msg += `📅 Created: ${new Date(d.createdAt).toLocaleDateString('id-ID')}`

      return conn.reply(m.chat, msg, m)
    }

    // ====== DELETE KEY ======
    case 'delete':
    case 'hapus': {
      const key = args[1]
      if (!key) return m.reply(`❗ Format: ${usedPrefix}${command} delete <key>`)

      const result = await apiCall('delete', { key })
      return m.reply(result.status ? `✅ Key berhasil dihapus.` : `❌ ${result.message}`)
    }

    // ====== TOGGLE KEY ======
    case 'toggle':
    case 'aktif': {
      const key = args[1]
      if (!key) return m.reply(`❗ Format: ${usedPrefix}${command} toggle <key>`)

      const result = await apiCall('toggle', { key })
      if (!result.status) return m.reply(`❌ ${result.message}`)
      return m.reply(`✅ Key ${result.isActive ? 'diaktifkan' : 'dinonaktifkan'}`)
    }

    // ====== EDIT KEY ======
    case 'edit': {
      // .apikey edit <key> <field> <value>
      const key = args[1]
      const field = args[2]
      const value = args.slice(3).join(' ')

      if (!key || !field || !value) {
        return m.reply(`❗ Format: ${usedPrefix}${command} edit <key> <field> <value>\n\nField: plan, limit, days, owner, note`)
      }

      const body = { key }
      if (field === 'plan') body.plan = value
      else if (field === 'limit') body.limit = parseInt(value)
      else if (field === 'days') body.days = parseInt(value)
      else if (field === 'owner') body.owner = value
      else if (field === 'note') body.note = value
      else return m.reply(`❌ Field tidak valid. Pilihan: plan, limit, days, owner, note`)

      const result = await apiCall('edit', body)
      if (!result.status) return m.reply(`❌ ${result.message}`)
      return m.reply(`✅ Key berhasil diupdate.\n\n📦 Plan: ${result.data.plan}\n📊 Limit: ${result.data.limit}\n⏰ Expires: ${result.data.expiresAt ? new Date(result.data.expiresAt).toLocaleDateString('id-ID') : '-'}`)
    }

    // ====== LIST KEYS ======
    case 'list': {
      const page = parseInt(args[1]) || 1
      const result = await apiCall('list', { page, perPage: 10 })
      if (!result.status) return m.reply(`❌ ${result.message}`)

      if (!result.data.length) return m.reply('📭 Belum ada key.')

      let msg = `📋 *DAFTAR API KEY* (Hal ${result.pagination.page}/${Math.ceil(result.pagination.total / result.pagination.perPage)})\n\n`
      result.data.forEach((k, i) => {
        msg += `${i + 1}. 🔑 ${k.key.slice(0, 14)}...\n`
        msg += `   📦 ${k.plan} | 📊 ${k.used}/${k.limit} | ${k.isActive ? '✅' : '❌'}\n`
        msg += `   👤 ${k.owner || '-'}\n\n`
      })
      msg += `Total: ${result.pagination.total} key`

      return conn.reply(m.chat, msg, m)
    }

    // ====== STATS ======
    case 'stats':
    case 'statistik': {
      const result = await apiCall('stats')
      if (!result.status) return m.reply(`❌ ${result.message}`)

      const d = result.data
      let msg = `📊 *PREMIUM KEY STATS*\n\n`
      msg += `📌 Total Key: ${d.total}\n`
      msg += `✅ Aktif: ${d.active}\n`
      msg += `❌ Nonaktif: ${d.inactive}\n`
      msg += `⏰ Expired: ${d.expired}\n\n`
      msg += `📦 *Per Plan:*\n`
      for (const [plan, info] of Object.entries(d.byPlan || {})) {
        msg += `  • ${plan}: ${info.count} key (total ${info.totalUsed} req)\n`
      }

      return conn.reply(m.chat, msg, m)
    }

    // ====== RESET USAGE ======
    case 'reset': {
      const key = args[1]
      if (!key) return m.reply(`❗ Format: ${usedPrefix}${command} reset <key>`)

      const result = await apiCall('reset', { key })
      return m.reply(result.status ? `✅ Usage key berhasil direset.` : `❌ ${result.message}`)
    }

    // ====== CUSTOM KEY — Ganti key menjadi custom ======
    case 'custom':
    case 'ganti': {
      // .apikey custom <key_lama> <key_baru>
      const key = args[1]
      const newKey = args[2]
      if (!key || !newKey) return m.reply(`❗ Format: ${usedPrefix}${command} custom <key_lama> <key_baru>\n\nContoh: ${usedPrefix}${command} custom BZ-ABC123 MyCustomKey`)

      const result = await apiCall('custom', { key, newKey })
      if (!result.status) return m.reply(`❌ ${result.message}`)

      const d = result.data
      let msg = `✅ *CUSTOM KEY BERHASIL*\n\n`
      msg += `🔑 Key Lama: ${d.oldKey}\n`
      msg += `🔑 Key Baru: \`${d.newKey}\`\n`
      msg += `📦 Plan: ${d.plan}\n`
      msg += `👤 Owner: ${d.owner || '-'}\n`
      msg += `\n⚠️ _Key lama sudah tidak bisa dipakai. Gunakan key baru._`

      return conn.reply(m.chat, msg, m)
    }

    // ====== ASSIGN — Link key ke akun user (email) ======
    case 'assign':
    case 'link': {
      // .apikey assign <key> <email>
      const key = args[1]
      const email = args[2]
      if (!key || !email) return m.reply(`❗ Format: ${usedPrefix}${command} assign <key> <email>\n\nContoh: ${usedPrefix}${command} assign BZ-ABC123 user@gmail.com`)

      const result = await apiCall('assign', { key, email })
      if (!result.status) return m.reply(`❌ ${result.message}`)

      const d = result.data
      let msg = `✅ *KEY ASSIGNED*\n\n`
      msg += `🔑 Key: ${d.key}\n`
      msg += `📧 Email: ${d.email}\n`
      msg += `📦 Plan: ${d.plan}\n`
      if (d.oldKey) msg += `🔄 Key lama user: ${d.oldKey}\n`
      msg += `\n_User sekarang bisa login dan lihat key di dashboard._`

      return conn.reply(m.chat, msg, m)
    }

    // ====== LOOKUP — Cari key by owner ======
    case 'lookup':
    case 'cari': {
      // .apikey lookup <email/phone/username>
      const owner = args[1]
      if (!owner) return m.reply(`❗ Format: ${usedPrefix}${command} lookup <email/nomor/username>`)

      const result = await apiCall('lookup', { owner })
      if (!result.status) return m.reply(`❌ ${result.message}`)

      if (!result.data.length) return m.reply('📭 Tidak ada key untuk owner ini.')

      let msg = `📋 *KEY MILIK ${owner}*\n\n`
      result.data.forEach((k, i) => {
        msg += `${i + 1}. 🔑 ${k.key}\n`
        msg += `   📦 ${k.plan} | 📊 ${k.used}/${k.limit} (sisa: ${k.remaining})\n`
        msg += `   ✅ Aktif: ${k.isActive ? 'Ya' : 'Tidak'}\n`
        msg += `   ⏰ Expires: ${k.expiresAt ? new Date(k.expiresAt).toLocaleDateString('id-ID') : '-'}\n\n`
      })

      return conn.reply(m.chat, msg, m)
    }

    // ====== HELP ======
    default: {
      let msg = `🔐 *BINZU API KEY MANAGER*\n\n`
      msg += `*Perintah:*\n`
      msg += `• ${usedPrefix}${command} create [plan] [days] [owner]\n`
      msg += `  _Buat key baru. Plan: free/basic/pro/unlimited_\n\n`
      msg += `• ${usedPrefix}${command} check <key>\n`
      msg += `  _Cek info & status key_\n\n`
      msg += `• ${usedPrefix}${command} custom <key_lama> <key_baru>\n`
      msg += `  _Ganti key jadi custom (min Starter)_\n\n`
      msg += `• ${usedPrefix}${command} assign <key> <email>\n`
      msg += `  _Link key ke akun user website_\n\n`
      msg += `• ${usedPrefix}${command} lookup <email/nomor>\n`
      msg += `  _Cari key berdasarkan owner_\n\n`
      msg += `• ${usedPrefix}${command} delete <key>\n`
      msg += `  _Hapus key_\n\n`
      msg += `• ${usedPrefix}${command} toggle <key>\n`
      msg += `  _Aktifkan/nonaktifkan key_\n\n`
      msg += `• ${usedPrefix}${command} edit <key> <field> <value>\n`
      msg += `  _Edit key (field: plan/limit/days/owner/note)_\n\n`
      msg += `• ${usedPrefix}${command} list [page]\n`
      msg += `  _Daftar semua key_\n\n`
      msg += `• ${usedPrefix}${command} stats\n`
      msg += `  _Statistik premium key_\n\n`
      msg += `• ${usedPrefix}${command} reset <key>\n`
      msg += `  _Reset usage harian key_\n\n`
      msg += `*Contoh:*\n`
      msg += `${usedPrefix}${command} create pro 30 6281212035575\n`
      msg += `${usedPrefix}${command} custom BZ-OLD123 MyCustomKey\n`
      msg += `${usedPrefix}${command} assign BZ-ABC123 user@gmail.com\n`
      msg += `${usedPrefix}${command} lookup user@gmail.com\n`
      msg += `${usedPrefix}${command} check BZ-A1B2C3D4E5F6...`

      return conn.reply(m.chat, msg, m)
    }
  }
}

handler.help = ['apikey', 'apikey create [plan] [days] [owner]', 'apikey check <key>', 'apikey custom <old> <new>', 'apikey assign <key> <email>', 'apikey lookup <owner>', 'apikey list']
handler.tags = ['owner']
handler.command = /^(apikey|apikunci|premiumkey)$/i
handler.owner = true
handler.fail = null

export default handler
