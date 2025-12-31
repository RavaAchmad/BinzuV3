import { proto } from 'baileys'

export async function all(m) {
	let setting = global.db.data.settings[this.user.jid]
	if (setting.resetlimit) {
		if (new Date() * 1 - setting.resetlimitDB > 86400000) {
			let list = Object.entries(global.db.data.users);
			let lim = 10;
			let resetCount = 0; // Counter untuk yang di-reset
			let skipCount = 0; // Counter untuk yang di-skip
			
			// Reset limit hanya untuk user yang limitnya <= 5
			list.map(([user, data], i) => {
				if (Number(data.limit) <= 5) {
					data.limit = lim;
					resetCount++;
				} else {
					skipCount++;
				}
			});

			// SOLUSI: Convert LID ke PN (Phone Number JID) menggunakan getPNForLID
			const lidMapping = this.signalRepository?.lidMapping;
			let targetJid = global.info.channel;
			
			// Jika channel adalah LID, convert ke PN
			if (targetJid.includes('@lid') && lidMapping) {
				const pn = await lidMapping.getPNForLID(targetJid);
				if (pn) {
					targetJid = pn; // Gunakan PN jika tersedia
				}
			}

			const msg = {
				conversation: `\`[ Reset Limit Notification ]\`\n\n* *Bot Name:* ${this.getName(this.user.jid)}\n* *Bot Number:* ${this.user.jid.split("@")[0]}\n* *Reset Status:* Sukses\n* *Reset Limit:* ${lim} / Users\n* *Total Users:* ${Object.keys(db.data.users).length} Users\n* *Users Di-Reset:* ${resetCount} Users\n* *Users Di-Skip:* ${skipCount} Users (limit > 5)\n\n> *Notes:* Limit di reset setiap hari (kecuali user dengan limit > 5)`
			};
			
			const plaintext = proto.Message.encode(msg).finish();
			const plaintextNode = {
				tag: 'plaintext',
				attrs: {},
				content: plaintext,
			};
			const node = {
				tag: 'message',
				attrs: {
					to: targetJid, // Gunakan targetJid yang sudah di-convert
					type: 'text'
				},
				content: [plaintextNode],
			};

			conn.query(node);
			setting.resetlimitDB = new Date() * 1
		}
	}
	return !0
}