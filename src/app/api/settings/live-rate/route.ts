import { NextResponse } from 'next/server'

// open.er-api.com is free and needs no API key -- kept server-side so the
// browser never talks to a third party directly and a slow/failing call
// can't hang the page (5s timeout below). This is purely a convenience for
// the "reload" button in Settings; the app's actual working rate is always
// the static value stored in the database, never this live one.
//
// Frankfurter (ECB-based) was tried first and does NOT carry RSD at all --
// it's not one of the ECB's published reference currencies. Confirmed by
// querying it directly before picking this API instead.
const LIVE_RATE_URL = 'https://open.er-api.com/v6/latest/EUR'

export async function GET() {
  try {
    const response = await fetch(LIVE_RATE_URL, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) {
      return NextResponse.json({ error: 'Spoljni servis za kurs nije dostupan' }, { status: 502 })
    }
    const body = (await response.json()) as { result?: string; rates?: { RSD?: number } }
    const rate = body.rates?.RSD
    if (body.result !== 'success' || typeof rate !== 'number' || !(rate > 0)) {
      return NextResponse.json({ error: 'Neočekivan odgovor od servisa za kurs' }, { status: 502 })
    }
    return NextResponse.json({ rate: Math.round(rate * 10000) / 10000 })
  } catch {
    return NextResponse.json({ error: 'Greška pri povezivanju sa servisom za kurs' }, { status: 502 })
  }
}
