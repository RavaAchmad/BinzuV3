import { getDungeonRank } from '../lib/rpg-ranks.js'
import bountySystem from '../lib/bounty.js'

let handler = async (m, { conn, args, usedPrefix }) => {
    const user = global.db.data.users[m.sender]
    let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.sender
    const targetUser = global.db.data.users[who]

    const subcommand = (args[0] || 'stats').toLowerCase()

    switch (subcommand) {
        case 'stats':
        case 'rank': {
            const rank = getDungeonRank(targetUser.level)
            const activeBounties = bountySystem.getActiveBounties(who)
            const totalBounty = bountySystem.getTotalBounty(who)

            let text = `
╭━━━━━━━━━━━━━━━ 🏰 ━━━━━━━━━━━━━━╮
┃        DUNGEON RANK STATS
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

👤 *Player:* ${targetUser.registered ? targetUser.name : conn.getName(who)}
📊 *Level:* ${targetUser.level || 0}
✨ *Experience:* ${(targetUser.exp || 0).toLocaleString('id-ID')}

╭━━━━━━━━━━━━━ 🎖️ DUNGEON RANK ━━━━━━━━━━━━━╮
┃ ${rank.name}
┃ ${rank.difficultyDesc}
┃
┃ 📈 Difficulty Multiplier: ${rank.multiplier}x
┃ ❤️ Health Scaling: ${rank.healthScaling}x
┃ 📊 Exp Reward: ${(rank.rewards.expMult * 100).toFixed(0)}%
┃ 💹 Money Reward: ${(rank.rewards.moneyMult * 100).toFixed(0)}%
┃ 📦 Item Drop: ${(rank.rewards.itemDropRate * 100).toFixed(0)}%
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│

╭━━━━━━━━━━━━━ 💀 BOUNTY INFO ━━━━━━━━━━━━╮
┃ Active Bounties: ${activeBounties.length}
┃ Total Bounty: 💹 ${totalBounty.toLocaleString('id-ID')}
${activeBounties.length > 0 ? `┃ 
┃ Latest Bounty:
┃ • From: @${activeBounties[activeBounties.length - 1].issuer.split('@')[0]}
┃ • Amount: 💹 ${activeBounties[activeBounties.length - 1].amount.toLocaleString('id-ID')}` : ''}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━════│

✅ Recommended Difficulty: *${rank.name}*
💡 Tip: Complete ${rank.name} to earn ${(rank.rewards.expMult).toFixed(1)}x rewards!
`
            m.reply(text)
            break
        }

        case 'bounty': {
            const amount = parseInt(args[1]) || 10000
            const reason = args.slice(2).join(' ') || 'No reason given'

            if (who === m.sender) {
                return m.reply('❌ You cannot put a bounty on yourself!')
            }

            if (user.money < amount) {
                return m.reply(`❌ You need 💹 ${amount.toLocaleString('id-ID')} to create this bounty!\nYour money: 💹 ${user.money.toLocaleString('id-ID')}`)
            }

            const bounty = bountySystem.createBounty(m.sender, who, amount, reason)
            user.money -= amount

            m.reply(`
✅ *BOUNTY CREATED*
${bountySystem.formatBounty(bounty)}
Your remaining money: 💹 ${user.money.toLocaleString('id-ID')}
`)
            break
        }

        case 'bounties': {
            const bounties = bountySystem.getActiveBounties(m.sender)
            
            if (bounties.length === 0) {
                return m.reply('✅ No active bounties on you!')
            }

            let text = `
╭━━━━━━━━━━━━━━━ 💀 ━━━━━━━━━━━━━━╮
┃        BOUNTIES ON YOU
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

Total Bounty Value: 💹 ${bountySystem.getTotalBounty(m.sender).toLocaleString('id-ID')}

`
            bounties.forEach((bounty, i) => {
                const daysLeft = Math.ceil((bounty.expiresAt - Date.now()) / 86400000)
                text += `${i + 1}. 💹 ${bounty.amount.toLocaleString('id-ID')} - by @${bounty.issuer.split('@')[0]}\n`
                text += `   └─ ${bounty.reason} (${daysLeft} days left)\n\n`
            })

            m.reply(text)
            break
        }

        default:
            m.reply(`
*DUNGEON RANK COMMANDS*

${usedPrefix}dungeonrank stats [@user]
${usedPrefix}dungeonrank rank [@user]
${usedPrefix}dungeonrank bounty [@user] [amount] [reason]
${usedPrefix}dungeonrank bounties

Example:
${usedPrefix}dungeonrank bounty @user 50000 hacker
`)
    }
}

handler.help = ['dungeonrank [subcommand]']
handler.tags = ['rpg', 'info']
handler.command = /^(dungeonrank|rank)$/i
handler.register = true
handler.rpg = true

export default handler
