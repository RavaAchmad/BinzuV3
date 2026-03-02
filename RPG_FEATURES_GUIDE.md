# 🎮 RPG System - Complete Feature Guide

## 📊 Dungeon Rank System

Your dungeon difficulty automatically scales based on your level:

### Rank Progression
- **🟢 Beginner Dungeon** (Lvl 1-20): 0.5x rewards, easy enemies
- **🟡 Normal Dungeon** (Lvl 21-50): 1x rewards, balanced difficulty
- **🔴 Hard Dungeon** (Lvl 51-100): 1.5x rewards, challenging
- **⚫ Nightmare Dungeon** (Lvl 101-200): 2x rewards, extreme
- **💀 Inferno Dungeon** (Lvl 201+): 3x rewards, impossible mode

#### Command
```
/dungeonrank stats [@user]
/dungeonrank rank [@user]
```

---

## 🏆 Leaderboard System

Track your performance across multiple timeframes:

### Timeframes
- **Daily**: Resets every 24 hours
- **Weekly**: Resets every 7 days  
- **Seasonal**: Resets every 6 months
- **All Time**: Permanent records

### Tracked Categories
- **dungeonwins** - Number of dungeon victories
- **dungeonruns** - Total dungeon attempts
- **exp** - Total experience gained
- **money** - Total money earned
- **bosskills** - Boss raid victories
- **achievements** - Achievements unlocked

#### Commands
```
/leaderboard [timeframe] [category]
/leaderboard daily dungeonwins
/leaderboard weekly exp
/leaderboard seasonal money
/leaderboard alltime achievements
```

---

## 📋 Daily Missions System

Complete rotating daily missions for exclusive rewards!

### Available Missions (Rotate Daily)
1. **Dungeon Novice** - Complete 3 Beginner Dungeons
   - Reward: 5k Exp, 10k Money, 1 Diamond

2. **Dungeon Champion** - Win 2 Hard Dungeons
   - Reward: 15k Exp, 50k Money, 3 Diamond

3. **Experience Hunter** - Gain 50k Exp
   - Reward: 10k Exp, 25k Money, 2 Emerald

4. **Resource Miner** - Mine 100 total resources
   - Reward: 8k Exp, 20k Money, 100 Iron

5. **Master Fisherman** - Catch 30 fish
   - Reward: 7k Exp, 15k Money, 5 Common

6. **Master Crafter** - Craft 5 different items
   - Reward: 12k Exp, 30k Money, 1 Diamond

7. **Boss Killer** - Defeat 2 Boss Raids
   - Reward: 25k Exp, 100k Money, 5 Diamond, 1 Legendary

8. **Achievement Collector** - Unlock 5 Achievements
   - Reward: 20k Exp, 50k Money, 2 Diamond

#### Commands
```
/mission list - View today's missions
/mission start [number] - Start a mission
/mission progress - Check progress
/mission reward - Claim finished mission rewards
```

---

## 🏅 Achievement System

Unlock badges and earn bonus rewards!

### Achievements Available
- 🌱 **Novice Adventurer** - Reach Level 10
- 💎 **Diamond Collector** - Collect 50 Diamonds
- ⚔️ **Dungeon Master** - Complete 50 Dungeon wins
- 💰 **Money Master** - Have 1M Money
- ✨ **Experience Hunter** - Gain 500k Exp
- 🔨 **Master Crafter** - Craft 100 items
- 🍀 **Lucky One** - Get Legendary from crate
- 💀 **Boss Slayer** - Defeat 10 Boss Raids
- 👑 **Legend Player** - Reach Level 100

#### Commands
```
/achievement - View all achievements
/achv - Shorthand
```

---

## 🎁 Enhanced Crate System

Open crates with improved luck mechanics, guaranteed rewards, and daily bonuses!

### Features

#### 🍀 Luck Multiplier
- Increases by 3% with each consecutive crate opened
- Maximum 2.5x bonus at 50-crate streak
- Resets after 45 minutes of inactivity
- Tracks total crates opened across all time

**Example:**
- 1 crate: 1.0x (normal rewards)
- 10 crates: 1.3x (+30% reward bonus)
- 25 crates: 1.75x (+75% reward bonus)
- 50 crates: 2.5x (maximum, +150% rewards)

