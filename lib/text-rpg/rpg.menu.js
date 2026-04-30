import { CLASSES } from './rpg.constants.js'
import { formatNumber, requiredExp } from './rpg.utils.js'

export function formatRpgMenu(player, prefix = '.') {
  if (!player) {
    return [
      '⚔️ *RPG MENU*',
      '',
      'Kamu belum punya karakter RPG.',
      '',
      'Mulai dengan:',
      `${prefix}rpg start`,
      '',
      'Class awal: Warrior, Mage, Rogue, Cleric'
    ].join('\n')
  }

  return [
    '⚔️ *RPG MENU*',
    '',
    `👤 Nama: ${player.name}`,
    `Class: ${CLASSES[player.class]?.name || player.class}`,
    `Level: ${player.level}`,
    `EXP: ${formatNumber(player.exp)}/${formatNumber(requiredExp(player.level))}`,
    `Gold: ${formatNumber(player.gold)}`,
    `Energy: ${player.energy}/${player.maxEnergy}`,
    '',
    '[Explore] [Quest] [Profile]',
    '[Inventory] [Equipment] [Shop]',
    '[Daily] [Leaderboard] [Help]'
  ].join('\n')
}

export function menuButtons(prefix = '.', player) {
  if (!player) {
    return [
      {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: 'Pilih Class',
          sections: [{
            title: 'Start RPG',
            rows: Object.values(CLASSES).map(klass => ({
              id: `${prefix}rpg start ${klass.id}`,
              title: klass.name,
              description: klass.description
            }))
          }]
        })
      },
      quick(prefix, 'Help', 'rpg help')
    ]
  }

  return [
    quick(prefix, 'Explore', 'rpg explore'),
    quick(prefix, 'Profile', 'rpg profile'),
    {
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
        title: 'RPG Menu',
        sections: [{
          title: 'Action',
          rows: [
            row(prefix, 'rpg explore', 'Explore', 'Cari monster, chest, material'),
            row(prefix, 'rpg quest', 'Quest', 'Lihat dan claim quest'),
            row(prefix, 'rpg inv', 'Inventory', 'Lihat item'),
            row(prefix, 'rpg equipment', 'Equipment', 'Lihat gear'),
            row(prefix, 'rpg shop', 'Shop', 'Beli item dasar'),
            row(prefix, 'rpg daily', 'Daily', 'Reward harian'),
            row(prefix, 'rpg top', 'Leaderboard', 'Top level, power, gold'),
            row(prefix, 'rpg help', 'Help', 'Panduan singkat')
          ]
        }]
      })
    }
  ]
}

export function battleButtons(prefix = '.') {
  return [
    quick(prefix, 'Attack', 'rpg attack'),
    quick(prefix, 'Skill', 'rpg skill'),
    {
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
        title: 'Battle Action',
        sections: [{
          title: 'Battle',
          rows: [
            row(prefix, 'rpg attack', 'Attack', 'Serangan biasa'),
            row(prefix, 'rpg skill', 'Skill', 'Pakai skill class'),
            row(prefix, 'rpg item potion', 'Potion', 'Heal HP'),
            row(prefix, 'rpg item mana_potion', 'Mana Potion', 'Pulihkan MP'),
            row(prefix, 'rpg run', 'Run', 'Coba kabur')
          ]
        }]
      })
    }
  ]
}

export function classButtons(prefix = '.') {
  return [{
    name: 'single_select',
    buttonParamsJson: JSON.stringify({
      title: 'Pilih Class',
      sections: [{
        title: 'Class Awal',
        rows: Object.values(CLASSES).map(klass => ({
          id: `${prefix}rpg start ${klass.id}`,
          title: klass.name,
          description: klass.description
        }))
      }]
    })
  }]
}

export function helpText(prefix = '.') {
  return [
    '❔ *RPG HELP*',
    '',
    `${prefix}rpg start - buat karakter`,
    `${prefix}rpg profile - lihat stat`,
    `${prefix}rpg explore / hunt - cari encounter`,
    `${prefix}rpg attack / skill / item / run - battle`,
    `${prefix}rpg quest - lihat quest`,
    `${prefix}rpg claim quest - claim quest selesai`,
    `${prefix}rpg inv - inventory`,
    `${prefix}rpg equip wooden_sword - pakai gear`,
    `${prefix}rpg shop / buy / sell - ekonomi`,
    `${prefix}rpg daily - reward harian`,
    `${prefix}rpg top - leaderboard`
  ].join('\n')
}

function quick(prefix, label, command) {
  return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: label, id: `${prefix}${command}` }) }
}

function row(prefix, command, title, description) {
  return { id: `${prefix}${command}`, title, description }
}
