// ref-before.js
// export function before(m, { isAdmin, isBotAdmin }) { ... }
// This should be registered as handler.before in your bot system per your framework.

export async function before(m, { conn }) {
  try {
    // ignore messages from bot itself
    if (m.isBaileys && m.fromMe) return true

    const pending = global.db.data.pendingRefs = global.db.data.pendingRefs || {}
    const users = global.db.data.users = global.db.data.users || {}

    // Quick exit: nothing pending
    if (!Object.keys(pending).length) return true

    // We only care about events in the target group
    const GROUP_JID = '6281371753464-1592310529@g.us'
    // If message is not in group, ignore (but still return true so normal handlers run)
    if (!m.isGroup) return true
    if (m.chat !== GROUP_JID) return true

    const now = Date.now()

    // COMMON CASES: detect join system messages
    // Different WA libs/versions expose join info differently.
    // We'll try common patterns:
    // 1) messageStubType / protocolMessage / groupInviteMessage variations
    // 2) simple textual notifications that contain "joined using this group's invite link"
    // 3) fallback: check m.message?.groupParticipants (some frameworks)
    // We'll normalize a list of candidate joined jids, then cross-check pending list.

    const joinedJids = new Set()

    // Case A: protocolMessage - some implementations for participant add use protocolMessage or messageStubType
    try {
      const proto = m.message?.protocolMessage
      if (proto && proto.type === 8 /* 8 sometimes = GROUP_PARTICIPANT_ADD */) {
        // not always available, included just in case
        (proto.participant || []).forEach(j => joinedJids.add(j))
      }
    } catch (e) { /* ignore */ }

    // Case B: check text body for 'joined using this group's invite link' phrase (english) or 'joined' (basic)
    try {
      const text = (m.text || m.message?.conversation || '') + ''
      if (text && (/joined using this group's invite link/i).test(text)) {
        // some clients include the jid inside the message contextInfo or mention list
        const mentions = m.mentionedJid || (m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [])
        mentions.forEach(j => joinedJids.add(j))
      } else if (text && /joined/i.test(text)) {
        // crude fallback: sometimes the message literally is "X joined"
        const mentions = m.mentionedJid || (m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [])
        mentions.forEach(j => joinedJids.add(j))
      }
    } catch (e) { /* ignore */ }

    // Case C: some libs attach an array like m.message?.groupParticipants?.added or m.message?.action
    try {
      const gp = m.message?.groupParticipants || m.message?.participant || m.message?.action
      if (Array.isArray(gp)) gp.forEach(x => joinedJids.add(x))
      // also check contextInfo.participant if present
      const part = m.message?.extendedTextMessage?.contextInfo?.participant
      if (part) joinedJids.add(part)
    } catch (e) { /* ignore */ }

    // If joinedJids still empty, try to parse "sender" as the newly joined (heuristic)
    if (!joinedJids.size) {
      // Some system messages set key.participant for join; let's try it
      try {
        if (m.key && m.key.participant) joinedJids.add(m.key.participant)
      } catch (e) { /* ignore */ }
    }

    if (!joinedJids.size) {
      // Nothing to process here
      return true
    }

    // Now for each joined jid, check if there's a pending ref (they must have initiated .ref to bot earlier)
    for (const jid of Array.from(joinedJids)) {
      if (!pending[jid]) continue
      const p = pending[jid]

      // expired?
      if (p.expiresAt <= now) {
        // remove expired
        delete pending[jid]
        // notify owner about expiration (optional)
        await conn.sendMessage('6281212035575@s.whatsapp.net', { text: `Expired pending ref: ${jid} -> ${p.refCreator}` })
        continue
      }

      // group must match
      if (p.group !== m.chat) {
        // not the correct group
        continue
      }

      // not used yet?
      if (p.used) {
        // ignore duplicates
        continue
      }

      // all good -> grant rewards
      const refCreator = p.refCreator
      const referee = jid

      // safety: ensure user records exist
      users[referee] = users[referee] || {}
      users[refCreator] = users[refCreator] || {}

      const R = users[referee]
      const C = users[refCreator]

      // init fields
      R.exp = Number(R.exp || 0)
      R.premiumTime = Number(R.premiumTime || 0)
      R.ref_used = Boolean(R.ref_used || false)
      C.exp = Number(C.exp || 0)
      C.ref_count = Number(C.ref_count || 0)
      C.bonusClaimed = Array.isArray(C.bonusClaimed) ? C.bonusClaimed : []
      C.premiumTime = Number(C.premiumTime || 0)

      // if referee already used a ref before, skip (defensive)
      if (R.ref_used) {
        // mark used anyway and remove pending
        delete pending[jid]
        continue
      }

      // increment ref_count for creator
      C.ref_count = C.ref_count + 1

      // milestone bonus check
      const milestoneKey = Object.keys(XP_BONUS).map(Number).find(n => C.ref_count === n)
      const milestoneBonus = milestoneKey && !C.bonusClaimed.includes(milestoneKey) ? XP_BONUS[milestoneKey] : 0
      if (milestoneBonus) C.bonusClaimed.push(milestoneKey)

      // reward XP
      R.exp += XP_FIRST_TIME
      C.exp += XP_LINK_CREATOR + (milestoneBonus || 0)

      // reward premium:
      const now2 = Date.now()
      // referee gets 1 day
      R.premiumTime = R.premiumTime && R.premiumTime > now2 ? R.premiumTime + ONE_DAY : now2 + ONE_DAY
      // creator gets 1 day (stackable)
      C.premiumTime = C.premiumTime && C.premiumTime > now2 ? C.premiumTime + ONE_DAY : now2 + ONE_DAY

      // mark referee as used
      R.ref_used = true

      // mark pending used & delete
      p.used = true
      delete pending[jid]

      // notify referee (in private if possible)
      try {
        await conn.sendMessage(referee, {
          text: `🎉 Selamat! Kamu berhasil join grup official.\n+${XP_FIRST_TIME} XP\n+1 hari premium telah diberikan.`
        })
      } catch (e) { /* ignore send error */ }

      // notify creator
      try {
        let notifyText = `🔥 Kode referral kamu baru dipakai oleh ${referee}!\n+${XP_LINK_CREATOR} XP` +
          (milestoneBonus ? ` (+${milestoneBonus} XP bonus milestone)` : '') +
          `\nTotal referral: ${C.ref_count}\nKamu juga mendapat +1 hari premium.`
        const next = Object.keys(XP_BONUS).map(Number).sort((a,b)=>a-b).find(n => C.ref_count < n)
        if (next) notifyText += `\nNext bonus di ${next} orang (+${XP_BONUS[next]} XP)`
        await conn.sendMessage(refCreator, { text: notifyText })
      } catch (e) { /* ignore */ }

      // notify group
      try {
        await conn.sendMessage(m.chat, { text: `🔔 ${referee.split('@')[0]} bergabung menggunakan kode referral! Dua-duanya menerima reward.` })
      } catch (e) { /* ignore */ }

      // notify owner
      try {
        await conn.sendMessage('6281212035575@s.whatsapp.net', { text: `Referral success: ${referee} used ${refCreator}'s code. Rewards applied.` })
      } catch (e) { /* ignore */ }
    }

    // done; continue normal processing
    return true
  } catch (err) {
    // don't block bot if something goes wrong; log for debug
    console.error('ref-before error', err)
    return true
  }
}

/*
IMPORTANT:
- Depending on Baileys / WhatsApp library version, you might instead need to listen on:
  conn.ev.on('group-participants.update', async (update) => { ... })
  where update.action === 'add' and update.participants is an array of jids.
  If your framework exposes that, prefer that event (more reliable).
- This before() attempts to be compatible by checking several message shapes, but please
  test in your env and adjust detection logic if join events appear differently.
*/
