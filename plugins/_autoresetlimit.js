import { proto } from 'baileys'

function decodeLidToJid(sender, conn) {
	if (!conn.storeLid) conn.storeLid = {};

	if (!sender || typeof sender !== "string") return "";

	// Jika sudah format normal, return langsung
	if (sender.endsWith("@s.whatsapp.net")) {
		return sender.decodeJid ? sender.decodeJid() : sender;
	}

	// Jika bukan LID, return as-is
	if (!sender.endsWith("@lid")) {
		return sender;
	}

	// Cek cache terlebih dahulu
	if (conn.storeLid[sender]) {
		return conn.storeLid[sender];
	}

	// Cari di semua chat
	for (let chat of Object.values(conn.chats)) {
		if (!chat.metadata?.participants) continue;
		
		let user = chat.metadata.participants.find(p => 
			p.id === sender || p.lid === sender
		);
		
		if (user?.jid && user.jid.endsWith("@s.whatsapp.net")) {
			const jid = user.jid.decodeJid ? user.jid.decodeJid() : user.jid;
			conn.storeLid[sender] = jid;
			return jid;
		}
	}

	// Fallback: coba konversi dari LID ke format normal
	try {
		const number = sender.split('@')[0];
		if (number && /^\d+$/.test(number)) {
			const fallbackJid = number + '@s.whatsapp.net';
			conn.storeLid[sender] = fallbackJid;
			return fallbackJid;
		}
	} catch (error) {
		console.error('Error converting LID:', error);
	}

	return sender;
}

export async function all(m) {
	let setting = global.db.data.settings[this.user.jid]
	if (setting.resetlimit) {
		if (new Date() * 1 - setting.resetlimitDB > 86400000) {
			let list = Object.entries(global.db.data.users);
			let lim = 3;
			list.map(([user, data], i) => (Number(data.limit = lim)));

			const msg = {
				conversation: `\`[ Reset Limit Notification ]\`\n\n* *Bot Name:* ${this.getName(this.user.jid)}\n* *Bot Number:* ${this.user.jid.split("@")[0]}\n* *Reset Status:* Sukses\n* *Reset Limit:* ${lim} / Users\n* *Total Reset:* ${Object.keys(db.data.users).length} Users\n\n> *Notes:* Limit di reset setiap hari`
			};
			
			const plaintext = proto.Message.encode(msg).finish();
			const plaintextNode = {
				tag: 'plaintext',
				attrs: {},
				content: plaintext,
			};
			
			const decodedChannel = decodeLidToJid(global.info.channel, this);
			
			const node = {
				tag: 'message',
				attrs: {
					to: decodedChannel,
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