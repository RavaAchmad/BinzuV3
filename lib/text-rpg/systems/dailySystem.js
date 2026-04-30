import { formatNumber, todayKey } from '../rpg.utils.js'
import { grantRewards } from './rewardSystem.js'

export function claimDaily(player) {
  const today = todayKey()
  const last = player.lastDailyClaimKey || ''
  if (last === today) return { ok: false, message: 'Daily reward sudah diklaim hari ini.' }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  player.dailyStreak = last === yesterday ? (player.dailyStreak || 0) + 1 : 1
  player.lastDailyClaimKey = today
  player.lastDailyClaimAt = Date.now()

  const reward = {
    gold: 300 + Math.min(700, player.dailyStreak * 40),
    exp: 50,
    items: { potion: 3 }
  }
  const result = grantRewards(player, reward)
  return {
    ok: true,
    text: [
      '🎁 *DAILY REWARD*',
      '',
      `Day ${player.dailyStreak} Streak`,
      '',
      `Gold +${formatNumber(result.gold)}`,
      `EXP +${formatNumber(result.exp)}`,
      'Potion x3',
      result.levelUps.length ? `Level Up! Sekarang level ${result.levelUps.at(-1)}` : ''
    ].filter(Boolean).join('\n')
  }
}
