/**
 * ============================================
 * GUILD SYSTEM v1.0
 * ============================================
 * Complete guild management with vault, ranks, leveling
 */

const GUILD_RANKS = {
  master: {
    id: 'master',
    title: 'Guild Master',
    permissions: ['manage_members', 'withdraw_vault', 'deposit_vault', 'manage_war', 'disband_guild', 'manage_rank'],
    emoji: '👑',
    vaultAccessLimit: null
  },
  vice_master: {
    id: 'vice_master',
    title: 'Vice Master',
    permissions: ['manage_members', 'withdraw_vault', 'deposit_vault', 'manage_war'],
    emoji: '⭐',
    vaultAccessLimit: 0.75
  },
  officer: {
    id: 'officer',
    title: 'Officer',
    permissions: ['invite_members', 'withdraw_vault', 'deposit_vault'],
    emoji: '🛡️',
    vaultAccessLimit: 0.5
  },
  member: {
    id: 'member',
    title: 'Member',
    permissions: ['deposit_vault'],
    emoji: '🤝',
    vaultAccessLimit: 0
  }
}

const GUILD_UPGRADE_TIERS = {
  1: {
    name: 'Small Guild',
    maxMembers: 20,
    vaultCapacity: 5000000,
    levelUpCost: 1000000,
    perks: ['Basic Vault']
  },
  2: {
    name: 'Growing Guild',
    maxMembers: 40,
    vaultCapacity: 15000000,
    levelUpCost: 5000000,
    perks: ['Basic Vault', 'Member Bonus +5%']
  },
  3: {
    name: 'Strong Guild',
    maxMembers: 60,
    vaultCapacity: 40000000,
    levelUpCost: 15000000,
    perks: ['Advanced Vault', 'Member Bonus +10%', 'Guild War']
  },
  4: {
    name: 'Powerful Guild',
    maxMembers: 100,
    vaultCapacity: 100000000,
    levelUpCost: 50000000,
    perks: ['Expert Vault', 'Member Bonus +15%', 'Guild War', 'Territory War']
  },
  5: {
    name: 'Legendary Guild',
    maxMembers: 200,
    vaultCapacity: 500000000,
    levelUpCost: null,
    perks: ['Ultimate Vault', 'Member Bonus +25%', 'Guild War', 'Territory War', 'Divine Blessing']
  }
}

