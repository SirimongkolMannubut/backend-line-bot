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

    const profile = await prisma.userProfile.findUnique({
      where: {
        user_id: session.user.id,
      },
    })

    if (!profile) {
      // Return a default blank profile object instead of erroring, so client can display it
      return NextResponse.json({
        user_id: session.user.id,
        name: session.user.name || '',
        age: '',
        job: '',
        location: '',
        data_json: '{}',
        updated_at: null,
      })
    }

    return NextResponse.json(profile)
  } catch (error: any) {
    console.error('GET Profile error:', error)
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
    const { name, age, job, location, data_json } = body

    const nowStr = new Date().toISOString()

    const updated = await prisma.userProfile.upsert({
      where: {
        user_id: session.user.id,
      },
      update: {
        name: name ?? null,
        age: age ? String(age) : null,
        job: job ?? null,
        location: location ?? null,
        data_json: data_json ?? '{}',
        updated_at: nowStr,
      },
      create: {
        user_id: session.user.id,
        name: name ?? null,
        age: age ? String(age) : null,
        job: job ?? null,
        location: location ?? null,
        data_json: data_json ?? '{}',
        updated_at: nowStr,
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('POST Profile error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}
