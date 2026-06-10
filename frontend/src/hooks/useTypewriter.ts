import { useState, useEffect } from 'react'

export function useTypewriter(text: string, speed: number = 30, trigger: boolean = true): string {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    if (!trigger || !text) { setDisplayed(''); return }
    setDisplayed('')
    let i = 0
    const id = setInterval(() => {
      setDisplayed(text.slice(0, i + 1))
      i++
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, trigger, speed])
  return displayed
}

