import fetch from "node-fetch"
import crateSystem from "../lib/crate-system.js"

const tfinventory = {
  others: {
    money: true,
  },
  tfitems: {
    potion: true,
    trash: true,
    wood: true,
    rock: true,
    string: true,
    emerald: true,
    diamond: true,
    gold: true,
    iron: true,
  },
  tfcrates: {
    common: true,
    uncommon: true,
    mythic: true,
    legendary: true,
    
  },
  tfpets: {
    horse: 10,
    cat: 10,
    fox: 10,
    dog: 10,
  }
}
const rewards = {
    common: {
        money: 101,
        trash: 11,
        potion: [0, 1, 0, 1, 0, 0, 0, 0, 0],
        common: [0, 1, 0, 1, 0, 0, 0, 0, 0, 0],
        uncommon: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    uncommon: {
        money: 201,
        trash: 31,
        potion: [0, 1, 0, 0, 0, 0, 0, 0],
        diamond: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        common: [0, 1, 0, 0, 0, 0, 0, 0, 0],
        uncommon: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        mythic: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        wood: [0, 1, 0, 0, 0, 0],
        rock: [0, 1, 0, 0, 0, 0],
        string: [0, 1, 0, 0, 0, 0]
    },
    mythic: {
        money: 301,
        exp: 50,
        trash: 61,
        potion: [0, 1, 0, 0, 0, 0],
        emerald: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        diamond: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
        gold: [0, 1, 0, 0, 0, 0, 1, 0, 0],
        iron: [0, 1, 0, 0, 0, 0, 0, 0],
        common: [0, 1, 0, 0, 0, 1],
        uncommon: [0, 1, 0, 0, 0, 0, 0, 1],
        mythic: [0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
        legendary: [0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
        pet: [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
        wood: [0, 1, 0, 0, 0],
        rock: [0, 1, 0, 0, 0],
        string: [0, 1, 0, 0, 0]
    },
    legendary: {
        money: 401,
        exp: 50,
        trash: 101,
        potion: [0, 1, 0, 0, 0],
        emerald: [0, 0, 0, 0, 0, 0 ,0, 0, 1, 0],
        diamond: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
        gold: [0, 1, 0, 0, 0, 0, 0, 1],
        iron: [0, 1, 0, 0, 0, 0, 1],
        common: [0, 1, 0, 1],
        uncommon: [0, 1, 0, 0, 0, 1],
        mythic: [0, 1, 0, 0, 1, 0, 1, 0, 0],
        legendary: [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
        pet: [0, 1, 0, 0, 0, 0, 1, 0, 0, 1],
        wood: [0, 1, 0, 1],
        rock: [0, 1, 0, 1],
        string: [0, 1, 0, 1]
    },
}
let handler = async (m, { command, args, usedPrefix, conn }) => {
    let user = global.db.data.users[m.sender]
    
    // Initialize systems
    crateSystem.initLuck(m.sender)
    crateSystem.initPity(m.sender)
    crateSystem.initDaily(m.sender)
    
    const listCrate = Object.fromEntries(Object.entries(rewards).filter(([v]) => v && v in user))
    
    let type = (args[0] || '').toLowerCase()
    let count = Math.floor(isNumber(args[1]) ? Math.min(Math.max(parseInt(args[1]), 1), 10) : 1) * 1
    
    // Show info if no type provided
    if (!type) {
        const luck = crateSystem.playerLuck[m.sender]
        const pity = crateSystem.playerPity[m.sender]
        
        let info = `🧑🏻‍🏫 *${user.registered ? user.name : conn.getName(m.sender)}*

🔖 *CRATE LIST:*
${Object.keys(tfinventory.tfcrates).map(v => user[v] && `⮕ ${global.rpg.emoticon(v)} ${v}: ${user[v]}`).filter(v => v).join('\n') || 'Tidak ada crate'}

${crateSystem.getLuckStatusDisplay(m.sender)}

${crateSystem.getPityStatusDisplay(m.sender, 'mythic')}

💁🏻‍♂ *USAGE:*
${usedPrefix}open [crate] [quantity]

★ *EXAMPLE:*
${usedPrefix}open mythic 3
${usedPrefix}open legendary 1

📊 *TIPS:*
⮕ Luck multiplier increases with consecutive opens (Max 2.5x)
⮕ First open of day gives +50% bonus!
⮕ Pity counter guarantees rare items every X opens
`.trim()
        return await conn.reply(m.chat, info, m, {
            contextInfo: {
                externalAdReply: {
                    showAdAttribution: true,
                    mediaType: 1,
                    title: '📦 OPEN CRATE',
                    thumbnail: await(await fetch(flaaa.getRandom() + 'Open Crate')).buffer(),
                    renderLargerThumbnail: true,
                    mediaUrl: hwaifu.getRandom(),
                    sourceId: wm,
                    sourceUrl: ''
                }
            }
        })
    }
    
    if (!(type in listCrate)) {
        return m.reply(`❌ Crate *${type}* tidak ditemukan! Available: ${Object.keys(listCrate).join(', ')}`)
    }
    
    if (user[type] < count) {
        return m.reply(`
❌ Crate *${global.rpg.emoticon(type)} ${type}* not enough!
You have: ${user[type]} | Need: ${count}
Type *${usedPrefix}buy ${type} ${count - user[type]}* to buy more
`.trim())
    }
    
    // Deduct crates
    user[type] -= count
    
    // Update luck system
    const luck = crateSystem.updateLuck(m.sender)
    const dailyBonus = crateSystem.getDailyBonus(m.sender)
    
    let totalReward = {}
    let guaranteedRewards = []
    let bonusMessage = ''
    
    // Process each crate opening
    for (let i = 0; i < count; i++) {
        // Check for guaranteed reward
        const guaranteed = crateSystem.checkPityGuarantee(m.sender, type)
        if (guaranteed) {
            guaranteedRewards.push(guaranteed)
            if (guaranteed.type === 'crate_drop') {
                user[guaranteed.item] = (user[guaranteed.item] || 0) + guaranteed.amount
                totalReward[guaranteed.item] = (totalReward[guaranteed.item] || 0) + guaranteed.amount
            } else if (guaranteed.type === 'mix') {
                for (const [item, amount] of Object.entries(guaranteed.items)) {
                    if (item in user) {
                        user[item] = (user[item] || 0) + amount
                        totalReward[item] = (totalReward[item] || 0) + amount
                    }
                }
            }
            continue
        }
        
        // Regular crate rewards with multipliers
        for (let [reward, value] of Object.entries(rewards[type])) {
            if (reward in user && Array.isArray(value)) {
                const baseAmount = value.getRandom()
                if (baseAmount > 0) {
                    const finalAmount = crateSystem.calculateReward(baseAmount, m.sender)
                    user[reward] = (user[reward] || 0) + finalAmount
                    totalReward[reward] = (totalReward[reward] || 0) + finalAmount
                }
            }
        }
    }

    // Build reward display
    let rewardText = Object.keys(totalReward)
        .filter(v => v && totalReward[v] && !/hai/i.test(v))
        .map(reward => `💎 *${global.rpg.emoticon(reward)} ${reward}:* ${totalReward[reward]}`)
        .join('\n')
    
    // Add daily bonus if applicable
    if (dailyBonus && dailyBonus.type === 'daily') {
        bonusMessage = `\n✨ ${dailyBonus.message} ✨`
    }

    // Add guaranteed rewards notification
    if (guaranteedRewards.length > 0) {
        rewardText += '\n\n🎁 *GUARANTEED REWARDS:*\n' + 
            guaranteedRewards.map((r, idx) => {
                if (r.type === 'crate_drop') {
                    return `${idx + 1}. 📦 ${r.amount}x ${r.item}`
                } else {
                    return `${idx + 1}. ✨ Special mix!`
                }
            }).join('\n')
    }

    // Main response
    let result = `
${global.rpg.emoticon(type)} *Opening ${count}x ${type} Crate*
${crateSystem.getOpeningAnimation(count)}

━━━━━━━━━━━━━━━━━━━
${rewardText}
━━━━━━━━━━━━━━━━━━━
${bonusMessage}

🍀 *Luck Info:*
├─ Streak: ${luck.streak}/50 (Multiplier: x${luck.multiplier.toFixed(2)})
├─ Total Opened: ${luck.totalOpens}
└─ Pity (${type}): ${crateSystem.playerPity[m.sender][type]}/${crateSystem.playerPity[m.sender].guaranteeThresholds[type]}

${crateSystem.playerPity[m.sender][type] === 0 && guaranteedRewards.length > 0 ? '⚡ Pity Reset!' : ''}
`.trim()

    await m.reply(result)
}
handler.help = ['open'].map(v => v + ' [crate] [count]')
handler.tags = ['rpg']
handler.command = /^(open|buka|gacha)$/i
handler.register = true
handler.group = true
handler.rpg = true
export default handler

function isNumber(number) {
    if (!number) return number
    number = parseInt(number)
    return typeof number == 'number' && !isNaN(number)
}