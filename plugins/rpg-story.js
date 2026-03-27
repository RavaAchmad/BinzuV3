import { StoryModeSystem, STORY_CHAPTERS, STORY_REWARDS } from '../lib/story-mode-system.js'
import { RPGHandler } from '../lib/rpg-handler.js'

let handler = async (m, { conn, args, command }) => {
  try {
    const userId = m.sender
    const userName = await conn.getName(userId)
    const user = await RPGHandler.initializeUser(global.db, userId, userName)

    if (command === 'story') {
      if (!args[0]) {
        // Show story progress
        const progress = StoryModeSystem.getStoryProgress(user)

        let text = `╔═══════════════════════════════╗\n`
        text += `║      📖 STORY MODE 📖        ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        text += `Progress: ${progress.chaptersCompleted}/${progress.totalChapters}\n`
        text += `📊 ${progress.percentage.toFixed(1)}% Complete\n\n`

        for (const [chapter, status] of Object.entries(progress.details)) {
          text += `Ch. ${chapter}: ${status}\n`
        }

        text += `\n_Use !story <chapter> to start_`

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else if (args[0].toLowerCase() === 'chapters') {
        let text = `╔═══════════════════════════════╗\n`
        text += `║      📚 STORY CHAPTERS 📚    ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        const overview = StoryModeSystem.getAllChapterOverview()

        for (const ch of overview) {
          text += `${ch.emoji} **Chapter ${ch.chapter}: ${ch.title}**\n`
          text += `Lv. ${ch.minLevel}+ | Scenes: ${ch.sceneCount}\n\n`
        }

        text += `_Use !story 1 to play Chapter 1_`

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })
      } else {
        const chapterNum = parseInt(args[0])

        if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > 5) {
          await conn.sendMessage(m.chat, { text: '❌ Chapter tidak valid (1-5)' }, { quoted: m })
          return
        }

        const canStart = StoryModeSystem.canStartChapter(user, chapterNum)

        if (!canStart.canStart) {
          await conn.sendMessage(m.chat, { text: `❌ ${canStart.reason}` }, { quoted: m })
          return
        }

        // Start chapter
        const chapter = StoryModeSystem.displayChapter(chapterNum)

        let text = `╔═══════════════════════════════╗\n`
        text += `║    ${chapter.emoji} CHAPTER ${chapter.chapter} ${chapter.emoji}    ║\n`
        text += `╚═══════════════════════════════╝\n\n`

        text += `*${chapter.title}*\n`
        text += `${chapter.description}\n\n`

        text += `*Scenes:* ${chapter.sceneCount}\n`
        text += `*Boss:* ${chapter.boss}\n\n`

        text += `_Prepare for battle!_\n`
        text += `_Use !story progress for details_`

        await conn.sendMessage(m.chat, { text: text }, { quoted: m })

        // Store current chapter
        if (!user.currentStory) user.currentStory = {}
        user.currentStory.chapter = chapterNum
        user.currentStory.scene = 1
        await RPGHandler.updateUser(global.db, userId, user)
      }
    }
  } catch (error) {
    console.error('Error in story command:', error)
    await conn.sendMessage(m.chat, { text: `❌ Error: ${error.message}` }, { quoted: m })
  }
}

handler.help = ['story']
handler.tags = ['rpg']
handler.command = /^story(?: (.+))?$/i

export default handler
