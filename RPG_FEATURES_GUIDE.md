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
```

Enjoy grinding! 🎮✨
