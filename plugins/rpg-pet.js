import { PetSystem, PET_DATABASE, PET_ABILITIES } from '../lib/pet-system.js'
import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, args, command }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    const user = await RPGHandler.initializeUser(global.db, userId, userName)

    if (!user.pets) user.pets = []

    if (command === 'pet' || command === 'catchpet') {
      if (!args[0]) {
        // Show pet list
        let text = `╔═══════════════════════════════╗\n`
        text += `║        🐾 MY PETS 🐾          ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        if (user.pets.length === 0) {
          text += `No pets yet. !catchpet <petname> to start!`
        } else {
          for (let i = 0; i < user.pets.length; i++) {
            const pet = user.pets[i]
            const power = PetSystem.getPetPower(pet)
            text += `*${i + 1}. ${pet.emoji} ${pet.name}*\n`
            text += `Lv. ${pet.level} | Power: ${power}\n`
            text += `HP: ${pet.health}/${pet.stats.hp}\n\n`
          }
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'catch') {
        const petName = args[1]
        if (!petName) {
          await conn.sendMessage(m.chat, { text: '❌ Usage: !pet catch <petname>' }, { quoted: m })
          return
        }

        const catchResult = PetSystem.attemptCatch(petName, user.stats?.luck || 1)

        if (!catchResult.success) {
          await conn.sendMessage(m.chat, { text: `❌ ${catchResult.message}` }, { quoted: m })
          return
        }

        if (catchResult.success) {
          const newPet = PetSystem.createPetInstance(petName, user)
          user.pets.push(newPet)

          let text = `🎉 ${catchResult.message}\n\n`
          text += `${newPet.emoji} ${newPet.name}\n`
          text += `Rarity: ${newPet.rarity}\n`
          text += `Level: ${newPet.level}`

          await conn.sendMessage(m.chat, { text: text }, { quoted: m })
          await RPGHandler.updateUser(global.db, userId, user)
        } else {
          await conn.sendMessage(m.chat, { text: `❌ ${catchResult.message}` }, { quoted: m })
        }
      } else if (args[0].toLowerCase() === 'info') {
        const petIndex = parseInt(args[1]) - 1
        const pet = user.pets[petIndex]

        if (!pet) {
          await conn.sendMessage(m.chat, { text: '❌ Pet tidak ditemukan' }, { quoted: m })
          return
        }

        const petInfo = PetSystem.getPetInfo(pet)
        let text = `╔═══════════════════════════════╗\n`
        text += `║      ${petInfo.emoji} PET INFO ${petInfo.emoji}      ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        text += `*Name:* ${petInfo.name}\n`
        text += `*Level:* ${petInfo.level}\n`
        text += `*Rarity:* ${petInfo.rarity}\n`
        text += `*Power:* ${petInfo.power}\n\n`

        text += `*Stats:*\n`
        text += `HP: ${petInfo.health}/${petInfo.maxHealth}\n`
        text += `ATK: ${petInfo.stats.atk}\n`
        text += `DEF: ${petInfo.stats.def}\n`
        text += `SP: ${petInfo.stats.sp}\n\n`

        text += `*Loyalty:* ${petInfo.loyalty}%\n`
        text += `*Experience:* ${petInfo.exp}\n`

        if (petInfo.ability) {
          text += `\n*Ability:* ${petInfo.ability.name}\n`
          text += `${petInfo.ability.description}`
        }

        if (petInfo.canEvolve) {
          text += `\n\n✨ *Can Evolve!* (!pet evolve <number>)`
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'evolve') {
        const petIndex = parseInt(args[1]) - 1
        const pet = user.pets[petIndex]

        if (!pet) {
          await conn.sendMessage(m.chat, { text: '❌ Pet tidak ditemukan' }, { quoted: m })
          return
        }

        const evolveResult = PetSystem.evolvePet(pet)

        if (evolveResult.success) {
          let text = `🦋 ${pet.emoji} ${evolveResult.newForm} evolved!\n\n`
          text += `New Stats:\n`
          for (const [stat, val] of Object.entries(evolveResult.newStats)) {
            text += `${stat.toUpperCase()}: ${val}\n`
          }

          await conn.sendMessage(m.chat, { text: text }, { quoted: m })
          await RPGHandler.updateUser(global.db, userId, user)
        } else {
          await conn.sendMessage(m.chat, { text: `❌ ${evolveResult.reason}` }, { quoted: m })
        }
      } else if (args[0].toLowerCase() === 'list') {
        let text = `╔═══════════════════════════════╗\n`
        text += `║      📖 CATCHABLE PETS 📖     ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        const catchable = PetSystem.getCatchableAt(user.level)
        for (const pet of catchable) {
          text += `${pet.emoji} ${pet.name} (${pet.rarity})\n`
          text += `Catch Rate: ${Math.round(pet.catchRate * 100)}%\n\n`
        }

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      }
    }
  } catch (error) {
    console.error('Error in pet command:', error)
    await conn.sendMessage(m.chat, { text: `❌ Error: ${error.message}` }, { quoted: m })
  }
}

handler.help = ['pet', 'catchpet']
handler.tags = ['rpg']
handler.command = /^(pet|catchpet)(?: (.+))?$/i

export default handler
