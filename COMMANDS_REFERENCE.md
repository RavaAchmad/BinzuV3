# 📚 Complete RPG System Commands Reference

## 🎮 Player Commands

### Skill System
```
.selectskill                 View all available skills
.selectskill <skill_name>    Select a skill (swordmaster, witch, necromancer, etc)
.skillstat                   View your current skill stats
.skilllevel                  Upgrade your skill level (costs money)
.skillinfo <skill>           Get detailed info about a skill
```

**Available Skills:**
- ⚔️ Swordmaster (STR/DEF)
- 💀 Necromancer (MAG/DEF)
- 🧙‍♀️ Witch (MAG/CRIT)
- 🏹 Archer (AGI/CRIT)
- ⚡⚔️ Magic Swordmaster (STR/MAG)
- 🗡️ Thief (AGI/CRIT)
- 👤 Shadow (AGI/MAG)

---

### Dungeon Combat
```
.dungeon                     Show dungeon menu & available dungeons
.dungeon enter <difficulty>  Enter a dungeon (easy/normal/hard/nightmare)
.dungeon attack              Attack the enemy in combat
.dungeon item <index>        Use an item in combat
.dungeon status              Check current combat status
.dungeon flee                Try to escape dungeon (50% chance, has penalty)
```

**Dungeon Requirements:**
- Must select a skill first (`.selectskill`)
- Minimum level requirement per difficulty
- Combat cost: Health (restored after win)

---

### Daily Missions & Progression
```
.missions                    View all daily missions and progress
.roleinfo                    View your current tier and progression
```

**Daily Missions Auto-Track:**
- Combat activities (dungeon wins, boss defeats)
- Gathering activities (mining, fishing, crafting)
- Progression goals (skill leveling, exp gain)
- Auto-complete when targets reached
- Reset every 24 hours

---

## 👨‍💼 Admin Commands

### Advertisement Management
```
.setads                      Show ads management menu
.setads set <name> <text>    Create a text advertisement
.setads upload <filename>    Upload image ad (reply to image first)
.setads remove <name>        Delete an advertisement
.setads list                 Show all configured ads
.setads preview              Preview how ads will look
```

**Ads Features:**
- Text ads appear with formatting
- Image ads uploaded to `src/ads/` folder
- Old images replaced automatically
- Ads rotate randomly after menu display
- Active/Inactive toggle support

**Example Usage:**
```
.setads set banner1 "Join our Discord! https://discord.gg/xyz"
→ Reply to image
.setads upload banner.jpg
→ Image saved and displayed after menu
```

---

## 📊 Info & Status Commands

### Character Status
```
.skillstat                   Current skill stats and level
.roleinfo                    Tier information and progression
.missions                    Daily mission progress
```

### Menu
```
.menu                        Main menu (ads display after)
.menu all                    Show all commands
.menu <category>             Show specific category
```

---

## 🎯 Quick Reference by Activity

### When You Start
```
1. .selectskill              # Pick your class
2. .roleinfo                 # See progression path
3. .dungeon                  # View dungeons
```

### Daily Routine
```
1. .missions                 # Check what to do
2. .dungeon enter normal     # Do some combat
3. .skillstat                # Track progress
```

### Skill Progression
```
.skillstat                   # Check current skills
.skilllevel                  # Level up skill (unlocks abilities)
.skillinfo necromancer       # Learn about other skills
```

### Combat
```
.dungeon enter easy          # Start combat
.dungeon attack              # Attack enemy
.dungeon status              # Check health/status
.dungeon flee                # Try to escape (50% success)
```

---

## 💡 Tips & Tricks

### Maximize Exp Gain
- Stack: Missions (auto-track) + Dungeons (hard mode) = 13K exp/day
- Relationship bonus: +150 exp/day if partnered
- Skill leveling gives modest boost

### Optimize Skill Choice
- **Fast Paced?** → Thief (high AGI, quick strikes)
- **Casual?** → Swordmaster (balanced, forgiving)
- **Magic User?** → Necromancer or Witch
- **Ranged?** → Archer

### Dungeon Strategy
- Easy dungeons: 100% win rate, quick exp
- Normal dungeons: Balanced risk/reward
- Hard dungeons: Check your stats first
- Nightmare: Only for level 50+, big rewards

### Money Management
- Skill upgrades cost 500-30,000 (scales up)
- Dungeons give money too (1K-20K per run)
- Don't blow it all - save for upgrades

---

## 🚨 Important Notes

### What Affects Rewards
✅ Your skill level (damages, defenses)
✅ Difficulty chosen (1x to 2.5x multiplier)
✅ Your current level (level gates content)
❌ RNG (rewards are fixed, not random)

### What Doesn't Exist (By Design)
❌ Equipment/gear system (skills provide stats)
❌ Unlimited farming (missions reset daily)
❌ Quick-rich schemes (rewards are balanced)
❌ Exploit dungeons (level-gated properly)

### One-Time Choices
⚠️ **Skill Selection is Permanent**
- Once you pick a skill, you can't change
- Choose carefully!
- Each skill is equally viable

---

## ⚙️ Command Syntax Rules

**Format Examples:**
```
.selectskill swordmaster    ✅ (skill name lowercase)
.selectskill SwordMaster    ❌ (wrong capitalization)
.dungeon enter hard         ✅ (difficulty lowercase)
.dungeon enter HARD         ❌ (wrong format)
.setads set ads1 "text"     ✅ (quotes for spaces)
.setads set ads1 text       ❌ (space-delimited limited)
```

---

## 📱 Mobile-Friendly Tips

- Commands work the same on mobile
- Just type and send normally
- Menu displays format for small screens
- Combat status updates easily
- Ads show after menu display

---

## 🆘 Common Questions

**Q: Can I change skills?**
A: No, skill choice is permanent (by design)

**Q: How long to reach level 500?**
A: ~150-200 hours of gameplay (intentional)

**Q: Do I have to do missions?**
A: No, they're optional bonus exp (5K/day)

**Q: Can I farm dungeons infinitely?**
A: No soft limit, but rewards scale/diminish

**Q: How often reset ads after menu?**
A: Random selection from active ads, ~1s after menu

**Q: Can I see other players' stats?**
A: Use `.profile @user` for basic info

---

## 📞 Report Issues

If a command doesn't work:
1. Check spelling (lowercase usually)
2. Verify you meet requirements (e.g., skill selected)
3. Type `.help` to see all commands
4. Contact admin if broken

---

## 🎖️ Achievement Icons

As you progress, you'll see:
- 📚 Apprentice (Tier 1) - Lv 1-70
- ⚔️ Initiate (Tier 2) - Lv 71-140
- 🎖️ Veteran (Tier 3) - Lv 141-210
- 👑 Champion (Tier 4) - Lv 211-280
- ✨ Legend (Tier 5) - Lv 281-350
- 🔮 Mythic (Tier 6) - Lv 351-420
- 👹 Eternal (Tier 7) - Lv 421-500

---

**Last Updated:** March 14, 2026
**Version:** 1.0
**Status:** Ready for Use ✅
