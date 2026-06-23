'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Upload, 
  FileText, 
  Trash2, 
  RotateCw, 
  Crop, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  Plus, 
  Check, 
  X, 
  Info
} from 'lucide-react'
import jsPDF from 'jspdf'

interface ImageItem {
  id: string
  name: string
  src: string        // original base64 or objectUrl
  editedSrc: string  // cropped / rotated base64 or objectUrl
  rotation: number   // 0, 90, 180, 270
  cropData?: {
    x: number        // percentage (0-100)
    y: number
    w: number
    h: number
  }
}

export default function PdfCreatorPage() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'original'>('a4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto')
  const [margin, setMargin] = useState<'none' | 'small' | 'medium'>('none')
  const [generating, setGenerating] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Editor Modal States
  const [editingItem, setEditingItem] = useState<ImageItem | null>(null)
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, w: 80, h: 80 }) // percentages
  const [cropRotation, setCropRotation] = useState(0)
  const editorImgRef = useRef<HTMLImageElement | null>(null)
  const cropBoxRef = useRef<HTMLDivElement | null>(null)
  const isDraggingCrop = useRef(false)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const cropBoxStart = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const isResizingCrop = useRef<string | null>(null) // 'nw', 'ne', 'se', 'sw'

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Handle File Upload
  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const newItems: ImageItem[] = []
    
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        if (result) {
          setImages((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substring(2, 9),
              name: file.name,
              src: result,
              editedSrc: result,
              rotation: 0
            }
          ])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  // Delete Image
  const handleDelete = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  // Reorder Functions (Mobile & Quick Controls)
  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === images.length - 1) return
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const updated = [...images]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setImages(updated)
  }

  // Drag and Drop Handlers (Desktop)
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
  }

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return
    const updated = [...images]
    const draggedItem = updated[draggedIndex]
    updated.splice(draggedIndex, 1)
    updated.splice(index, 0, draggedItem)
    setImages(updated)
    setDraggedIndex(null)
  }

  // Edit / Crop Modal Opening
  const openEditor = (item: ImageItem) => {
    setEditingItem(item)
    setCropRotation(item.rotation)
    setCropBox(
      item.cropData || { x: 10, y: 10, w: 80, h: 80 }
    )
  }

  // Image Rotation in Editor
  const rotateImage = () => {
    setCropRotation((prev) => (prev + 90) % 360)
  }

  // Draggable / Resizable Crop Box Logic (Touch & Mouse Support)
  const handleCropMouseDown = (e: React.MouseEvent | React.TouchEvent, resizeCorner: string | null = null) => {
    e.preventDefault()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    dragStartPos.current = { x: clientX, y: clientY }
    cropBoxStart.current = { ...cropBox }
    
    if (resizeCorner) {
      isResizingCrop.current = resizeCorner
    } else {
      isDraggingCrop.current = true
    }
  }

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!editingItem || (!isDraggingCrop.current && !isResizingCrop.current)) return
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      
      const deltaX = clientX - dragStartPos.current.x
      const deltaY = clientY - dragStartPos.current.y
      
      const container = editorImgRef.current?.parentElement
      if (!container) return
      
      const containerRect = container.getBoundingClientRect()
      const pctDeltaX = (deltaX / containerRect.width) * 100
      const pctDeltaY = (deltaY / containerRect.height) * 100
      
      setCropBox((prev) => {
        let newX = prev.x
        let newY = prev.y
        let newW = prev.w
        let newH = prev.h
        
        if (isDraggingCrop.current) {
          newX = Math.max(0, Math.min(100 - prev.w, cropBoxStart.current.x + pctDeltaX))
          newY = Math.max(0, Math.min(100 - prev.h, cropBoxStart.current.y + pctDeltaY))
        } else if (isResizingCrop.current) {
          const corner = isResizingCrop.current
          if (corner.includes('e')) {
            newW = Math.max(10, Math.min(100 - prev.x, cropBoxStart.current.w + pctDeltaX))
          }
          if (corner.includes('w')) {
            const potentialW = cropBoxStart.current.w - pctDeltaX
            if (potentialW >= 10) {
              newX = Math.max(0, cropBoxStart.current.x + pctDeltaX)
              newW = cropBoxStart.current.w - (newX - cropBoxStart.current.x)
            }
          }
          if (corner.includes('s')) {
            newH = Math.max(10, Math.min(100 - prev.y, cropBoxStart.current.h + pctDeltaY))
          }
          if (corner.includes('n')) {
            const potentialH = cropBoxStart.current.h - pctDeltaY
            if (potentialH >= 10) {
              newY = Math.max(0, cropBoxStart.current.y + pctDeltaY)
              newH = cropBoxStart.current.h - (newY - cropBoxStart.current.y)
            }
          }
        }
        
        return { x: newX, y: newY, w: newW, h: newH }
      })
    }

    const handleUp = () => {
      isDraggingCrop.current = false
      isResizingCrop.current = null
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [editingItem])

  // Save Crop & Rotate Edits
  const saveEdits = () => {
    if (!editingItem) return
    
    const img = new Image()
    img.src = editingItem.src
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      // Calculate crop coordinates
      const cropX = (cropBox.x / 100) * img.naturalWidth
      const cropY = (cropBox.y / 100) * img.naturalHeight
      const cropW = (cropBox.w / 100) * img.naturalWidth
      const cropH = (cropBox.h / 100) * img.naturalHeight
      
      // Setup canvas size based on crop dimensions & rotation
      const is90or270 = cropRotation === 90 || cropRotation === 270
      canvas.width = is90or270 ? cropH : cropW
      canvas.height = is90or270 ? cropW : cropH
      
      // Translate & rotate canvas
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((cropRotation * Math.PI) / 180)
      
      // Draw image segment onto canvas
      ctx.drawImage(
        img,
        cropX, cropY, cropW, cropH,
        -cropW / 2, -cropH / 2, cropW, cropH
      )
      
      const editedSrc = canvas.toDataURL('image/jpeg', 0.9)
      
      setImages((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                editedSrc,
                rotation: cropRotation,
                cropData: cropBox
              }
            : item
        )
      )
      setEditingItem(null)
    }
  }

  // Generate & Download PDF
  const generatePdf = async () => {
    if (images.length === 0) return
    setGenerating(true)
    
    try {
      // Initialize jsPDF
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      })
      
      // Page size constants in mm
      const a4Width = 210
      const a4Height = 297
      const letterWidth = 215.9
      const letterHeight = 279.4
      
      const marginSize = margin === 'none' ? 0 : margin === 'small' ? 10 : 20

      for (let i = 0; i < images.length; i++) {
        const item = images[i]
        
        // Add new page for subsequent items
        if (i > 0) {
          pdf.addPage()
        }
        
        // Get image dimensions
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image()
          image.src = item.editedSrc
          image.onload = () => resolve(image)
          image.onerror = (err) => reject(err)
        })
        
        const imgWidth = img.naturalWidth
        const imgHeight = img.naturalHeight
        
        // Determine PDF page width and height
        let pageW = a4Width
        let pageH = a4Height
        
        if (pageSize === 'letter') {
          pageW = letterWidth
          pageH = letterHeight
        } else if (pageSize === 'original') {
          // Convert pixels to mm roughly (1 pixel = 0.264583 mm)
          pageW = imgWidth * 0.264583
          pageH = imgHeight * 0.264583
          // Set custom page size
          pdf.setPage(i + 1)
          // @ts-ignore
          pdf.internal.pageSize.width = pageW
          // @ts-ignore
          pdf.internal.pageSize.height = pageH
        }
        
        // Determine orientation
        let finalOrientation: 'portrait' | 'landscape' = 'portrait'
        if (orientation === 'landscape' || (orientation === 'auto' && imgWidth > imgHeight)) {
          finalOrientation = 'landscape'
        }
        
        // Swap dimensions if landscape
        if (finalOrientation === 'landscape' && pageSize !== 'original') {
          const temp = pageW
          pageW = pageH
          pageH = temp
        }
        
        // Apply orientation to PDF page
        if (pageSize !== 'original') {
          pdf.setPage(i + 1)
          // @ts-ignore
          pdf.internal.pageSize.width = pageW
          // @ts-ignore
          pdf.internal.pageSize.height = pageH
        }

        // Calculate printable area
        const printableWidth = pageW - marginSize * 2
        const printableHeight = pageH - marginSize * 2
        
        // Calculate image aspect ratio scale fit
        const imgRatio = imgWidth / imgHeight
        const printableRatio = printableWidth / printableHeight
        
        let drawWidth = printableWidth
        let drawHeight = printableHeight
        
        if (imgRatio > printableRatio) {
          // Image is wider than printable area
          drawHeight = printableWidth / imgRatio
        } else {
          // Image is taller than printable area
          drawWidth = printableHeight * imgRatio
        }
        
        // Center image within margins
        const xOffset = marginSize + (printableWidth - drawWidth) / 2
        const yOffset = marginSize + (printableHeight - drawHeight) / 2
        
        pdf.addImage(
          item.editedSrc,
          'JPEG',
          xOffset,
          yOffset,
          drawWidth,
          drawHeight
        )
      }
      
      pdf.save(`LouisAI_PDF_${Date.now()}.pdf`)
    } catch (err) {
      console.error('PDF Generation Failed:', err)
      alert('ไม่สามารถสร้างไฟล์ PDF ได้ โปรดลองใหม่อีกครั้ง')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-8 select-none max-w-4xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <FileText className="h-8 w-8 text-emerald-500" />
            PDF Creator & Image Editor
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            จัดเรียง ครอบรูปภาพ และหมุนภาพ พร้อมรวมไฟล์เป็น PDF เอกสารคุณภาพสูง
          </p>
        </div>
        
        <button
          onClick={generatePdf}
          disabled={images.length === 0 || generating}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-950/20 transition-all duration-200 transform active:scale-95 shrink-0"
        >
          {generating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>กำลังสร้าง PDF...</span>
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              <span>ดาวน์โหลดไฟล์ PDF ({images.length} หน้า)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Grid & Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload & Grid Area */}
        <div className="lg:col-span-2 space-y-6">
          {images.length === 0 ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-900/30 hover:bg-slate-900/50 rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center space-y-4 min-h-[350px]"
            >
              <div className="p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl group-hover:scale-115 transition-transform duration-300">
                <Upload className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-white font-bold text-base">อัปโหลดรูปภาพเพื่อเริ่มทำ PDF</h3>
                <p className="text-sm text-slate-400 max-w-xs">
                  ลากไฟล์รูปภาพมาวางที่นี่ หรือคลิกเพื่อค้นหาและเลือกรูปภาพ
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-500">
                <Info className="h-3.5 w-3.5" />
                รองรับไฟล์ PNG, JPG, JPEG
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  ลำดับหน้าในเอกสาร ({images.length} หน้า)
                </span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  เพิ่มรูปภาพ
                </button>
              </div>
              
              {/* Image Grid with Drag-n-Drop & Quick Reorder */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    className={`bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 space-y-3 relative group transition-all duration-200 ${
                      draggedIndex === idx ? 'opacity-30 border-emerald-500' : 'hover:border-slate-700'
                    } cursor-grab active:cursor-grabbing`}
                  >
                    {/* Page Index Badge */}
                    <div className="absolute top-4 left-4 z-10 px-2 py-0.5 bg-slate-950/80 backdrop-blur border border-slate-800 text-[10px] font-bold text-slate-300 rounded-lg">
                      หน้า {idx + 1}
                    </div>

                    {/* Image Preview Container */}
                    <div className="aspect-[3/4] w-full bg-slate-950 rounded-xl overflow-hidden relative flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={img.editedSrc} 
                        alt={img.name} 
                        className="max-w-full max-h-full object-contain pointer-events-none"
                      />
                    </div>

                    {/* Image Label */}
                    <div className="truncate text-xs font-medium text-slate-300 px-1">
                      {img.name}
                    </div>

                    {/* Action Controls */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => openEditor(img)}
                        className="flex items-center justify-center gap-1 py-1.5 bg-slate-800/60 hover:bg-emerald-600 hover:text-white text-slate-300 text-[10px] font-bold rounded-xl border border-slate-700/40 hover:border-emerald-500/30 transition-all"
                      >
                        <Crop className="h-3 w-3" />
                        ครอบ/หมุน
                      </button>
                      <button
                        onClick={() => handleDelete(img.id)}
                        className="flex items-center justify-center gap-1 py-1.5 bg-slate-800/60 hover:bg-rose-600 hover:text-white text-slate-300 text-[10px] font-bold rounded-xl border border-slate-700/40 hover:border-rose-500/30 transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                        ลบออก
                      </button>
                    </div>

                    {/* Quick Move Reorder Buttons for Mobile */}
                    <div className="flex gap-1">
                      <button
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, 'up')}
                        className="flex-1 flex items-center justify-center py-1 bg-slate-950/40 hover:bg-slate-900 border border-slate-855 text-slate-400 hover:text-white rounded-lg disabled:opacity-20 transition-all"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled={idx === images.length - 1}
                        onClick={() => moveItem(idx, 'down')}
                        className="flex-1 flex items-center justify-center py-1 bg-slate-950/40 hover:bg-slate-900 border border-slate-855 text-slate-400 hover:text-white rounded-lg disabled:opacity-20 transition-all"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Setting Options sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-850 pb-4">
              🛠️ การตั้งค่าเอกสาร
            </h2>

            {/* Page Size Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                ขนาดหน้ากระดาษ (Page Size)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'a4', label: 'A4' },
                  { value: 'letter', label: 'Letter' },
                  { value: 'original', label: 'ขนาดจริง' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPageSize(opt.value as any)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      pageSize === opt.value
                        ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                การวางแนว (Orientation)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'auto', label: 'ออโต้' },
                  { value: 'portrait', label: 'แนวตั้ง' },
                  { value: 'landscape', label: 'แนวนอน' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setOrientation(opt.value as any)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      orientation === opt.value
                        ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Margin Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                ระยะขอบกระดาษ (Margins)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'none', label: 'ไม่มีขอบ' },
                  { value: 'small', label: 'ขอบแคบ' },
                  { value: 'medium', label: 'ขอบกลาง' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMargin(opt.value as any)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                      margin === opt.value
                        ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl text-[11px] text-slate-400 space-y-2 leading-relaxed">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-emerald-500" /> คำแนะนำ
              </div>
              <p>1. แนะนำอัปโหลดรูปภาพที่มีแนวทิศทางเดียวกันเพื่อความสวยงาม</p>
              <p>2. สามารถคลิก **"ครอบ/หมุน"** บนหน้าพรีวิวเพื่อครอบตัดภาพหรือแก้ทิศทางของสลิปที่เอียงได้</p>
              <p>3. จัดลำดับใหม่ได้โดยการ **ลากการ์ดสลับที่กัน** หรือใช้ปุ่มลูกศร ⬆️ ⬇️ ด้านล่างของแต่ละการ์ด</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*"
        className="hidden"
      />

      {/* ── Visual Canvas Editor Modal ── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-850 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-base">ครอบตัด & หมุนรูปภาพ</h3>
                <p className="text-xs text-slate-400">ใช้นิ้วลากขอบครอบเพื่อตัด และหมุนภาพให้ตรงทิศทาง</p>
              </div>
              <button 
                onClick={() => setEditingItem(null)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Canvas Working Area */}
            <div className="flex-1 bg-slate-950 p-6 flex items-center justify-center overflow-auto min-h-[300px] relative">
              <div 
                className="relative max-w-full max-h-[50vh] flex items-center justify-center select-none"
                style={{ transform: `rotate(${cropRotation}deg)`, transition: 'transform 0.2s ease-out' }}
              >
                {/* Image under edit */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={editorImgRef}
                  src={editingItem.src}
                  alt="Editor Mode"
                  className="max-w-full max-h-[50vh] object-contain pointer-events-none rounded-lg"
                />

                {/* Draggable Crop Frame */}
                <div
                  ref={cropBoxRef}
                  onMouseDown={(e) => handleCropMouseDown(e)}
                  onTouchStart={(e) => handleCropMouseDown(e)}
                  className="absolute border-2 border-emerald-500 bg-emerald-500/10 cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] rounded-sm"
                  style={{
                    left: `${cropBox.x}%`,
                    top: `${cropBox.y}%`,
                    width: `${cropBox.w}%`,
                    height: `${cropBox.h}%`
                  }}
                >
                  {/* Resize Handles for Crop Box */}
                  {['nw', 'ne', 'se', 'sw'].map((corner) => (
                    <div
                      key={corner}
                      onMouseDown={(e) => handleCropMouseDown(e, corner)}
                      onTouchStart={(e) => handleCropMouseDown(e, corner)}
                      className={`absolute w-4 h-4 bg-emerald-500 border border-white rounded-full -translate-x-1/2 -translate-y-1/2 cursor-crosshair z-20 ${
                        corner === 'nw' ? 'top-0 left-0' :
                        corner === 'ne' ? 'top-0 left-full' :
                        corner === 'se' ? 'top-full left-full' : 'top-full left-0'
                      }`}
                    />
                  ))}
                  
                  {/* Aspect Helper Center indicator */}
                  <div className="absolute inset-0 border border-emerald-500/30 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    <div className="border-r border-b border-emerald-500/20" />
                    <div className="border-r border-b border-emerald-500/20" />
                    <div className="border-b border-emerald-500/20" />
                    <div className="border-r border-b border-emerald-500/20" />
                    <div className="border-r border-b border-emerald-500/20" />
                    <div className="border-b border-emerald-500/20" />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-850 flex justify-between items-center gap-3">
              <button
                onClick={rotateImage}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700/50 transition-all"
              >
                <RotateCw className="h-4 w-4" />
                <span>หมุนภาพ 90°</span>
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-sm font-semibold rounded-xl transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={saveEdits}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
                >
                  <Check className="h-4 w-4" />
                  บันทึกการแก้ไข
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
