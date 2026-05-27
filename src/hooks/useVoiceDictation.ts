import { useState, useCallback, useRef, useEffect } from 'react'

interface UseVoiceDictationOptions {
  onResult: (text: string) => void
  lang?: string
}

const AUTO_STOP_MS = 8000

export function useVoiceDictation({ onResult, lang = 'sv-SE' }: UseVoiceDictationOptions) {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Röstfel: ${event.error}`)
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

  return { isListening, isSupported, error, toggle, start, stop }
}
