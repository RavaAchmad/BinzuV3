# 🛠️ RPG System Enhancement - Integration Guide

## Quick Start

### 1. Verify All Files Are In Place
```
lib/
├── skill-system.js ✅
├── combat-system.js ✅
├── mission-generator.js ✅
└── ... (existing files)

plugins/
├── rpg-selectkil.js (MODIFIED) ✅
├── rpg-role.js (MODIFIED) ✅
├── rpg-dungeon-turnbase.js (NEW) ✅
├── rpg-missions.js (NEW) ✅
├── rpg-roleinfo.js (NEW) ✅
├── owner-setads.js (NEW) ✅
├── _pacaranBonus.js (NEW) ✅
├── yula-menu.js (MODIFIED) ✅
└── ... (existing files)

src/
└── ads/ (auto-created) ✅
```

### 2. No Database Migration Needed!
All new fields auto-initialize when first accessed. The system gracefully handles missing data.

---

## 🎮 User Quick Commands

### Skill System
```bash
.selectskill              # View available skills
.selectskill swordmaster  # Select skill
.skillstat               # View your stats
.skilllevel              # Upgrade skill (costs money)
.skillinfo necromancer   # Details about skill
```

### Dungeon Combat
```bash
.dungeon                 # View dungeon menu
.dungeon enter easy      # Start easy dungeon
.dungeon attack          # Attack in combat
.dungeon status          # Check combat status
.dungeon flee            # Try to escape (50% chance)
```

### Daily Missions
```bash
.missions               # View daily missions & progress
# Missions auto-update as you play!
```

### Role Information
```bash
.roleinfo              # View tier progression
```

---

## 👨‍💼 Admin Commands

### Manage Advertisements
```bash
.setads set banner1 "Check our new features!"
         # Create text ad

.setads upload ad_image.jpg
         # Reply to image, then use this
         # File saved to: src/ads/ad_image.jpg

.setads list
         # Show all configured ads

.setads remove banner1
         # Remove ad (deletes file too)

.setads preview
         # See what ads look like
```

---

## 📊 Understanding The New Systems

### Skill Progression
```
Level 1    → +2.5 STR per level (Swordmaster example)
Level 30   → ~85 STR (starts at 10)
Cost:      → 500 base + (level × 300) money
EXP needed → 500 base + (level × 200) exp
```

### Dungeon Difficulty Scaling
```
EASY    → 1x rewards (Goblin, Level 1+)
NORMAL  → 1x rewards (Orc, Level 10+)
HARD    → 1.5x rewards (Demon, Level 25+)
NIGHTMARE → 2.5x rewards (Abyssal Horror, Level 50+)
```

### Tier Progression
```
Tier 1 (Lv 1-70)    → Apprentice
Tier 2 (Lv 71-140)  → Initiate
Tier 3 (Lv 141-210) → Veteran
...
Tier 7 (Lv 421-500) → Eternal
```

### Daily Missions
- Generated fresh daily (24-hour reset)
- 3 types: Combat, Gathering, Progression
- Auto-complete when target reached
- ~5000-15000 total exp per day

### Pacaran Bonus
- 150 exp/day when in mutual relationship
- No economy burst (2% of normal earning)
- Tracked in relationshipStat

---

## 🔌 Integrating Existing Plugins

If you want new plugins to contribute to mission tracking:

```javascript
// In your plugin file (e.g., rpg-fishing.js)
import { trackMissionActivity } from '../plugins/rpg-missions.js'

// When user catches a fish:
trackMissionActivity(user, 'fishing', 1)

// When user completes activity:
trackMissionActivity(user, 'dungeonWins', 1)
```

Available activity types:
- `dungeonRuns`, `dungeonWins`, `bossKills`
- `mining`, `fishing`, `crafting`, `garden`
- `expGain`, `moneyGain`, `skillLevelup`
- `relationships`, `gamePlayed`

---

## 🐛 Troubleshooting

### User says "You must select a skill first!"
- They need to run `.selectskill <skillname>`
- Confirm the skill is available in the list

### Dungeon won't let them enter
- Check minimum level requirement
- `.roleinfo` shows their current level
- May need to level up more

### Ads not showing
- Run `.setads list` as admin
- If empty, use `.setads set` to create one
- Check `/src/ads/` folder exists

### Missions not progressing
- Missions auto-track dungeon/game activity
- May need to wait for plugin hooks
- View pending missions with `.missions`

---

## 📈 Economic Health Checks

### Monitor These Metrics
```
Daily user exp gain: ~5000-15000 (missions help)
Daily money gain: ~10000-50000 (should be reasonable)
Skill upgrade cost: 500-30000 (should be affordable)
Dungeon rewards: Scale with difficulty, not broken
```

### If Economy Looks Broken
1. Check if players are exploiting a specific dungeon
2. Verify mission rewards in `mission-generator.js`
3. Adjust reward multipliers in `combat-system.js`
4. Set money cap in `_antibug.js` if needed

---

## ⚙️ Custom Configuration

### Change Dungeon Difficulties
Edit `plugins/rpg-dungeon-turnbase.js`:
```javascript
const dungeonDifficulties = {
    EASY: {
        enemy: { health: 50, damage: 15 },  // ← adjust here
        rewards: { exp: 500, money: 1000 }
    }
}
```

### Adjust Skill Costs
Edit `lib/skill-system.js`:
```javascript
getUpgradeCost(level) {
    return {
        money: 500 + (level * 300),  // ← change multiplier
        materials: 10 + (level * 5)
    }
}
```

### Change Pacaran Bonus
Edit `plugins/_pacaranBonus.js`:
```javascript
const bonusExp = Math.floor(150)  // ← change this number
```

---

## 📱 Player Experience Flow

### New Player Journey
```
1. Register
2. Select skill (.selectskill)
3. Check stats (.skillstat)
4. View missions (.missions)
5. Enter easy dungeon (.dungeon enter easy)
6. Gain exp and level up
7. Skill auto-upgrades when exp needed
8. Progress to harder dungeons
9. Climb tier ranks
```

### Daily Routine
```
Morning: .missions (check what to do)
During Play: Dungeons, missions auto-track
Evening: .roleinfo (see progress)
Next Day: Missions reset, repeat
```

---

## 🎓 Advanced Features

### Skill Synergy Example
```
Thief (high AGI + CRIT)
→ High dodge + backstab damage
→ Perfect for HARD dungeons (needs quick wins)
→ Strong with critical builds
```

### Progression Path Example
```
.selectskill archer
(Lv 1-30) → Archer skill leveling
(Lv 1-70) → Apprentice tier quests
(Lv 70) → Tier 2 unlock
(Lv 70-140) → Harder dungeons available
(Repeat through Tiers 1-7)
```

---

## 📞 Support

If something doesn't work:
1. Check file locations first
2. Verify imports in plugins
3. Check error logs (look for red text)
4. Check user database structure (should auto-init)
5. Restart bot if needed

---

## 🎯 Success Criteria

✅ Skill system working: Users can select and level
✅ Dungeons accessible: Users can enter and combat works
✅ Missions visible: `.missions` shows daily tasks
✅ Ads showing: See ads after `.menu`
✅ Roles progressing: Tiers update with level
✅ No crashes: Bot stays stable

If all above work, **you're good to go!** 🚀

---

Version: 1.0
Ready for Production: Yes
Last Tested: March 14, 2026
