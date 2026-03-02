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
    let count = Math.floor(isNumber(args[1]) ? Math.max(parseInt(args[1]), 1) : 1) * 1
    
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
⚠️ *Max 10 opens per sekali! Lebih dari itu perlu warning*
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

    // ⚠️ WARNING: Jika count > 10
    if (count > 10) {
        let warningMsg = `
⚠️ *PERHATIAN!*

Anda ingin membuka ${count}x ${global.rpg.emoticon(type)} ${type} crate
Ini akan memakan waktu ~${(count * 400 / 1000).toFixed(1)} detik

*⚡ PEMBERITAHUAN:*
• Jangan close chat atau restart bot sampai selesai
• Crate akan langsung dikurangi dari inventory

Apakah Anda yakin? 

*Ketik:* ${usedPrefix}open ${type} ${count} confirm
`.trim()
        return m.reply(warningMsg)
    }

    // Check for confirmation if needed
    const confirmArg = args[2]?.toLowerCase()
    
    if (!(type in listCrate)) {
        return m.reply(`❌ Crate *${type}* tidak ditemukan! Available: ${Object.keys(listCrate).join(', ')}`)
    }
    
    if (user[type] < count) {
        return m.reply(`
❌ Crate *${global.rpg.emoticon(type)} ${type}* tidak cukup!
You have: ${user[type]} | Need: ${count}
Type *${usedPrefix}buy ${type} ${count - user[type]}* to buy more
`.trim())
    }

    // Deduct crates first
    user[type] -= count
    
    // Create status message
    let statusMsg = await conn.sendMessage(m.chat, {
        text: `⏳ ${global.rpg.emoticon(type)} Membuka ${count}x ${type} crate...\n\n🔄 Silahkan tunggu...`
    }, { quoted: m })

    try {
        // Update luck system
        const luck = crateSystem.updateLuck(m.sender)
        const dailyBonus = crateSystem.getDailyBonus(m.sender)
        
        let totalReward = {}
        let guaranteedRewards = []
        let openedCount = 0
        let revealedItems = []
        
        // Process each crate opening WITH ANIMATION
        for (let i = 0; i < count; i++) {
            // Wait 400ms before revealing next item
            await new Promise(resolve => setTimeout(resolve, 400))
            
            openedCount++
            let currentReveals = []

            // Check for guaranteed reward
            const guaranteed = crateSystem.checkPityGuarantee(m.sender, type)
            if (guaranteed) {
                guaranteedRewards.push(guaranteed)
                if (guaranteed.type === 'crate_drop') {
                    user[guaranteed.item] = (user[guaranteed.item] || 0) + guaranteed.amount
                    totalReward[guaranteed.item] = (totalReward[guaranteed.item] || 0) + guaranteed.amount
                    currentReveals.push(`🎁 ${guaranteed.amount}x ${guaranteed.item}`)
                } else if (guaranteed.type === 'mix') {
                    for (const [item, amount] of Object.entries(guaranteed.items)) {
                        if (item in user) {
                            user[item] = (user[item] || 0) + amount
                            totalReward[item] = (totalReward[item] || 0) + amount
                            currentReveals.push(`🎁 ${amount}x ${item}`)
                        }
                    }
                }
            } else {
                // Regular crate rewards with multipliers
                for (let [reward, value] of Object.entries(rewards[type])) {
                    if (reward in user && Array.isArray(value)) {
                        const baseAmount = value.getRandom()
                        if (baseAmount > 0) {
                            const finalAmount = crateSystem.calculateReward(baseAmount, m.sender)
                            user[reward] = (user[reward] || 0) + finalAmount
                            totalReward[reward] = (totalReward[reward] || 0) + finalAmount
                            currentReveals.push(`✨ ${finalAmount}x ${global.rpg.emoticon(reward)} ${reward}`)
                        }
                    }
                }
            }

            // Add to revealed items
            revealedItems.push(...currentReveals)

            // Build animated update message
            let animatedText = `🎁 *Opening ${count}x ${type} Crate*\n`
            animatedText += `Progress: [${('█'.repeat(Math.floor((openedCount / count) * 10)) + '░'.repeat(10 - Math.floor((openedCount / count) * 10)))}] ${openedCount}/${count}\n\n`
            animatedText += `📦 *Items Revealed:*\n`
            animatedText += revealedItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n')
            animatedText += `\n\n⏳ Opening... (${Math.round((count - openedCount) * 0.4)}ms left)`

            // Update status message
            await conn.sendMessage(m.chat, {
                text: animatedText,
                edit: statusMsg.key
            })
        }

        // Build final reward display
        let rewardText = Object.keys(totalReward)
            .filter(v => v && totalReward[v] && !/hai/i.test(v))
            .map(reward => `💎 *${global.rpg.emoticon(reward)} ${reward}:* ${totalReward[reward]}`)
            .join('\n')
        
        // Add daily bonus if applicable
        let bonusMessage = ''
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

        // Final result
        let result = `
✅ *Selesai! ${count}x ${type} Crate Terbuka*
🎊 ${crateSystem.getOpeningAnimation(count)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *HASIL OPENING:*
${rewardText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${bonusMessage}

🍀 *Luck Info:*
├─ Streak: ${luck.streak}/50 (Multiplier: x${luck.multiplier.toFixed(2)})
├─ Total Opened Today: ${luck.totalOpens}
└─ Pity (${type}): ${crateSystem.playerPity[m.sender][type]}/${crateSystem.playerPity[m.sender].guaranteeThresholds[type]}

${crateSystem.playerPity[m.sender][type] === 0 && guaranteedRewards.length > 0 ? '⚡ Pity Counter Reset!' : ''}
`.trim()

        // Final update with complete results
        await conn.sendMessage(m.chat, {
            text: result,
            edit: statusMsg.key
        })

    } catch (error) {
        console.error('Error in open crate:', error)
        await conn.sendMessage(m.chat, {
            text: '❌ Terjadi error saat membuka crate. Crate sudah dikurangi dari inventory.',
            edit: statusMsg.key
        })
    }
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