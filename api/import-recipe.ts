import type { VercelRequest, VercelResponse } from '@vercel/node'

interface ParsedIngredient {
  name: string
  amount: string
}

function parseIngredient(raw: string): ParsedIngredient {
  const clean = raw.trim()
  // Match leading number (int or decimal with , or .) + optional unit
  const match = clean.match(
    /^(\d+(?:[,./]\d+)?\s*(?:ml|dl|l|g|kg|msk|tsk|krm|st|cl|tbsp|tsp|cup|oz|lb)?)\s+(.+)$/i
  )
  if (match) return { amount: match[1].trim(), name: match[2].trim() }
  return { amount: '', name: clean }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRecipe(data: any): any | null {
  if (!data) return null
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractRecipe(item)
      if (found) return found
    }
    return null
  }
  const types: string[] = Array.isArray(data['@type']) ? data['@type'] : [data['@type']]
  if (types.includes('Recipe')) return data
  if (data['@graph']) return extractRecipe(data['@graph'])
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { url } = req.body ?? {}
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL saknas' })
  }

  let html: string
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Veckoplanen/1.0; +https://veckoplanen.app)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      return res.status(400).json({ error: `Kunde inte hämta sidan (HTTP ${response.status})` })
    }
    html = await response.text()
  } catch {
    return res.status(400).json({ error: 'Kunde inte nå adressen — kontrollera länken' })
  }

  // Extract all application/ld+json script blocks
  const ldBlocks = [...html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )]

  let recipe = null
  for (const block of ldBlocks) {
    try {
      const parsed = JSON.parse(block[1])
      const found = extractRecipe(parsed)
      if (found) { recipe = found; break }
    } catch {
      continue
    }
  }

  if (!recipe) {
    return res.status(422).json({ error: 'Hittade inget recept på den här sidan. Prova en annan länk.' })
  }

  const name: string = recipe.name ?? ''
  const rawIngredients: string[] = Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient : []
  const ingredients = rawIngredients.map(parseIngredient)

  // Extract image URL (various formats used by different sites)
  let imageUrl = ''
  const img = recipe.image
  if (typeof img === 'string') imageUrl = img
  else if (Array.isArray(img) && img.length > 0) imageUrl = typeof img[0] === 'string' ? img[0] : img[0]?.url ?? ''
  else if (img?.url) imageUrl = img.url

  return res.status(200).json({ name, ingredients, imageUrl })
}
