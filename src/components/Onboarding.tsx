interface OnboardingProps {
  onStart: () => void
}

export default function Onboarding({ onStart }: OnboardingProps) {
  return (
    <div className="fixed inset-0 bg-black/55 z-200 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl px-6 py-7 max-w-90 w-full shadow-[0_8px_32px_rgba(0,0,0,0.2)] text-center">
        <h2 className="font-serif text-primary text-[22px] mb-5">Välkommen! 🌿</h2>
        <div className="text-primary text-lg leading-relaxed mb-6">
          <p className="m-0">Planera veckans mat på 30 sekunder.</p>
          <p className="m-0">Få en färdig handlingslista.</p>
          <p className="m-0">Dela med familjen.</p>
        </div>
        <button
          className="w-full py-3 bg-primary text-white border-0 rounded-xl text-base cursor-pointer font-serif"
          onClick={onStart}
        >Skapa min första vecka</button>
      </div>
    </div>
  )
}
