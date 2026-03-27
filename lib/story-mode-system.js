/**
 * ============================================
 * STORY MODE SYSTEM v1.0
 * ============================================
 * 5-Chapter story progression with bosses
 */

const STORY_CHAPTERS = {
  1: {
    chapter: 1,
    title: 'Awakening to a New World',
    emoji: '🌅',
    minLevel: 10,
    description: 'Your journey begins in a peaceful village, but darkness is lurking...',
    scenes: [
      { scene: 1, text: 'Kehidupan awalmu di desa yang tenang', npc: 'Village Elder', giveReward: false },
      { scene: 2, text: 'Kedatangan monster misterius', npc: 'Guardian', giveReward: false },
      { scene: 3, text: 'Pertarungan pertamamu melawan kegelapan', boss: 'Shadow Scout', reward: { exp: 1000, gold: 2000 } }
    ],
    completionReward: { exp: 2000, gold: 5000, item: 'beginner_sword' },
    bossFight: { name: 'Shadow Scout', hp: 100, damage: 20 }
  },
  2: {
    chapter: 2,
    title: 'The Hidden Conspiracy',
    emoji: '🔍',
    minLevel: 30,
    description: 'Discover the truth behind the shadows threatening your world',
    scenes: [
      { scene: 1, text: 'Jejak aneh gerhana misterius', npc: 'Merchant', giveReward: false },
      { scene: 2, text: 'Perjalanan ke kota yang tersembunyi', npc: 'Wanderer', giveReward: false },
      { scene: 3, text: 'Pertarungan mendalam melawan kuasa gelap', boss: 'Dark Cultist', reward: { exp: 3000, gold: 8000 } }
    ],
    completionReward: { exp: 5000, gold: 15000, item: 'mystery_cloak' },
    bossFight: { name: 'Dark Cultist', hp: 250, damage: 45 }
  },
  3: {
    chapter: 3,
    title: 'The Ancient Evil Awakens',
    emoji: '💀',
    minLevel: 60,
    description: 'Face the consequences of awakening something you should not have disturbed',
    scenes: [
      { scene: 1, text: 'Penemuan kuil kuno yang terlupakan', npc: 'Archaeologist', giveReward: false },
      { scene: 2, text: 'Ritual berbahaya yang salah dilakukan', npc: 'Priestess', giveReward: false },
      { scene: 3, text: 'Perlawanan terhadap keganasan purba', boss: 'Ancient Lich', reward: { exp: 8000, gold: 20000 } }
    ],
    completionReward: { exp: 10000, gold: 30000, item: 'ancient_tome' },
    bossFight: { name: 'Ancient Lich', hp: 500, damage: 80 }
  },
  4: {
    chapter: 4,
    title: 'The Final Betrayal',
    emoji: '🔪',
    minLevel: 100,
    description: 'Someone close to you has been working with the dark forces all along',
    scenes: [
      { scene: 1, text: 'Pengkhianatan yang mengejutkan dari teman terdekat', npc: 'Trusted Ally (Traitor)', giveReward: false },
      { scene: 2, text: 'Pelarian dan pencarian kebenaran', npc: 'Secret Informant', giveReward: false },
      { scene: 3, text: 'Pertarungan dengan rival yang dipimpin kegelapan', boss: 'Corrupted Guardian', reward: { exp: 15000, gold: 40000 } }
    ],
    completionReward: { exp: 20000, gold: 60000, item: 'cursed_blade' },
    bossFight: { name: 'Corrupted Guardian', hp: 800, damage: 120 }
  },
  5: {
    chapter: 5,
    title: 'The World at the Brink',
    emoji: '🌍🔥',
    minLevel: 150,
    description: 'Final confrontation with the source of all darkness. The fate of the world rests in your hands.',
    scenes: [
      { scene: 1, text: 'Perjalanan ke abyss gelap', npc: 'Voice of Light', giveReward: false },
      { scene: 2, text: 'Konfrontasi dengan keberadaan tertinggi kegelapan', npc: 'Harbinger of Doom', giveReward: false },
      { scene: 3, text: 'Apakah kamu mampu menyelamatkan dunia?', boss: 'The Void Incarnate', reward: { exp: 50000, gold: 150000 } }
    ],
    completionReward: { exp: 100000, gold: 500000, item: 'world_savior_medal' },
    bossFight: { name: 'The Void Incarnate', hp: 2000, damage: 200, special: true }
  }
}

const STORY_REWARDS = {
  beginner_sword: { name: 'Beginner Sword', dmg: 15, rarity: 'common' },
  mystery_cloak: { name: 'Mystery Cloak', def: 20, rarity: 'uncommon' },
  ancient_tome: { name: 'Ancient Tome', mag: 30, rarity: 'rare' },
  cursed_blade: { name: 'Cursed Blade', dmg: 80, crit: 30, rarity: 'epic' },
  world_savior_medal: { name: 'World Savior Medal', all: 50, rarity: 'legendary' }
}

class StoryModeSystem {
  /**
   * Get chapter info
   */
  static getChapterInfo(chapterNum) {
    return STORY_CHAPTERS[chapterNum] || null
  }

