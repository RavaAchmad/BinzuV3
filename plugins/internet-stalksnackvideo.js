import fetch from 'node-fetch';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Contoh:\n${usedPrefix + command} jokowi`
    try {
        let res = await (await fetch(`https://api.botcahx.eu.org/api/stalk/snackvideo?username=${text}&apikey=${btc}`)).json()
        
        if (res.status && res.result) {
            let { name, username, id, likes, followers, posts, profile_picture, profile_url } = res.result;
            
            let capt = `乂 *S N A C K V I D E O   S T A L K*\n\n`;
            capt += `◦ *ID* : ${id}\n`;
            capt += `◦ *Name* : ${name}\n`;
            capt += `◦ *Username* : ${username}\n`;
            capt += `◦ *Followers* : ${followers}\n`;
            capt += `◦ *Likes* : ${likes}\n`;
            capt += `◦ *Posts* : ${posts}\n`;
            capt += `◦ *URL* : ${profile_url}\n`;
            
            let profileThumb = Buffer.alloc(0);
            try {
              const { data } = await conn.getFile(profile_picture, true);
              profileThumb = data;
            } catch (thumbErr) {
              console.log('SnackVideo thumbnail fetch failed:', thumbErr.message);
              if (global.thum) {
                try {
                  const { data } = await conn.getFile(global.thum, true);
                  profileThumb = data;
                } catch (e) {
                  profileThumb = Buffer.alloc(0);
                }
              }
            }
            return conn.relayMessage(m.chat, {
                extendedTextMessage: {
                    text: capt, 
                    contextInfo: {
                        externalAdReply: {
                            title: ('Profile ' + username).toUpperCase(),
                            mediaType: 1,
                            previewType: 0,
                            renderLargerThumbnail: true,
                            thumbnail: profileThumb,
                            sourceUrl: profile_url
                        }
                    }, mentions: [m.sender]
                }
            }, {})
        } else {
            throw 'Profile tidak ditemukan!'
        }
    } catch (e) {
        m.reply('Sistem Sedang Bermasalah!')
    }
}

handler.help = ['snackvideostalk'];
handler.tags = ['internet'];
handler.command = /^(snackvideostalk|snackstalk)$/i
handler.limit = true;

export default handler;
