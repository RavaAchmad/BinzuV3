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
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Fix for __dirname in ES6 modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
  'entertainment': 'Entertainment Zone',
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

// ✅ FIXED: Helper function to create safe dividers for WhatsApp mobile
function createSafeDivider(width = 25, style = 'line') {
  const maxWidth = 25 // Safe for WhatsApp mobile (40-45 char wrap limit)
  const safeWidth = Math.min(width, maxWidth)
  
  switch (style) {
    case 'box-top':
      return '╔' + '═'.repeat(safeWidth) + '╗'
    case 'box-mid':
      return '║'
    case 'box-bot':
      return '╚' + '═'.repeat(safeWidth) + '╝'
    case 'line':
      return '─'.repeat(safeWidth)
    case 'heavy':
      return '━'.repeat(safeWidth)
    default:
      return '─'.repeat(safeWidth)
  }
}

// ✅ FIXED: Fetch with timeout to prevent hanging
async function fetchThumbnailWithTimeout(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    
    fetch(url, { signal: controller.signal })
      .then(res => {
        clearTimeout(timeout)
        if (!res.ok) reject(new Error(`HTTP ${res.status}`))
        return res.arrayBuffer()
      })
      .then(buffer => {
        if (buffer.byteLength < 1000) {
          reject(new Error('Image too small'))
        } else {
          resolve(Buffer.from(buffer))
        }
      })
      .catch(err => {
        clearTimeout(timeout)
        reject(err)
      })
  })
}

let handler = async (m, { conn, usedPrefix, command, __dirname: cmdDirname, text }) => {
  try {
    // Use provided __dirname or fallback to computed one
    const workDir = cmdDirname || __dirname
    
    let wib = moment.tz('Asia/Jakarta').format('HH:mm:ss')
    let _package = JSON.parse(await promises.readFile(join(workDir, '../package.json')).catch(_ => ({}))) || {}
    let { exp, level, role } = global.db.data.users[m.sender]
    let { min, xp, max } = xpRange(level, global.multiplier)
    let tag = `@${m.sender.split`@`[0]}`
    let user = global.db.data.users[m.sender]
    
    // ✅ FIXED: Safe null checks for optional values
    let limit = user?.premiumTime >= 1 ? 'Unlimited' : user?.limit ?? 'N/A'
    let premium = global.db.data.users[m.sender]?.premiumTime ?? 0
    let prems = `${premium > 0 ? 'Yes': 'No'}`
    let name = `@${m.sender.split`@`[0]}`
    let status = `${m.sender.split`@`[0] == global.info?.nomorown ? 'Developer' : user?.premiumTime >= 1 ? 'Premium User' : user?.level >= 1000 ? 'Elite User' : 'Free User'}`
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
    let after = conn.menu.after || (conn.user.jid == global.conn.user.jid ? '' : `Powered by wa.me/${global.info?.nomorown}\n`) + defaultMenu.after
    
    // Handle menu type based on text input
    let menuType = text ? text.toLowerCase() : ''
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
    let replace = {
      '%': '%',
      p: usedPrefix, 
      uptime: uptime ?? '00:00:00', 
      muptime: muptime ?? '00:00:00',
      me: conn.getName(conn.user.jid) ?? conn.user.jid ?? 'Bot',
      npmname: _package?.name ?? 'Binzu v3',
      npmdesc: _package?.description ?? 'RPG Fantasy Bot',
      version: _package?.version ?? 'unknown',
      exp: exp - min,
      maxexp: xp,
      totalexp: exp,
      xp4levelup: max - exp,
      github: _package?.homepage?.url ?? _package?.homepage ?? '[unknown github url]',
      level: level ?? 1, 
      limit: limit ?? 'N/A', 
      name: name ?? 'User', 
      weton, 
      week, 
      date, 
      year, 
      dateIslamic, 
      time, 
      totalreg, 
      rtotalreg, 
      role, 
      prems, 
      tag, 
      status, 
      wib, 
      platform, 
      mode, 
      readmore: readMore
    }
    
    textToSend = textToSend.replace(
      new RegExp(`%(${Object.keys(replace).sort((a, b) => b.length - a.length).join`|`})`, 'g'), 
      (_, name) => String(replace[name] ?? '')
    )
    
    // ✅ FIXED: Fetch thumbnail with timeout and better error handling
    let xm4ze = await (await fetch(xmenus)).json().catch(_ => [])
    let thumb = xm4ze[Math.floor(Math.random() * xm4ze.length)] || 'https://g.top4top.io/p_353640c0q1.png'
    
    if (!cachedThumbnail) {
      try {
        cachedThumbnail = await fetchThumbnailWithTimeout(global.thum || thumb, 5000)
      } catch (err) {
        console.warn(`Failed to fetch primary thumbnail (${global.thum || thumb}):`, err.message)
        try {
          cachedThumbnail = await fetchThumbnailWithTimeout('https://g.top4top.io/p_353640c0q1.png', 3000)
        } catch (fallbackErr) {
          console.warn('Failed to fetch fallback thumbnail:', fallbackErr.message)
          cachedThumbnail = Buffer.from([]) // Empty buffer fallback
        }
      }
    }

    let fkon = { 
      key: { 
        fromMe: false, 
        participant: `0@s.whatsapp.net`, 
        ...(m.chat ? { remoteJid: '0@s.whatsapp.net' } : {}) 
      }, 
      message: { 
        contactMessage: { 
          displayName: `${conn.getName(conn.user.jid)}`, 
          vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${conn.getName(conn.user.jid)}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
        }
      }
    }

    // ✅ FIXED: Better device handling with proper fallbacks
    const isAndroid = await getDevice(m.key.id) === 'android'
    const hasSettings = db.data.settings?.[conn.user.jid]
    const useThumbnail = hasSettings?.thumbnail !== false && isAndroid && cachedThumbnail?.length > 0

    if (useThumbnail && !/all/.test(command)) {
      // Send with thumbnail on Android
      conn.sendMessage(m.chat, {
        text: textToSend,
        contextInfo: {
          mentionedJid: [m.sender],
          forwardedNewsletterMessageInfo: {
            newsletterJid: global.info?.channel,
            serverMessageId: null,
            newsletterName: global.info?.namechannel,
          },
          externalAdReply: {
            showAdAttribution: false,
            title: `${global.info?.namebot || 'Bot'} © ${year}`,
            body: '',
            mediaType: 1,
            sourceUrl: global.info?.gcbot || 'https://wa.me',
            renderLargerThumbnail: true,
            thumbnail: cachedThumbnail,
          }
        },
      }, { quoted: m }).catch(err => {
        console.error('Error sending with thumbnail:', err.message)
        // Fallback to text-only
        conn.sendMessage(m.chat, { 
          text: textToSend, 
          contextInfo: { mentionedJid: [m.sender] }
        }, { quoted: m })
      })
    } else {
      // Fallback: text-only or video format
      conn.sendMessage(m.chat, { 
        text: textToSend,
        contextInfo: { mentionedJid: [m.sender] }
      }, { quoted: m }).catch(err => {
        console.error('Error sending menu:', err.message)
      })
    }
    
  } catch (e) {
    console.error('Menu handler error:', e)
    throw e
  }
  
  // Display ads after menu with delay
  setTimeout(() => displayAds(m, conn), 1200)
};

