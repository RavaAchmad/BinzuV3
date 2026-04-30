import { interactiveMsg } from '../buttons.js'
import { handleRpgService, isTextRpgSubcommand } from './rpg.service.js'

export { isTextRpgSubcommand }

export async function handleTextRpgCommand(m, { conn, args = [], usedPrefix = '.', text = '' } = {}) {
  const userName = await Promise.resolve(conn.getName(m.sender)).catch(() => m.sender.split('@')[0])
  const parsedArgs = Array.isArray(args) && args.length ? args : String(text || '').trim().split(/\s+/).filter(Boolean)
  const result = await handleRpgService({
    db: global.db,
    userId: m.sender,
    userName,
    args: parsedArgs,
    prefix: usedPrefix
  })

  if (result.buttons?.length) {
    try {
      return await interactiveMsg(conn, m.chat, {
        text: withFallback(result.text, result.buttons, usedPrefix),
        footer: result.footer || 'RPG',
        interactiveButtons: result.buttons,
        mentions: [m.sender]
      }, m)
    } catch (error) {
      console.warn('[text-rpg] interactive failed:', error?.message || error)
    }
  }

  return conn.sendMessage(m.chat, {
    text: result.text,
    contextInfo: { mentionedJid: [m.sender] }
  }, { quoted: m })
}

function withFallback(text, buttons, prefix) {
  const ids = []
  for (const button of buttons || []) {
    try {
      const params = JSON.parse(button.buttonParamsJson || '{}')
      if (params.id) ids.push(params.id)
      for (const section of params.sections || []) {
        for (const row of section.rows || []) if (row.id) ids.push(row.id)
      }
    } catch {}
  }

  const unique = [...new Set(ids)].slice(0, 8)
  if (!unique.length) return text
  return [
    text,
    '',
    'Tombol tidak muncul? Ketik:',
    ...unique.map((id, index) => `${index + 1}. ${id.startsWith(prefix) ? id : `${prefix}${id}`}`)
  ].join('\n')
}
