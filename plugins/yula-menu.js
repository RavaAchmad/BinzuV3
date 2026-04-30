import PhoneNumber from 'awesome-phonenumber'
import { promises } from 'fs'
import { join } from 'path'
import fetch from 'node-fetch'
import { xpRange } from '../lib/levelling.js'
import moment from 'moment-timezone'
import { getDevice } from 'baileys'
import os from 'os'
import axios from 'axios' 
import fs from 'fs'
import { displayUpdateNotification } from './bot-updates.js'
import { toAudio } from '../lib/converter.js'
import path from 'path'
import { interactiveMsg } from '../lib/buttons.js'
let cachedThumbnail = null
let tags = {
  // 🧭 CORE / WAJIB (Tier 1)
  'main': 'Main Menu',
  'store': 'Store Menu',
  'digiflazz': 'Topup Menu',
  'tools': 'Tools & Utilities',
  'downloader': 'Downloader Menu',
  'search': 'Search Menu',
  'info': 'Info & Help Menu',

  // ⚙️ ENGAGEMENT (Tier 2)
  'ai': 'AI Menu',
  'group': 'Group Features',
  'xp': 'Exp & Level Menu',
  'game': 'Mini Games',
  'rpg': 'RPG System',
  'fun': 'Fun & Jokes',
  'maker': 'Maker / Image Editor',
  'sticker': 'Sticker Generator',
  'audio': 'Audio Tools',
  'quotes': 'Quotes & Motivation',
  'jadibot': 'JadiBot System',

  // 🎭 INTEREST / COMMUNITY (Tier 3)
  'anime': 'Anime & Manga',
  'genshin': 'Genshin Impact Menu',
  'hsr': 'Honkai Star Rail Menu',
  'islamic': 'Islamic Features',
  'primbon': 'Primbon & Ramalan',
  'internet': 'Internet Tools',
  'news': 'News & Updates',

  // 💫 ENTERTAINMENT (Tier 4)
  'entertainment': 'Entertainment Zone', // merge fun/pacaran/kerang/quotes if needed
  'pacaran': 'Relationship & Couple',
  'kerang': 'Kerang Ajaib',
  'absen': 'Attendance System',
  'vote': 'Voting Menu',

  // 🔒 SYSTEM & INTERNAL (Tier 5)
  'premium': 'Premium Features',
  'database': 'Database Control',
  'adminry': 'Admin Tools',
  'owner': 'Owner Only',
  'nsfw': 'NSFW Menu',
}


const defaultMenu = {
  before: `Hallo %name!\nSaya adalah Bot Otomatis. Saya dapat membantu Anda mencari data, mendownload data, dan mengelola data dengan mudah dan efisien. Saya siap membantu Anda 24/7!

*「  I N F O  K A M U  」*
 •  *Premium :* %prems
 •  *Limits :* %limit
 •  *Level :* %level
 •  *Role :* %role 
 •  *Exp :* %totalexp
 
*「  I N F O  B O T  」*
 •  *Mode :* %mode
 •  *Me :* %me
 •  *Version :* %version
 •  *Request :* %rtotalreg
 •  *Platform :* %platform
%readmore
`.trimStart(),
  header: '\`— %category\`',
  body: '•  %cmd',
  footer: '',
  after: `Powered By RavaAchmad`,
}

