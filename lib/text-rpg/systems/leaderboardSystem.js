import { formatNumber } from '../rpg.utils.js'
import { calculatePower } from './playerSystem.js'

export function formatLeaderboard(players = []) {
  const safePlayers = players.filter(Boolean)
  return [
    '🏆 *RPG LEADERBOARD*',
    '',
    '*Top Level*',
    formatTop(safePlayers, player => player.level, player => `Lv.${player.level}`),
    '',
    '*Top Power*',
    formatTop(safePlayers, calculatePower, player => `Power ${formatNumber(calculatePower(player))}`),
    '',
    '*Top Gold*',
    formatTop(safePlayers, player => player.gold, player => `${formatNumber(player.gold)} gold`)
  ].join('\n')
}

function formatTop(players, scoreFn, labelFn) {
  const rows = [...players]
    .sort((a, b) => scoreFn(b) - scoreFn(a))
    .slice(0, 5)
    .map((player, index) => `${index + 1}. ${player.name} - ${labelFn(player)}`)
  return rows.length ? rows.join('\n') : 'Belum ada player.'
}