#### 📊 Pity Counter System
Guarantees rare items after opening certain amounts:

| Crate Type | Guaranteed After | Reward |
|-----------|-----------------|---------|
| Common | 15 opens | 3x Common Crate |
| Uncommon | 25 opens | 2x Uncommon Crate |
| Mythic | 60 opens | 1x Mythic Crate + 5 Diamond + 3 Emerald |
| Legendary | 200 opens | 1x Legendary Crate + 10 Diamond + 5 Emerald |

- Counter resets immediately after guaranteed reward
- Separate counter for each crate type
- Prevents "bad luck" streaks

#### 🎉 Daily First-Open Bonus
- First crate opened each day gets +50% reward boost
- Bonus stacks with luck multiplier
- Resets at midnight server time
- Shows special "🎉 FIRST OPEN BONUS" message

**Example:**
- Normal luck: 1.0x
- With daily bonus: 1.0x × 1.5 = 1.5x
- With 25-streak luck: 1.75x × 1.5 = 2.625x effective multiplier!

#### 📈 Reward Scaling
All crate rewards are multiplied by:
1. **Luck Multiplier** (1.0x - 2.5x based on consecutive opens)
2. **Daily Bonus** (1.5x on first open of day)
3. **Base Rewards** (by crate tier: common < uncommon < mythic < legendary)

### Commands

```
/open [crate_type] [quantity]
```

**Parameters:**
- `crate_type`: common, uncommon, mythic, or legendary
- `quantity`: 1-10 crates per command (max 10 to prevent spam)

**Examples:**
```
/open mythic 3
/open legendary 1
/open common 10
```

### Crate Tiers

#### 🟤 Common Crate
- Base reward: 101 Money
- Contains: Trash, Potions, Wood, Rock, String
- Drop rate: Highest
- Best for: New players accumulating resources

#### 🟢 Uncommon Crate  
- Base reward: 201 Money
- Contains: Diamond (5%), Potions, Common items
- Drop rate: Medium
- Best for: Mid-game progression

#### ⚫ Mythic Crate
- Base reward: 301 Money + 50 Exp
- Contains: Diamond (15%), Emerald, Gold, Mythic items
- Drop rate: Low
- Best for: Advanced players

#### 👑 Legendary Crate
- Base reward: 401 Money + 50 Exp
- Contains: Diamond (40%), Legendary items, Gold, Emerald
- Drop rate: Very low
- Best for: Endgame farming

### Display Information

When you open crates, you'll see:
```
📦 Opening 3x mythic Crate
▰▰▰▰▰▰▰▱▱▱ Processing...

━━━━━━━━━━━━━━━━━━━
💎 money: 903
💎 exp: 150
💎 diamond: 12
💎 legendary: 3
━━━━━━━━━━━━━━━━━━━

🍀 Luck Info:
├─ Streak: 5/50 (Multiplier: x1.15)
├─ Total Opened: 42
└─ Pity (mythic): 25/60
```

### Strategy Tips

1. **Build Your Streak** - Keep opening within 45 minutes to maintain bonus
2. **Daily First Open** - Always do your first crate right after daily reset for 1.5x bonus
3. **Plan for Pity** - Save up to reach guaranteed rewards (especially at 60 and 200 opens)
4. **Mix Crate Types** - Don't get stuck on one type; pity counters are separate
5. **Time Your Farming** - Open when you have time to maintain streak for max multiplier

### Luck Multiplier Speed

At different streaks:
- 0-10 opens: 1.0x - 1.3x (warmup phase)
- 10-25 opens: 1.3x - 1.75x (building momentum)
- 25-40 opens: 1.75x - 2.2x (high bonus phase)
- 40-50 opens: 2.2x - 2.5x (maximum bonus)

---

## 💀 Boss Raid System

Epic multiplayer boss encounters with massive rewards!

### Available Bosses

