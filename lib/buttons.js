/**
 * Baileys Helper Wrapper for BinzuV3
 * Provides interactive buttons, lists, and quick replies
 * Uses baileys_helper npm package
 */

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

let sendButtons, sendInteractiveMessage

try {
  const helper = require('baileys_helper')
  sendButtons = helper.sendButtons
  sendInteractiveMessage = helper.sendInteractiveMessage
} catch (e) {
  console.warn('[buttons] baileys_helper not available, buttons will fallback to text')
}

/**
 * Send quick reply buttons
 * @param {object} conn - Baileys socket
 * @param {string} jid - Chat JID
 * @param {string} text - Body text
 * @param {string} footer - Footer text
 * @param {Array<{id: string, text: string}>} buttons - Quick reply buttons
 * @param {object} [quoted] - Quoted message
 */
export async function quickButtons(conn, jid, text, footer, buttons, quoted) {
  if (!sendButtons) {
    // Fallback: append button labels to text
    let fallback = text + '\n'
    if (footer) fallback += `\n_${footer}_\n`
    buttons.forEach((b, i) => { fallback += `\n${i + 1}. ${b.text}` })
    return conn.sendMessage(jid, { text: fallback }, { quoted })
  }
  try {
    return await sendButtons(conn, jid, {
      text,
      footer,
      buttons: buttons.map(b => ({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id })
      }))
    })
  } catch (e) {
    // Fallback on error
    let fallback = text + '\n'
    if (footer) fallback += `\n_${footer}_\n`
    buttons.forEach((b, i) => { fallback += `\n${i + 1}. ${b.text}` })
    return conn.sendMessage(jid, { text: fallback }, { quoted })
  }
}

/**
 * Send a single_select list menu
 * @param {object} conn - Baileys socket
 * @param {string} jid - Chat JID
 * @param {string} text - Body text
 * @param {string} footer - Footer text
 * @param {string} buttonTitle - Title on the list button
 * @param {Array<{title: string, rows: Array<{id: string, title: string, description?: string}>}>} sections
 */
export async function listMenu(conn, jid, text, footer, buttonTitle, sections) {
  if (!sendInteractiveMessage) {
    // Fallback: render as text
    let fallback = text + '\n'
    if (footer) fallback += `\n_${footer}_\n`
    sections.forEach(sec => {
      fallback += `\n*${sec.title}*\n`
      sec.rows.forEach(r => {
        fallback += `• ${r.title}${r.description ? ' — ' + r.description : ''}\n`
      })
    })
    return conn.sendMessage(jid, { text: fallback })
  }
  try {
    return await sendInteractiveMessage(conn, jid, {
      text,
      footer,
      interactiveButtons: [{
        name: 'single_select',
        buttonParamsJson: JSON.stringify({ title: buttonTitle, sections })
      }]
    })
  } catch (e) {
    let fallback = text + '\n'
    if (footer) fallback += `\n_${footer}_\n`
    sections.forEach(sec => {
      fallback += `\n*${sec.title}*\n`
      sec.rows.forEach(r => {
        fallback += `• ${r.title}${r.description ? ' — ' + r.description : ''}\n`
      })
    })
    return conn.sendMessage(jid, { text: fallback })
  }
}

/**
 * Send mixed buttons (quick_reply + single_select + cta_url etc)
 * @param {object} conn - Baileys socket
 * @param {string} jid - Chat JID
 * @param {object} content - { text, footer, interactiveButtons: [...] }
 */
export async function interactiveMsg(conn, jid, content) {
  if (!sendInteractiveMessage) {
    let fallback = content.text || ''
    if (content.footer) fallback += `\n\n_${content.footer}_`
    return conn.sendMessage(jid, { text: fallback })
  }
  try {
    return await sendInteractiveMessage(conn, jid, content)
  } catch (e) {
    let fallback = content.text || ''
    if (content.footer) fallback += `\n\n_${content.footer}_`
    return conn.sendMessage(jid, { text: fallback })
  }
}

export { sendButtons, sendInteractiveMessage }
