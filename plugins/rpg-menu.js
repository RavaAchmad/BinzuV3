let handler = async (m, { conn, usedPrefix }) => {
    const text = `
╭━━━━━━━━━━━━━━━━ 🎮 RPG MENU ━━━━━━━━━━━━━━━╮
┃
┃  *Welcome to Enhanced RPG System!*
┃
┃  📊 CORE FEATURES
┃  ├─ ${usedPrefix}rpgstats - View your complete stats
┃  ├─ ${usedPrefix}dungeonrank - Check dungeon tier
┃  └─ ${usedPrefix}inventory - Full inventory
┃
┃  🏆 LEADERBOARDS  
┃  ├─ ${usedPrefix}leaderboard daily dungeonwins
┃  ├─ ${usedPrefix}leaderboard weekly exp
┃  ├─ ${usedPrefix}leaderboard seasonal money
┃  └─ ${usedPrefix}leaderboard alltime achievements
┃
┃  📋 DAILY MISSIONS
┃  ├─ ${usedPrefix}mission list - View missions
┃  ├─ ${usedPrefix}mission start [number]
┃  ├─ ${usedPrefix}mission progress
┃  └─ ${usedPrefix}mission reward
┃
┃  🏅 ACHIEVEMENTS
┃  ├─ ${usedPrefix}achievement - View badges
┃  └─ ${usedPrefix}achv - Shorthand
┃
┃  💀 BOSS RAIDS
┃  ├─ ${usedPrefix}bosraid list - Available bosses
┃  ├─ ${usedPrefix}bosraid start [name]
┃  ├─ ${usedPrefix}bosraid attack
┃  └─ ${usedPrefix}bosraid info
┃
┃  🤝 PLAYER TRADING
┃  ├─ ${usedPrefix}trade list
┃  ├─ ${usedPrefix}trade offer @user
┃  ├─ ${usedPrefix}trade accept [id]
┃  └─ ${usedPrefix}trade reject [id]
┃
┃  💰 BOUNTY SYSTEM
┃  ├─ ${usedPrefix}dungeonrank bounty @user [amount]
┃  └─ ${usedPrefix}dungeonrank bounties
┃
┃  ⚙️ OTHER COMMANDS
┃  ├─ ${usedPrefix}adventure - Adventure quest
┃  ├─ ${usedPrefix}work - Work for money
┃  ├─ ${usedPrefix}hunt - Hunt for items
┃  ├─ ${usedPrefix}fishing - Fish for catch
┃  ├─ ${usedPrefix}mining - Mine resources
┃  ├─ ${usedPrefix}craft - Craft items
┃  └─ ${usedPrefix}claim - Daily rewards
┃
┃  📖 DOCUMENTATION
┃  └─ View: RPG_FEATURES_GUIDE.md
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

🌟 *What's New in This Update:*

✅ **Dungeon Rank System** - Auto-scaling difficulty
✅ **Multi-Timeframe Leaderboards** - Daily/Weekly/Seasonal
✅ **Daily Mission System** - Rotating quests with rewards
✅ **Achievement System** - Unlock badges & bonuses
✅ **Boss Raid Encounters** - Epic co-op battles
✅ **Player Trading** - Exchange items with others
✅ **Bounty System** - Create competitive challenges
✅ **Enhanced Diamond Scarcity** - Make gems more valuable

🎯 *Progression Path:*
1️⃣ Start daily missions for consistent rewards
2️⃣ Climb your dungeon rank for better loot
3️⃣ Compete on leaderboards
4️⃣ Unlock achievements
5️⃣ Defeat boss raids
6️⃣ Trade & interact with players

💡 *Pro Tips:*
• diamonds are now rare - use them wisely!
• Boss raids give 10x better rewards than dungeons
• Check leaderboards daily for ranking boosts
• Complete seasonal missions before reset
• Team up with friends for boss raids

Ready to become a legend? Start with: ${usedPrefix}mission list
`

    return m.reply(text)
}

handler.help = ['rpgmenu']
handler.tags = ['rpg', 'menu']
handler.command = /^(rpgmenu|rmenu)$/i

export default handler
