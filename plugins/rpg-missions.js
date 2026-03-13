/**
 * Daily Missions System
 * Displays and tracks auto-generated daily missions
 */

import missionGenerator, { activityTypes } from '../lib/mission-generator.js'

let handler = async (m, { conn, usedPrefix }) => {
    let user = global.db.data.users[m.sender]

    // Initialize missions for user
    missionGenerator.initMissions(user)

    const tracker = user.missionTracker
    const display = missionGenerator.getMissionsDisplay(user)

    m.reply(display)
}

/**
 * Middleware to track activities across plugins
 * This should be hooked into dungeon, mining, fishing, crafting plugins
 */
export function trackMissionActivity(user, activityType, amount = 1) {
    if (!user) return
    missionGenerator.trackActivity(user, activityType, amount)
}

handler.help = ['missions']
handler.tags = ['rpg']
handler.command = /^missions?$/i
handler.register = true
handler.group = true

export default handler