| Boss | Min Lvl | Difficulty | Main Reward |
|------|---------|-----------|-------------|
| ⚫ Stone Golem | 30 | 🔵 EPIC | 50k Exp, 5 Diamond
| 🐉 Fire Dragon | 50 | 🔴 LEGENDARY | 100k Exp, 10 Diamond
| 🦋 Shadow Beast | 70 | 🟣 EPIC | 150k Exp, 15 Diamond
| 👹 Dark Lord | 100 | 💜 MYTHIC | 250k Exp, 25 Diamond

#### Mechanics
- Boss has health points and defensive abilities
- Players deal damage through attacks
- Boss counterattacks each turn
- Alive players at end get reward multiplier
- Rewards scale with player count

#### Commands
```
/bosraid list - View available bosses
/bosraid start [bossname] - Start a raid
/bosraid attack - Attack the boss
/bosraid info - Check raid status
```

---

## 🤝 Trading System

Trade items with other players!

### How to Trade
1. Create an offer specifying what you offer and what you want
2. Other player reviews and accepts
3. Items are automatically transferred
4. Offers expire after 5 minutes if not accepted

#### Commands
```
/trade list - View active trades
/trade view [id] - See trade details
/trade offer @user - Create new offer
/trade accept [id] - Accept trade
/trade reject [id] - Reject trade
```

---

## 💰 Bounty System

Put bounties on players for competitive fun!

#### Commands
```
/dungeonrank bounty @user [amount] [reason]
/dungeonrank bounties - See bounties on you
```

---

## 📊 Complete RPG Stats

View comprehensive RPG profile:

```
/rpgstats - See all your RPG statistics
/stats - Shorthand
```

Displays:
- Main stats (Level, Health, Money, Diamond)
- Dungeon rank with reward multipliers
- Global rankings
- Leaderboard positions  
- Combat statistics
- Full inventory
- Pet levels
- Achievement progress
- Bank & ATM info

---

## 🎯 Reward Breakdown

### Diamond Drop Rates (Made Rare)
- **Adventure**: 12.5% chance for 1 diamond (cooldown: 10 min)
- **Dungeon**: 5.9% chance for 1 diamond
- **Normal Dungeon**: ~1/10 runs

### Experience Scaling
- Each dungeon tier gives 1.5x - 10x more XP
- Boss raids give 100k - 250k XP
- Missions give 5k - 25k XP daily

### Money Rewards
- Normal Dungeon: ~10k - 50k 
- Hard Dungeon: ~50k - 150k
- Boss Raids: 100k - 500k

---

## 🎮 Tips for Maximum Progress

1. **Daily Missions First** - Do them daily for consistent rewards
2. **Climb Leaderboards** - Compete for global recognition  
3. **Unlock Achievements** - Get bonus rewards for milestones
4. **Scale Dungeons** - Fight harder difficulties for better loot
5. **Boss Raids** - Team up for legendary items
6. **Trade Strategically** - Exchange duplicates for needed items
7. **Time Your Efforts** - Use Diamond scarcity strategically

---

## 📅 Season Calendar

**Current Season Settings:**
- Daily Reset: Every 24 hours at UTC+0
- Weekly Reset: Every Monday UTC+0
- Seasonal Reset: January 1st, July 1st of each year

---

## ⚡ Quick Command Reference

```
/mission          - Daily missions
/leaderboard      - Rankings
/achievement      - Badges
/bosraid          - Boss fights
/trade            - Player trading
/dungeonrank      - Rank info & bounties
/rpgstats         - Full profile
/rpgadmin         - Owner controls (ADMIN ONLY)
```

---

## 🛠️ Enhanced Tool & Item Upgrade System

Tools are essential in RPG progression! Each tool can be upgraded to become significantly more powerful.

### Tool Types & Bonuses

#### 🎣 Fishing Rod
- **Max Level:** 10
- **Stats:**
  - Catch Rate: 35% → 85% (base → max)
  - Speed Bonus: 1.0x → 1.72x (faster fishing)
  - Durability: 100 → 900 (per upgrade)
  - Success Exp Bonus: 0 → 450 (bonus exp per fish)
- **Use:** `/fish` command

#### ⛏️ Pickaxe
- **Max Level:** 10
- **Stats:**
  - Mine Rate: 40% → 100% (success rate)
  - Speed Bonus: 1.0x → 2.0x (faster mining)
  - Durability: 120 → 1200
  - Damage Bonus: 0 → 72 (ore quality multiplier)
