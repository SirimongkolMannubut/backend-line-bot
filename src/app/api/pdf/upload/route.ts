import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename, dataBase64, pdfBase64 } = body
    const finalBase64 = dataBase64 || pdfBase64

    if (!filename || !finalBase64) {
      return NextResponse.json({ error: 'Missing required fields: filename, dataBase64 or pdfBase64' }, { status: 400 })
    }

    // Save to PostgreSQL database
    const pdf = await prisma.pdfDocument.create({
      data: {
        filename,
        data_base64: finalBase64,
      },
    })

    const downloadUrl = `/api/pdf/download?id=${pdf.id}`

    return NextResponse.json({
      success: true,
      id: pdf.id,
      url: downloadUrl,
    })
  } catch (error: any) {
    console.error('POST PDF Upload error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}
