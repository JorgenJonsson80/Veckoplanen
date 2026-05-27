import { useState, useCallback, useRef, useEffect } from 'react'

interface UseVoiceDictationOptions {
  onResult: (text: string) => void
  lang?: string
}

const AUTO_STOP_MS = 8000

function friendlyError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Mikrofonen är blockerad. Gå till telefonens inställningar → webbläsare → tillåt mikrofon, och ladda om sidan.'
    case 'network':
      return 'Nätverksfel — röstinmatning kräver internetuppkoppling.'
    case 'audio-capture':
      return 'Ingen mikrofon hittades på enheten.'
    case 'aborted':
    case 'no-speech':
      return ''
    default:
      return `Röstinmatning fungerade inte (${code}).`
  }
}

export function useVoiceDictation({ onResult, lang = 'sv-SE' }: UseVoiceDictationOptions) {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // After a permission/service block the button should hide — no point retrying
  const [blocked, setBlocked] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Always call the latest version of onResult without needing to restart recognition
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult })

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  function clearAutoStop() {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const stop = useCallback(() => {
    clearAutoStop()
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  const start = useCallback(() => {
    if (!isSupported) {
      setError('Röstinmatning stöds inte i den här webbläsaren')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    const recognition = new SR()

    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      clearAutoStop()
      const transcript = (event.results[0][0].transcript as string).trim()
      onResultRef.current(transcript)
      setIsListening(false)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      clearAutoStop()
      const msg = friendlyError(event.error as string)
      if (msg) setError(msg)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setBlocked(true)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      clearAutoStop()
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
    setError(null)

    // Auto-stop after 8 s so the user is never stuck in listening mode
    timeoutRef.current = setTimeout(() => {
      recognition.stop()
      setIsListening(false)
    }, AUTO_STOP_MS)
  }, [isSupported, lang])

  const toggle = useCallback(() => {
    if (isListening) stop()
    else start()
  }, [isListening, start, stop])

  // isSupported becomes false after a permission block so the button hides
  return { isListening, isSupported: isSupported && !blocked, error, blocked, toggle, start, stop }
}