let handler = async (m, { conn, usedPrefix, command, __dirname, text }) => {
  try {
    let wib = moment.tz('Asia/Jakarta').format('HH:mm:ss')
    let _package = JSON.parse(await promises.readFile(join(__dirname, '../package.json')).catch(_ => ({}))) || {}
    let { exp, level, role } = global.db.data.users[m.sender]
    let { min, xp, max } = xpRange(level, global.multiplier)
    let tag = `@${m.sender.split`@`[0]}`
    let user = global.db.data.users[m.sender]
    let limit = user.premiumTime >= 1 ? 'Unlimited' : user.limit
    let premium = global.db.data.users[m.sender].premiumTime
    let prems = `${premium > 0 ? 'Yes': 'No'}`
    let name = `@${m.sender.split`@`[0]}`
    let status = `${m.sender.split`@`[0] == info.nomorown ? 'Developer' : user.premiumTime >= 1 ? 'Premium User' : user.level >= 1000 ? 'Elite User' : 'Free User'}`
    let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
    let d = new Date(new Date + 3600000)
    let locale = 'id'
    let weton = ['Pahing', 'Pon', 'Wage', 'Kliwon', 'Legi'][Math.floor(d / 84600000) % 5]
    let week = d.toLocaleDateString(locale, { weekday: 'long' })
    let year = d.toLocaleDateString(locale, { year: 'numeric' })
    let date = d.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    let dateIslamic = Intl.DateTimeFormat(locale + '-TN-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d)
    let time = d.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    })
    let _uptime = process.uptime() * 1000
    let _muptime
    if (process.send) {
      process.send('uptime')
      _muptime = await new Promise(resolve => {
        process.once('message', resolve)
        setTimeout(resolve, 1000)
      }) * 1000
    }
    let muptime = clockString(_muptime)
    let uptime = clockString(_uptime)
    let platform = os.platform()
    let mode = global.opts['self'] ? 'Private' : 'Publik'
    let totalreg = Object.keys(global.db.data.users).length
    let rtotalreg = Object.values(global.db.data.users).filter(user => user.registered == true).length
    let help = Object.values(global.plugins).filter(plugin => !plugin.disabled).map(plugin => {
      return {
        help: Array.isArray(plugin.tags) ? plugin.help : [plugin.help],
        tags: Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags],
        prefix: 'customPrefix' in plugin,
        limit: plugin.limit,
        premium: plugin.premium,
        enabled: !plugin.disabled,
      }
    })
    for (let plugin of help)
      if (plugin && 'tags' in plugin)
        for (let tag of plugin.tags)
          if (!(tag in tags) && tag) tags[tag] = tag
    conn.menu = conn.menu ? conn.menu : {}
    let before = conn.menu.before || defaultMenu.before
    let header = conn.menu.header || defaultMenu.header
    let body = conn.menu.body || defaultMenu.body
    let footer = conn.menu.footer || defaultMenu.footer
    let after = conn.menu.after || (conn.user.jid == global.conn.user.jid ? '' : `Powered by wa.me/${global.info.nomorown}\n`) + defaultMenu.after
    
    let menuType = text ? text.trim().toLowerCase() : ''

    let menuText = []
    
    if (!menuType) {
      // Show available tags when no argument is given
      menuText = [
        before,
        `\`Daftar Menu Yang Tersedia:\`\n• \`\`\`${usedPrefix + command} all\`\`\`\n` +
        Object.entries(tags).map(([tag]) => `• \`\`\`${usedPrefix + command} ${tag}\`\`\``).join('\n') +
        `\n\n\`Contoh penggunaan: ${usedPrefix + command} sticker\``,
        `\n` + after
      ]
    } else if (menuType === 'all') {
      // Show all menus when 'all' is specified
      menuText = [
        before,
        ...Object.keys(tags).map(tag => {
          return header.replace(/%category/g, tags[tag]) + '\n' + [
            ...help.filter(menu => menu.tags && menu.tags.includes(tag) && menu.help).map(menu => {
              return menu.help.map(help => {
                return body.replace(/%cmd/g, menu.prefix ? help : '%p' + help)
                  .replace(/%islimit/g, menu.limit ? '🅛' : '')
                  .replace(/%isPremium/g, menu.premium ? '🅟' : '')
                  .trim()
              }).join('\n')
            }),
            footer
          ].join('\n')
        }),
        after
      ]
    } else if (menuType === 'rpg') {
      // Dedicated RPG guide when using: .menu rpg
      const rpgGuide = [
        '*RPG MENU GUIDE*',
        '',
        'Konsep:',
        '- Naik level dari aktivitas harian',
        '- Semakin tinggi level, hadiah makin bagus',
        '- Pilih skill sesuai gaya main',
        '',
        'Aktivitas utama (CD 5 menit):',
        `- ${usedPrefix}hunt`,
        `- ${usedPrefix}fish`,
        `- ${usedPrefix}mine`,
        `- ${usedPrefix}work`,
        `- ${usedPrefix}adventure`,
        '',
        'Progress & info:',
        `- ${usedPrefix}rpggo`,
        `- ${usedPrefix}rpgnotify on/off`,
        `- ${usedPrefix}stats`,
        `- ${usedPrefix}rpg skills`,
        `- ${usedPrefix}rpg detailed`,
        `- ${usedPrefix}rpg balance`,
        '',
        'Combat cepat:',
        `- ${usedPrefix}dungeon normal`,
        `- ${usedPrefix}attack slash`,
        '',
        `Tip: untuk menu interaktif gunakan ${usedPrefix}rpg`
      ].join('\n')

      menuText = [
        before,
        rpgGuide,
        `\n` + after
      ]
    } else if (tags[menuType]) {
      // Show specific menu when valid tag is specified
      menuText = [
        before,
        header.replace(/%category/g, tags[menuType]) + '\n' + [
          ...help.filter(menu => menu.tags && menu.tags.includes(menuType) && menu.help).map(menu => {
            return menu.help.map(help => {
              return body.replace(/%cmd/g, menu.prefix ? help : '%p' + help)
                .replace(/%islimit/g, menu.limit ? '🅛' : '')
                .replace(/%isPremium/g, menu.premium ? '🅟' : '')
                .trim()
            }).join('\n')
          }),
          footer
        ].join('\n'),
        after
      ]
    } else {
      // Show error message when invalid tag is specified
      menuText = [
        before,
        `Menu "${text}" tidak ditemukan!!!.\n\n\`Daftar menu yang tersedia:\`\n• \`\`\`${usedPrefix + command} all\`\`\`\n` +
        Object.entries(tags).map(([tag]) => `• \`\`\`${usedPrefix + command} ${tag}\`\`\``).join('\n'),
        `\n` + after
      ]
    }
    
    let textToSend = menuText.join('\n')
    const botName = await Promise.resolve(conn.getName(conn.user.jid)).catch(() => global.info?.namebot || 'Bot')

    let replace = {
      '%': '%',
      p: usedPrefix, uptime, muptime,
      me: botName,
      npmname: _package.name,
      npmdesc: _package.description,
      version: _package.version,
      exp: exp - min,
      maxexp: xp,
      totalexp: exp,
      xp4levelup: max - exp,
      github: _package.homepage ? _package.homepage.url || _package.homepage : '[unknown github url]',
      level, limit, name, weton, week, date, year, dateIslamic, time, totalreg, rtotalreg, role, prems, tag, status, wib, platform, mode, 
      readmore: readMore
    }
    textToSend = textToSend.replace(new RegExp(`%(${Object.keys(replace).sort((a, b) => b.length - a.length).join`|`})`, 'g'), (_, name) => '' + replace[name])
    
    if (!cachedThumbnail) {
      cachedThumbnail = await loadMenuThumbnail()
    }

    let fkon = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: '0@s.whatsapp.net' } : {}) }, message: { contactMessage: { displayName: `${botName}`, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${botName}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}}

    const contextInfo = buildMenuContext(m.sender, year, cachedThumbnail)
    const isAllMenu = menuType === 'all'

    if (!isAllMenu) {
      await conn.sendMessage(m.chat, {
        text: textToSend,
        contextInfo
      }, { quoted: m })

      try {
        await interactiveMsg(conn, m.chat, {
          text: 'Pilih kategori atau aksi cepat di bawah.',
          footer: `${global.info?.namebot || 'Binzu'} Menu`,
          contextInfo,
          interactiveButtons: buildMenuButtons(usedPrefix, command, menuType, help)
        }, m)
      } catch (e) {
        console.warn('[menu] interactive menu skipped:', e?.message || e)
      }
    } else if (!/all/.test(command) && await getDevice(m.key.id) == 'android') {
      if (!db.data.settings[conn.user.jid].thumbnail) {
        conn.sendMessage(m.chat, {
            text: textToSend,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardedNewsletterMessageInfo: {
                    newsletterJid: global.info.channel,
                    serverMessageId: null,
                    newsletterName: global.info.namechannel,
                },
                externalAdReply: {
                    showAdAttribution: false,
                    title: global.info.namebot + ` © ` + year,
                    body: '',
                    mediaType: 1,
                    sourceUrl: gcbot,
                    renderLargerThumbnail: true,
                    thumbnail: cachedThumbnail, // ← pindah ke sini, harus Buffer jpeg
                }
            },
        }, { quoted: m });
      } else {
      conn.sendMessage(m.chat, { text: textToSend, contextInfo: { mentionedJid: [m.sender] }}, { quoted: m });
      }
    } else await conn.sendMessage(m.chat, { 
          image: { 
             url: "https://files.catbox.moe/morbwn.mp4" 
             }, 
             fileName: wm, 
             caption: textToSend, 
                 contextInfo: { 
                     mentionedJid: [m.sender] 
                 }
          }, { quoted: m });
  } catch (e) {
    throw e
  }
  
  // Display ads after menu with delay
  setTimeout(() => displayAds(m, conn), 1200)
};