  /**
   * Check if player can start chapter
   */
  static canStartChapter(playerData, chapterNum) {
    const chapter = STORY_CHAPTERS[chapterNum]
    if (!chapter) return { canStart: false, reason: 'Chapter tidak ditemukan' }

    if (playerData.level < chapter.minLevel) {
      return { canStart: false, reason: `Level minimal: ${chapter.minLevel}` }
    }

    // Check previous chapters are completed
    if (chapterNum > 1) {
      const previousChapterId = `story_chapter_${chapterNum - 1}`
      if (!playerData.storyProgress || !playerData.storyProgress[previousChapterId]) {
        return { canStart: false, reason: `Complete chapter ${chapterNum - 1} first` }
      }
    }

    return { canStart: true, reason: 'Siap memulai!' }
  }

  /**
   * Progress through story chapter
   */
  static progressStory(playerData, chapterNum, sceneNum) {
    const check = this.canStartChapter(playerData, chapterNum)
    if (!check.canStart) return check

    const chapter = STORY_CHAPTERS[chapterNum]
    const scene = chapter.scenes[sceneNum - 1]

    if (!scene) return { success: false, reason: 'Scene tidak ditemukan' }

    if (!playerData.storyProgress) playerData.storyProgress = {}
    const chapterId = `story_chapter_${chapterNum}`
    const sceneId = `${chapterId}_scene_${sceneNum}`

    if (!playerData.storyProgress[chapterId]) {
      playerData.storyProgress[chapterId] = { currentScene: 1, completed: false }
    }

    playerData.storyProgress[chapterId].currentScene = sceneNum

    return {
      success: true,
      chapter: chapterNum,
      scene: sceneNum,
      text: scene.text,
      npc: scene.npc,
      isBoss: !!scene.boss,
      boss: scene.boss || null
    }
  }

  /**
   * Complete boss fight in story
   */
  static completeBossFight(playerData, chapterNum) {
    const chapter = STORY_CHAPTERS[chapterNum]
    if (!chapter) return { success: false, reason: 'Chapter tidak ditemukan' }

    const boss = chapter.bossFight
    const chapterId = `story_chapter_${chapterNum}`

    if (!playerData.storyProgress) playerData.storyProgress = {}
    if (!playerData.storyProgress[chapterId]) {
      playerData.storyProgress[chapterId] = { currentScene: 1, completed: false }
    }

    playerData.storyProgress[chapterId].completed = true
    playerData.storyProgress[chapterId].completedDate = Date.now()

    // Give rewards
    const reward = chapter.completionReward
    playerData.exp = (playerData.exp || 0) + reward.exp
    playerData.money = (playerData.money || 0) + reward.gold

    // Add story item to inventory if exists
    if (reward.item && STORY_REWARDS[reward.item]) {
      if (!playerData.inventory) playerData.inventory = { items: [] }
      playerData.inventory.items.push({
        name: reward.item,
        ...STORY_REWARDS[reward.item],
        obtainedDate: Date.now()
      })
    }

    // Check if all chapters completed
    let allCompleted = true
    for (let i = 1; i <= 5; i++) {
      if (!playerData.storyProgress[`story_chapter_${i}`]?.completed) {
        allCompleted = false
        break
      }
    }

    // Unlock achievement if all completed
    if (allCompleted) {
      if (!playerData.achievements) playerData.achievements = []
      if (!playerData.achievements.includes('world_savior')) {
        playerData.achievements.push('world_savior')
      }
    }

    return {
      success: true,
      message: `Chapter ${chapterNum} selesai!`,
      reward: reward,
      allStoriesComplete: allCompleted
    }
  }

  /**
   * Get story progress
   */
  static getStoryProgress(playerData) {
    const progress = {
      totalChapters: 5,
      chaptersCompleted: 0,
      currentChapter: 1,
      details: {}
    }

    if (!playerData.storyProgress) {
      playerData.storyProgress = {}
    }

    for (let i = 1; i <= 5; i++) {
      const chapterId = `story_chapter_${i}`
      const chapterData = playerData.storyProgress[chapterId]

      if (chapterData?.completed) {
        progress.chaptersCompleted += 1
        progress.details[i] = 'Completed'
      } else if (chapterData) {
        progress.details[i] = `In Progress (Scene ${chapterData.currentScene})`
      } else {
        progress.details[i] = 'Locked'
      }

      progress.currentChapter = i
    }

    progress.percentage = (progress.chaptersCompleted / 5) * 100

    return progress
  }

  /**
   * Display chapter details
   */
  static displayChapter(chapterNum) {
    const chapter = STORY_CHAPTERS[chapterNum]
    if (!chapter) return null

    return {
      chapter: chapter.chapter,
      title: chapter.title,
      emoji: chapter.emoji,
      minLevel: chapter.minLevel,
      description: chapter.description,
      scenes: chapter.scenes.length,
      boss: chapter.bossFight.name,
      completionReward: chapter.completionReward
    }
  }

  /**
   * Get all chapters overview
   */
  static getAllChapterOverview() {
    return Object.entries(STORY_CHAPTERS).map(([num, ch]) => ({
      chapter: ch.chapter,
      title: ch.title,
      emoji: ch.emoji,
      minLevel: ch.minLevel,
      sceneCount: ch.scenes.length
    }))
  }

  /**
   * Get story item info
   */
  static getStoryItem(itemKey) {
    return STORY_REWARDS[itemKey] || null
  }
}

export { StoryModeSystem, STORY_CHAPTERS, STORY_REWARDS }
