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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // "income" or "expense"
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate') // YYYY-MM-DD
    const endDate = searchParams.get('endDate') // YYYY-MM-DD
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    // Build Prisma query filters
    const where: any = {
      user_id: session.user.id,
    }

    if (type) {
      where.type = type
    }
    if (category) {
      where.category = category
    }
    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = startDate
      }
      if (endDate) {
        where.date.lte = endDate
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
      take: limit,
    })

    return NextResponse.json(transactions)
  } catch (error: any) {
    console.error('GET Transactions error:', error)
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
    const { id, type, amount, category, note, date } = body

    if (!type || typeof amount !== 'number' || !date) {
      return NextResponse.json({ error: 'Missing required fields: type, amount, date' }, { status: 400 })
    }

    if (id) {
      // Check ownership
      const existing = await prisma.transaction.findFirst({
        where: { id: Number(id), user_id: session.user.id },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Transaction not found or unauthorized' }, { status: 404 })
      }

      // Update
      const updated = await prisma.transaction.update({
        where: { id: Number(id) },
        data: {
          type,
          amount: amount,
          category: category || null,
          note: note || null,
          date,
        },
      })
      return NextResponse.json(updated)
    } else {
      // Create new
      const created = await prisma.transaction.create({
        data: {
          user_id: session.user.id,
          type,
          amount: amount,
          category: category || null,
          note: note || null,
          date,
        },
      })
      return NextResponse.json(created, { status: 201 })
    }
  } catch (error: any) {
    console.error('POST Transactions error:', error)
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
      return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 })
    }

    // Check ownership
    const existing = await prisma.transaction.findFirst({
      where: { id: Number(id), user_id: session.user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found or unauthorized' }, { status: 404 })
    }

    await prisma.transaction.delete({
      where: { id: Number(id) },
    })

    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' })
  } catch (error: any) {
    console.error('DELETE Transaction error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}