/**
 * Load and display ads from config
 */
function displayAds(m, conn) {
  try {
    const adsDir = './src/ads'
    const configPath = path.join(adsDir, 'config.json')
    
    if (!fs.existsSync(configPath)) {
      // No ads config, try showing update instead
      displayUpdateNotification(m, conn)
      return
    }

    const adsConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    const activeAds = Object.entries(adsConfig)
      .filter(([_, ad]) => ad.active)
      .map(([name, ad]) => ad)

    if (activeAds.length === 0) {
      // No active ads, show update notification instead
      displayUpdateNotification(m, conn)
      return
    }

    // Select random ad from active ones
    const selectedAd = activeAds[Math.floor(Math.random() * activeAds.length)]

    if (selectedAd.type === 'text') {
      // Send text ad
      conn.sendMessage(m.chat, {
        text: `\n${'━'.repeat(30)}\n📢 *ADVERTISEMENT*\n${'━'.repeat(30)}\n\n${selectedAd.content}\n\n${'━'.repeat(30)}`
      }, { quoted: m })
    } else if (selectedAd.type === 'image' && selectedAd.path) {
      // Send image ad with optional caption
      if (fs.existsSync(selectedAd.path)) {
        const caption = selectedAd.caption 
          ? `📢 *ADVERTISEMENT*\n\n${selectedAd.caption}`
          : `📢 *ADVERTISEMENT*`
        
        conn.sendMessage(m.chat, {
          image: fs.readFileSync(selectedAd.path),
          caption: caption
        }, { quoted: m })
      }
    }
  } catch (e) {
    console.error('Error displaying ads:', e)
  }
}

