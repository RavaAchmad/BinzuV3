import { toStickerImage } from '../lib/converter.js'

let handler = async (m, { conn, command, usedPrefix }) => {
	if (m.quoted?.viewOnce) return;
	let sendSticker = async (media, isImage = true) => {
		m.reply(wait);
		const optionsimg = {
			packname: info.namebot,
			author: info.nameown,
			isAnimated: false
		};
		
		const optionsvid = {
			packname: info.namebot,
			author: info.nameown,
			isAnimated: true
		};
		
		try {
			if (isImage) {
				// Resize image to optimal sticker size (512x512)
				const resizedMedia = await toStickerImage(media, 'png');
				await conn.sendStickerImage(m.chat, resizedMedia.data, m, optionsimg);
				await resizedMedia.delete();
			} else {
				// Video dibiarkan original, tanpa resize
				await conn.sendStickerVideo(m.chat, media, m, optionsvid);
			}
		} catch (error) {
			throw new Error(`Gagal membuat stiker: ${error.message}`);
		}
	};
	let q = m.quoted ? m.quoted : m;
	let mime = (q.msg || q).mimetype || "";
	if (/image|jpeg|png/.test(mime)) {
		let media = await q.download();
  await sendSticker(media, true);
	} else if (/video|mp4/.test(mime)) {
		if ((q.msg || q).seconds > 15) return m.reply("*DURASI MAKSIMAL 15 DETIK*");
		let media = await q.download();
		await sendSticker(media, false);
	} else {
		throw `*SUNDA?*`
	}
};

handler.help = ["s", "stiker", "sticker"];
handler.command = /^(s|stiker|sticker)$/i;
handler.tags = ["sticker"];
handler.sewa = true;

export default handler;