/**
 * Load and display ads from config with safe dividers
 */
function displayAds(m, conn) {
  try {
    // ✅ FIXED: Better path resolution using fileURLToPath
    const pluginDir = dirname(__dirname) // Go up to plugins parent
    const adsDir = path.join(pluginDir, 'src', 'ads')
    const configPath = path.join(adsDir, 'config.json')
    
    // Check if config exists before trying to read
    if (!fs.existsSync(configPath)) {
      // No ads config, try showing update instead
      displayUpdateNotification(m, conn)
      return
    }

    try {
      const adsConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      const activeAds = Object.entries(adsConfig)
        .filter(([_, ad]) => ad?.active)
        .map(([name, ad]) => ad)

      if (activeAds.length === 0) {
        // No active ads, show update notification instead
        displayUpdateNotification(m, conn)
        return
      }

      // Select random ad from active ones
      const selectedAd = activeAds[Math.floor(Math.random() * activeAds.length)]

      if (selectedAd.type === 'text') {
        // ✅ FIXED: Send text ad with safe dividers for WhatsApp mobile
        const divider = createSafeDivider(25, 'box-top')
        const dividerBot = createSafeDivider(25, 'box-bot')
        const adContent = `\n${divider}\n📢 *ADVERTISEMENT*\n${dividerBot}\n\n${selectedAd.content}\n\n${divider}`
        
        conn.sendMessage(m.chat, {
          text: adContent
        }, { quoted: m }).catch(err => console.error('Error sending ad:', err.message))
        
      } else if (selectedAd.type === 'image' && selectedAd.path) {
        // Send image ad with optional caption
        if (fs.existsSync(selectedAd.path)) {
          const divider = createSafeDivider(25, 'box-top')
          const dividerBot = createSafeDivider(25, 'box-bot')
          const caption = selectedAd.caption 
            ? `${divider}\n📢 *ADVERTISEMENT*\n${dividerBot}\n\n${selectedAd.caption}`
            : `${divider}\n📢 *ADVERTISEMENT*\n${dividerBot}`
          
          conn.sendMessage(m.chat, {
            image: fs.readFileSync(selectedAd.path),
            caption: caption
          }, { quoted: m }).catch(err => console.error('Error sending image ad:', err.message))
        }
      }
    } catch (parseErr) {
      console.error('Failed to parse ads config:', parseErr.message)
      displayUpdateNotification(m, conn)
    }
  } catch (e) {
    console.error('Error displaying ads:', e.message)
  }
}

handler.command = /^(menu|help|perintah)$/i
handler.register = true

export default handler

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
