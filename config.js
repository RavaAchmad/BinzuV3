import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import fs from 'fs'
/*============== GLOBAL APIKEY ==============*/
global.btc = 'ravaja'/*============== NOMOR ==============*/
global.info = {
    nomorbot: '62895325866441',
    nomorown: '6281212035575',
    namebot: 'ʙɪɴᴢᴜ Bot',
    nameown: 'RV',
    channel: '120363218308835731@newsletter',
    namechannel: 'ʙɪɴᴢᴜ | Whatsapp Bots'
}
global.adminRG = ["6281212035575@s.whatsapp.net", "628987029543@s.whatsapp.net", "6281268629687@s.whatsapp.net", "120370938015880@lid", "244431001268468@lid", "217333968683183@lid"]


/*============== OWNER ==============*/
global.owner = ['6281212035575']
global.mods = ['6285387071079']
global.prems = ['6281212035575', '6285387071079']
global.xmaze = [global.info.nomorown, '6285387071079']

/*============== API ==============*/
global.APIs = {
      TioXD: 'https://api.botcahx.eu.org',
    btc: 'https://api.botcahx.eu.org'
} 

global.APIKeys = {
  'https://api.botcahx.eu.org': global.btc,
  'https://api.botcahx.eu.org': 'ravaja'
}

/*============== WATERMARK ==============*/
global.wm = 'ʙɪɴᴢᴜ-MD'
global.author = '\n\n\n\n\n\n\n62895325866441'
global.stickpack = 'Bot : ʙɪɴᴢᴜ-MD'
global.stickauth = 'https://wa.me/62895325866441'
global.multiplier = 38 // The higher, The harder levelup        

/*============== NO EDIT ==============*/
global.maxwarn = '2'
function pickRandom(list) {
  return list[Math.floor(list.length * Math.random())]
}

/*========== TEXT & THUMBNAIL ==========*/
global.nameown = 'Binzu Official'
global.waown = 'wa.me/6281212035575'
global.mail = 'ravabbok.ganz@gmail.com'
global.fb = 'https://facebook.com/'
global.ig = 'https://instagram.com/ravaja_'
global.gcbot = 'https://chat.whatsapp.com/KPqLnY91cX2BGWaZVcXX2D'
global.wait = '*Starting Processing . . .*'
global.eror = '*Failed to process . . .*\n\nLapor Owner dengan menulis \`.lapor\`\nReport Owner by writing \`.report\`'
global.qris = 'https://ibb.co.com/tpTLWJLv'
global.pricelist = '*Limit kamu habis.*\nKamu bisa order akses premium dengan menulis `.sewa`\nAtau menambah limit gratis dengan perintah `.freelimit`'
global.thumvid = 'https://media.tenor.com/aYg-_ZOHKNMAAAPo/ganyu.mp4'
// 'https://github.com/XM4ZE/DATABASE/raw/refs/heads/master/wallpaper/mommy.mp4' // Allmenu Video thumbnail
global.xmenus = 'https://github.com/RavaAchmad/node_modules/raw/refs/heads/main/menus.json'
global.thum = 'https://g.top4top.io/p_353640c0q1.png'
global.welcome = "https://i.top4top.io/p_3536fhysp1.png"
global.leave = "https://b.top4top.io/p_3536pdpj41.png"
/*=========== AUDIO ALLMENU ===========*/
// global.vn = 'https://github.com/XM4ZE/DATABASE/raw/master/wallpaper/XMcodes.mp3' // Allmenu audio
global.vn = fs.readFileSync('./mp3/menunya.mp3') 
/*=========== TYPE DOCUMENT ===========*/
global.doc = {
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf: 'application/pdf',
    rtf: 'text/rtf'
}

global.xmyulamd = '@lid'

/*========== HIASAN ===========*/
global.decor = {
	menut: '❏═┅═━〈',
	menub: '┊✦ ',
	menub2: '┊',
	menuf: '┗━═┅═━✦',
	hiasan: '꒦︶꒷︶꒦︶꒷︶꒦︶꒷︶꒦︶꒷︶꒦︶꒷︶꒦︶꒷',

	menut2: '––––––『', 
	menuh: '』––––––',
	menub3: '┊☁︎ ',
	menuf2: '┗━═┅═━––––––๑\n',
	menua: '',
	menus: '✦',

	htki: '––––––『',
	htka: '』––––––',
	haki: '┅━━━═┅═❏',
	haka: '❏═┅═━━━┅',

	lopr: 'Ⓟ',
	lolm: 'Ⓛ',
	htjava: '✧'
}

//'https://telegra.ph/file/f4f24dc6ce5247f6abb6d.png', 'https://telegra.ph/file/754c704194ef0d84c6419.jpg'