- **Use:** `/mine` command

#### ⚔️ Sword
- **Max Level:** 10
- **Stats:**
  - Damage: 50 → 200 (attack power)
  - Crit Chance: 5% → 25% (critical hit %chance)
  - Durability: 150 → 1350
  - Heal Bonus: 0 → 100 HP (life steal per hit)
- **Use:** `/dung`, `/bosraid` commands

#### 🛡️ Armor
- **Max Level:** 10
- **Stats:**
  - Defense: 20 → 100 (defense power)
  - Damage Reduction: 5% → 20% (reduce incoming damage)
  - Durability: 200 → 1700
  - Block Chance: 0% → 20% (block attack %)
- **Use:** `/dung`, `/bosraid` commands
- **Benefit:** Reduce damage taken, protect from damage

#### 🏧 ATM
- **Max Level:** 100 (highest level cap!)
- **Stats:**
  - Money Capacity: 500M → 5.5B (max storable money)
  - Interest Rate: 2% → 12% (hourly interest!)
  - Withdraw Speed: 1.0x → 4.0x (faster withdrawals)
  - Money Multiplier: 1.0x → 3.0x (earn more money)
- **Use:** `/atm` command
- **Benefit:** Store money safely, earn passive interest

### Upgrade Mechanics

#### 📈 Exponential Scaling
- Each upgrade costs **1.4x more** than the previous
- Level 1→2: Normal cost
- Level 5→6: 3.6x base cost
- Level 9→10: 12.84x base cost
- **Tip:** Early levels are cheap, late levels are expensive!

#### 💰 Upgrade Costs

| Level | Fishing Rod | Pickaxe | Sword | Armor | ATM |
|-------|-----------|---------|-------|-------|-----|
| 1→2 | 150 wood, 150 string, 2M | 300 rock, 200 wood, 2.5M | 300 iron, 200 wood, 2M | 3 💎, 200 wood, 2M | 2 💎, 8 💚, 50k |
| 5→6 | **540 wood, 540 string, 7.2M** | 1,080 rock, 720 wood, 9M | 1,080 iron, 720 wood, 7.2M | 10 💎, 720 wood, 7.2M | 7 💎, 29 💚, 180k |
| 9→10 | **1,899 wood, 1,899 string, 25.4M** | 3,780 rock, 2,520 wood, 31.5M | 3,780 iron, 2,520 wood, 25.4M | 37 💎, 2,520 wood, 25.4M | 24 💎, 96 💚, 630k |

**Higher levels need incredible resources!** Plan your upgrades carefully.

### Commands

#### View Tool Stats
```
/toolstats [tool_name]
/toolstats fishingrod
/toolstats sword
```

Shows:
- Current level and percentage
- All stats at current level
- Cost for next upgrade
- Whether you can afford next upgrade

#### Upgrade Tool
```
/upgrade [tool_name]
/upgrade pickaxe
```

Shows:
- Preview of stat improvements
- Exact percentages of improvement
- Cost breakdown
- Missing materials (if any)

#### Upgrade Menu
```
/upgrade
```

Shows all available tools and upgrade info.

### Tier System

Your tools have visual tiers based on level:

```
🟢 Common    (1-25% of max level)   - Basic stats
🔵 Rare     (25-50% of max level)  - Good improvement
⚫ Epic     (50-70% of max level)  - Excellent stats
💎 Mythic   (70-90% of max level)  - Powerful
👑 Legendary (90-100% of max level) - Ultimate power!
```

### Strategy for Upgrades

1. **Early Game (Levels 1-5):**
   - Upgrade all tools somewhat evenly
   - Cheap to upgrade, get quick benefits
   - Stack gathering bonuses (fishing + mining)

2. **Mid Game (Levels 5-8):**
   - Focus on farming tools (rod + pickaxe)
   - Costs start getting significant
   - Plan your material farming

3. **Late Game (Levels 8-10):**
   - Expensive! Costs jump dramatically
   - Sword/Armor for combat players
   - ATM continues working up to level 100

