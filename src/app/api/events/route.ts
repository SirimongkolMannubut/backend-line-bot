import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const events = await prisma.event.findMany({
      where: {
        user_id: session.user.id,
      },
      orderBy: [
        { event_date: 'asc' },
        { event_time: 'asc' },
      ],
    })

    return NextResponse.json(events)
  } catch (error: any) {
    console.error('GET Events error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, title, event_date, event_time } = body

    if (!title || !event_date) {
      return NextResponse.json({ error: 'Missing required fields: title, event_date' }, { status: 400 })
    }

    if (id) {
      // Check ownership
      const existing = await prisma.event.findFirst({
        where: { id: Number(id), user_id: session.user.id },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Event not found or unauthorized' }, { status: 404 })
      }

      const updated = await prisma.event.update({
        where: { id: Number(id) },
        data: {
          title,
          event_date,
          event_time: event_time || null,
        },
      })
      return NextResponse.json(updated)
    } else {
      const created = await prisma.event.create({
        data: {
          user_id: session.user.id,
          title,
          event_date,
          event_time: event_time || null,
          notified: 0,
        },
      })
      return NextResponse.json(created, { status: 201 })
    }
  } catch (error: any) {
    console.error('POST Events error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })
    }

    const existing = await prisma.event.findFirst({
      where: { id: Number(id), user_id: session.user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Event not found or unauthorized' }, { status: 404 })
    }

    await prisma.event.delete({
      where: { id: Number(id) },
    })

    return NextResponse.json({ success: true, message: 'Event deleted' })
  } catch (error: any) {
    console.error('DELETE Event error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}
