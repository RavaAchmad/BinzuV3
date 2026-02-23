// ============================================================
// CRYPTO DEPOSIT - Setor money ke crypto wallet
// File: plugins/crypto-deposit.js
// ============================================================
import { initCryptoEngine } from '../lib/crypto-engine.js'

let handler = async (m, { conn, usedPrefix, command, args }) => {
    let user = global.db.data.users[m.sender]

    // Init field
    if (!user.cryptoWallet) user.cryptoWallet = 0
    if (!user.cryptoTotalDeposit) user.cryptoTotalDeposit = 0
    if (!user.cryptoPortfolio) user.cryptoPortfolio = {}
    initCryptoEngine()

    if (!args[0]) throw `❌ *Format salah!*\nGunakan: *${usedPrefix}crypto-deposit <nominal>*\n\n_Contoh: ${usedPrefix}crypto-deposit 10000_`

    const nominal = parseInt(args[0].replace(/[^0-9]/g, ''))

    if (!nominal || nominal < 100) throw `❌ *Minimal deposit adalah 100!*`
    if (nominal > (user.money || 0)) throw `❌ *Saldo money kamu tidak cukup!*\n💰 Saldo: ${(user.money || 0).toLocaleString('id')}\n💸 Deposit: ${nominal.toLocaleString('id')}`

    // Proses deposit
    user.money = (user.money || 0) - nominal
    user.cryptoWallet += nominal
    user.cryptoTotalDeposit += nominal

    await conn.reply(m.chat, `
╔══════════════════════╗
║  💸 *DEPOSIT BERHASIL*  ║
╚══════════════════════╝

✅ *${nominal.toLocaleString('id')}* berhasil dipindahkan ke crypto wallet!

━━━━━━━━━━━━━━━━━━━━━━
💰 Saldo Money   : ${(user.money).toLocaleString('id')}
💼 Crypto Wallet : ${user.cryptoWallet.toLocaleString('id')}
━━━━━━━━━━━━━━━━━━━━━━

💡 Mulai trading dengan:
 › *${usedPrefix}crypto-market* — Lihat harga koin
 › *${usedPrefix}crypto-buy <koin> <nominal>* — Beli koin
`.trim(), m)
}

handler.help = ['crypto-deposit']
handler.tags = ['game', 'rpg']
handler.command = /^crypto[-_]deposit$/i

export default handler