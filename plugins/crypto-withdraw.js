// ============================================================
// CRYPTO WITHDRAW - Tarik dari crypto wallet ke money
// File: plugins/crypto-withdraw.js
//
// PROTEKSI EKONOMI RPG:
// ✦ Pajak withdraw 15% (hangus, bukan ke siapa-siapa)
//   → Profit crypto 30% = efektif cuma +15% ke money
//   → Cegah money printer & inflasi item shop
// ✦ Cooldown 8 jam antar withdraw
//   → Cegah spam deposit-withdraw loop
// ============================================================
import { initCryptoEngine } from '../lib/crypto-engine.js'

const TAX_RATE = 0.15                    // 15% pajak withdraw
const COOLDOWN_MS = 8 * 60 * 60 * 1000  // 8 jam cooldown

let handler = async (m, { conn, usedPrefix, args }) => {
    let user = global.db.data.users[m.sender]

    if (!user.cryptoWallet) user.cryptoWallet = 0
    if (!user.cryptoPortfolio) user.cryptoPortfolio = {}
    if (!user.cryptoLastWithdraw) user.cryptoLastWithdraw = 0
    initCryptoEngine()

    if (!args[0]) throw `❌ *Format salah!*\nGunakan: *${usedPrefix}crypto-withdraw <nominal>*\n\n_Contoh: ${usedPrefix}crypto-withdraw 5000_\nKetik *all* untuk tarik semua: _${usedPrefix}crypto-withdraw all_\n\n⚠️ _Withdraw dikenakan pajak *15%*_\n⏳ _Cooldown *8 jam* per withdraw_`

    // Cek cooldown
    const now = Date.now()
    const sisaCooldown = COOLDOWN_MS - (now - user.cryptoLastWithdraw)
    if (sisaCooldown > 0) {
        const jam = Math.floor(sisaCooldown / (60 * 60 * 1000))
        const menit = Math.floor((sisaCooldown % (60 * 60 * 1000)) / (60 * 1000))
        throw `⏳ *Cooldown withdraw belum habis!*\n\nKamu bisa withdraw lagi dalam:\n⏱ *${jam} jam ${menit} menit*\n\n_Withdraw dibatasi 1x per 8 jam untuk menjaga keseimbangan ekonomi._`
    }

    let nominal
    if (args[0].toLowerCase() === 'all') {
        nominal = user.cryptoWallet
    } else {
        nominal = parseInt(args[0].replace(/[^0-9]/g, ''))
    }

    if (!nominal || nominal <= 0) throw `❌ *Nominal tidak valid!*`
    if (nominal > user.cryptoWallet) throw `❌ *Saldo wallet tidak cukup!*\n💼 Wallet: ${user.cryptoWallet.toLocaleString('id')}\n💸 Withdraw: ${nominal.toLocaleString('id')}`

    // Hitung pajak
    const tax = Math.floor(nominal * TAX_RATE)
    const diterima = nominal - tax

    // Proses withdraw
    user.cryptoWallet -= nominal
    user.money = (user.money || 0) + diterima
    user.cryptoLastWithdraw = now

    await conn.reply(m.chat, `
╔═══════════════════════╗
║  💰 *WITHDRAW BERHASIL*  ║
╚═══════════════════════╝

💸 Jumlah withdraw : ${nominal.toLocaleString('id')}
🏦 Pajak 15%       : -${tax.toLocaleString('id')}
✅ Diterima        : *${diterima.toLocaleString('id')}*

━━━━━━━━━━━━━━━━━━━━━━
💰 Saldo Money   : ${user.money.toLocaleString('id')}
💼 Crypto Wallet : ${user.cryptoWallet.toLocaleString('id')}
━━━━━━━━━━━━━━━━━━━━━━
⏳ Withdraw berikutnya: *8 jam lagi*

💡 Ingin trading lagi?
 › *${usedPrefix}crypto-deposit <nominal>* — Setor lagi
 › *${usedPrefix}crypto-portofolio* — Cek portfolio kamu
`.trim(), m)
}

handler.help = ['crypto-withdraw']
handler.tags = ['game', 'rpg']
handler.command = /^crypto[-_]withdraw$/i

export default handler