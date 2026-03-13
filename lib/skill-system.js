/**
 * Advanced Skill System
 * Manages skill progression, stat calculation, and integration with RPG
 */

const skillDatabase = {
    swordmaster: {
        name: 'Swordmaster',
        emoji: '⚔️',
        primary: 'STR',
        secondary: 'DEF',
        description: 'Master of swords and melee combat',
        statGrowth: { STR: 2.5, DEF: 1.5, HP: 1.2, CRIT: 0.8 },
        abilityBonus: (level) => ({
            damage: 50 + (level * 3),
            crit_chance: 5 + (level * 0.5),
            dodge: 2 + (level * 0.3)
        })
    },
    necromancer: {
        name: 'Necromancer',
        emoji: '💀',
        primary: 'MAG',
        secondary: 'DEF',
        description: 'Command death and shadow magic',
        statGrowth: { MAG: 3, DEF: 0.8, HP: 0.8, CRIT: 1.2 },
        abilityBonus: (level) => ({
            spell_damage: 60 + (level * 3.5),
            mana_pool: 30 + (level * 2),
            drain_life: 10 + (level * 0.4)
        })
    },
    witch: {
        name: 'Witch',
        emoji: '🧙‍♀️',
        primary: 'MAG',
        secondary: 'CRIT',
        description: 'Potent elemental and restoration magic',
        statGrowth: { MAG: 2.8, DEF: 1, HP: 1, CRIT: 1.5 },
        abilityBonus: (level) => ({
            spell_damage: 55 + (level * 3.2),
            heal_power: 40 + (level * 2),
            status_chance: 8 + (level * 0.6)
        })
    },
    archer: {
        name: 'Archer',
        emoji: '🏹',
        primary: 'AGI',
        secondary: 'CRIT',
        description: 'Swift and precise ranged attacks',
        statGrowth: { AGI: 3, CRIT: 1.8, DEF: 0.5, STR: 1.2 },
        abilityBonus: (level) => ({
            ranged_damage: 45 + (level * 2.8),
            attack_speed: 10 + (level * 0.8),
            pierce_chance: 12 + (level * 0.7)
        })
    },
    magicswordmaster: {
        name: 'Magic Swordmaster',
        emoji: '⚡⚔️',
        primary: 'STR',
        secondary: 'MAG',
        description: 'Balance between martial and magical arts',
        statGrowth: { STR: 2, MAG: 2, DEF: 1.5, CRIT: 0.9 },
        abilityBonus: (level) => ({
            physical_damage: 40 + (level * 2.5),
            spell_damage: 40 + (level * 2.5),
            spell_pierce: 5 + (level * 0.4)
        })
    },
    thief: {
        name: 'Thief',
        emoji: '🗡️',
        primary: 'AGI',
        secondary: 'CRIT',
        description: 'Quick strikes and high risk, high reward',
        statGrowth: { AGI: 3.2, CRIT: 2, DEF: 0.3, STR: 1 },
        abilityBonus: (level) => ({
            backstab_damage: 70 + (level * 3.8),
            evasion: 15 + (level * 1),
            steal_chance: 8 + (level * 0.5)
        })
    },
    shadow: {
        name: 'Shadow',
        emoji: '👤',
        primary: 'AGI',
        secondary: 'MAG',
        description: 'Stealth, shadow magic, and assassination',
        statGrowth: { AGI: 2.5, MAG: 1.8, CRIT: 1.5, DEF: 0.4 },
        abilityBonus: (level) => ({
            shadow_damage: 50 + (level * 3),
            stealth: 10 + (level * 0.9),
            shadow_clone_damage: 30 + (level * 1.5)
        })
    }
}

const skillSystem = {
    /**
     * Initialize skill for user
     */
    initializeSkill(user, skillName) {
        const skill = skillDatabase[skillName.toLowerCase()]
        if (!skill) return null

        user.skill = {
            name: skillName.toLowerCase(),
            level: 1,
            exp: 0,
            stats: this.calculateStats(skillName.toLowerCase(), 1),
            unlocked_abilities: []
        }
        return user.skill
    },

    /**
     * Calculate stat bonuses based on skill level
     */
    calculateStats(skillName, level) {
        const skill = skillDatabase[skillName]
        if (!level < 1 || level > 30) return null

        const baseStats = {
            STR: 10,
            DEF: 10,
            MAG: 10,
            AGI: 10,
            CRIT: 5,
            HP: 100
        }

        const growth = skill.statGrowth
        const stats = { ...baseStats }

        Object.keys(growth).forEach(stat => {
            stats[stat] = Math.floor(baseStats[stat] + (growth[stat] * level))
        })

        return stats
    },

    /**
     * Add skill exp and check for levelup
     */
    addSkillExp(user, amount = 100) {
        if (!user.skill) return { levelup: false }

        user.skill.exp += amount
        const expNeeded = 500 + (user.skill.level * 200)

        if (user.skill.exp >= expNeeded && user.skill.level < 30) {
            user.skill.level++
            user.skill.exp = 0
            user.skill.stats = this.calculateStats(user.skill.name, user.skill.level)
            return { 
                levelup: true, 
                newLevel: user.skill.level,
                newStats: user.skill.stats
            }
        }

        return { levelup: false, expProgress: user.skill.exp, expNeeded }
    },

    /**
     * Get ability bonus multiplier for damage calculation
     */
    getAbilityBonus(skillName, level, abilityType) {
        const skill = skillDatabase[skillName]
        if (!skill) return 1

        const bonuses = skill.abilityBonus(level)
        return bonuses[abilityType] || 1
    },

    /**
     * Calculate combat damage with skill enhancement
     */
    calculateDamage(attacker, defender, baseAttack = 100) {
        const atkStats = attacker.skill?.stats || { STR: 10, CRIT: 5, AGI: 10 }
        const defStats = defender.skill?.stats || { DEF: 10 }

        // Base damage calculation
        let damage = baseAttack + (atkStats.STR * 0.8)
        
        // Crit calculation
        const critChance = atkStats.CRIT / 100
        const isCrit = Math.random() < critChance
        if (isCrit) {
            damage *= 1.5
        }

        // Defense reduction
        const defenseReduction = Math.max(0.5, 1 - (defStats.DEF / 100))
        damage *= defenseReduction

        // Add slight RNG variation
        damage *= (0.95 + Math.random() * 0.1)

        return {
            damage: Math.floor(damage),
            isCrit,
            details: {
                attacker_skill: attacker.skill?.name || 'None',
                defender_skill: defender.skill?.name || 'None'
            }
        }
    },

    /**
     * Get skill description with current stats
     */
    getSkillInfo(skillName, level = 1) {
        const skill = skillDatabase[skillName.toLowerCase()]
        if (!skill) return null

        const stats = this.calculateStats(skillName.toLowerCase(), level)
        const abilities = skill.abilityBonus(level)

        return {
            ...skill,
            currentLevel: level,
            stats,
            abilities,
            expNeeded: 500 + (level * 200)
        }
    },

    /**
     * List all available skills
     */
    getAllSkills() {
        return Object.entries(skillDatabase).map(([key, data]) => ({
            id: key,
            ...data
        }))
    },

    /**
     * Get skill cost for upgrading (materials needed)
     */
    getUpgradeCost(level) {
        return {
            money: 500 + (level * 300),
            materials: 10 + (level * 5)
        }
    }
}

export default skillSystem
