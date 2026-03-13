# 📊 RPG ECONOMY AUDIT REPORT

## Executive Summary
**Status**: ⚠️ **REQUIRES REBALANCING** - Adventure & Mining activities enable exponential daily farming with insufficient caps

**Key Issues**:
1. **Adventure activity allows 144 runs/day** (10-min cooldown) = 1.3M exp/day
2. **Mining allows 288 runs/day** (5-min cooldown) = 288k exp/day  
3. **No daily activity caps** across entire system
4. **Dungeon multiplier scaling** creates 10x boost for level 200+ players
5. **Casino unbounded wealth divergence** (unlimited betting)

---

## Detailed Analysis

### Activity Reward Sources

#### 🟢 LOW RISK (Balanced)
| Activity | Cooldown | exp/Run | Money/Run | Daily Max | Risk |
|----------|----------|---------|-----------|-----------|------|
| Mission (Daily) | - | 5k-25k | ~5k | 15k exp | ✅ Capped |
| Boss Raid | Unknown | 100k-250k | 100k-500k | ~175k | ⚠️ Need verify |
| Pacaran | 24h | 150 | 0 | 150 | ✅ Minimal |
| Dungeon-TB | ~? min | 500-8000 | 1000-20000 | ? | ⚠️ Unknown CD |

#### 🟠 HIGH RISK (Spammable)
| Activity | Cooldown | exp/Run | Money/Run | Daily Max | Risk |
|----------|----------|---------|-----------|-----------|------|
| **Adventure** | 10 min | 9,251 | 1,027 | **1,330,144 exp** | ❌ CRITICAL |
| **Mining** | 5 min | 1,000 | 0 | **288,000 exp** | ❌ CRITICAL |
| Casino | None | ±Bet | ±Bet | **UNLIMITED** | ❌ CRITICAL |

#### 🟡 MODERATE RISK (Scaling Issues)
| Factor | Impact | Issue |
|--------|--------|-------|
| Dungeon Rank Multipliers | Up to 10x | Late-game players farm 10x harder |
| Multi-player Dungeon | Scales by party | 4 players = 4x resources split |
| Item Drop Scaling | Up to 5.8% | Legendary items concentration |

### Exponential Growth Scenario

**User Level 200 - Maximum Farm Efficiency:**
```
Daily Farming:
- Adventure:     144 runs × 9,251 exp = 1,330,144 exp
- Mining:        288 runs × 1,000 exp = 288,000 exp
- Boss Raid (1): 1 × 175,000 exp     = 175,000 exp
- Missions:      3 × 15,000 exp      = 45,000 exp
- Casino (2M bet): 1,000,000+ exp    = 1,000,000 exp

TOTAL:  ~2,838,144 exp/DAY (WITHOUT multipliers)
        ~28,381,440 exp/DAY (WITH 10x dungeon multiplier)
```

**This reaches level 500 in ~7-14 days instead of 150+ days** ❌

---

## Reward Structure Issues

### 1. **Adventure Cooldown Not Enforced**
```javascript
// Current code checks:
if (new Date - user.lastadventure <= cooldown) return // ← Only per-user check

// But NO rate-limiting prevents 144 daily runs
// Cooldown = 600,000ms = 10 minutes
// 24 hours = 1,440 minutes = 144 possible runs
```

### 2. **Mining Identical Issue**
```javascript
cooldown = 300000 // 5 minutes
// 24 hours = 1,440 minutes ÷ 5 = 288 possible runs
```

### 3. **Multiplier Stacking Unclear**
From `rpg-ranks.js`:
```javascript
rewards: {
    expMult: 10,  // ← Is this × base OR replacing base?
    moneyMult: 10,
    itemDropRate: 5
}
```

If multiplicative:
- Base Dungeon: 3,500 exp
- Rank Multiplied: 3,500 × 10 = 35,000 exp
- Per run seems reasonable

If replaces:
- Base Dungeon: 3,500 exp → IGNORED, becomes 10x = 10,000 exp
- Still manageable single-run

**Concern**: With 144 adventure runs at 9,251 each = 1.33M exp/day
Then adding dungeon multiplier stacking could create 10M+ exp scenarios

---

## Recommendations

### IMMEDIATE FIXES (Priority 1)
- [ ] **Cap Daily Activities**
  ```javascript
  // Add to adventure.js:
  const DAILY_LIMIT = 10  // 10 runs max per day
  const dayStart = new Date(user.lastadventure).toDateString()
  if (dayStart === new Date().toDateString() && user.adventureCount >= DAILY_LIMIT) {
      return m.reply('Daily adventure limit reached')
  }
  user.adventureCount++
  ```

- [ ] **Mining Daily Limit**
  ```javascript
  // Similar: max 20 mining runs/day
  ```

- [ ] **Verify Multiplier Logic**
  - Test dungeon reward at level 200+ with rank multiplier
  - Confirm if stacking or replacing
  - Document final formula

### MEDIUM-TERM FIXES (Priority 2)
- [ ] **Fatigue System**
  ```
  Run 1: 100% reward
  Run 2: 95% reward
  Run 3: 90% reward
  Run 5: 75% reward
  Run 10: 50% reward
  ```

- [ ] **Casino Limits**
  ```javascript
  const dailyBetMax = 100000
  if (user.casinoBet + count > dailyBetMax) {
      return m.reply(`Daily casino limit: ${dailyBetMax} exp`)
  }
  user.casinoBet += count
  ```

- [ ] **Boss Raid Rarity**
  ```javascript
  // Max 1 raid per week per user
  const lastRaid = user.lastBossRaid || 0
  if (Date.now() - lastRaid < 604800000) { // 7 days
      return m.reply('Raid available in ' + timeLeft)
  }
  ```

### LONG-TERM TRACKING (Priority 3)
- [ ] Monitor leaderboard exp curves
- [ ] Track daily farming patterns (spam detection)
- [ ] Log anomalous exp gains (>500k/day)
- [ ] Adjust multipliers based on data

---

## Verification Checklist

- [ ] Do you want daily activity caps?
- [ ] Should multipliers apply to ALL dungeons or only high-rank?
- [ ] Is casino bet limit needed?
- [ ] Should we add fatigue system?
- [ ] Boss raid frequency limit acceptable?

---

## Summary

**Current State**: RPG economy has sustainability issues at level 150+

**With Fixes**: Economy becomes stable and engaging across all levels

**Timeline**: 
- Implement caps: 1-2 days
- Add fatigue: 3-4 days
- Monitor & adjust: Ongoing

**Impact on Players**:
- Early-game (1-50): No change - limited resources
- Mid-game (50-150): Slight slowdown - balanced grind
- Late-game (150+): Significant slowdown - prevents 10M/day farming

**Recommendation**: ✅ **PROCEED WITH ALL FIXES** to ensure long-term game balance

