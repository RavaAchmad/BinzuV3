/**
 * Bounty System - Player vs Player Challenges
 * Allows targeting other players with bounties & rewards
 */

const bountySystem = {
    bounties: {},

    createBounty(issuer, target, amount = 10000, reason = '') {
        if (!this.bounties[target]) {
            this.bounties[target] = []
        }

        const bounty = {
            id: `${target}_${Date.now()}`,
            target,
            issuer,
            amount,
            reason,
            createdAt: Date.now(),
            expiresAt: Date.now() + 604800000, // 7 hari
            claimedBy: null,
            claimedAt: null
        }

        this.bounties[target].push(bounty)
        return bounty
    },

    getActiveBounties(target) {
        const now = Date.now()
        return (this.bounties[target] || [])
            .filter(b => b.expiresAt > now && !b.claimedBy)
    },

    getTotalBounty(target) {
        return this.getActiveBounties(target)
            .reduce((sum, b) => sum + b.amount, 0)
    },

    claimBounty(bountyId, claimer) {
        for (const targetBounties of Object.values(this.bounties)) {
            const bounty = targetBounties.find(b => b.id === bountyId)
            if (bounty && !bounty.claimedBy) {
                bounty.claimedBy = claimer
                bounty.claimedAt = Date.now()
                return bounty
            }
        }
        return null
    },

    formatBounty(bounty) {
        const timeLeft = Math.ceil((bounty.expiresAt - Date.now()) / 86400000)
        return `
🎯 *BOUNTY ACTIVE*
├─ Target: @${bounty.target.split('@')[0]}
├─ Issued by: @${bounty.issuer.split('@')[0]}
├─ Reward: 💹 ${bounty.amount.toLocaleString('id-ID')}
├─ Reason: ${bounty.reason || 'No reason given'}
└─ Expires in: ${timeLeft} days
`
    }
}

export default bountySystem
