import tradingSystem from '../lib/trading.js'

let handler = async (m, { conn, args, usedPrefix }) => {
    const user = global.db.data.users[m.sender]
    const db = global.db.data
    const subcommand = (args[0] || 'list').toLowerCase()

    switch (subcommand) {
        case 'list': {
            const offers = tradingSystem.getPlayerOffers(m.sender)
            
            if (offers.length === 0) {
                return m.reply('📦 No active trade offers. Use: ' + usedPrefix + 'trade offer @user [items]')
            }

            let text = `
╭━━━━━━━━━━━━━━━ 🤝 ━━━━━━━━━━━━━━╮
┃        YOUR TRADE OFFERS
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

`
            offers.forEach((offer, i) => {
                const isIncoming = offer.to === m.sender
                const otherPlayer = isIncoming ? offer.from : offer.to
                const direction = isIncoming ? '←' : '→'
                
                text += `${i + 1}. ${direction} @${otherPlayer.split('@')[0]}\n`
                text += `   Status: ${offer.status}\n`
                text += `   ID: ${offer.id.split('_').slice(-1)[0]}\n\n`
            })

            text += `\nCommands:\n${usedPrefix}trade view [id]\n${usedPrefix}trade accept [id]\n${usedPrefix}trade reject [id]`
            m.reply(text)
            break
        }

        case 'view': {
            const offerId = args[1]
            if (!offerId) {
                return m.reply('❌ Specify offer ID')
            }

            const offer = Object.values(tradingSystem.activeOffers)
                .find(o => o.id.includes(offerId))
            
            if (!offer) {
                return m.reply('❌ Offer not found')
            }

            m.reply(tradingSystem.formatOffer(offer, db))
            break
        }

        case 'accept': {
            const offerId = args[1]
            if (!offerId) {
                return m.reply('❌ Specify offer ID')
            }

            const offer = Object.values(tradingSystem.activeOffers)
                .find(o => o.id.includes(offerId))
            
            if (!offer) {
                return m.reply('❌ Offer not found')
            }

            if (offer.to !== m.sender && offer.from !== m.sender) {
                return m.reply('❌ You are not part of this trade')
            }

            const fromUser = db.users[offer.from]
            const toUser = db.users[offer.to]

            // Validate items
            for (const [item, amount] of Object.entries(offer.offer)) {
                if ((fromUser[item] || 0) < amount) {
                    return m.reply(`❌ Trader doesn't have enough ${item}`)
                }
            }

            for (const [item, amount] of Object.entries(offer.request)) {
                if ((toUser[item] || 0) < amount) {
                    return m.reply(`❌ You don't have enough ${item}`)
                }
            }

            tradingSystem.acceptOffer(offer.id, fromUser, toUser)

            m.reply(`✅ Trade accepted! Items transferred.`)
            
            // Notify other player
            const otherPlayer = m.sender === offer.from ? offer.to : offer.from
            conn.sendMessage(otherPlayer, {
                text: `✅ Trade completed with @${m.sender.split('@')[0]}!`
            })

            break
        }

        case 'reject': {
            const offerId = args[1]
            if (!offerId) {
                return m.reply('❌ Specify offer ID')
            }

            const offer = Object.values(tradingSystem.activeOffers)
                .find(o => o.id.includes(offerId))
            
            if (!offer) {
                return m.reply('❌ Offer not found')
            }

            tradingSystem.rejectOffer(offer.id)
            m.reply('✅ Trade offer rejected')
            break
        }

        case 'offer': {
            let targetUser = m.mentionedJid?.[0]
            if (!targetUser) {
                return m.reply('❌ Mention a user to trade with')
            }

            if (targetUser === m.sender) {
                return m.reply('❌ You cannot trade with yourself')
            }

            // Simple format: #trade offer @user [item1:amount1] [item2:amount2]
            // For now, just create an empty offer as example
            const offerItems = { diamond: 5, money: 50000 }
            const requestItems = { emerald: 3, legendary: 1 }

            const trade = tradingSystem.createOffer(m.sender, targetUser, offerItems, requestItems)

            m.reply(`✅ Trade offer created for @${targetUser.split('@')[0]}!\n\n${tradingSystem.formatOffer(trade, db)}`)

            break
        }

        default:
            m.reply(`
*TRADING SYSTEM COMMANDS*

${usedPrefix}trade list - View your trades
${usedPrefix}trade view [id] - View trade details
${usedPrefix}trade accept [id] - Accept trade
${usedPrefix}trade reject [id] - Reject trade
${usedPrefix}trade offer @user - Create new offer
`)
    }
}

handler.help = ['trade [subcommand]']
handler.tags = ['rpg', 'trading']
handler.command = /^(trade|trading)$/i
handler.register = true
handler.rpg = true

export default handler
