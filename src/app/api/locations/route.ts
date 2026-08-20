import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createLocation, listLocations } from '@/lib/db/queries/locations'

// Coordinates arrive as strings to match the numeric columns, but still have to
// be real points on the globe -- a swapped lat/lng silently puts the pin in the
// wrong hemisphere otherwise.
const coordinate = (max: number) =>
  z
    .string()
    .min(1)
    .refine((value) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) && Math.abs(parsed) <= max
    }, `Koordinata mora biti broj između -${max} i ${max}`)

const createSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  latitude: coordinate(90),
  longitude: coordinate(180),
})

export async function GET() {
  return NextResponse.json(await listLocations())
}

export async function POST(request: Request) {
  const body = createSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  return NextResponse.json(await createLocation(body.data), { status: 201 })
}
