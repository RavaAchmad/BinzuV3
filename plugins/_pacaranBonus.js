/**
 * Pacaran (Relationship) Bonus System
 * Provides minimal exp bonuses for users in relationships
 */

let handler = m => m

handler.all = async function (m, { conn, db }) {
    const user = global.db.data.users[m.sender]
    
    // Early exit if no relationship data
    if (!user || !user.pasangan || user.pasangan === '') return

    // Check if partner exists and is in mutual relationship
    const partner = global.db.data.users[user.pasangan]
    if (!partner || partner.pasangan !== m.sender) return

    // Apply daily bonus only once per day (tracked by lastDayBonusApplied)
    const today = new Date().toDateString()
    if (user.lastDayBonusApplied === today) return

    // Calculate bonus exp - minimal impact (2% of base daily earning)
    // Assuming average daily farming = 5000-10000 exp
    const bonusExp = Math.floor(150) // ~2% of 7500 baseline
    
    user.exp = (user.exp || 0) + bonusExp
    user.lastDayBonusApplied = today
    
    // Track relationship stat
    if (!user.relationshipStat) {
        user.relationshipStat = {
            days: 0,
            totalBonusExp: 0,
            lastInteraction: Date.now()
        }
    }
    user.relationshipStat.totalBonusExp += bonusExp
    user.relationshipStat.lastInteraction = Date.now()
}

export default handler
