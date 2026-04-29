import { getParticipantJids, jidEqual } from '../lib/jid-helper.js'

let handler = async (m, { conn, usedPrefix, participants }) => {
  conn.level = global.db.data.users[m.sender]
  conn.fight = conn.fight ? conn.fight : {}
  const delay = time => new Promise(res=>setTimeout(res,time));

  if (typeof conn.fight[m.sender] != "undefined" && conn.fight[m.sender] == true) return m.reply(`*Tidak bisa melakukan pertarungan lagi karena anda sedang bertarung bro.*`)

  let users = getParticipantJids(participants || [], conn)
    .filter(u => !jidEqual(u, m.sender, conn) && typeof global.db.data.users[u] !== "undefined")
  if (!users.length) return m.reply('Belum ada lawan terdaftar yang bisa diajak fighting.')

  var lawan = users[Math.floor(users.length * Math.random())]
  const senderName = await conn.getName(m.sender)
  const opponentName = await conn.getName(lawan)

  let lamaPertarungan = getRandom(5,10)

  m.reply(`*Kamu* (level ${global.db.data.users[m.sender].level}) menantang *${opponentName}* (level ${global.db.data.users[lawan].level}) dan sedang dalam pertarungan sengit.\n\nTunggu ${lamaPertarungan} menit lagi dan lihat siapa yg menang.`)

  conn.fight[m.sender] = true

  await delay(1000 * 60 * lamaPertarungan)

  let alasanKalah = ['Noob','Cupu','Kurang hebat','Ampas kalahan','Gembel kalahan']
  let alasanMenang = ['Hebat','Pro','Master Game','Legenda game','Sangat Pro','Rajin Nge-push']

  let kesempatan = []
  for (let i = 0; i < global.db.data.users[m.sender].level; i++) kesempatan.push(m.sender)
  for (let i = 0; i < global.db.data.users[lawan].level; i++) kesempatan.push(lawan)

  let pointPemain = 0
  let pointLawan = 0
  for (let i = 0; i < 10; i++){
    let unggul = getRandom(0,kesempatan.length-1)
    if (kesempatan[unggul] == m.sender) pointPemain += 1
    else pointLawan += 1
  }

  if (pointPemain > pointLawan){
    let hadiah = (pointPemain - pointLawan) * 10000
    global.db.data.users[m.sender].money += hadiah
    global.db.data.users[m.sender].limit += 1
    m.reply(`*${senderName}* [${pointPemain * 10}] - [${pointLawan * 10}] *${opponentName}*\n\n*Kamu* (level ${global.db.data.users[m.sender].level}) MENANG melawan *${opponentName}* (level ${global.db.data.users[lawan].level}) karena kamu ${alasanMenang[getRandom(0,alasanMenang.length-1)]}\n\nHadiah Rp. ${hadiah.toLocaleString()}\n+1 Limit`)
  }else if (pointPemain < pointLawan){
    let denda = (pointLawan - pointPemain) * 100000
    global.db.data.users[m.sender].money -= denda
    global.db.data.users[m.sender].limit += 1
    m.reply(`*${senderName}* [${pointPemain * 10}] - [${pointLawan * 10}] *${opponentName}*\n\n*Kamu* (level ${global.db.data.users[m.sender].level}) KALAH melawan *${opponentName}* (level ${global.db.data.users[lawan].level}) karena kamu ${alasanKalah[getRandom(0,alasanKalah.length-1)]}\n\nUang kamu berkurang Rp. ${denda.toLocaleString()}\n+1 Limit`)
  }else {
    m.reply(`*${senderName}* [${pointPemain * 10}] - [${pointLawan * 10}] *${opponentName}*\n\nHasil imbang kak, ga dapet apa apa 😂`)
  }

  delete conn.fight[m.sender]
}
handler.help = ['fighting']
handler.tags = ['game']
handler.command = /^(fight(ing)?)$/i
handler.register = true
handler.group = true

export default handler;

function getRandom(min,max){
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random()*(max-min+1)) + min
}
