import { RPGHandler } from '../lib/rpg-handler.js'
import { SKILL_DATABASE } from '../lib/rpg-core-engine.js'

let handler = async (m, { conn, text, args, usedPrefix }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    const user = await RPGHandler.initializeUser(global.db, userId, userName)

    const subcommand = (args[0] || 'menu').toLowerCase()

    switch (subcommand) {
      case 'menu':
      case 'main': {
        const menu = `
╔═════════════════════════════════════╗
║   ⚔️ RPG GAME - HOW TO PLAY ⚔️      ║
╚═════════════════════════════════════╝

📚 *GAME CONCEPT:*
Gain experience through activities to level up.
More levels = Better dungeons & rewards.
Customize with skills for unique playstyle.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎮 *MAIN ACTIVITIES (5 min cooldown):*
  !hunt - Combat hunting, fair rewards
  !fish - Relaxed fishing, quick exp
  !mine - Mining ore, best money
  !work - Job work, steady income
  !adventure - Long quest, big rewards

✨ *COMBAT:*
  !dungeon NORMAL - Start 1v1 dungeon
  !attack slash - Attack in combat
  (Harder difficulty = bigger rewards)

📈 *PROGRESSION:*
  !stats - Full profile & character sheet
  !selectskill [name] - Pick a skill
  !rpg skills - List all skills

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *FOR BEGINNERS:*
1. Do !hunt a few times (gain exp+money)
2. Check !stats to see progress
3. Try !dungeon normal when ready
4. Win = get double XP!

For details: !rpg detailed
`
        m.reply(menu)
        break
      }

      case 'detailed': {
        const detailed = `
╔═════════════════════════════════════╗
║       📖 DETAILED GAME GUIDE        ║
╚═════════════════════════════════════╝

**1. PROGRESSION SYSTEM**
├─ Start Level 1 with 0 exp
├─ Gain exp from activities or dungeons
├─ 1000 exp = Level 2
├─ 1120 exp = Level 3 (grows ~12% per level)
└─ Rinse, repeat → Eventually level 300!

**2. STATS & ATTRIBUTES**
├─ STR (Strength): Physical damage
├─ AGI (Agility): Attack speed & dodge
├─ DEF (Defense): Damage reduction
├─ MAG (Magic): Spell power & mana
├─ CRIT: Chance to deal 1.5x damage
└─ LUCK: Item drop rate multiplier

Stats increase from:
  • Leveling up (+1-2 per level)
  • Skill levels (+bonus per skill level)
  • Equipment bonuses

**3. SKILLS (Pick ONE to start)**
├─ Swordmaster ⚔️: Best for hunters
├─ Archer 🏹: Best for speed
├─ Mage 🧙: Best for magic damage
├─ Necromancer 💀: Life steal + damage
└─ Paladin ⛑️: Tank + healing

Each skill adds unique stat bonuses.
Level skill up by doing activities.
Available at:
  - Level 1: Buy skill essence
  - Equip skill essence
  - Start gaining skill exp

**4. ACTIVITY COOLDOWNS**
Hunt: 5 minutes, 150 exp, 100 money
Fish: 5 minutes, 120 exp, 80 money
Mine: 5 minutes, 140 exp, 150 money
Work: 5 minutes, 100 exp, 150 money

Skills boost rewards by ~20%
Higher levels don't affect cooldown
(Fair for all!)

**5. DUNGEON COMBAT**
├─ 1v1 turn-based batte
├─ You attack → Enemy counters
├─ Repeat until one dies
└─ Winner: Get exp + money

Difficulties:
EASY: 0.7x (for practice)
NORMAL: 1x (recommended)
HARD: 1.8x (for pros)
NIGHTMARE: 3x (skill required)
INFERNO: 5x (hardcore only)

**6. ECONOMY**
Get money from:
  • Hunt/Mine/Work/Fish
  • Dungeon victories
  • Completing quests

Spend money on:
  • Equipment upgrades
  • Item purchases
  • Special rewards

Emeralds for top-tier upgrades
(Don't worry, get free ones too)

**7. MECHANICS**
- Cooldowns are global (one per activity)
- Stats update automatically on level up
- Combat is FAIR (no pay-to-win)
- Leaderboards reset weekly

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Want skill list? !rpg skills
Want balance info? !rpg balance
`
        m.reply(detailed)
        break
      }

      case 'skills': {
        let skillText = `
╔═════════════════════════════════════╗
║     🔮 SKILL SELECTION GUIDE       ║
╚═════════════════════════════════════╝

Choose ONE to start! Can change later.

⚔️ *SWORDMASTER*
  Emoji: ⚔️
  Best for: Hunt + Dungeon
  Bonus: +STR (physical damage)
  Playstyle: Full damage dealer

🏹 *ARCHER*
  Emoji: 🏹
  Best for: Speed runners
  Bonus: +AGI (attack speed)
  Playstyle: Hit fast, dodge attacks

🧙 *MAGE*
  Emoji: 🧙
  Best for: Spell lovers
  Bonus: +MAG (magic damage)
  Playstyle: Spell burst damage

💀 *NECROMANCER*
  Emoji: 💀
  Best for: Advanced
  Bonus: +MAG + Life steal
  Playstyle: Drain enemies to heal

⛑️ *PALADIN*
  Emoji: ⛑️
  Best for: Tank playstyle
  Bonus: +DEF + Healing
  Playstyle: Tank damage, support

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To select:
!selectskill swordmaster
!selectskill archer
!selectskill mage
!selectskill necromancer
!selectskill paladin
`
        m.reply(skillText)
        break
      }

      case 'balance': {
        m.reply(`
╔═════════════════════════════════════╗
║       ⚖️ BALANCE INFORMATION       ║
╚═════════════════════════════════════╝

**DIFFICULTY MULTIPLIERS:**
EASY:       0.7x exp, 0.7x money
NORMAL:     1.0x exp, 1.0x money
HARD:       1.8x exp, 1.8x money
NIGHTMARE:  3.0x exp, 3.0x money
INFERNO:    5.0x exp, 5.0x money

**ACTIVITY BALANCING:**
All activities have same cooldown: 5min
Fair solo grinding
Rewards scale with difficulty

**SKILL BENEFITS:**
~20% better rewards from activities
Unique stat bonuses per skill
Level up skills independently

**ECONOMY:**
Money from: activities, dungeons
No inflation (carefully balanced)
Cost scaling reasonable for all levels

**COMBAT BALANCE:**
Enemy scales to your level
Stats matter (no RNG BS)
Higher levels = stronger enemies
Fair difficulty progression

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Design: Fair, Fun, Not Grindy ✓
`)
        break
      }

      default: {
        m.reply('Usage: !rpg menu | !rpg detailed | !rpg skills | !rpg balance')
      }
    }

  } catch (error) {
    console.error('RPG menu error:', error)
    m.reply(`❌ Error: ${error.message}`)
  }
}

handler.help = ['rpg']
handler.tags = ['rpg', 'info']
handler.command = /^rpg$/i
handler.register = true
handler.rpg = true

export default handler
