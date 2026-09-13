/** 场景内定时器收纳袋：复刻原 HTML 的 later/every/clearTimers，便于统一清理 */
export function createTimerBag() {
  const timers: number[] = []
  return {
    later(fn: () => void, ms: number) {
      const t = window.setTimeout(fn, ms)
      timers.push(t)
      return t
    },
    every(fn: () => void, ms: number) {
      const t = window.setInterval(fn, ms)
      timers.push(t)
      return t
    },
    clear() {
      timers.forEach((t) => {
        window.clearTimeout(t)
        window.clearInterval(t)
      })
      timers.length = 0
    },
  }
}

export type TimerBag = ReturnType<typeof createTimerBag>
