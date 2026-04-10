/**
 * Leaderboard System - Real-time Asset & Achievement Rankings
 * Menghitung ranking berdasarkan kekayaan & pencapaian player secara langsung
 */

export class LeaderboardManager {
    constructor() {
        // Daftar pet yang dihitung
        this.PET_KEYS = [
            'hero', 'kucing', 'anjing', 'kuda', 'rubah', 'naga',
            'phonix', 'griffin', 'centaur', 'kyubi', 'serigala'
        ]

        // Nilai estimasi per item untuk perhitungan total kekayaan
        this.WEALTH_VALUES = {
            money: 1,
            bank: 1,
            diamond: 10000,
            emerald: 25000,
            gold: 5000,
            berlian: 50000,
            coin: 100,
            mythic: 500000,
            legendary: 200000,
            superior: 100000,
            uncommon: 10000,
            common: 1000,
            trofi: 75000,
        }

        // Kategori leaderboard
        this.CATEGORIES = {
            wealth: { name: '💰 Total Kekayaan', icon: '💰', desc: 'Estimasi total aset' },
            level: { name: '⭐ Level Tertinggi', icon: '⭐', desc: 'Level & Experience' },
            money: { name: '💵 Uang Terbanyak', icon: '💵', desc: 'Money + Bank' },
            diamond: { name: '💎 Diamond Terbanyak', icon: '💎', desc: 'Jumlah Diamond' },
            emerald: { name: '🟢 Emerald Terbanyak', icon: '🟢', desc: 'Jumlah Emerald' },
            pets: { name: '🐾 Koleksi Pet', icon: '🐾', desc: 'Total pet yang dimiliki' },
            exp: { name: '✨ Experience', icon: '✨', desc: 'Total EXP' },
        }
    }

    /**
     * Hitung total kekayaan player
     */
    calcWealth(user) {
        let total = 0
        for (const [key, multiplier] of Object.entries(this.WEALTH_VALUES)) {
            total += (user[key] || 0) * multiplier
        }
        return total
    }

    /**
     * Hitung total pet yang dimiliki
     */
    countPets(user) {
        let count = 0
        for (const key of this.PET_KEYS) {
            if ((user[key] || 0) > 0) count++
        }
        return count
    }

    /**
     * Ambil value berdasarkan kategori
     */
    getCategoryValue(user, category) {
        switch (category) {
            case 'wealth': return this.calcWealth(user)
            case 'level': return user.level || 0
            case 'money': return (user.money || 0) + (user.bank || 0)
            case 'diamond': return user.diamond || 0
            case 'emerald': return user.emerald || 0
            case 'pets': return this.countPets(user)
            case 'exp': return user.exp || 0
            default: return 0
        }
    }

    /**
     * Ambil leaderboard real-time dari db.users
     */
    getLeaderboard(db, category = 'wealth', limit = 15) {
        if (!db.users) return []

        const entries = Object.entries(db.users)
            .filter(([uid, u]) => uid.includes('@') && u && (u.level || 0) > 0)
            .map(([userId, user]) => ({
                userId,
                value: this.getCategoryValue(user, category),
                level: user.level || 0,
                exp: user.exp || 0,
                money: (user.money || 0) + (user.bank || 0),
                diamond: user.diamond || 0,
                emerald: user.emerald || 0,
                pets: this.countPets(user),
                wealth: this.calcWealth(user),
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, limit)

        return entries.map((e, i) => ({ ...e, rank: i + 1 }))
    }

    /**
     * Ambil rank player di kategori tertentu
     */
    getPlayerRank(db, userId, category = 'wealth') {
        if (!db.users) return null

        const sorted = Object.entries(db.users)
            .filter(([uid, u]) => uid.includes('@') && u && (u.level || 0) > 0)
            .map(([uid, user]) => ({
                userId: uid,
                value: this.getCategoryValue(user, category)
            }))
            .sort((a, b) => b.value - a.value)

        const idx = sorted.findIndex(e => e.userId === userId)
        return idx >= 0 ? { rank: idx + 1, value: sorted[idx].value, total: sorted.length } : null
    }
}

export default new LeaderboardManager()
