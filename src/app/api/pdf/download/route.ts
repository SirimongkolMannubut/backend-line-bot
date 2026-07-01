import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing document ID' }, { status: 400 })
    }

    const pdf = await prisma.pdfDocument.findUnique({
      where: { id },
    })

    if (!pdf) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Strip base64 data URL prefix if present (e.g., "data:application/pdf;base64,")
    const base64Data = pdf.data_base64.includes('base64,')
      ? pdf.data_base64.split('base64,')[1]
      : pdf.data_base64

    const pdfBuffer = Buffer.from(base64Data, 'base64')

    // Clean up older records in the background to prevent DB bloat (older than 24 hours)
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      await prisma.pdfDocument.deleteMany({
        where: {
          created_at: {
            lt: oneDayAgo,
          },
        },
      })
    } catch (cleanupError) {
      console.error('Failed to clean up old PDFs:', cleanupError)
    }

    // Return the PDF buffer directly with headers
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(pdf.filename)}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('GET PDF Download error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}
