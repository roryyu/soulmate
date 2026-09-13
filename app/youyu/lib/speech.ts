/**
 * 语音播报：温柔治愈女声
 * 由原单页 HTML 的 pickVoice / speak 移植。
 */

let FEMALE_VOICE: SpeechSynthesisVoice | null = null

function pickVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const vs = window.speechSynthesis.getVoices()
  const femaleHints = ['xiaoxiao', 'xiaoyi', 'yaoyao', 'huihui', 'tingting', 'xiaochen', 'keke', 'yuan', '笑语', '晓晓', 'female']
  FEMALE_VOICE =
    vs.find((v) => v.lang.startsWith('zh') && femaleHints.some((h) => v.name.toLowerCase().includes(h))) ||
    vs.find((v) => v.lang === 'zh-CN' && /female|女/i.test(v.name)) ||
    vs.find((v) => v.lang === 'zh-CN') ||
    vs.find((v) => v.lang.startsWith('zh')) ||
    null
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  pickVoice()
  window.speechSynthesis.onvoiceschanged = pickVoice
}

export interface SpeakOptions {
  rate?: number
  pitch?: number
}

/** 播报文本，返回预估播报时长(ms) */
export function speak(text: string, opt: SpeakOptions = {}): number {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return 800
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    if (FEMALE_VOICE) u.voice = FEMALE_VOICE
    u.rate = opt.rate ?? 0.88
    u.pitch = opt.pitch ?? 1.18
    u.volume = 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
    return text.length * 220 + 900
  } catch {
    return 800
  }
}

/** 取消当前播报 */
export function cancelSpeak() {
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
  } catch {
    /* noop */
  }
}