class GuildSystem {
  /**
   * Create a new guild
   */
  static createGuild(guildName, founder, founderData) {
    const cost = 500000

    if (founderData.money < cost) {
      return { success: false, reason: `Biaya pembuatan guild: ${cost.toLocaleString('id-ID')}` }
    }

    const guildId = `guild_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      success: true,
      guild: {
        id: guildId,
        name: guildName,
        founded: Date.now(),
        founderId: founder,
        level: 1,
        exp: 0,
        icon: '🏰',
        description: '',
        notice: '',

        // Members
        members: [
          {
            userId: founder,
            joinDate: Date.now(),
            rank: 'master',
            contribution: 0,
            role: 'Founder'
          }
        ],
        maxMembers: GUILD_UPGRADE_TIERS[1].maxMembers,

        // Vault & Finance
        vault: 0,
        vaultCapacity: GUILD_UPGRADE_TIERS[1].vaultCapacity,
        vaultHistory: [],

        // War & Territory
        wars: [],
        territory: null,
        territories: [],

        // Settings
        joinType: 'free', // free, request, invite
        autoKickInactive: true,
        inactiveThreshold: 7 // days

      },
      cost: cost
    }
  }

  /**
   * Add member to guild
   */
  static addMember(guild, userId, playerData, invitedBy = null) {
    // Check capacity
    if (guild.members.length >= guild.maxMembers) {
      return { success: false, reason: 'Guild sudah penuh' }
    }

    // Check if already member
    if (guild.members.find(m => m.userId === userId)) {
      return { success: false, reason: 'Sudah menjadi member guild' }
    }

    guild.members.push({
      userId: userId,
      joinDate: Date.now(),
      rank: 'member',
      contribution: 0,
      invitedBy: invitedBy,
      activeDate: Date.now()
    })

    return {
      success: true,
      message: `${playerData.name} bergabung dengan guild!`,
      newMemberCount: guild.members.length
    }
  }

  /**
   * Remove member from guild
   */
  static removeMember(guild, userId, reason = 'Removed') {
    const memberIndex = guild.members.findIndex(m => m.userId === userId)
    if (memberIndex === -1) {
      return { success: false, reason: 'Member tidak ditemukan' }
    }

    const member = guild.members[memberIndex]
    guild.members.splice(memberIndex, 1)

    return {
      success: true,
      message: `Member dihapus: ${reason}`,
      removedMember: member
    }
  }

  /**
   * Deposit money to guild vault
   */
  static depositToVault(guild, userId, amount, playerData) {
    const member = guild.members.find(m => m.userId === userId)
    if (!member) return { success: false, reason: 'Bukan member guild' }

    if (playerData.money < amount) {
      return { success: false, reason: 'Uang tidak cukup' }
    }

    if (guild.vault + amount > guild.vaultCapacity) {
      return { success: false, reason: `Vault penuh. Kapasitas: ${guild.vaultCapacity}` }
    }

    guild.vault += amount
    member.contribution += amount
    playerData.money -= amount

    guild.vaultHistory.push({
      type: 'deposit',
      userId: userId,
      amount: amount,
      timestamp: Date.now()
    })

    return {
      success: true,
      message: `Deposit ${amount.toLocaleString('id-ID')} ke vault berhasil`,
      newVault: guild.vault
    }
  }

  /**
   * Withdraw money from guild vault
   */
  static withdrawFromVault(guild, userId, amount) {
    const member = guild.members.find(m => m.userId === userId)
    if (!member) return { success: false, reason: 'Bukan member guild' }

    const rankInfo = GUILD_RANKS[member.rank]
    if (!rankInfo.permissions.includes('withdraw_vault')) {
      return { success: false, reason: 'Tidak punya permission untuk withdraw' }
    }

    if (guild.vault < amount) {
      return { success: false, reason: 'Vault tidak cukup' }
    }

    const maxWithdraw = guild.vaultCapacity * (rankInfo.vaultAccessLimit || 0)
    if (rankInfo.vaultAccessLimit === null) {
      // Master bisa withdraw semua
    } else if (amount > maxWithdraw) {
      return { success: false, reason: `Max withdraw: ${maxWithdraw.toLocaleString('id-ID')}` }
    }

    guild.vault -= amount

    guild.vaultHistory.push({
      type: 'withdraw',
      userId: userId,
      amount: amount,
      timestamp: Date.now()
    })

    return {
      success: true,
      message: `Withdraw ${amount.toLocaleString('id-ID')} berhasil`,
      newVault: guild.vault
    }
  }

  /**
   * Level up guild
   */
  static levelUpGuild(guild, playerData) {
    if (guild.level >= 5) {
      return { success: false, reason: 'Guild sudah di level maksimal' }
    }

    const currentTier = GUILD_UPGRADE_TIERS[guild.level]
    const cost = currentTier.levelUpCost

    if (guild.vault < cost) {
      return { success: false, reason: `Vault minimal: ${cost.toLocaleString('id-ID')}` }
    }

    guild.vault -= cost
    guild.level += 1

    const newTier = GUILD_UPGRADE_TIERS[guild.level]
    guild.maxMembers = newTier.maxMembers
    guild.vaultCapacity = newTier.vaultCapacity

    guild.vaultHistory.push({
      type: 'upgrade',
      amount: cost,
      timestamp: Date.now()
    })

    return {
      success: true,
      message: `Guild naik ke level ${guild.level}!`,
      newTier: newTier,
      benefits: newTier.perks
    }
  }

  /**
   * Get member info
   */
  static getMemberInfo(guild, userId) {
    const member = guild.members.find(m => m.userId === userId)
    if (!member) return null

    const rankInfo = GUILD_RANKS[member.rank]
    return {
      ...member,
      rankTitle: rankInfo.title,
      rankEmoji: rankInfo.emoji,
      joinedDaysAgo: Math.floor((Date.now() - member.joinDate) / (1000 * 60 * 60 * 24))
    }
  }

  /**
   * Change member rank
   */
  static changeMemberRank(guild, userId, newRank, changedBy) {
    const member = guild.members.find(m => m.userId === userId)
    if (!member) return { success: false, reason: 'Member tidak ditemukan' }

    const changer = guild.members.find(m => m.userId === changedBy)
    if (!changer || changer.rank !== 'master') {
      return { success: false, reason: 'Hanya master yang bisa mengubah rank' }
    }

    if (!GUILD_RANKS[newRank]) {
      return { success: false, reason: 'Rank tidak valid' }
    }

    const oldRank = member.rank
    member.rank = newRank

    return {
      success: true,
      message: `${member.userId} rank: ${oldRank} → ${newRank}`,
      memberUpdated: member
    }
  }

  /**
   * Get guild statistics
   */
  static getGuildStats(guild) {
    const activeDays = Math.floor((Date.now() - guild.founded) / (1000 * 60 * 60 * 24))
    const memberContribution = guild.members.reduce((sum, m) => sum + m.contribution, 0)

    return {
      name: guild.name,
      level: guild.level,
      tier: GUILD_UPGRADE_TIERS[guild.level],
      memberCount: `${guild.members.length}/${guild.maxMembers}`,
      vault: guild.vault.toLocaleString('id-ID'),
      vaultCapacity: guild.vaultCapacity.toLocaleString('id-ID'),
      totalContribution: memberContribution.toLocaleString('id-ID'),
      activeDays: activeDays,
      joinType: guild.joinType,
      territory: guild.territory || 'None'
    }
  }

  /**
   * Disband guild (Master only)
   */
  static disbandGuild(guild, guildMasterId, playerData) {
    const master = guild.members.find(m => m.userId === guildMasterId && m.rank === 'master')
    if (!master) {
      return { success: false, reason: 'Hanya master yang bisa bubar guild' }
    }

    const returnAmount = Math.floor(guild.vault * 0.8) // 80% dikembalikan
    playerData.money += returnAmount

    return {
      success: true,
      message: 'Guild berhasil dibubarkan',
      returnedMoney: returnAmount,
      memberCount: guild.members.length
    }
  }
}

export { GuildSystem, GUILD_RANKS, GUILD_UPGRADE_TIERS }
