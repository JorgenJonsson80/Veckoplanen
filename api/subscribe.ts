import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { roomCode, subscription } = req.body ?? {}
  if (!roomCode || !subscription?.endpoint) {
    return res.status(400).json({ error: 'Saknar roomCode eller subscription' })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { room_code: roomCode, endpoint: subscription.endpoint, subscription },
      { onConflict: 'endpoint' }
    )

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ ok: true })
}