4. **End Game (ATM Pushing to 100):**
   - ATM gives passive income with interest rates
   - Can be upgraded much further than others
   - Late game money sink (good for economy)

### Stat Importance

**For Farming:**
- Fishing Rod: Catch Rate (success), Speed Bonus (fast)
- Pickaxe: Mine Rate (success), Speed Bonus (fast)

**For Combat:**
- Sword: Damage (big hits), Crit Chance (random huge damage)
- Armor: Defense, Damage Reduction (survive more)

**For Money:**
- ATM: Interest Rate (passive income!), Capacity (store more)
- ATM Level 100: Can earn million per hour passively

### Display After Upgrade

When you upgrade, you see:

```
💎 Sword Upgraded!
━━━━━━━━━━━━━━━━━━━

Level: 5 → 6
Status: ✨ Good progress

Stat Improvements:
├─ damage: 50 → 65 (+30.0%)
├─ critChance: 5 → 7 (+40.0%)
├─ durability: 150 → 270 (+80.0%)
└─ healBonus: 0 → 60 (+∞%)

💰 Materials Used:
• iron: 1080
• wood: 720
• money: 7200000

🎯 Improvement Score: 62.50%
```

**Improvement Score** shows how much better the tool got overall!

### Pro Tips

| Tip | Benefit |
|-----|---------|
| Focus farming tools first | Faster resource gathering |
| Upgrade ATM constantly | Passive money farming |
| Keep tools balanced | Better overall performance |
| Check toolstats often | Know your power level |
| Plan expensive upgrades | Don't get stuck without materials |

---

## 🎮 Admin Control Panel [OWNER ONLY]

Owner-only commands to manage RPG settings, rewards, and seasonal resets.

### Access

```
/rpgadmin [subcommand]
/adminrpg [subcommand]
```

Only server **owner** can use these commands.

### Subcommands

#### ⚙️ Settings Management

**View current settings:**
```
/rpgadmin settings
```

**Toggle RPG on/off:**
```
/rpgadmin toggle
```

**Set reward multipliers:**
```
/rpgadmin multiplier [type] [value]
```
- Types: `diamond`, `exp`, `money`
- Values: 0.5 - 3.0x
- Example: `/rpgadmin multiplier diamond 1.5` → 50% more diamond

#### 🎉 Event Management

**Activate event mode:**
```
/rpgadmin event on
```

**Set event bonus multiplier:**
```
/rpgadmin eventbonus [multiplier]
```
- Values: 1.5 - 5.0x
- Example: `/rpgadmin eventbonus 2.0` → All rewards 2x during event

#### 🔄 Season Reset

**Check season info:**
```
/rpgadmin season check
```

**Preview what will happen:**
```
/rpgadmin season preview
```

**Execute season reset:**
```
/rpgadmin season reset
```
Then confirm with: `confirm`

**Manually set season number:**
```
/rpgadmin season manual [number]
```

#### 📊 Statistics

**View RPG statistics:**
```
/rpgadmin stats
```

Shows:
- Total players & average level
- Total economy (money, diamond, exp)
- Game status info

**View top 10 players:**
```
/rpgadmin topplayers
```

---

## 🏆 Seasonal Reset - Best Practices Guide

### What is a Season Reset?

A complete reset of competitive leaderboards and rewards that happens every **6 months**. It allows fresh competition and prevents the same top players from dominating forever.

### What Gets Reset

✅ **Reset (Wiped):**
- Daily leaderboards
- Weekly leaderboards
- Seasonal leaderboards
- Daily mission counters

❌ **NOT Reset (Kept):**
- All-Time leaderboards (permanent records)
- Player inventory (items, money, diamonds)
- Player level and experience
- Achievements (unlocked badges)
- Overall stats

### Recommended Reset Schedule

| Timing | Frequency | Best For |
|--------|-----------|----------|
| **Every 6 months** | Standard | Most games |
| **Every 3 months** | Aggressive | Highly competitive servers |
| **Every 1 month** | Ultra-fresh | Events/tournaments |

**Recommended:** Start with **6 months** and adjust based on engagement.

### Reset Timeline

**30 days before:**
- Announce upcoming reset
- Start "Race to Rank!" marketing
- Highlight top players

