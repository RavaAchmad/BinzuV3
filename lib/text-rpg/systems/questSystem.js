import { QUESTS } from '../rpg.constants.js'
import { todayKey } from '../rpg.utils.js'

export function ensureQuests(player) {
  if (!player.quests || typeof player.quests !== 'object') player.quests = {}
  if (!player.quests.tutorial_slime) {
    player.quests.tutorial_slime = { id: 'tutorial_slime', current: 0, completed: false, claimed: false }
  }

  const today = todayKey()
  if (!player.quests.daily_hunter || player.quests.daily_hunter.date !== today) {
    player.quests.daily_hunter = { id: 'daily_hunter', date: today, current: 0, completed: false, claimed: false }
  }
  return player.quests
}

export function progressQuest(player, type, targetId, amount = 1) {
  const quests = ensureQuests(player)
  const updates = []
  for (const progress of Object.values(quests)) {
    const quest = QUESTS[progress.id]
    if (!quest || progress.claimed || progress.completed) continue
    const objective = quest.objective
    if (objective.type !== type) continue
    if (objective.target !== 'any' && objective.target !== targetId) continue
    progress.current = Math.min(objective.required, (progress.current || 0) + amount)
    if (progress.current >= objective.required) progress.completed = true
    updates.push(formatQuestProgress(progress))
  }
  return updates
}

export function claimQuest(player, questInput = '') {
  const quests = ensureQuests(player)
  const query = questInput.trim().toLowerCase()
  const progress = Object.values(quests).find(item => {
    const quest = QUESTS[item.id]
    return item.completed && !item.claimed && (!query || item.id.includes(query) || quest?.name.toLowerCase().includes(query))
  })

  if (!progress) return { ok: false, message: 'Tidak ada quest selesai yang bisa diklaim.' }
  progress.claimed = true
  return { ok: true, quest: QUESTS[progress.id], progress }
}

export function formatQuestList(player) {
  return Object.values(ensureQuests(player)).map(formatQuestProgress).join('\n\n')
}

function formatQuestProgress(progress) {
  const quest = QUESTS[progress.id]
  if (!quest) return '- Quest tidak dikenal'
  const required = quest.objective.required
  const state = progress.claimed ? 'CLAIMED' : progress.completed ? 'READY CLAIM' : `${progress.current || 0}/${required}`
  return [
    `📜 *${quest.name}*`,
    quest.description,
    `Progress: ${state}`,
    `Reward: EXP ${quest.reward.exp || 0}, Gold ${quest.reward.gold || 0}`
  ].join('\n')
}
