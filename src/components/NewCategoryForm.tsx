import { useState } from 'react'
import type { Category } from '../types'

interface Props {
  onAdd: (cat: Category) => void
}

const EMOJI_OPTIONS = [
  '🥬','🥕','🍎','🍋','🌽','🫑','🧅','🥒','🍅',
  '🥚','🧀','🥩','🐟','🍗','🥦','🧄','🌿',
  '🍞','🥐','🧁','🍰','🎂',
  '🍝','🍜','🍚','🥗','🫙','🥫','🧂','🫒',
  '🧊','🍦','🧃','🥤','🍷','🫖',
  '🍫','🍬','🍭','🥜','🍿',
  '🧴','🧹','🧼','🪥','🛒','📦',
]

const styles = {
  container: { background: 'var(--clr-bg)', borderRadius: '10px', padding: '14px', marginTop: '12px' },
  title: { fontWeight: '700', color: 'var(--clr-primary)', fontSize: '15px', marginBottom: '10px' },
  emojiGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginBottom: '10px' },
  emojiBtn: { width: '36px', height: '36px', border: '2px solid transparent', borderRadius: '8px', fontSize: '20px', cursor: 'pointer', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.1s' } as React.CSSProperties,
  emojiBtnSelected: { borderColor: 'var(--clr-primary)', background: 'var(--clr-bg-subtle)' },
  row: { display: 'flex', gap: '8px' },
  input: { flex: 1, padding: '9px 10px', border: '1.5px solid #c8e6c9', borderRadius: '8px', fontSize: '15px', fontFamily: 'inherit' } as React.CSSProperties,
  addBtn: { padding: '9px 16px', background: 'var(--clr-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', cursor: 'pointer', whiteSpace: 'nowrap' as const },
}

export default function NewCategoryForm({ onAdd }: Props) {
  const [selectedEmoji, setSelectedEmoji] = useState('🛒')
  const [catName, setCatName] = useState('')

  function handleAdd() {
    if (!catName.trim()) return
    const id = crypto.randomUUID()
    onAdd({ id, name: catName.trim(), emoji: selectedEmoji, shelfLife: 30 })
    setCatName('')
  }

  return (
    <div style={styles.container}>
      <p style={styles.title}>Ny kategori</p>
      <div style={styles.emojiGrid}>
        {EMOJI_OPTIONS.map(emoji => (
          <button
            key={emoji}
            style={{ ...styles.emojiBtn, ...(selectedEmoji === emoji ? styles.emojiBtnSelected : {}) }}
            onClick={() => setSelectedEmoji(emoji)}
            title={emoji}
          >{emoji}</button>
        ))}
      </div>
      <div style={styles.row}>
        <input
          style={styles.input}
          value={catName}
          onChange={e => setCatName(e.target.value)}
          placeholder="t.ex. Ekologiskt"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button style={styles.addBtn} onClick={handleAdd}>Lägg till</button>
      </div>
    </div>
  )
}
