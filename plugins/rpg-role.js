/**
 * Advanced Role System - MMORPG Style
 * 7 Tiers with 70+ levels each, up to level 500
 */

const roleDatabase = {
    tier1: {
        name: 'Apprentice',
        levels: [1, 70],
        roles: [
            { name: 'Trainee ㋡', min: 1, max: 10 },
            { name: 'Novice Grade 1 ⚊¹', min: 11, max: 20 },
            { name: 'Novice Grade 2 ⚊²', min: 21, max: 35 },
            { name: 'Novice Grade 3 ⚊³', min: 36, max: 50 },
            { name: 'Novice Grade 4 ⚊⁴', min: 51, max: 70 }
        ],
        emoji: '📚',
        reward: { money: 5000, diamond: 0 }
    },
    tier2: {
        name: 'Initiate',
        levels: [71, 140],
        roles: [
            { name: 'Private Grade 1 ⚌¹', min: 71, max: 85 },
            { name: 'Private Grade 2 ⚌²', min: 86, max: 100 },
            { name: 'Private Grade 3 ⚌³', min: 101, max: 115 },
            { name: 'Private Grade 4 ⚌⁴', min: 116, max: 130 },
            { name: 'Private Grade 5 ⚌⁵', min: 131, max: 140 }
        ],
        emoji: '⚔️',
        reward: { money: 25000, diamond: 1 }
    },
    tier3: {
        name: 'Veteran',
        levels: [141, 210],
        roles: [
            { name: 'Corporal Grade 1 ☰¹', min: 141, max: 160 },
            { name: 'Corporal Grade 2 ☰²', min: 161, max: 180 },
            { name: 'Corporal Grade 3 ☰³', min: 181, max: 200 },
            { name: 'Sergeant Grade 1 ▲¹', min: 201, max: 210 }
        ],
        emoji: '🎖️',
        reward: { money: 75000, diamond: 3 }
    },
    tier4: {
        name: 'Champion',
        levels: [211, 280],
        roles: [
            { name: 'Sergeant Grade 2 ▲²', min: 211, max: 230 },
            { name: 'Sergeant Grade 3 ▲³', min: 231, max: 250 },
            { name: 'Captain Grade 1 ◆¹', min: 251, max: 270 },
            { name: 'Captain Grade 2 ◆²', min: 271, max: 280 }
        ],
        emoji: '👑',
        reward: { money: 200000, diamond: 7 }
    },
    tier5: {
        name: 'Legend',
        levels: [281, 350],
        roles: [
            { name: 'Major Grade 1 ⬟¹', min: 281, max: 305 },
            { name: 'Major Grade 2 ⬟²', min: 306, max: 330 },
            { name: 'Colonel Grade 1 ◇¹', min: 331, max: 350 }
        ],
        emoji: '✨',
        reward: { money: 500000, diamond: 15 }
    },
    tier6: {
        name: 'Mythic',
        levels: [351, 420],
        roles: [
            { name: 'Colonel Grade 2 ◇²', min: 351, max: 375 },
            { name: 'General Grade 1 ⬟◆¹', min: 376, max: 400 },
            { name: 'General Grade 2 ⬟◆²', min: 401, max: 420 }
        ],
        emoji: '🔮',
        reward: { money: 1000000, diamond: 25 }
    },
    tier7: {
        name: 'Eternal',
        levels: [421, 500],
        roles: [
            { name: 'Archon Grade 1 ⚡¹', min: 421, max: 450 },
            { name: 'Archon Grade 2 ⚡²', min: 451, max: 475 },
            { name: 'Supreme ⚡S', min: 476, max: 500 },
            { name: 'Transcendent 忍', min: 500, max: 500 }
        ],
        emoji: '👹',
        reward: { money: 2500000, diamond: 50 }
    }
}

let handler = m => m

handler.before = function (m, { conn, db }) {
    let user = global.db.data.users[m.sender]
    
    // Determine role based on level
    let role = getRoleByLevel(user.level || 1)
    user.role = role
    
    // Tier unlock features
    user.tier = getTierByLevel(user.level || 1)
    
    return true
}

function getRoleByLevel(level) {
    for (const tier of Object.values(roleDatabase)) {
        for (const roleData of tier.roles) {
            if (level >= roleData.min && level <= roleData.max) {
                return roleData.name
            }
        }
    }
    return 'Trainee ㋡' // Fallback
}

function getTierByLevel(level) {
    if (level <= 70) return 1
    if (level <= 140) return 2
    if (level <= 210) return 3
    if (level <= 280) return 4
    if (level <= 350) return 5
    if (level <= 420) return 6
    return 7
}

export default handler
export { roleDatabase, getRoleByLevel, getTierByLevel }