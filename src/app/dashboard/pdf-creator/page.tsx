'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Upload,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Crop,
  RotateCw,
  FileDown,
  Check,
  X,
  FileImage,
  Layers,
  Settings,
  Maximize,
} from 'lucide-react'
import { jsPDF } from 'jspdf'

interface ImagePage {
  id: string
  name: string
  src: string        // DataURL of the current version (cropped/rotated)
  originalSrc: string // Original uploaded DataURL
  rotation: number   // 0, 90, 180, 270
  cropPercent: { x: number; y: number; w: number; h: number } // 0-100 percentage values
}

const dict = {
  th: {
    title: 'เครื่องมือสร้าง PDF',
    subtitle: 'รวมรูปภาพ/ภาพสแกนหลายรูปเป็นไฟล์ PDF จัดเรียง ครอปตัด และหมุนภาพได้ตามต้องการ',
    settings: 'ตั้งค่า PDF',
    fileName: 'ชื่อไฟล์',
    pageSize: 'ขนาดหน้ากระดาษ',
    standardA4: 'ขนาดมาตรฐาน A4',
    originalRatio: 'ขนาดตามรูปต้นฉบับ',
    orientation: 'การวางแนวกระดาษ',
    portrait: 'แนวตั้ง',
    landscape: 'แนวนอน',
    margins: 'ระยะขอบกระดาษ',
    marginNone: 'ไม่มีขอบ (เต็มแผ่น)',
    marginSmall: 'ขอบขนาดเล็ก (10 มม.)',
    generatePdf: 'สร้างไฟล์ PDF',
    generating: 'กำลังสร้างไฟล์ PDF...',
    pages: 'หน้า',
    choosePhotos: 'เลือกรูปภาพ / ลากรูปมาวางที่นี่',
    supportFormats: 'รองรับไฟล์ภาพ JPG, PNG อัปโหลดพร้อมกันได้หลายรูป ปรับแต่งง่ายบนมือถือ',
    noPages: 'ยังไม่ได้อัปโหลดรูปภาพ',
    editCrop: 'แก้ไข',
    deletePage: 'ลบหน้านี้',
    editorTitle: 'เครื่องมือครอปตัดและหมุนภาพ',
    rotate: 'หมุน 90°',
    apply: 'ตกลง',
    dragInstructions: 'ลากที่มุมเพื่อครอปตัดส่วนที่ต้องการ',
    originalRatioNotice: 'เมื่อเลือก "ขนาดตามรูปต้นฉบับ" การวางแนวกระดาษและระยะขอบจะถูกกำหนดโดยอัตโนมัติตามรูปภาพของคุณ ไม่จำเป็นต้องตั้งค่าเพิ่มเติม',
  },
  en: {
    title: 'PDF Creator',
    subtitle: 'Compile multiple photos/scans into a clean PDF. Edit, crop, reorder pages.',
    settings: 'PDF Settings',
    fileName: 'File Name',
    pageSize: 'Page Size',
    standardA4: 'Standard A4',
    originalRatio: 'Original Ratio',
    orientation: 'Orientation',
    portrait: 'Portrait',
    landscape: 'Landscape',
    margins: 'Page Margins',
    marginNone: 'None (Full)',
    marginSmall: 'Small (10mm)',
    generatePdf: 'Generate PDF',
    generating: 'Compiling PDF...',
    pages: 'pages',
    choosePhotos: 'Choose / Drop Photos',
    supportFormats: 'Supports multiple JPG, PNG image uploads. Touch friendly.',
    noPages: 'No pages uploaded yet',
    editCrop: 'Edit',
    deletePage: 'Delete Page',
    editorTitle: 'Image Editor & Cropper',
    rotate: 'Rotate 90°',
    apply: 'Apply Crop',
    dragInstructions: 'Drag crop corners to adjust page bounds',
    originalRatioNotice: 'In "Original Ratio" mode, page orientation and margins are automatically determined by each image.',
  }
}

