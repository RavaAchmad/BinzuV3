import { getDevice } from 'baileys'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let xm4ze = await (await fetch(xmenus)).json()
    let thum = xm4ze[Math.floor(Math.random() * xm4ze.length)]
    let esanan = `*ID Pesanan* yang dipilih tidak tersedia, Silahkan pilih *ID Pesanan* di bawah ini.
      
*— BINZU JOIN GROUP*

*7 Day join the group*
- Harga: Rp. 7.000 IDR
- ID Pesanan: G7

*30 Day join the group*
- Harga: Rp. 15.000 IDR
- ID Pesanan: G30

*60 Day join the group*
- Harga: Rp. 30.000 IDR
- ID Pesanan: G60


*— PREMIUM USER*

*3 Day premium*
- Harga: Rp. 5.000 IDR
- ID Pesanan: 3day

*7 Day premium*
- Harga: Rp. 10.000 IDR
- ID Pesanan: 7day

*30 Day premium*
- Harga: Rp. 20.000 IDR
- ID Pesanan: 30day

*60 Day premium*
- Harga: Rp. 35.000 IDR
- ID Pesanan: 60day


*Example:* ${usedPrefix + command} <ID Pesanan>
*Example:* ${usedPrefix + command} 30day
`;

    // let pesan = `\n> *1.* 30 Day join the group\n> *2.* 3 Day Premium\n> *3.* 30 Day Premium\n\nSilahkan pilih produk kami dengan mengeklik tombol dibawah ini`
    // const sections = [
    // 		[
    // 			'— BINZU JOIN GROUP', [
    // 				['Harga: Rp. 7.000 IDR', '.sewa G7', '7 Day join the group'],
    // 				['Harga: Rp. 15.000 IDR', '.sewa G30', '30 Day join the group'],
    // 				['Harga: Rp. 30.000 IDR', '.sewa G60', '60 Day join the group']
    // 		]], [
    // 			'— PREMIUM USER', [
    // 				['Harga: Rp. 5.000 IDR', '.sewa 3day', '3 Day Premium'],
    // 				['Harga: Rp. 7.000 IDR', '.sewa 7day', '7 Day Premium'],
    // 				['Harga: Rp. 15.000 IDR', '.sewa 30day', '30 Day Premium'],
    // 				['Harga: Rp. 30.000 IDR', '.sewa 60day', '60 Day Premium'],
    // 		]],
    // 	]

    if (!text) return await conn.sendMessage(m.chat, {
        text: esanan,
        contextInfo: {
            forwardingScore: 9999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.info.channel,
                serverMessageId: null,
                newsletterName: global.info.namechannel,
            },
            externalAdReply: {
                title: "SILAHKAN PILIH PESANAN SESUAI ID!",
                body: "",
                thum,
                sourceUrl: "",
                mediaType: 1,
                renderLargerThumbnail: true
            },
        },
    }, {});

    let orderID;

    switch (text) {
        case '3day':
            orderID = '5.000 IDR';
            break;
        case '7day':
            orderID = '10.000 IDR';
            break;
        case '30day':
            orderID = '15.000 IDR';
            break;
        case '60day':
            orderID = '30.000 IDR';
            break;
        case 'G7':
            orderID = '7.000 IDR';
            break;
        case 'G30':
            orderID = '15.000 IDR';
            break;
        case 'G60':
            orderID = '30.000 IDR';
            break;
        default:
            throw `*ID Pesanan* yang dipilih tidak tersedia, Silahkan pilih *ID Pesanan* di bawah ini.
      
*— BINZU JOIN GROUP*

*7 Day join the group*
- Harga: Rp. 7.000 IDR
- ID Pesanan: G7

*30 Day join the group*
- Harga: Rp. 15.000 IDR
- ID Pesanan: G30

*60 Day join the group*
- Harga: Rp. 30.000 IDR
- ID Pesanan: G60


*— PREMIUM USER*

*3 Day premium*
- Harga: Rp. 5.000 IDR
- ID Pesanan: 3day

*7 Day premium*
- Harga: Rp. 10.000 IDR
- ID Pesanan: 7day

*30 Day premium*
- Harga: Rp. 20.000 IDR
- ID Pesanan: 30day

*60 Day premium*
- Harga: Rp. 35.000 IDR
- ID Pesanan: 60day


*Example:* ${usedPrefix + command} <ID Pesanan>
*Example:* ${usedPrefix + command} 30day
`;
    };
    let maximus = `*B I N Z U  O R D E R*\n\n*• Status:* _🟡 Pending_\n*• ID Pembelian:* ${text}\n*• Nominal:* ${orderID}\n*• Payment:* QRIS\n\n\n*TAHAP-TAHAP Pembayaran*\n*1.* Silahkan SCAN QRIS ini dengan M-Banking/E-Wallet kamu\n*2.* Masukan Nominal: ${orderID}\n*3.* Silahkan Kirim bukti pembayaran ke nomor ini wa.me/${global.info.nomorown}`
    conn.sendFile(m.sender, global.qris, 'maxim.jpg', maximus, m)
    conn.reply(m.chat, '✔️ *PESANANMU TELAH DI BUAT*\n\nSaya telah mengirim pembayarannya melalu private chat silahkan di baca dan ikuti tahap-tahap pembayaran. Terimakasih', m)
    conn.reply(global.info.nomorown + '@s.whatsapp.net', `@${m.sender.split('@')[0]} Sedang dalam pembayaran nominal ${orderID}`, m, { contextInfo: { mentionedJid: [m.sender] } })
}
handler.help = ['sewa', 'order']
handler.tags = ['info']
handler.command = /(order|sewa|premium)/i
handler.register = false;
handler.premium = false;

export default handler