**7 days before:**
- Final warning
- Announce reward distribution
- Preview top 3 players

**3 days before:**
- Prevent new registrations (optional)
- Lock major feature updates
- Last-minute grinding period

**Reset Day:**
- Execute reset during low-traffic time (2-4 AM server time)
- Give immediate feedback
- Announce results

**After reset:**
- Announce new season with special event
- Display top 3 winners prominently
- Start fresh leaderboards

### Distribution of Seasonal Rewards

**Default Rewards:**
```
🥇 Rank 1: 100 Diamond + 50 Emerald + 500 Gold + 5 Legendary
🥈 Rank 2: 50 Diamond + 25 Emerald + 250 Gold + 3 Legendary
🥉 Rank 3: 25 Diamond + 10 Emerald + 100 Gold + 1 Legendary
```

**Adjust based on server size:**

| Players | Diamond | Emerald | Gold | Legendary |
|---------|---------|---------|------|-----------|
| <100 | 50/25/10 | 25/10/5 | 250/100/50 | 2/1/0 |
| 100-500 | 100/50/25 | 50/25/10 | 500/250/100 | 5/3/1 |
| 500-2k | 200/100/50 | 100/50/25 | 1k/500/250 | 10/5/2 |
| 2k+ | Custom | Custom | Custom | Custom |

### Event Timing Ideas

**Best practices for events:**

1. **Every 7 days:** Small bonus events (+20% exp/money)
2. **Every 14 days:** Medium events (+50% one item type)
3. **Every 3 months:** Major events (+100% all rewards, special crates)
4. **On season reset:** Celebration event (+150% first 24 hrs)

### Announcement Template

```
🔄 SEASON [NUMBER] STARTING SOON! 🔄

📅 Reset Date: [DATE]
👑 Top 3 Players Will Receive Legendary Rewards!

🏆 CURRENT RANK 1:
[Player Name] - Level [X]

🎁 SEASONAL REWARDS:
1st: 100 💎 + 50 💚 + 500 🟡 + 5 👑
2nd: 50 💎 + 25 💚 + 250 🟡 + 3 👑
3rd: 25 💎 + 10 💚 + 100 🟡 + 1 👑

⚡ Get grinding! Last [DAYS] days!
```

### Preventing Abuse During Reset

**Before reset:**
- Snapshot top 100 players (in case of disputes)
- Verify no bot accounts in top 10
- Check for suspicious exp gains
- Monitor unusual patterns

**During reset:**
- Log all reward distributions
- Backup database before reset
- Announce in real-time progress
- Have rollback plan ready

**After reset:**
- Monitor for complaints
- Check if rewards distributed correctly
- Announce final standings
- Lock rewards for 24 hours

### Monitoring Post-Reset

Track these metrics after reset:

1. **Player Engagement:** Login rate, playtime
2. **Top Climbers:** Is new #1 player emerging?
3. **Economy Health:** Balance between money/diamond?
4. **Churn Rate:** Did many players quit?

If engagement drops > 20%, consider:
- Increasing event bonus (2-3x)
- Shortening next season (3 months instead of 6)
- Adding special rewards
- Hosting tournaments

### Optional: Soft Reset Strategy

Instead of full reset, try **partial reset:**
- Keep daily/weekly leaderboards
- Only reset seasonal leaderboard  
- Reduce reward distribution (50%)
- More frequent (every 2 weeks)

**Pros:** Less disruption, keeps momentum
**Cons:** Less competitive freshness

---

## 🎯 Quick Admin Setup

1. **Initial Setup:**
```
/rpgadmin multiplier diamond 1.0
/rpgadmin multiplier exp 1.0
/rpgadmin multiplier money 1.0
```

2. **Before Season Reset:**
```
/rpgadmin season preview
/rpgadmin season check
```

3. **Execute Reset:**
```
/rpgadmin season reset
// Confirm when prompted
```

4. **Post-Reset Event:**
```
/rpgadmin event on
/rpgadmin eventbonus 1.5
```

5. **Monitor:**
```
/rpgadmin stats
/rpgadmin topplayers
```

Enjoy grinding! 🎮✨