function buildMenuContext(sender, year, thumbnail) {
  return {
    mentionedJid: [sender],
    forwardedNewsletterMessageInfo: {
      newsletterJid: global.info.channel,
      serverMessageId: null,
      newsletterName: global.info.namechannel,
    },
    externalAdReply: {
      showAdAttribution: false,
      title: `${global.info.namebot} © ${year}`,
      body: 'Interactive menu',
      mediaType: 1,
      sourceUrl: global.gcbot || '',
      renderLargerThumbnail: true,
      thumbnail,
    }
  }
}

function buildMenuButtons(usedPrefix, command, currentTag, help = []) {
  const base = `${usedPrefix}${command}`
  const buttons = [
    {
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
        title: 'Pilih Menu',
        sections: buildMenuSections(base, help)
      })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: currentTag === 'rpg' ? 'Tools' : 'RPG', id: `${base} ${currentTag === 'rpg' ? 'tools' : 'rpg'}` })
    },
        
    {
      name: 'cta_call',
      buttonParamsJson: JSON.stringify({ display_text: 'Group Bot', url: `https://chat.whatsapp.com/KPqLnY91cX2BGWaZVcXX2D` })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: 'Sewa Bot', id: `${usedPrefix}sewa` })
    }
  ]

  if (currentTag) {
    buttons.splice(1, 0, {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: 'Kategori', id: base })
    })
  }

  return buttons
}

