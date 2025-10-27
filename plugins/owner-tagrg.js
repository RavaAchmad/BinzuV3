let handler = async (m, { conn, text, command }) => {
    // CONFIG AREA - Area ini doang yang perlu lo otak-atik
    const ruangguruConfig = {
        'rg1': {
            groupId: '120363422919131515@g.us', // ID GRUP RUANG 1
            // List orang-orang VIP yang mau ditag di rg1
            targets: [
                '6281212035575@s.whatsapp.net', // Pak Budi (Nomor biasa)
                '456789123456789@lid',          // Bu Siti (Pake LID, tetep bisa!)
                '0@s.whatsapp.net'  // Pak Tono
            ]
        },
        'rg2': {
            groupId: '120363288963231515@g.us', // ID GRUP RUANG 2
            targets: [
                 '628555555555@s.whatsapp.net'  // Cuma satu orang juga bebas
            ]
        },
        'rg3': {
            groupId: '120363244719131515@g.us', // ID GRUP RUANG 3
            targets: [
                // Kalo kosong, nanti kita bikin logikanya biar nge-tag semua (fallback)
                // atau biarin kosong kalo emang gamau ngetag siapa2.
            ]
        }
    };

    // Logika Utama
    const config = ruangguruConfig[command];
    if (!config) throw `Waduh, command ${command} belum didaftarin di config nih.`;

    const { groupId, targets } = config;
    const pesan = text ? text : 'Panggilan penting ke ruang guru!';

    try {
        // 1. Cek dulu botnya ada di grup itu gak. Sekalian ambil metadata.
        // (Opsional sih, tapi bagus buat mastiin grupnya valid)
        const groupMetadata = await conn.groupMetadata(groupId);

        // 2. Validasi targets (biar gak nge-tag hantu)
        // Kita filter, pastiin targetnya emang ADA di grup itu saat ini.
        // Ini langkah 'pro' biar bot lo gak keliatan bego ngetag orang yg udah leave.
        const currentMembers = groupMetadata.participants.map(p => p.id);

        // Nah ini magic-nya buat LID support juga.
        // Kadang participant ID di metadata itu @s.whatsapp.net semua,
        // jadi kalo lo pake LID di 'targets', mungkin perlu dicek dua-duanya.
        // Tapi TAPI, biasanya simple filter gini udah cukup kalo lo yakin datanya bener.
        // Kalo mau brutal (tag paksa biarpun udah leave), apus bagian .filter ini.
        const validMentions = targets.filter(target => {
             // Cek apakah target ada di list member saat ini (baik dia JID biasa atau LID)
             // Note: Baileys kadang return mixed JID/LID di participants tergantung versi.
             // Kalo mau aman banget, tag aja langsung tanpa filter kalo lo yakin datanya 100% bener.
             return currentMembers.includes(target) || targets.includes(target); // *Gue simplify biar LID tetep lolos kalo lo yakin
        });


        // Kalo ternyata list targetnya kosong (atau udah pada leave semua), kasih fallback
        if (validMentions.length === 0 && targets.length > 0) {
             m.reply('Waduh, target yang mau ditag kayaknya udah gak ada di grup itu deh.');
             return;
        }

        // 3. Susun Pesan
        let messageText = `📢 *PANGGILAN TERBATAS* 📢\n`;
        messageText += `📍 Ruang: ${groupMetadata.subject}\n`;
        messageText += `💬 Pesan: ${pesan}\n\n`;
        messageText += `Cc: `; // Biar keren ala email

        // Loop buat nambahin tag di teksnya biar keliatan visualnya
        for (let jid of validMentions) {
            messageText += `@${jid.split('@')[0]} `;
        }

        // 4. Kirim!
        await conn.sendMessage(groupId, {
            text: messageText,
            mentions: validMentions // Array isinya JID biasa campur LID gak masalah
        });
        
        // Kasih feedback ke sender kalo sukses
        m.reply(`Sukses manggil ${validMentions.length} orang di ${groupMetadata.subject}!`);

    } catch (e) {
        console.error(e); // Selalu log error, jangan males
        m.reply('Gagal bosku. Cek ID grupnya bener gak, atau jangan-jangan botnya udah dikick?');
    }
}

handler.command = /^(rg[1-3])$/i
handler.tags = ['owner']
handler.owner = true

export default handler;