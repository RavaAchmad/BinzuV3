/**
 * Interactive message wrapper for BinzuV3.
 * Tries baileys_helper when available, then falls back to native Baileys
 * nativeFlow interactive messages instead of plain text.
 */

import { createRequire } from 'module'
import { generateWAMessageFromContent, prepareWAMessageMedia } from 'baileys'

const require = createRequire(import.meta.url)

let sendButtons
let sendInteractiveMessage
let helperDisabled = false

try {
  let helper = require('baileys_helper')
  helper = helper?.default || helper
  sendButtons = helper?.sendButtons
  sendInteractiveMessage = helper?.sendInteractiveMessage
} catch (requireError) {
  try {
    let helper = await import('baileys_helper')
    helper = helper?.default || helper
    sendButtons = helper?.sendButtons
    sendInteractiveMessage = helper?.sendInteractiveMessage
  } catch {
    console.warn('[buttons] baileys_helper not available, using native Baileys interactive fallback')
  }
}

export async function quickButtons(conn, jid, text, footer, buttons, quoted) {
  const content = {
    title: '',
    text,
    footer,
    buttons: buttons.map(button => ({ id: button.id, text: button.text }))
  }

  if (sendButtons) {
    try {
      return await sendButtons(conn, jid, content, quoted)
    } catch (e) {
      disableHelperIfMissingInternals(e)
      if (!helperDisabled) console.warn('[buttons] sendButtons failed, using native fallback:', e?.message || e)
    }
  }

  return sendNativeInteractive(conn, jid, content, quoted)
}

export async function listMenu(conn, jid, text, footer, buttonTitle, sections, quoted) {
  return interactiveMsg(conn, jid, {
    text,
    footer,
    interactiveButtons: [{
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
        title: buttonTitle,
        sections: normalizeSections(sections)
      })
    }]
  }, quoted)
}

export async function interactiveMsg(conn, jid, content = {}, quoted, options = {}) {
  const nativeContent = normalizeContent(content)

  if (sendInteractiveMessage && !helperDisabled) {
    try {
      return await sendInteractiveMessage(conn, jid, nativeContent, quoted)
    } catch (e) {
      disableHelperIfMissingInternals(e)
      if (!helperDisabled) console.warn('[buttons] sendInteractiveMessage failed, using native fallback:', e?.message || e)
    }
  }

  try {
    return await sendNativeInteractive(conn, jid, nativeContent, quoted, options)
  } catch (e) {
    console.warn('[buttons] native interactive failed, using text fallback:', e?.message || e)
    return sendTextFallback(conn, jid, nativeContent, quoted)
  }
}

export function getButtonsDebugInfo() {
  return {
    helperLoaded: Boolean(sendButtons || sendInteractiveMessage),
    helperDisabled,
    hasSendButtons: Boolean(sendButtons),
    hasSendInteractiveMessage: Boolean(sendInteractiveMessage),
    fallbackMode: helperDisabled || !sendInteractiveMessage ? 'native_or_text' : 'helper_first'
  }
}

async function sendNativeInteractive(conn, jid, content = {}, quoted, options = {}) {
  const buttons = normalizeButtons(content.interactiveButtons || content.buttons || [])
  if (!buttons.length) return sendTextFallback(conn, jid, content, quoted)

  const header = await buildHeader(conn, content)
  const interactiveMessage = {
    body: { text: String(content.text || '') },
    footer: { text: String(content.footer || '') },
    header,
    nativeFlowMessage: {
      buttons,
      messageParamsJson: ''
    },
    contextInfo: normalizeContextInfo(content)
  }

  const msg = generateWAMessageFromContent(jid, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2
        },
        interactiveMessage
      }
    }
  }, {
    userJid: conn.user?.jid || conn.user?.id,
    quoted
  })

  return conn.relayMessage(jid, msg.message, {
    messageId: msg.key.id,
    ...options
  })
}

async function buildHeader(conn, content = {}) {
  const header = {
    title: String(content.title || ''),
    subtitle: String(content.subtitle || ''),
    hasMediaAttachment: false
  }

  if (!content.image && !content.video) return header

  try {
    const media = content.video
      ? await prepareWAMessageMedia({ video: content.video }, { upload: conn.waUploadToServer })
      : await prepareWAMessageMedia({ image: content.image }, { upload: conn.waUploadToServer })
    return {
      ...header,
      ...media,
      hasMediaAttachment: true
    }
  } catch (e) {
    console.warn('[buttons] media header failed:', e?.message || e)
    return header
  }
}

function normalizeContent(content = {}) {
  return {
    ...content,
    interactiveButtons: normalizeButtons(content.interactiveButtons || content.buttons || []),
    contextInfo: normalizeContextInfo(content)
  }
}

function normalizeButtons(buttons = []) {
  return buttons
    .map(button => {
      if (!button) return null
      if (button.name && button.buttonParamsJson) {
        if (button.name === 'single_select') {
          const params = safeJson(button.buttonParamsJson)
          return {
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: params.title || 'Pilih',
              sections: normalizeSections(params.sections || [])
            })
          }
        }
        return {
          name: button.name,
          buttonParamsJson: button.buttonParamsJson
        }
      }

      if (button.url) {
        return {
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({
            display_text: button.text || button.title || 'Buka',
            url: button.url,
            merchant_url: button.url
          })
        }
      }

      if (button.id || button.text || button.title) {
        return {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: button.text || button.title || button.id,
            id: button.id || button.text || button.title
          })
        }
      }

      return null
    })
    .filter(Boolean)
}

function normalizeSections(sections = []) {
  return sections.map(section => ({
    title: String(section.title || ''),
    highlight_label: section.highlight_label || '',
    rows: (section.rows || []).map(row => ({
      header: String(row.header || ''),
      title: String(row.title || row.id || ''),
      id: String(row.id || row.title || ''),
      description: String(row.description || '')
    }))
  }))
}

function normalizeContextInfo(content = {}) {
  const contextInfo = { ...(content.contextInfo || {}) }
  const mentionedJid = content.mentions || contextInfo.mentionedJid
  if (mentionedJid?.length) contextInfo.mentionedJid = mentionedJid.filter(Boolean)
  return contextInfo
}

function safeJson(json) {
  try {
    return JSON.parse(json)
  } catch {
    return {}
  }
}

function sendTextFallback(conn, jid, content = {}, quoted) {
  const contextInfo = normalizeContextInfo(content)
  return conn.sendMessage(jid, {
    text: String(content.text || ''),
    contextInfo
  }, { quoted })
}

function disableHelperIfMissingInternals(error) {
  const message = String(error?.message || error || '')
  if (!/Missing baileys internals/i.test(message)) return
  helperDisabled = true
  sendButtons = null
  sendInteractiveMessage = null
}

export { sendButtons, sendInteractiveMessage }
