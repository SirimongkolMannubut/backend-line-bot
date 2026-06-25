import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { pdfBase64, filename } = data
    if (!pdfBase64) {
      return NextResponse.json({ error: 'No PDF data provided' }, { status: 400 })
    }

    const buffer = Buffer.from(pdfBase64, 'base64')

    const dirPath = path.join(process.cwd(), 'public', 'temp-pdf')
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }

    const uniqueId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
    let cleanFilename = filename ? filename.replace(/[^a-zA-Z0-9_\u0e00-\u0e7f.-]/g, '_') : 'document.pdf'
    if (!cleanFilename.endsWith('.pdf')) {
      cleanFilename += '.pdf'
    }
    
    const finalFilename = `${uniqueId}_${cleanFilename}`
    const filePath = path.join(dirPath, finalFilename)

    fs.writeFileSync(filePath, buffer)

    const fileUrl = `/temp-pdf/${finalFilename}`
    return NextResponse.json({ url: fileUrl })
  } catch (error: any) {
    console.error('Upload PDF error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
