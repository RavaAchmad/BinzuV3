/**
 * Player Trading System
 */

const tradingSystem = {
    activeOffers: {},

    createOffer(fromPlayer, toPlayer, offerItems = {}, requestItems = {}, offerTime = 300000) {
        const offerId = `${fromPlayer}_${toPlayer}_${Date.now()}`
        
        this.activeOffers[offerId] = {
            id: offerId,
            from: fromPlayer,
            to: toPlayer,
            offer: offerItems,
            request: requestItems,
            status: 'PENDING',
            createdAt: Date.now(),
            expiresAt: Date.now() + offerTime,
            acceptedAt: null
        }

        return this.activeOffers[offerId]
    },

    getPlayerOffers(playerId) {
        return Object.values(this.activeOffers)
            .filter(o => (o.from === playerId || o.to === playerId) && 
                        o.status === 'PENDING' &&
                        o.expiresAt > Date.now())
    },

    acceptOffer(offerId, playerFromUser, playerToUser) {
        const offer = this.activeOffers[offerId]
        if (!offer || offer.status !== 'PENDING') return null

        // Transfer items
        for (const [item, amount] of Object.entries(offer.offer)) {
            playerFromUser[item] = (playerFromUser[item] || 0) - amount
            playerToUser[item] = (playerToUser[item] || 0) + amount
        }

        for (const [item, amount] of Object.entries(offer.request)) {
            playerToUser[item] = (playerToUser[item] || 0) - amount
            playerFromUser[item] = (playerFromUser[item] || 0) + amount
        }

        offer.status = 'COMPLETED'
        offer.acceptedAt = Date.now()

        return offer
    },

    rejectOffer(offerId) {
        const offer = this.activeOffers[offerId]
        if (offer) {
            offer.status = 'REJECTED'
            return true
        }
        return false
    },

    formatOffer(offer, db) {
        const fromUser = db.data.users[offer.from]
        const toUser = db.data.users[offer.to]
        const minutesLeft = Math.ceil((offer.expiresAt - Date.now()) / 60000)

        let text = `
╭━━━━━━━━━━━━━━━ 🤝 ━━━━━━━━━━━━━━╮
┃        TRADE OFFER
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

From: ${fromUser?.registered ? fromUser.name : 'Unknown'} (@${offer.from.split('@')[0]})
To: ${toUser?.registered ? toUser.name : 'Unknown'} (@${offer.to.split('@')[0]})

📦 *OFFERING:*
`
        for (const [item, amount] of Object.entries(offer.offer)) {
            text += `  • ${item}: ${amount}\n`
        }

        text += `\n📋 *REQUESTING:*\n`
        for (const [item, amount] of Object.entries(offer.request)) {
            text += `  • ${item}: ${amount}\n`
        }

        text += `\n⏰ Expires in: ${minutesLeft} minutes`
        text += `\n📌 Offer ID: ${offer.id.split('_').slice(-1)[0]}`

        return text
    }
}

export default tradingSystem