export default function PDFCreatorPage() {
  const [lang, setLang] = useState<'th' | 'en'>('th')
  const [images, setImages] = useState<ImagePage[]>([])
  const [editingImage, setEditingImage] = useState<ImagePage | null>(null)
  
  // Editor Modal Local State
  const [editorRotation, setEditorRotation] = useState(0)
  const [editorCrop, setEditorCrop] = useState({ x: 10, y: 10, w: 80, h: 80 })
  
  // PDF Options
  const [pageSize, setPageSize] = useState<'a4' | 'original'>('a4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [margin, setMargin] = useState<0 | 10>(0)
  const [pdfFileName, setPdfFileName] = useState('LouisAI_Document')
  const [generating, setGenerating] = useState(false)

  // Drag and Drop Dragged Item Index
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const t = dict[lang]

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const filesArray = Array.from(e.target.files)

    filesArray.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          const newImg: ImagePage = {
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            src: event.target.result as string,
            originalSrc: event.target.result as string,
            rotation: 0,
            cropPercent: { x: 0, y: 0, w: 100, h: 100 },
          }
          setImages((prev) => [...prev, newImg])
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = '' // Reset input
  }

  // Reordering Handlers (Desktop: Drag & Drop)
  const handleDragStart = (idx: number) => {
    setDraggedIndex(idx)
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
  }

  const handleDrop = (idx: number) => {
    if (draggedIndex === null || draggedIndex === idx) return
    const updated = [...images]
    const [draggedItem] = updated.splice(draggedIndex, 1)
    updated.splice(idx, 0, draggedItem)
    setImages(updated)
    setDraggedIndex(null)
  }

  // Reordering Handlers (Mobile: Shift Buttons)
  const moveLeft = (idx: number) => {
    if (idx === 0) return
    const updated = [...images]
    const temp = updated[idx]
    updated[idx] = updated[idx - 1]
    updated[idx - 1] = temp
    setImages(updated)
  }

  const moveRight = (idx: number) => {
    if (idx === images.length - 1) return
    const updated = [...images]
    const temp = updated[idx]
    updated[idx] = updated[idx + 1]
    updated[idx + 1] = temp
    setImages(updated)
  }

  // Delete Handler
  const deleteImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  const [cropRatioMode, setCropRatioMode] = useState<'free' | '1:1' | 'a4' | '4:3' | '16:9'>('free')
  const [editorImageRatio, setEditorImageRatio] = useState<number>(1)

  // Open Crop/Rotate Modal
  const openEditor = (img: ImagePage) => {
    setEditingImage(img)
    setEditorRotation(img.rotation)
    setEditorCrop({ ...img.cropPercent })
    setCropRatioMode('free') // Default to free on open
    
    // Load natural aspect ratio
    const tempImg = new Image()
    tempImg.src = img.originalSrc
    tempImg.onload = () => {
      const is90or270 = img.rotation === 90 || img.rotation === 270
      const width = is90or270 ? tempImg.height : tempImg.width
      const height = is90or270 ? tempImg.width : tempImg.height
      setEditorImageRatio(width / height)
    }
  }

  // Crop Box Editor Dragging Logic (Touch & Mouse friendly)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [activeHandle, setActiveHandle] = useState<string | null>(null) // 'tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r', 'move'

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, handle: string) => {
    e.stopPropagation()
    e.preventDefault()
    setActiveHandle(handle)
    setDragStart({ x: e.clientX, y: e.clientY })
    if (e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart || !activeHandle || !imageContainerRef.current) return
    e.preventDefault()

    const container = imageContainerRef.current.getBoundingClientRect()
    const dx = ((e.clientX - dragStart.x) / container.width) * 100
    const dy = ((e.clientY - dragStart.y) / container.height) * 100

    setEditorCrop((prev) => {
      let { x, y, w, h } = prev

      if (activeHandle === 'move') {
        x = Math.max(0, Math.min(100 - w, x + dx))
        y = Math.max(0, Math.min(100 - h, y + dy))
        return { x, y, w, h }
      }

      const isLocked = cropRatioMode !== 'free'
      let R_val = 1
      if (cropRatioMode === '1:1') R_val = 1
      else if (cropRatioMode === 'a4') R_val = 210 / 297
      else if (cropRatioMode === '4:3') R_val = 4 / 3
      else if (cropRatioMode === '16:9') R_val = 16 / 9

      const targetRatio = R_val / editorImageRatio // w / h target ratio in percentage space

      if (!isLocked) {
        // --- Free Mode: Drag 8 handles independently ---
        if (activeHandle === 'tl') {
          const newX = Math.max(0, Math.min(x + w - 10, x + dx))
          const newY = Math.max(0, Math.min(y + h - 10, y + dy))
          w = w - (newX - x)
          h = h - (newY - y)
          x = newX
          y = newY
        } else if (activeHandle === 'tr') {
          w = Math.max(10, Math.min(100 - x, w + dx))
          const newY = Math.max(0, Math.min(y + h - 10, y + dy))
          h = h - (newY - y)
          y = newY
        } else if (activeHandle === 'bl') {
          const newX = Math.max(0, Math.min(x + w - 10, x + dx))
          w = w - (newX - x)
          x = newX
          h = Math.max(10, Math.min(100 - y, h + dy))
        } else if (activeHandle === 'br') {
          w = Math.max(10, Math.min(100 - x, w + dx))
          h = Math.max(10, Math.min(100 - y, h + dy))
        } else if (activeHandle === 't') {
          const newY = Math.max(0, Math.min(y + h - 10, y + dy))
          h = h - (newY - y)
          y = newY
        } else if (activeHandle === 'b') {
          h = Math.max(10, Math.min(100 - y, h + dy))
        } else if (activeHandle === 'l') {
          const newX = Math.max(0, Math.min(x + w - 10, x + dx))
          w = w - (newX - x)
          x = newX
        } else if (activeHandle === 'r') {
          w = Math.max(10, Math.min(100 - x, w + dx))
        }
      } else {
        // --- Locked Aspect Ratio Mode: Scale proportionally ---
        if (activeHandle === 'br' || activeHandle === 'r' || activeHandle === 'b') {
          let newW = w + dx
          let newH = newW / targetRatio
          
          if (x + newW > 100) {
            newW = 100 - x
            newH = newW / targetRatio
          }
          if (y + newH > 100) {
            newH = 100 - y
            newW = newH * targetRatio
          }
          w = Math.max(10, newW)
          h = Math.max(10, newH)
        } else if (activeHandle === 'tl' || activeHandle === 't' || activeHandle === 'l') {
          const fixedX2 = x + w
          const fixedY2 = y + h
          let newW = w - dx
          let newH = newW / targetRatio
          
          let newX = fixedX2 - newW
          let newY = fixedY2 - newH
          
          if (newX < 0) {
            newX = 0
            newW = fixedX2 - newX
            newH = newW / targetRatio
            newY = fixedY2 - newH
          }
          if (newY < 0) {
            newY = 0
            newH = fixedY2 - newY
            newW = newH * targetRatio
            newX = fixedX2 - newW
          }
          
          x = newX
          y = newY
          w = Math.max(10, newW)
          h = Math.max(10, newH)
        } else if (activeHandle === 'tr') {
          const fixedX1 = x
          const fixedY2 = y + h
          let newW = w + dx
          let newH = newW / targetRatio
          
          let newY = fixedY2 - newH
          if (x + newW > 100) {
            newW = 100 - x
            newH = newW / targetRatio
            newY = fixedY2 - newH
          }
          if (newY < 0) {
            newY = 0
            newH = fixedY2 - newY
            newW = newH * targetRatio
          }
          
          y = newY
          w = Math.max(10, newW)
          h = Math.max(10, newH)
        } else if (activeHandle === 'bl') {
          const fixedX2 = x + w
          const fixedY1 = y
          let newW = w - dx
          let newH = newW / targetRatio
          
          let newX = fixedX2 - newW
          if (newX < 0) {
            newX = 0
            newW = fixedX2 - newX
            newH = newW / targetRatio
          }
          if (fixedY1 + newH > 100) {
            newH = 100 - fixedY1
            newW = newH * targetRatio
            newX = fixedX2 - newW
          }
          
          x = newX
          w = Math.max(10, newW)
          h = Math.max(10, newH)
        }
      }

      return { x, y, w, h }
    })

    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setActiveHandle(null)
    setDragStart(null)
    if (e.currentTarget.releasePointerCapture) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  // Rotate Handler
  const handleRotate = () => {
    setEditorRotation((prev) => {
      const nextRotation = (prev + 90) % 360
      setEditorImageRatio((r) => 1 / r)
      return nextRotation
    })
  }

  const handleRatioModeChange = (mode: 'free' | '1:1' | 'a4' | '4:3' | '16:9') => {
    setCropRatioMode(mode)
    if (mode === 'free') return

    let R_val = 1
    if (mode === '1:1') R_val = 1
    else if (mode === 'a4') R_val = 210 / 297
    else if (mode === '4:3') R_val = 4 / 3
    else if (mode === '16:9') R_val = 16 / 9

    const targetRatio = R_val / editorImageRatio // w/h in percent space

    // Snap crop box to center with the target ratio
    let newW = 80
    let newH = newW / targetRatio

    if (newH > 80) {
      newH = 80
      newW = newH * targetRatio
    }

    const newX = (100 - newW) / 2
    const newY = (100 - newH) / 2

    setEditorCrop({
      x: Math.max(0, Math.min(100, newX)),
      y: Math.max(0, Math.min(100, newY)),
      w: Math.max(10, Math.min(100, newW)),
      h: Math.max(10, Math.min(100, newH)),
    })
  }

  // Apply Changes (Process Canvas Cropping and Rotation)
  const saveEditedImage = () => {
    if (!editingImage) return

    const img = new Image()
    img.src = editingImage.originalSrc
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Determine dimensions based on rotation
      const is90or270 = editorRotation === 90 || editorRotation === 270
      const width = is90or270 ? img.height : img.width
      const height = is90or270 ? img.width : img.height

      // Extract Crop Pixels relative to rotated image bounds
      const cropX = (editorCrop.x / 100) * width
      const cropY = (editorCrop.y / 100) * height
      const cropW = (editorCrop.w / 100) * width
      const cropH = (editorCrop.h / 100) * height

      // Set Canvas to cropped output size
      canvas.width = cropW
      canvas.height = cropH

      // Transform context to rotate about cropped origin
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((editorRotation * Math.PI) / 180)

      // Draw rotated image centered, accounting for translation
      // (We map the un-rotated image coordinates back to original size)
      if (editorRotation === 0) {
        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropW,
          cropH,
          -canvas.width / 2,
          -canvas.height / 2,
          canvas.width / 2 * 2,
          canvas.height / 2 * 2
        )
      } else if (editorRotation === 90) {
        // Map rotated crop area back to original source img coordinates
        const srcX = (editorCrop.y / 100) * img.width
        const srcY = (1 - (editorCrop.x + editorCrop.w) / 100) * img.height
        const srcW = (editorCrop.h / 100) * img.width
        const srcH = (editorCrop.w / 100) * img.height

        ctx.drawImage(
          img,
          srcX,
          srcY,
          srcW,
          srcH,
          -canvas.height / 2,
          -canvas.width / 2,
          canvas.height,
          canvas.width
        )
      } else if (editorRotation === 180) {
        const srcX = (1 - (editorCrop.x + editorCrop.w) / 100) * img.width
        const srcY = (1 - (editorCrop.y + editorCrop.h) / 100) * img.height
        const srcW = (editorCrop.w / 100) * img.width
        const srcH = (editorCrop.h / 100) * img.height

        ctx.drawImage(
          img,
          srcX,
          srcY,
          srcW,
          srcH,
          -canvas.width / 2,
          -canvas.height / 2,
          canvas.width,
          canvas.height
        )
      } else if (editorRotation === 270) {
        const srcX = (1 - (editorCrop.y + editorCrop.h) / 100) * img.width
        const srcY = (editorCrop.x / 100) * img.height
        const srcW = (editorCrop.h / 100) * img.width
        const srcH = (editorCrop.w / 100) * img.height

        ctx.drawImage(
          img,
          srcX,
          srcY,
          srcW,
          srcH,
          -canvas.height / 2,
          -canvas.width / 2,
          canvas.height,
          canvas.width
        )
      }

      const croppedSrc = canvas.toDataURL('image/jpeg', 0.92)

      setImages((prev) =>
        prev.map((item) =>
          item.id === editingImage.id
            ? {
                ...item,
                src: croppedSrc,
                rotation: editorRotation,
                cropPercent: editorCrop,
              }
            : item
        )
      )
      setEditingImage(null)
    }
  }

  // Generate and Download PDF using jsPDF
  const generatePDF = async () => {
    if (images.length === 0) return
    setGenerating(true)

    try {
      let pdf: any = null

      for (let i = 0; i < images.length; i++) {
        const imgData = images[i].src
        
        // Wait to load dimensions
        await new Promise<void>((resolve) => {
          const img = new Image()
          img.src = imgData
          img.onload = () => {
            // Convert image pixels to mm at standard 96 DPI
            // (1 pixel = 25.4 / 96 = 0.264583 mm)
            const pxToMm = 25.4 / 96
            const imgW_mm = img.width * pxToMm
            const imgH_mm = img.height * pxToMm

            const imgIsLandscape = imgW_mm > imgH_mm
            const pageOrientation = pageSize === 'original'
              ? (imgIsLandscape ? 'landscape' : 'portrait')
              : orientation

            const pageFormat = pageSize === 'original'
              ? [imgW_mm, imgH_mm] as [number, number]
              : 'a4'

            if (i === 0) {
              pdf = new jsPDF({
                orientation: pageOrientation,
                unit: 'mm',
                format: pageFormat,
              })
            } else if (pdf) {
              pdf.addPage(pageFormat, pageOrientation)
            }

            if (pdf) {
              if (pageSize === 'original') {
                // For original ratio, draw the image covering 100% of the custom page size
                pdf.addImage(imgData, 'JPEG', 0, 0, imgW_mm, imgH_mm)
              } else {
                // For standard A4, scale and center it inside margins
                const pageW = pageOrientation === 'portrait' ? 210 : 297
                const pageH = pageOrientation === 'portrait' ? 297 : 210
                const m = margin

                const availW = pageW - m * 2
                const availH = pageH - m * 2

                const imgRatio = imgW_mm / imgH_mm
                const availRatio = availW / availH

                let destW = availW
                let destH = availH

                if (imgRatio > availRatio) {
                  destH = availW / imgRatio
                } else {
                  destW = availH * imgRatio
                }

                const x = m + (availW - destW) / 2
                const y = m + (availH - destH) / 2

                pdf.addImage(imgData, 'JPEG', x, y, destW, destH)
              }
            }
            resolve()
          }
        })
      }

      if (pdf) {
        pdf.save(`${pdfFileName.trim() || 'LouisAI_Document'}.pdf`)
      }
    } catch (e) {
      console.error(e)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">{t.title}</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {t.subtitle}
        </p>
      </div>

      {/* Main Grid: Options on Left, Images List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* PDF Configuration Options Panel */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-500" />
              <h3 className="font-extrabold text-base">{t.settings}</h3>
            </div>
            
            {/* Language Toggle */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 border border-slate-200/50 dark:border-slate-800/80 rounded-lg">
              <button
                type="button"
                onClick={() => setLang('th')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  lang === 'th'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-250'
                }`}
              >
                TH
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  lang === 'en'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-250'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Filename Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t.fileName}
              </label>
              <input
                type="text"
                value={pdfFileName}
                onChange={(e) => setPdfFileName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium"
              />
            </div>

            {/* Page Size Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t.pageSize}
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200/60 dark:border-slate-850 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPageSize('a4')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pageSize === 'a4'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t.standardA4}
                </button>
                <button
                  type="button"
                  onClick={() => setPageSize('original')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    pageSize === 'original'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t.originalRatio}
                </button>
              </div>
            </div>

            {/* Page Orientation */}
            <div className={`space-y-2 transition-all duration-300 ${
              pageSize === 'original' ? 'opacity-40 pointer-events-none select-none' : ''
            }`}>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t.orientation}
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200/60 dark:border-slate-850 rounded-xl">
                <button
                  type="button"
                  disabled={pageSize === 'original'}
                  onClick={() => setOrientation('portrait')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    orientation === 'portrait'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t.portrait}
                </button>
                <button
                  type="button"
                  disabled={pageSize === 'original'}
                  onClick={() => setOrientation('landscape')}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    orientation === 'landscape'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t.landscape}
                </button>
              </div>
            </div>

            {/* Margins */}
            <div className={`space-y-2 transition-all duration-300 ${
              pageSize === 'original' ? 'opacity-40 pointer-events-none select-none' : ''
            }`}>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t.margins}
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200/60 dark:border-slate-850 rounded-xl">
                <button
                  type="button"
                  disabled={pageSize === 'original'}
                  onClick={() => setMargin(0)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    margin === 0
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t.marginNone}
                </button>
                <button
                  type="button"
                  disabled={pageSize === 'original'}
                  onClick={() => setMargin(10)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    margin === 10
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t.marginSmall}
                </button>
              </div>
            </div>

            {/* Original Ratio Help Info */}
            {pageSize === 'original' && (
              <div className="text-[11px] text-indigo-400 font-semibold leading-relaxed bg-indigo-500/5 dark:bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 mt-2 flex items-start gap-2">
                <span className="text-base leading-none select-none">ℹ️</span>
                <span>{t.originalRatioNotice}</span>
              </div>
            )}
          </div>

          {/* Action Trigger */}
          <button
            onClick={generatePDF}
            disabled={images.length === 0 || generating}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] cursor-pointer"
          >
            <FileDown className="h-5 w-5" />
            {generating ? t.generating : `${t.generatePdf} (${images.length} ${lang === 'th' ? t.pages : images.length > 1 ? 'pages' : 'page'})`}
          </button>
        </div>

        {/* Images Reordering and Upload Panel (Right 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Area */}
          {images.length > 0 ? (
            <div className="relative group border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500 rounded-xl p-3 bg-white dark:bg-slate-900/10 backdrop-blur transition-all duration-300">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex items-center justify-center gap-2">
                <Upload className="h-5 w-5 text-indigo-500" />
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  {lang === 'th' ? 'อัปโหลดรูปภาพเพิ่ม...' : 'Upload more photos...'}
                </span>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 group-hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900/20 backdrop-blur transition-all duration-300">
                <div className="p-3.5 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 rounded-2xl mb-4 group-hover:scale-105 transition-all">
                  <Upload className="h-7 w-7" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                  {t.choosePhotos}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                  {t.supportFormats}
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {images.length === 0 && (
            <div className="bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-850 p-12 text-center text-slate-500 rounded-2xl flex flex-col items-center gap-3">
              <FileImage className="h-10 w-10 text-slate-400" />
              <p className="font-semibold text-sm">{t.noPages}</p>
            </div>
          )}

          {/* Images Grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  className={`bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-850 rounded-xl overflow-hidden shadow-sm relative group transition-all cursor-move ${
                    draggedIndex === idx ? 'opacity-40 border-indigo-500 border-2' : ''
                  }`}
                >
                  {/* Page index badge */}
                  <span className="absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-full bg-slate-950/80 backdrop-blur border border-slate-800 text-white flex items-center justify-center font-mono text-xs font-bold">
                    {idx + 1}
                  </span>

                  {/* Thumbnail Image Container */}
                  <div className="aspect-[3/4] bg-slate-950 flex items-center justify-center relative overflow-hidden select-none">
                    <img
                      src={img.src}
                      alt={img.name}
                      className="max-w-full max-h-full object-contain pointer-events-none"
                    />
                  </div>

                  {/* Desktop Action Handles & Mobile shifting */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-1.5">
                    {/* Shift Left */}
                    <button
                      onClick={() => moveLeft(idx)}
                      disabled={idx === 0}
                      className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20 transition-all rounded-lg hover:bg-slate-200 dark:hover:bg-slate-850"
                      title={lang === 'th' ? 'เลื่อนไปซ้าย' : 'Move Left'}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    {/* Editor Trigger */}
                    <button
                      onClick={() => openEditor(img)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] rounded-lg transition-all"
                      title={t.editCrop}
                    >
                      <Crop className="h-3.5 w-3.5" />
                      {t.editCrop}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteImage(img.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-all rounded-lg hover:bg-slate-200 dark:hover:bg-slate-850"
                      title={t.deletePage}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {/* Shift Right */}
                    <button
                      onClick={() => moveRight(idx)}
                      disabled={idx === images.length - 1}
                      className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20 transition-all rounded-lg hover:bg-slate-200 dark:hover:bg-slate-850"
                      title={lang === 'th' ? 'เลื่อนไปขวา' : 'Move Right'}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Editor Modal (Touch crop & Rotate) */}
      {editingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setEditingImage(null)} />

          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-6 text-slate-100 animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <Crop className="h-5.5 w-5.5 text-indigo-500" />
                {t.editorTitle}
              </h3>
              <button
                onClick={() => setEditingImage(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Editor workspace */}
            <div className="flex flex-col items-center justify-center bg-slate-950 p-4 rounded-xl border border-slate-850 min-h-[300px] max-h-[420px] overflow-hidden relative select-none">
              <div
                ref={imageContainerRef}
                className="relative max-h-full max-w-full"
                style={{
                  transform: `rotate(${editorRotation}deg)`,
                  transition: 'transform 0.25s ease',
                }}
              >
                <img
                  src={editingImage.originalSrc}
                  alt="Original"
                  className="max-h-[300px] max-w-full object-contain pointer-events-none select-none"
                />

                {/* Draggable Cropping Frame box overlay */}
                <div
                  onPointerMove={handlePointerMove}
                  className="absolute border-2 border-dashed border-indigo-400 bg-indigo-500/10 cursor-move"
                  style={{
                    left: `${editorCrop.x}%`,
                    top: `${editorCrop.y}%`,
                    width: `${editorCrop.w}%`,
                    height: `${editorCrop.h}%`,
                  }}
                  onPointerDown={(e) => handlePointerDown(e, 'move')}
                  onPointerUp={handlePointerUp}
                >
                  {/* Resize Drag Handles at 4 Corners */}
                  <div
                    className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-indigo-400 border border-white rounded-full cursor-nwse-resize touch-none z-20"
                    onPointerDown={(e) => handlePointerDown(e, 'tl')}
                    onPointerUp={handlePointerUp}
                  />
                  <div
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-400 border border-white rounded-full cursor-nesw-resize touch-none z-20"
                    onPointerDown={(e) => handlePointerDown(e, 'tr')}
                    onPointerUp={handlePointerUp}
                  />
                  <div
                    className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-indigo-400 border border-white rounded-full cursor-nesw-resize touch-none z-20"
                    onPointerDown={(e) => handlePointerDown(e, 'bl')}
                    onPointerUp={handlePointerUp}
                  />
                  <div
                    className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-400 border border-white rounded-full cursor-nwse-resize touch-none z-20"
                    onPointerDown={(e) => handlePointerDown(e, 'br')}
                    onPointerUp={handlePointerUp}
                  />

                  {/* 4 Side Edges Handles (Only visible in Free mode) */}
                  {cropRatioMode === 'free' && (
                    <>
                      {/* Top Edge */}
                      <div
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-indigo-400 border border-white rounded-full cursor-ns-resize touch-none z-10 hover:bg-indigo-300"
                        onPointerDown={(e) => handlePointerDown(e, 't')}
                        onPointerUp={handlePointerUp}
                      />
                      {/* Bottom Edge */}
                      <div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-indigo-400 border border-white rounded-full cursor-ns-resize touch-none z-10 hover:bg-indigo-300"
                        onPointerDown={(e) => handlePointerDown(e, 'b')}
                        onPointerUp={handlePointerUp}
                      />
                      {/* Left Edge */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-8 bg-indigo-400 border border-white rounded-full cursor-ew-resize touch-none z-10 hover:bg-indigo-300"
                        onPointerDown={(e) => handlePointerDown(e, 'l')}
                        onPointerUp={handlePointerUp}
                      />
                      {/* Right Edge */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-8 bg-indigo-400 border border-white rounded-full cursor-ew-resize touch-none z-10 hover:bg-indigo-300"
                        onPointerDown={(e) => handlePointerDown(e, 'r')}
                        onPointerUp={handlePointerUp}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Aspect Ratio Presets */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-center">
                {lang === 'th' ? 'อัตราส่วนการครอปตัด' : 'Crop Aspect Ratio'}
              </label>
              <div className="flex flex-wrap justify-center gap-1.5 bg-slate-950 p-1.5 border border-slate-800 rounded-xl">
                {[
                  { mode: 'free', label: lang === 'th' ? 'อิสระ' : 'Free' },
                  { mode: '1:1', label: '1:1' },
                  { mode: 'a4', label: 'A4' },
                  { mode: '4:3', label: '4:3' },
                  { mode: '16:9', label: '16:9' },
                ].map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => handleRatioModeChange(item.mode as any)}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      cropRatioMode === item.mode
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-800 items-center justify-between">
              {/* Tooltip instructions */}
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Maximize className="h-3.5 w-3.5" />
                {t.dragInstructions}
              </span>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRotate}
                  className="flex-1 sm:flex-initial py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-slate-100 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCw className="h-4.5 w-4.5" />
                  {t.rotate}
                </button>
                <button
                  type="button"
                  onClick={saveEditedImage}
                  className="flex-1 sm:flex-initial py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="h-4.5 w-4.5" />
                  {t.apply}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
