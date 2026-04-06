import axios from 'axios';

let handler = async (m, { args, usedPrefix, command }) => {
    if (!args[0]) throw `*Contoh:* ${usedPrefix}${command} Jakarta`
    try {
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${args.join(' ')}&units=metric&appid=060a6bcfa19809c2cd4d97a212b19273`)
        const r = response.data
        const wea = `「 📍 」 Place: ${r.name}\n「 🗺️ 」 Country: ${r.sys.country}\n「 🌤️ 」 Weather: ${r.weather[0].description}\n「 🌡️ 」 Temperature: ${r.main.temp}°C\n「 💠 」 Min Temp: ${r.main.temp_min}°C\n「 📛 」 Max Temp: ${r.main.temp_max}°C\n「 💦 」 Humidity: ${r.main.humidity}%\n「 🌬️ 」 Wind: ${r.wind.speed} km/h`
        m.reply(wea)
    } catch (e) {
        m.reply('❌ Lokasi tidak ditemukan!')
    }
}

handler.help = ['weather <location>']
handler.tags = ['tools']
handler.command = /^(weather|cuaca)$/i
handler.limit = true
handler.register = true

export default handler
