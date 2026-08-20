import { NextResponse } from 'next/server'
import { z } from 'zod'
import { deleteLocation, updateLocation } from '@/lib/db/queries/locations'

const coordinate = (max: number) =>
  z
    .string()
    .min(1)
    .refine((value) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) && Math.abs(parsed) <= max
    }, max === 90 ? 'INVALID_LATITUDE' : 'INVALID_LONGITUDE')

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  latitude: coordinate(90).optional(),
  longitude: coordinate(180).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = updateSchema.safeParse(await request.json())
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 })
  }
  const location = await updateLocation(Number(id), body.data)
  if (!location) {
    return NextResponse.json({ error: 'LOCATION_NOT_FOUND' }, { status: 404 })
  }
  return NextResponse.json(location)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deleteLocation(Number(id))
  return NextResponse.json({ ok: true })
}