function buildMenuSections(baseCommand, help = []) {
  const groups = [
    ['Utama', ['main', 'store', 'digiflazz', 'tools', 'downloader', 'search', 'info', 'ai']],
    ['Chat & Grup', ['group', 'adminry', 'absen', 'vote', 'xp', 'premium']],
    ['Hiburan', ['game', 'rpg', 'fun', 'maker', 'sticker', 'audio', 'quotes', 'pacaran']],
    ['Lainnya', ['anime', 'genshin', 'hsr', 'islamic', 'primbon', 'internet', 'news', 'owner', 'database', 'nsfw']]
  ]
  const groupedKeys = new Set(groups.flatMap(([, keys]) => keys))

  const sections = groups
    .map(([title, keys]) => ({
      title,
      rows: keys
        .filter(key => tags[key])
        .map(key => ({
          id: `${baseCommand} ${key}`,
          title: limitText(tags[key], 24),
          description: `${countCommandsByTag(help, key)} command`
        }))
        .filter(row => row.description !== '0 command' || ['main', 'rpg', 'tools'].some(key => row.id.endsWith(` ${key}`)))
    }))
    .filter(section => section.rows.length)

  const extraRows = Object.keys(tags)
    .filter(key => !groupedKeys.has(key))
    .map(key => ({
      id: `${baseCommand} ${key}`,
      title: limitText(tags[key], 24),
      description: `${countCommandsByTag(help, key)} command`
    }))
    .filter(row => row.description !== '0 command')

  if (extraRows.length) sections.push({ title: 'Tambahan', rows: extraRows.slice(0, 25) })

  return sections
}

function countCommandsByTag(help = [], tag) {
  return help
    .filter(menu => menu.tags && menu.tags.includes(tag) && menu.help)
    .reduce((total, menu) => total + menu.help.filter(Boolean).length, 0)
}

function limitText(text, max) {
  text = String(text || '')
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}

async function loadMenuThumbnail() {
  const candidates = await getThumbnailCandidates()
  for (const source of candidates) {
    try {
      return await fetchBuffer(source)
    } catch (e) {
      console.warn('[menu] thumbnail fetch failed:', source, e?.message || e)
    }
  }
  return Buffer.alloc(0)
}

async function getThumbnailCandidates() {
  const candidates = []
  if (global.thum) candidates.push(global.thum)

  try {
    const menuSource = typeof xmenus !== 'undefined' ? xmenus : global.xmenus
    if (menuSource) {
      const list = await fetch(menuSource).then(res => res.json())
      if (Array.isArray(list) && list.length) {
        candidates.push(list[Math.floor(Math.random() * list.length)])
      }
    }
  } catch (e) {
    console.warn('[menu] xmenus fetch failed:', e?.message || e)
  }

  candidates.push('https://g.top4top.io/p_353640c0q1.png')
  return [...new Set(candidates.filter(Boolean))]
}

async function fetchBuffer(source) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(source, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  } finally {
    clearTimeout(timeout)
  }
}

handler.command = /^(menu|help|perintah)$/i
handler.register = true;

export default handler;

const more = String.fromCharCode(8206)
const readMore = more.repeat(4001)

function wish() {
    let wishloc = ''
  const time = moment.tz('Asia/Jakarta').format('HH')
  wishloc = ('Hi')
  if (time >= 0) {
    wishloc = ('Selamat Malam')
  }
  if (time >= 4) {
    wishloc = ('Selamat Pagi')
  }
  if (time >= 11) {
    wishloc = ('Selamat Siang')
  }
  if (time >= 15) {
    wishloc = ('️Selamat Sore')
  }
  if (time >= 18) {
    wishloc = ('Selamat Malam')
  }
  if (time >= 23) {
    wishloc = ('Selamat Malam')
  }
  return wishloc
}

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}
