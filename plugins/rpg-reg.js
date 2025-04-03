import { createHash } from 'crypto'
import moment from 'moment-timezone'

let Reg = /|?(.*)([.|] ?)([0-9])$/i

let handler = async function (m, { conn, text, args, usedPrefix, command }) {
  let fkontak = {
    "key": {
      "participants":"0@s.whatsapp.net",
      "remoteJid": "status@broadcast",
      "fromMe": false,
      "id": "Halo"
    },
    "message": {
      "contactMessage": {
        "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
      }
    },
    "participant": "0@s.whatsapp.net"
  }

  let user = global.db.data.users[m.sender]
  let totalreg = Object.keys(global.db.data.users).length
  let rtotalreg = Object.values(global.db.data.users).filter(user => user.registered === true).length
  let name2 = conn.getName(m.sender)

  if (/^(verify|reg|verificar|registrar)$/i.test(command)) {
    if (user.registered === true) throw 'Ya estás registrado.'
    if (!Reg.test(text)) throw `⚠️ Uso incorrecto. Ejemplo:\n*${usedPrefix + command} ${name2}.16*`

    let [_, name, splitter, age] = text.match(Reg)
    if (!name) throw '¿Y el nombre?'
    if (!age) throw 'La edad no puede estar vacía'
    if (name.length >= 45) throw '¿Qué?, ¿tan largo va a ser tu nombre?'
    age = parseInt(age)
    if (age > 100) throw '👴🏻 ¡Estás muy viejo para esto!'
    if (age < 5) throw '🚼 ¿Los bebés saben escribir? ✍️😳'

    user.name = name + '✓'
    user.age = age
    user.regTime = +new Date()
    user.regPhase = 'language'
    user.registered = false

    let supportedLanguages = [
      {code: 'es', name: 'Español', aliases: ['español', 'spanish']},
      {code: 'en', name: 'English', aliases: ['inglés', 'ingles']},
      {code: 'pt', name: 'Português', aliases: ['portugues']},
      {code: 'id', name: 'Bahasa Indonesia', aliases: ['indonesio']},
      {code: 'fr', name: 'Francés', aliases: ['frances', 'french']},
      {code: 'de', name: 'Alemán', aliases: ['aleman', 'german']},
      {code: 'it', name: 'Italiano', aliases: ['italian']},
      {code: 'ar', name: 'Arab (عرب)', aliases: ['arabe', 'arabic']}
    ]

    let languageOptions = supportedLanguages.map((lang, i) => `${i + 1}. ${lang.name} (${lang.code})`).join('\n')
    await conn.sendMessage(m.chat, {
      text: `📝 *Paso final del registro: Selecciona tu idioma*\n\n${languageOptions}\n\n> Responde con número o nombre del idioma.`,
      mentions: [m.sender]
    }, { quoted: m })

    user.regData = { name, age, supportedLanguages, usedPrefix, rtotalreg }
  }

  if (/^(nserie|myns|sn)$/i.test(command)) {
    let sn = createHash('md5').update(m.sender).digest('hex')
    return m.reply(`⬇️ Este es tu número de serie ⬇️\n\n${sn}`)
  }

  if (command === 'unreg') {
    if (!args[0]) throw `✳️ Ingrese su número de serie.\nUse *${usedPrefix}nserie* para obtenerlo.`
    let sn = createHash('md5').update(m.sender).digest('hex')
    if (args[0] !== sn) throw '⚠️ Número de serie incorrecto'
    user.registered = false
    user.money -= 400
    user.limit -= 2
    user.exp -= 150
    user.language = null
    user.languageName = null
    conn.reply(m.chat, '😢 Registro eliminado.', m)
  }
}

handler.before = async function (m, { conn }) {
  let user = global.db.data.users[m.sender]
  if (!user.regPhase || m.text.startsWith(global.prefix)) return

  let text = m.text.toLowerCase().trim()
  if (text === 'cancelar' || text === 'cancel') {
    user.regPhase = null
    delete user.regData
    clearTimeout(user._regTimeout)
    return m.reply('❌ Registro cancelado.')
  }

  if (!user._regTimeout) {
    user._regTimeout = setTimeout(() => {
      user.regPhase = null
      delete user.regData
      delete user._regTimeout
    }, 1 * 60 * 1000)
  }

  if (user.regPhase === 'language') {
    let langs = user.regData.supportedLanguages
    let selected = langs.find((lang, i) =>
      text === (i + 1).toString() ||
      lang.code === text ||
      lang.name.toLowerCase() === text ||
      lang.aliases.includes(text)
    )
    if (!selected) {
      let langOpts = langs.map((l, i) => `${i + 1}. ${l.name} (${l.code})`).join('\n')
      return m.reply(`📝 *Selecciona tu idioma:*\n\n${langOpts}\n\n> Usa número o nombre del idioma.`)
    }

    user.language = selected.code
    user.languageName = selected.name
    user.regPhase = null
    user.registered = true

    delete user._regTimeout
    let sn = createHash('md5').update(m.sender).digest('hex')
    let currentDate = moment().tz('America/Argentina/Buenos_Aires')
    let time = currentDate.format('LT')
    let date = currentDate.format('DD/MM/YYYY')

    await conn.sendMessage(m.chat, {
      text: `[ ✅ REGISTRO COMPLETADO ]

◉ Nombre: ${user.name}
◉ Edad: ${user.age} años
◉ Idioma: ${user.languageName}
◉ Hora: ${time} 🇦🇷
◉ Fecha: ${date}
◉ Número: wa.me/${m.sender.split('@')[0]}
◉ Número de serie:
⤷ ${sn}

🎁 Recompensa:
⤷ 2 diamantes 💎
⤷ 400 Coins 🪙
⤷ 150 exp

◉ Para ver los comandos del bot usar:
${user.regData.usedPrefix}menu

◉ Total de usuarios registrados: ${user.regData.rtotalreg}`,
    }, { quoted: fkontak })

    delete user.regData
  }
}

handler.help = ['reg', 'verificar', 'myns', 'nserie', 'unreg']
handler.tags = ['rg']
handler.command = /^(nserie|unreg|sn|myns|verify|verificar|registrar|reg(ister)?)$/i

export default handler
