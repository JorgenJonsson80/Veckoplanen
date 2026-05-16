import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Returns the current weekday in Swedish, in Swedish timezone
function todaySwedish(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    weekday: 'long',
    timeZone: 'Europe/Stockholm',
  }).format(new Date())
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end()
  }

  const today = todaySwedish()

  const PAGE_SIZE = 200
  const rooms: Array<{ code: string; state: { meals?: Record<string, string> } }> = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('rooms')
      .select('code, state')
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) return res.status(500).json({ error: error.message })
    if (data?.length) rooms.push(...data)
    if (!data?.length || data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  let sent = 0

  await Promise.all(
    rooms.map(async room => {
      const meal: string | undefined = room.state?.meals?.[today]
      if (!meal) return

      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('room_code', room.code)

      if (!subs?.length) return

      const payload = JSON.stringify({
        title: '🍽 Vad är det till middag?',
        body: `Idag: ${meal}`,
        data: { url: '/' },
      })

      await Promise.allSettled(
        subs.map(({ subscription }) =>
          webpush
            .sendNotification(subscription, payload)
            .then(() => { sent++ })
            .catch(() => {
              // Expired or invalid subscription — remove it
              supabase
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', subscription.endpoint)
                .then(() => {})
            })
        )
      )
    })
  )

  return res.status(200).json({ today, sent })
}
