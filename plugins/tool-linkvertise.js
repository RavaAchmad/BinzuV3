import crypto from 'crypto'
import fetch from 'node-fetch'
import { HttpsProxyAgent } from 'https-proxy-agent'

const GQL_ENDPOINT = 'https://publisher.linkvertise.com/graphql'
const BASE_URL = 'https://linkvertise.com'

const generateActionId = () =>
  `${crypto.randomUUID()}${crypto.randomBytes(16).toString('hex')}${crypto.randomBytes(16).toString('hex')}`
const generateRequestId = () => crypto.randomBytes(16).toString('hex')

function randomIp() {
  const ranges = [
    () => [rand(1, 126), rand(0, 255), rand(0, 255), rand(1, 254)],
    () => [rand(128, 191), rand(0, 255), rand(0, 255), rand(1, 254)],
    () => [rand(192, 223), rand(0, 255), rand(0, 255), rand(1, 254)],
  ]
  return ranges[Math.floor(Math.random() * ranges.length)]().join('.')
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function spoofHeaders(referer) {
  const ip = randomIp()
  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0',
  ]
  return {
    'Content-Type': 'application/json',
    'User-Agent': uas[Math.floor(Math.random() * uas.length)],
    'Origin': BASE_URL,
    'Referer': referer,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'X-Forwarded-For': ip,
    'X-Real-IP': ip,
    'CF-Connecting-IP': ip,
    'True-Client-IP': ip,
    'X-Originating-IP': ip,
    'X-Client-IP': ip,
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function gqlCall(op, variables, query, referer, extra = {}, agent = null) {
  const body = JSON.stringify({ operationName: op, variables, query })
  const headers = { ...spoofHeaders(referer), ...extra }
  const opts = { method: 'POST', headers, body }
  if (agent) opts.agent = agent

  const res = await fetch(GQL_ENDPOINT, opts)
  const text = await res.text()
  if (text.trimStart().startsWith('<')) throw new Error('Blocked (HTML response), coba lagi nanti')
  const json = JSON.parse(text)
  if (json.errors?.length) throw new Error(json.errors[0]?.message || 'GraphQL error')
  return json
}

async function bypassLinkvertise(inputUrl, proxyUrl) {
  const match = inputUrl.match(/linkvertise\.com\/(?:access\/)?(\d+)\/([A-Za-z0-9_-]+)/)
  if (!match) throw new Error('URL Linkvertise tidak valid!\nFormat: https://linkvertise.com/USER_ID/LINK_CODE')

  const userId = match[1]
  const linkCode = match[2]
  const reqId = generateRequestId()
  const referer = `${BASE_URL}/access/${userId}/${linkCode}`

  let agent = null
  if (proxyUrl) {
    agent = new HttpsProxyAgent(proxyUrl)
  }

  const identifier = { userIdAndUrl: { url: linkCode, user_id: userId } }

  // 1) Fetch link info
  const linkData = await gqlCall('getLinkByIdentifier', { identifier }, `
    query getLinkByIdentifier($identifier: PublicLinkIdentificationInput!) {
      linkByIdentifier(linkIdentificationInput: $identifier) {
        id title target_type target_host url is_premium_only
        publisher { id name subscriber_count }
      }
    }
  `, referer, {}, agent)

  const linkInfo = linkData?.data?.linkByIdentifier
  if (!linkInfo) throw new Error('Link tidak ditemukan atau sudah expired')

  // 2) Solve tasks
  for (let i = 0; i < 15; i++) {
    const actionId = generateActionId()
    const contentData = await gqlCall('getContent', {
      identifier,
      action_id: actionId,
    }, `
      query getContent($identifier: PublicLinkIdentificationInput!, $action_id: String) {
        getContent(input: $identifier, action_id: $action_id) {
          ... on ContentAccessTaskSet {
            __typename
            tasks {
              __typename id status
              ... on PremiumTask { status }
              ... on WaitTask { remainingWaitingTime status }
              ... on AdTask { adIndex adsTotal ads { countdown } }
            }
          }
          ... on DetailPageTargetData { __typename type url paste }
        }
      }
    `, referer, {}, agent)

    const content = contentData?.data?.getContent
    if (!content) { await sleep(1000); continue }

    // Got the target URL
    if (content.__typename === 'DetailPageTargetData' || content.url) {
      return {
        success: true,
        title: linkInfo.title,
        publisher: linkInfo.publisher?.name,
        targetHost: linkInfo.target_host,
        url: content.url || content.paste,
        type: content.type,
      }
    }

    // Tasks to complete
    if (content.__typename === 'ContentAccessTaskSet') {
      const tasks = (content.tasks || []).filter(t => t.status !== 'DONE')
      if (!tasks.length) { await sleep(1000); continue }

      const task = tasks[0]
      const taskArgs = {
        request_id: reqId,
        additional_data: {
          taboola: {
            user_id: 'fallbackUserId',
            consent_string: '',
            url: referer,
            external_referrer: '',
            session_id: null,
          },
        },
        action_id: generateActionId(),
      }

      const startMutation = `
        mutation startTask($identifier: PublicLinkIdentificationInput!, $task_id: String!, $task_args: TaskArgument) {
          startTask(input: $identifier, task_id: $task_id, task_args: $task_args) {
            id
            ... on AdTask { status ads { countdown } adIndex adsTotal }
            ... on WaitTask { status remainingWaitingTime }
          }
        }
      `
      const completeMutation = `
        mutation completeTask($identifier: PublicLinkIdentificationInput!, $task_id: String!, $task_args: TaskArgument) {
          completeTask(input: $identifier, task_id: $task_id, task_args: $task_args) {
            id
            ... on AdTask { status }
            ... on WaitTask { status remainingWaitingTime }
          }
        }
      `

      if (task.__typename === 'WaitTask') {
        if (task.status === 'OPEN') {
          await gqlCall('startTask', { identifier, task_id: task.id, task_args: taskArgs }, startMutation, referer, {}, agent)
        }
        const waitTime = task.remainingWaitingTime || 12
        await sleep(waitTime * 1000)
        await gqlCall('completeTask', { identifier, task_id: task.id, task_args: { ...taskArgs, action_id: generateActionId() } }, completeMutation, referer, { cqreferrer: referer }, agent)
      } else if (task.__typename === 'AdTask') {
        const started = await gqlCall('startTask', { identifier, task_id: task.id, task_args: taskArgs }, startMutation, referer, {}, agent)
        const countdown = started?.data?.startTask?.ads?.[0]?.countdown ?? 30
        await sleep((countdown + 1) * 1000)
        await gqlCall('completeTask', { identifier, task_id: task.id, task_args: { ...taskArgs, action_id: generateActionId() } }, completeMutation, referer, { cqreferrer: referer }, agent)
      } else if (task.__typename === 'PremiumTask') {
        await sleep(1000)
      }
      continue
    }
    await sleep(1000)
  }

  throw new Error('Timeout: gagal bypass setelah 15 percobaan')
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    throw `Masukkan URL Linkvertise!\n\n*Contoh:*\n${usedPrefix + command} https://linkvertise.com/1234/abcdef\n${usedPrefix + command} https://linkvertise.com/1234/abcdef proxy://user:pass@host:port`
  }

  const parts = text.trim().split(/\s+/)
  const url = parts[0]

  if (!url.includes('linkvertise.com')) {
    throw 'URL harus dari linkvertise.com!'
  }

  let proxyUrl = parts[1] || null

  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
  m.reply(`${global.wait}\n_Bypass Linkvertise sedang diproses...\nMohon tunggu, proses bisa memakan waktu 30-60 detik._`)

  try {
    const result = await bypassLinkvertise(url, proxyUrl)

    const msg = `╭─── *LINKVERTISE BYPASS* ───
│
│ 📌 *Title:* ${result.title || '-'}
│ 👤 *Publisher:* ${result.publisher || '-'}
│ 🌐 *Target Host:* ${result.targetHost || '-'}
│ 📎 *Type:* ${result.type || '-'}
│
│ 🔗 *Result URL:*
│ ${result.url}
│
╰────────────────────
_Powered by ${global.wm}_`

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    m.reply(msg)
  } catch (e) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    throw `❌ Gagal bypass Linkvertise!\n\n*Error:* ${e.message}\n\n_Tips: Coba lagi nanti, atau gunakan proxy jika terkena rate limit._\n_Contoh:_ ${usedPrefix + command} <url> http://proxy:port`
  }
}

handler.help = ['linkvertise <url>', 'lvbypass <url>']
handler.tags = ['tools']
handler.command = /^(linkvertise|lvbypass|lv)$/i
handler.limit = true
handler.register = true
handler.premium = false

export default handler