global.elainajpg = [
    'https://telegra.ph/file/3e43fcfaea6dc1ba95617.jpg',
    'https://telegra.ph/file/c738a9fc0722a59825cbb.mp4',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg',
    'https://telegra.ph/file/4018167852aef19651f46.jpg'
]
global.flaaa = [
    //'https://flamingtext.com/net-fu/proxy_form.cgi?&imageoutput=true&script=water-logo&script=water-logo&fontsize=90&doScale=true&scaleWidth=800&scaleHeight=500&fontsize=100&fillTextColor=%23000&shadowGlowColor=%23000&backgroundColor=%23000&text=',
    //'https://flamingtext.com/net-fu/proxy_form.cgi?&imageoutput=true&script=crafts-logo&fontsize=90&doScale=true&scaleWidth=800&scaleHeight=500&text=',
    //'https://flamingtext.com/net-fu/proxy_form.cgi?&imageoutput=true&script=amped-logo&doScale=true&scaleWidth=800&scaleHeight=500&text=',
    'https://flamingtext.com/net-fu/proxy_form.cgi?&imageoutput=true&script=sketch-name&doScale=true&scaleWidth=800&scaleHeight=500&fontsize=100&fillTextType=1&fillTextPattern=Warning!&text=',
    'https://flamingtext.com/net-fu/proxy_form.cgi?&imageoutput=true&script=sketch-name&doScale=true&scaleWidth=800&scaleHeight=500&fontsize=100&fillTextType=1&fillTextPattern=Warning!&fillColor1Color=%23f2aa4c&fillColor2Color=%23f2aa4c&fillColor3Color=%23f2aa4c&fillColor4Color=%23f2aa4c&fillColor5Color=%23f2aa4c&fillColor6Color=%23f2aa4c&fillColor7Color=%23f2aa4c&fillColor8Color=%23f2aa4c&fillColor9Color=%23f2aa4c&fillColor10Color=%23f2aa4c&fillOutlineColor=%23f2aa4c&fillOutline2Color=%23f2aa4c&backgroundColor=%23101820&text='
]
global.hwaifu = [
    'https://i.pinimg.com/originals/ed/34/f8/ed34f88af161e6278993e1598c29a621.jpg',
    'https://i.pinimg.com/originals/85/4d/bb/854dbbd30304cd69f305352f0183fad0.jpg',
    'https://i.pinimg.com/originals/32/2c/a4/322ca456fa2cdec4b717895a65adfa8d.jpg',
    'https://i.pinimg.com/originals/f2/dd/cc/f2ddccd5a1b89d2302cf75c6520c58dd.png',
    'https://i.pinimg.com/originals/aa/6b/df/aa6bdf98cbc9e1fc741c36682fa3e838.jpg',
    'https://i.pinimg.com/originals/88/46/88/884688def830c43648f88154836a8b05.jpg',
    'https://i.pinimg.com/originals/57/d9/20/57d920d58533915850b431bd0b8e1f1d.jpg',
    'https://i.pinimg.com/originals/46/ad/05/46ad0505d33a2c2359f84ed9b867a58c.jpg',
    'https://i.pinimg.com/originals/23/b7/fb/23b7fb922770e139a2a57b1a443a2180.jpg',
    'https://i.pinimg.com/originals/46/79/25/467925d52634fd098ab6890a23c33f30.jpg',
    'https://i.pinimg.com/originals/a4/a1/74/a4a1740e565f4205eb3f700e1936e064.jpg',
    'https://i.pinimg.com/originals/f9/8d/2c/f98d2c3f64e50ba6c8efd9fdc7cf0093.png',
    'https://i.pinimg.com/originals/29/a4/b4/29a4b4573f993d7d6abb45843f529892.jpg',
    'https://i.pinimg.com/originals/40/de/84/40de84ce2ee376d8fae8ff5863d6edb0.jpg',
    'https://i.pinimg.com/originals/80/4f/1a/804f1a05f9996c96a2d492b4854b7fd5.jpg'
]

/*============== EMOJI ==============*/
global.rpg = {
    emoticon(string) {
        string = string.toLowerCase()
        let emot = {
            level: '📊',
            limit: '🎫',
            health: '❤️',
            exp: '✨',
            atm: '💳',
            money: '💰',
            bank: '🏦',
            potion: '🥤',
            diamond: '💎',
            common: '📦',
            uncommon: '🛍️',
            mythic: '🎁',
            legendary: '🗃️',
            superior: '💼',
            pet: '🔖',
            trash: '🗑',
            armor: '🥼',
            sword: '⚔️',
            pickaxe: '⛏️',
            fishingrod: '🎣',
            wood: '🪵',
            rock: '🪨',
            string: '🕸️',
            horse: '🐴',
            cat: '🐱',
            dog: '🐶',
            fox: '🦊',
            robo: '🤖',
            petfood: '🍖',
            iron: '⛓️',
            gold: '🪙',
            emerald: '❇️',
            upgrader: '🧰',
            bibitanggur: '🌱',
            bibitjeruk: '🌿',
            bibitapel: '☘️',
            bibitmangga: '🍀',
            bibitpisang: '🌴',
            anggur: '🍇',
            jeruk: '🍊',
            apel: '🍎',
            mangga: '🥭',
            pisang: '🍌',
            botol: '🍾',
            kardus: '📦',
            kaleng: '🏮',
            plastik: '📜',
            gelas: '🧋',
            chip: '♋',
            umpan: '🪱',
            skata: '🧩'
        }
        let results = Object.keys(emot).map(v => [v, new RegExp(v, 'gi')]).filter(v => v[1].test(string))
        if (!results.length) return ''
        else return emot[results[0][0]]
    }
}

//------ JANGAN DIUBAH -----
let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
    unwatchFile(file)
    console.log(chalk.redBright("Update 'config.js'"))
    import(`${file}?update=${Date.now()}`)
})
