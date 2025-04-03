import { createHash } from 'crypto'
import moment from 'moment-timezone'

let Reg = /|?(.*)([.|] ?)([0-9])$/i

let handler = async function (m, { conn, text, args, usedPrefix, command }) {
  let fkontak = {
    "key": { "participants":"0@s.whatsapp.net", "remoteJid": "status@broadcast", "fromMe": false, "id": "Halo" },
    "message": {
      "contactMessage": {
        "vcard": `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
      }
    },
    "participant": "0@s.whatsapp.net"
  }

  let who = m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender)
  let user = global.db.data.users[m.sender]
  let rtotalreg = Object.values(global.db.data.users).filter(u => u.registered).length
  let name2 = conn.getName(m.sender)

  if (command.match(/^(verify|verificar|reg(ister)?)$/i)) {
    if (user.registered) throw await tr('*Ya estás registrado 🤨*')
    if (!Reg.test(text)) throw `⚠️ ${await tr('¿No sabes cómo usar este comando?')} Usar de la siguiente manera:\n\n*${usedPrefix + command} nombre.edad*\n*• Ejemplo:* ${usedPrefix + command} ${name2}.16`

    let [_, name, , age] = text.match(Reg)
    if (!name) throw await tr('¿Y el nombre?')
    if (!age) throw await tr('La edad no puede estar vacía, agrega tu edad')
    if (name.length >= 45) throw await tr('¿Qué?, ¿tan largo va a ser tu nombre?')
    age = parseInt(age)
    if (age > 100) throw await tr('👴🏻 ¡Estás muy viejo para esto!')
    if (age < 5) throw await tr('🚼 ¿Los bebés saben escribir? ✍️😳')

    user.name = name + '✓'
    user.age = age
    user.regTime = +new Date()
    user.regPhase = 'language'
    user.registered = false

    let supportedLanguages = [
      { code: 'es', name: 'Español', aliases: ['español', 'spanish'] },
      { code: 'en', name: 'English', aliases: ['inglés', 'ingles'] },
      { code: 'pt', name: 'Português', aliases: ['portugues'] },
      { code: 'id', name: 'Bahasa Indonesia', aliases: ['indonesio'] },
      { code: 'fr', name: 'Francés', aliases: ['frances', 'french'] },
      { code: 'de', name: 'Alemán', aliases: ['aleman', 'german'] },
      { code: 'it', name: 'Italiano', aliases: ['italian'] },
      { code: 'ar', name: 'Arab (عرب)', aliases: ['arabe', 'arabic'] }
    ]

    let languageOptions = supportedLanguages.map((lang, i) => `${i + 1}. ${lang.name} (${lang.code})`).join('\n')

    await conn.sendMessage(m.chat, {
      text: `📝 ${await tr("*Registro Paso 2: Selecciona tu idioma*")}\n\n${languageOptions}\n\n> *${await tr("Responde con número o nombre del idioma")}*`,
      mentions: [m.sender]
    }, { quoted: m })

    user.regData = { name, age, supportedLanguages, who, usedPrefix, rtotalreg }
  }

  if (command.match(/^(nserie|myns|sn)$/i)) {
    let sn = createHash('md5').update(m.sender).digest('hex')
    conn.fakeReply(m.chat, sn, '0@s.whatsapp.net', await tr('⬇️ Este es tu número de serie ⬇️'), 'status@broadcast', null, fkontak)
  }

  if (command == 'unreg') {
    if (!args[0]) throw await tr(`✳️ *Ingrese número de serie*\nVerifique su número de serie con el comando...\n\n*${usedPrefix}nserie*`)
    let sn = createHash('md5').update(m.sender).digest('hex')
    if (args[0] !== sn) throw await tr('⚠️ Número de serie incorrecto')

    user.money -= 400
    user.limit -= 2
    user.exp -= 150
    user.gender = null
    user.registered = false
    conn.fakeReply(m.chat, await tr('😢 Ya no estás registrado'), '0@s.whatsapp.net', await tr("Registro eliminado"), 'status@broadcast', null, fkontak)
  }
}

handler.before = async function (m, { conn }) {
  let user = global.db.data.users[m.sender]
  if (!user.regPhase || m.text?.startsWith(global.prefix)) return

  let text = m.text.toLowerCase().trim()
  if (text === 'cancelar' || text === 'cancel') {
    user.regPhase = null
    delete user.regData
    if (user._regTimeout) clearTimeout(user._regTimeout)
    delete user._regTimeout
    return m.reply(await tr('❌ Registro cancelado. Puedes empezar de nuevo cuando quieras.'))
  }

  if (!user._regTimeout) {
    user._regTimeout = setTimeout(() => {
      user.regPhase = null
      delete user.regData
      delete user._regTimeout
    }, 1 * 60 * 1000)
  }

  if (user.regPhase === 'language') {
    let supportedLanguages = user.regData.supportedLanguages
    let selectedLang = supportedLanguages.find((lang, i) =>
      text === (i + 1).toString() ||
      lang.code === text ||
      lang.name.toLowerCase() === text ||
      lang.aliases.includes(text)
    )

    if (!selectedLang) {
      let options = supportedLanguages.map((lang, i) => `${i + 1}. ${lang.name} (${lang.code})`).join('\n')
      return m.reply(`📝 ${await tr("*Selecciona tu idioma:*\n\n")}${options}\n\n> *${await tr("Usa número o nombre del idioma")}*`)
    }

    user.language = selectedLang.code
    user.languageName = selectedLang.name
    user.regPhase = 'gender'
    return m.reply(await tr('📝 *Registro Paso 3: Selecciona tu género*\n\n1. Hombre 👨\n2. Mujer 👩\n3. Otro/No especificar\n\n> *Responde con número o palabra*'))
  }

  if (user.regPhase === 'gender') {
    let genderMap = {
      '1': 'Hombre', 'hombre': 'Hombre', 'man': 'Hombre',
      '2': 'Mujer', 'mujer': 'Mujer', 'woman': 'Mujer',
      '3': 'Otro', 'otro': 'Otro', 'other': 'Otro'
    }

    let gender = genderMap[text]
    if (!gender) return m.reply(await tr('📝 *Selecciona tu género:*\n\n1. Hombre 👨\n2. Mujer 👩\n3. Otro/No especificar\n\n> *Usa número o palabra*'))

    user.gender = gender
    user.regPhase = null
    user.registered = true
    user.money += 400
    user.limit += 2
    user.exp += 150

    if (user._regTimeout) clearTimeout(user._regTimeout)
    delete user._regTimeout

    let sn = createHash('md5').update(m.sender).digest('hex')
    let genderEmoji = gender === 'Hombre' ? '👨' : gender === 'Mujer' ? '👩' : '⚧'
    let currentDate = moment().tz('America/Argentina/Buenos_Aires')
    let time = currentDate.format('LT')
    let date = currentDate.format('DD/MM/YYYY')

    await conn.sendMessage(m.chat, {
      text: `[ ✅ ${await tr("REGISTRO COMPLETADO")} ]

◉ ${await tr("Nombre")}: ${user.name}
◉ ${await tr("Edad")}: ${user.age} ${await tr("años")}
◉ ${await tr("Género")}: ${gender} ${genderEmoji}
◉ ${await tr("Idioma")}: ${user.languageName}
◉ ${await tr("Hora")}: ${time} 🇦🇷
◉ ${await tr("Fecha")}: ${date}
◉ ${await tr("Número")}: wa.me/${m.sender.split('@')[0]}
◉ ${await tr("Número de serie")}:
⤷ ${sn}

🎁 ${await tr("Recompensa")}:
⤷ 2 ${await tr("diamantes")} 💎
⤷ 400 ${await tr("Coins")} 🪙
⤷ 150 exp

◉ ${await tr("Para ver los comandos del bot usar")}:
${user.regData.usedPrefix}menu

◉ ${await tr("Total de usuarios registrados")}: ${user.regData.rtotalreg}`,
    }, { quoted: fkontak })

    delete user.regData
  }
}

handler.help = ['reg', 'verificar', 'myns', 'nserie', 'unreg']
handler.tags = ['rg']
handler.command = /^(nserie|unreg|sn|myns|verify|verificar|registrar|reg(ister)?)$/i

export default handler
