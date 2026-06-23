'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
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
  Info,
  Maximize2
} from 'lucide-react'
import jsPDF from 'jspdf'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ImageItem {
  id: string
  name: string
  src: string       // original base64
  editedSrc: string // cropped / rotated base64
  rotation: number  // 0, 90, 180, 270
  cropData?: CropBox
}

/** All values are 0-100 percentages relative to the displayed image bounds */
interface CropBox {
  x: number
  y: number
  w: number
  h: number
}

type RatioMode = 'free' | '1:1' | 'a4' | '4:3' | '16:9'
type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function getTargetRatio(mode: RatioMode, imgW: number, imgH: number, rotation: number): number {
  // For A4 we need to know if the effective image is landscape or portrait
  const is90or270 = rotation === 90 || rotation === 270
  const effectiveW = is90or270 ? imgH : imgW
  const effectiveH = is90or270 ? imgW : imgH

  if (mode === '1:1') return 1
  if (mode === '4:3') return 4 / 3
  if (mode === '16:9') return 16 / 9
  if (mode === 'a4') {
    return effectiveW > effectiveH ? 297 / 210 : 210 / 297
  }
  return -1 // free
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PdfCreatorPage() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'original'>('a4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto')
  const [margin, setMargin] = useState<'none' | 'small' | 'medium'>('none')
  const [generating, setGenerating] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // ── Editor Modal States ───────────────────────────────────────────────────
  const [editingItem, setEditingItem] = useState<ImageItem | null>(null)
  const [cropBox, setCropBox] = useState<CropBox>({ x: 10, y: 10, w: 80, h: 80 })
  const [cropRotation, setCropRotation] = useState(0)
  const [cropRatioMode, setCropRatioMode] = useState<RatioMode>('free')

  // Refs for crop interaction
  const cropOverlayRef = useRef<HTMLDivElement | null>(null)  // the overlay that receives coordinates
  const editorImgRef = useRef<HTMLImageElement | null>(null)

  const interactionRef = useRef<{
    type: 'drag' | 'resize'
    handle: ResizeHandle | null
    startClientX: number
    startClientY: number
    startBox: CropBox
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // ── File Handling ─────────────────────────────────────────────────────────

  const handleFiles = (files: FileList | null) => {
    if (!files) return
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
    e.target.value = ''
  }

  // ── Delete & Reorder ──────────────────────────────────────────────────────

  const handleDelete = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

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

  const handleDragStart = (index: number) => setDraggedIndex(index)
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return
    const updated = [...images]
    const item = updated.splice(draggedIndex, 1)[0]
    updated.splice(index, 0, item)
    setImages(updated)
    setDraggedIndex(null)
  }

  // ── Editor Opening ────────────────────────────────────────────────────────

  const openEditor = (item: ImageItem) => {
    setEditingItem(item)
    setCropRotation(item.rotation)
    setCropRatioMode('free')
    setCropBox(item.cropData ?? { x: 10, y: 10, w: 80, h: 80 })
  }

  // ── Rotation ──────────────────────────────────────────────────────────────

  const rotateImage = () => {
    setCropRotation((prev) => (prev + 90) % 360)
    // Reset crop to full image after rotation to avoid confusion
    setCropBox({ x: 5, y: 5, w: 90, h: 90 })
    setCropRatioMode('free')
  }

  // ── Aspect Ratio Presets ──────────────────────────────────────────────────

  const handleRatioModeChange = (mode: RatioMode) => {
    setCropRatioMode(mode)
    if (mode === 'free') return

    const img = editorImgRef.current
    if (!img) return

    const ratio = getTargetRatio(mode, img.naturalWidth, img.naturalHeight, cropRotation)
    if (ratio < 0) return

    // We work in % of the displayed image container, which always has ratio imgW/imgH (unrotated)
    // The crop box percentages are relative to the rotated display dimensions.
    // We want an 80% wide box by default, then derive height from the target ratio.
    // But "ratio" here is width/height in image-pixel space.
    // The displayed overlay container is always the same aspect as the rotated image,
    // so we can just set w/h in terms of display percentages.
    // We'll use 80% width max then derive height:
    const displayRatio = ratio // same ratio because overlay matches rotated image dims
    let newW = 80
    let newH = newW / displayRatio
    if (newH > 90) {
      newH = 90
      newW = newH * displayRatio
    }
    if (newW > 90) {
      newW = 90
      newH = newW / displayRatio
    }
    const newX = (100 - newW) / 2
    const newY = (100 - newH) / 2
    setCropBox({ x: newX, y: newY, w: newW, h: newH })
  }

  // ── Crop Interaction ──────────────────────────────────────────────────────
  // 
  // The crop overlay sits directly on top of the image (after rotation is applied
  // to the image via CSS transform). The overlay itself does NOT rotate — it
  // always has the same bounding rect as the displayed (rotated) image. This
  // means crop percentages map 1-to-1 to the overlay container pixels.
  //
  // On mousedown / touchstart we record:
  //   • type: drag or resize
  //   • handle: which corner/edge
  //   • startClientX / Y: pointer position in screen px
  //   • startBox: the crop box at interaction start
  //
  // On move we convert the pointer delta into % relative to overlay dims.

  const getClientXY = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      const t = (e as TouchEvent | React.TouchEvent).touches
      if (t.length > 0) return { clientX: t[0].clientX, clientY: t[0].clientY }
      // touchend has no touches, use changedTouches
      const ct = (e as any).changedTouches
      if (ct && ct.length > 0) return { clientX: ct[0].clientX, clientY: ct[0].clientY }
    }
    return { clientX: (e as MouseEvent | React.MouseEvent).clientX, clientY: (e as MouseEvent | React.MouseEvent).clientY }
  }

  const handleInteractionStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, handle: ResizeHandle | null) => {
      e.stopPropagation()
      if (e.cancelable) e.preventDefault()

      const { clientX, clientY } = getClientXY(e)

      interactionRef.current = {
        type: handle ? 'resize' : 'drag',
        handle,
        startClientX: clientX,
        startClientY: clientY,
        startBox: { ...cropBox }
      }
    },
    [cropBox]
  )

  useEffect(() => {
    if (!editingItem) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!interactionRef.current) return
      if (e.cancelable) e.preventDefault()

      const overlay = cropOverlayRef.current
      if (!overlay) return

      const rect = overlay.getBoundingClientRect()
      const overlayW = rect.width
      const overlayH = rect.height

      const { clientX, clientY } = getClientXY(e)
      const { startClientX, startClientY, startBox, type, handle } = interactionRef.current

      // Convert pixel delta → percentage of overlay dimensions
      const dpx = clientX - startClientX
      const dpy = clientY - startClientY
      const dx = (dpx / overlayW) * 100
      const dy = (dpy / overlayH) * 100

      if (type === 'drag') {
        const newX = clamp(startBox.x + dx, 0, 100 - startBox.w)
        const newY = clamp(startBox.y + dy, 0, 100 - startBox.h)
        setCropBox({ ...startBox, x: newX, y: newY })
        return
      }

      // ── Resize ──
      if (!handle) return

      const img = editorImgRef.current
      const ratioMode = cropRatioMode

      let { x: left, y: top, w, h } = startBox
      const right = left + w
      const bottom = top + h

      if (ratioMode === 'free') {
        let newLeft = left, newRight = right, newTop = top, newBottom = bottom

        if (handle.includes('w')) newLeft = clamp(left + dx, 0, right - 5)
        if (handle.includes('e')) newRight = clamp(right + dx, left + 5, 100)
        if (handle.includes('n')) newTop = clamp(top + dy, 0, bottom - 5)
        if (handle.includes('s')) newBottom = clamp(bottom + dy, top + 5, 100)

        setCropBox({
          x: newLeft,
          y: newTop,
          w: newRight - newLeft,
          h: newBottom - newTop
        })
      } else {
        // Locked ratio resize
        const ratio = img
          ? getTargetRatio(ratioMode, img.naturalWidth, img.naturalHeight, cropRotation)
          : 1

        let newW = w
        let newH = h
        let newX = left
        let newY = top

        if (handle === 'se') {
          newW = clamp(w + dx, 5, 100 - left)
          newH = newW / ratio
          if (top + newH > 100) { newH = 100 - top; newW = newH * ratio }
          newX = left; newY = top
        } else if (handle === 'sw') {
          newW = clamp(w - dx, 5, right)
          newH = newW / ratio
          if (top + newH > 100) { newH = 100 - top; newW = newH * ratio }
          newX = right - newW; newY = top
        } else if (handle === 'ne') {
          newW = clamp(w + dx, 5, 100 - left)
          newH = newW / ratio
          if (newH > bottom) { newH = bottom; newW = newH * ratio }
          newX = left; newY = bottom - newH
        } else if (handle === 'nw') {
          newW = clamp(w - dx, 5, right)
          newH = newW / ratio
          if (newH > bottom) { newH = bottom; newW = newH * ratio }
          newX = right - newW; newY = bottom - newH
        } else {
          // Edge handles in ratio mode — treat like se
          newW = clamp(w + dx, 5, 100 - left)
          newH = newW / ratio
          if (top + newH > 100) { newH = 100 - top; newW = newH * ratio }
          newX = left; newY = top
        }

        setCropBox({ x: newX, y: newY, w: newW, h: newH })
      }
    }

    const handleUp = () => {
      interactionRef.current = null
    }

    window.addEventListener('mousemove', handleMove, { passive: false })
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [editingItem, cropRotation, cropRatioMode])

  // ── Save Crop & Rotate ────────────────────────────────────────────────────

  const saveEdits = () => {
    if (!editingItem) return

    const img = new Image()
    img.src = editingItem.src
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Map crop % → pixel coordinates on the *original* (unrotated) image
      // Because cropBox is in terms of the rotated display, we must rotate back.
      //
      // Strategy: draw image rotated on a temp canvas, then crop from that.
      const srcW = img.naturalWidth
      const srcH = img.naturalHeight
      const is90or270 = cropRotation === 90 || cropRotation === 270

      // Step 1: rotate the full image onto a temp canvas
      const rotCanvas = document.createElement('canvas')
      rotCanvas.width = is90or270 ? srcH : srcW
      rotCanvas.height = is90or270 ? srcW : srcH
      const rotCtx = rotCanvas.getContext('2d')!
      rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2)
      rotCtx.rotate((cropRotation * Math.PI) / 180)
      rotCtx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH)

      // Step 2: crop from the rotated canvas using cropBox %
      const cropX = (cropBox.x / 100) * rotCanvas.width
      const cropY = (cropBox.y / 100) * rotCanvas.height
      const cropW = (cropBox.w / 100) * rotCanvas.width
      const cropH = (cropBox.h / 100) * rotCanvas.height

      canvas.width = cropW
      canvas.height = cropH
      ctx.drawImage(rotCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

      const editedSrc = canvas.toDataURL('image/jpeg', 0.92)

      setImages((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? { ...item, editedSrc, rotation: cropRotation, cropData: cropBox }
            : item
        )
      )
      setEditingItem(null)
    }
  }

  // ── PDF Generation ────────────────────────────────────────────────────────

  const generatePdf = async () => {
    if (images.length === 0) return
    setGenerating(true)

    try {
      const loadedImages = await Promise.all(
        images.map((item) =>
          new Promise<{ img: HTMLImageElement; width: number; height: number }>((resolve, reject) => {
            const image = new Image()
            image.src = item.editedSrc
            image.onload = () => resolve({ img: image, width: image.naturalWidth, height: image.naturalHeight })
            image.onerror = (err) => reject(err)
          })
        )
      )

      const a4W = 210, a4H = 297
      const ltW = 215.9, ltH = 279.4
      const marginSize = pageSize === 'original' ? 0 : (margin === 'none' ? 0 : margin === 'small' ? 10 : 20)

      let firstPageW = a4W, firstPageH = a4H
      if (pageSize === 'letter') { firstPageW = ltW; firstPageH = ltH }
      else if (pageSize === 'original' && loadedImages.length > 0) {
        firstPageW = loadedImages[0].width * 0.264583
        firstPageH = loadedImages[0].height * 0.264583
      }

      let firstOri: 'p' | 'l' = 'p'
      if (pageSize !== 'original' && loadedImages.length > 0) {
        const fi = loadedImages[0]
        if (orientation === 'landscape' || (orientation === 'auto' && fi.width > fi.height)) {
          firstOri = 'l'
          const t = firstPageW; firstPageW = firstPageH; firstPageH = t
        }
      }

      const pdf = new jsPDF({
        orientation: firstOri,
        unit: 'mm',
        format: pageSize === 'original' ? [firstPageW, firstPageH] : pageSize
      })

      for (let i = 0; i < loadedImages.length; i++) {
        const { width: imgWidth, height: imgHeight } = loadedImages[i]
        let pageW = a4W, pageH = a4H
        if (pageSize === 'letter') { pageW = ltW; pageH = ltH }
        else if (pageSize === 'original') { pageW = imgWidth * 0.264583; pageH = imgHeight * 0.264583 }

        let finalOri: 'portrait' | 'landscape' = 'portrait'
        if (orientation === 'landscape' || (orientation === 'auto' && imgWidth > imgHeight)) finalOri = 'landscape'
        if (finalOri === 'landscape' && pageSize !== 'original') { const t = pageW; pageW = pageH; pageH = t }

        if (i > 0) {
          if (pageSize === 'original') pdf.addPage([pageW, pageH], 'p')
          else pdf.addPage(pageSize, finalOri === 'landscape' ? 'l' : 'p')
        }

        const pw = pageW - marginSize * 2
        const ph = pageH - marginSize * 2
        const ir = imgWidth / imgHeight
        const pr = pw / ph
        let dw = pw, dh = ph
        if (ir > pr) dh = pw / ir; else dw = ph * ir

        const xOff = marginSize + (pw - dw) / 2
        const yOff = marginSize + (ph - dh) / 2
        pdf.setPage(i + 1)
        pdf.addImage(images[i].editedSrc, 'JPEG', xOff, yOff, dw, dh)
      }

      pdf.save(`LouisAI_PDF_${Date.now()}.pdf`)
    } catch (err) {
      console.error('PDF Generation Failed:', err)
      alert('ไม่สามารถสร้างไฟล์ PDF ได้ โปรดลองใหม่อีกครั้ง')
    } finally {
      setGenerating(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 select-none max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <FileText className="h-8 w-8 text-emerald-500" />
            PDF Creator &amp; Image Editor
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
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload & Image Grid */}
        <div className="lg:col-span-2 space-y-6">
          {images.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-900/30 hover:bg-slate-900/50 rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center space-y-4 min-h-[350px]"
            >
              <div className="p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <Upload className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-white font-bold text-base">อัปโหลดรูปภาพเพื่อเริ่มทำ PDF</h3>
                <p className="text-sm text-slate-400 max-w-xs">ลากไฟล์รูปภาพมาวางที่นี่ หรือคลิกเพื่อค้นหาและเลือกรูปภาพ</p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-500">
                <Info className="h-3.5 w-3.5" /> รองรับไฟล์ PNG, JPG, JPEG
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
                  <Plus className="h-3.5 w-3.5" /> เพิ่มรูปภาพ
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                    className={`bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 space-y-3 relative group transition-all duration-200 ${
                      draggedIndex === idx ? 'opacity-30 border-emerald-500' : 'hover:border-slate-700'
                    } cursor-grab active:cursor-grabbing`}
                  >
                    <div className="absolute top-4 left-4 z-10 px-2 py-0.5 bg-slate-950/80 backdrop-blur border border-slate-800 text-[10px] font-bold text-slate-300 rounded-lg">
                      หน้า {idx + 1}
                    </div>
                    <div className="aspect-[3/4] w-full bg-slate-950 rounded-xl overflow-hidden relative flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.editedSrc} alt={img.name} className="max-w-full max-h-full object-contain pointer-events-none" />
                    </div>
                    <div className="truncate text-xs font-medium text-slate-300 px-1">{img.name}</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => openEditor(img)}
                        className="flex items-center justify-center gap-1 py-1.5 bg-slate-800/60 hover:bg-emerald-600 hover:text-white text-slate-300 text-[10px] font-bold rounded-xl border border-slate-700/40 hover:border-emerald-500/30 transition-all"
                      >
                        <Crop className="h-3 w-3" /> ครอบ/หมุน
                      </button>
                      <button
                        onClick={() => handleDelete(img.id)}
                        className="flex items-center justify-center gap-1 py-1.5 bg-slate-800/60 hover:bg-rose-600 hover:text-white text-slate-300 text-[10px] font-bold rounded-xl border border-slate-700/40 hover:border-rose-500/30 transition-all"
                      >
                        <Trash2 className="h-3 w-3" /> ลบออก
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, 'up')}
                        className="flex-1 flex items-center justify-center py-1 bg-slate-950/40 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg disabled:opacity-20 transition-all"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled={idx === images.length - 1}
                        onClick={() => moveItem(idx, 'down')}
                        className="flex-1 flex items-center justify-center py-1 bg-slate-950/40 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg disabled:opacity-20 transition-all"
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

        {/* Settings Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
              🛠️ การตั้งค่าเอกสาร
            </h2>

            {/* Page Size */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">ขนาดหน้ากระดาษ</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'a4', label: 'A4' },
                  { value: 'letter', label: 'Letter' },
                  { value: 'original', label: 'ดั้งเดิม' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPageSize(opt.value as any)}
                    className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all ${
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

            {/* Orientation */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">การวางแนว</label>
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

            {/* Margin */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">ระยะขอบกระดาษ</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'none', label: 'ไม่มี' },
                  { value: 'small', label: '10 มม.' },
                  { value: 'medium', label: '20 มม.' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setMargin(opt.value as any)}
                    className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all ${
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

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-[11px] text-slate-400 space-y-2 leading-relaxed">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-emerald-500" /> คำแนะนำ
              </div>
              <p>1. อัปโหลดรูปภาพที่มีทิศทางเดียวกันเพื่อความสวยงาม</p>
              <p>2. กด <strong>ครอบ/หมุน</strong> เพื่อครอบตัดหรือหมุนภาพ</p>
              <p>3. ลากการ์ดสลับที่กัน หรือใช้ปุ่ม ⬆️⬇️ เพื่อเรียงลำดับ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />

      {/* ── Crop Editor Modal ── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[92vh]">

            {/* Modal Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-950/40 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Crop className="h-4 w-4 text-emerald-400" />
                  ครอบตัด &amp; หมุนรูปภาพ
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">ลากกล่องหรือดึงจุดมุม/ขอบเพื่อครอบตัด</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Aspect Ratio Presets — top of modal body for easy mobile thumb reach */}
            <div className="px-4 pt-3 pb-2 sm:px-6 bg-slate-950/30 border-b border-slate-800/60 shrink-0">
              <div className="flex flex-wrap gap-2 justify-center">
                {([
                  { value: 'free',  label: '✂️ อิสระ' },
                  { value: '1:1',   label: '⬛ 1:1' },
                  { value: 'a4',    label: '📄 A4' },
                  { value: '4:3',   label: '🖼 4:3' },
                  { value: '16:9',  label: '🎬 16:9' }
                ] as { value: RatioMode; label: string }[]).map((ratio) => (
                  <button
                    key={ratio.value}
                    onClick={() => handleRatioModeChange(ratio.value)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      cropRatioMode === ratio.value
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/20'
                        : 'bg-slate-950/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas Working Area */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center overflow-hidden p-4 sm:p-6 min-h-[240px]">
              {/*
                ARCHITECTURE:
                - Outer wrapper: rotates the image using CSS transform
                - Inner .crop-overlay: sits on top WITHOUT rotating — this is where crop % maps to
                - This means getBoundingClientRect() on crop-overlay always gives the correct
                  unrotated display rect, so pointer math is always consistent
              */}
              <div className="relative inline-flex items-center justify-center">
                {/* Rotated image wrapper */}
                <div
                  style={{
                    transform: `rotate(${cropRotation}deg)`,
                    transition: 'transform 0.25s ease-out',
                    lineHeight: 0
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={editorImgRef}
                    src={editingItem.src}
                    alt="Editor"
                    className="block rounded-lg"
                    style={{
                      maxWidth: 'min(100%, 520px)',
                      maxHeight: 'min(46vh, 380px)',
                      objectFit: 'contain',
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}
                  />
                </div>

                {/* Crop Overlay — positioned absolute, covers rotated image display area exactly */}
                {/* We use the same max dims as the image to position it */}
                <div
                  ref={cropOverlayRef}
                  className="absolute inset-0 overflow-hidden rounded-lg"
                  style={{ cursor: 'default' }}
                >
                  {/* Dark mask — outside crop area */}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(0,0,0,0.55)' }} />

                  {/* Crop window cutout (simulated with clip) */}
                  {/* We use the crop box border + absolute positioning instead */}
                  <div
                    className="absolute border-2 border-emerald-400 rounded-sm"
                    style={{
                      left: `${cropBox.x}%`,
                      top: `${cropBox.y}%`,
                      width: `${cropBox.w}%`,
                      height: `${cropBox.h}%`,
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                      background: 'transparent',
                      cursor: 'move'
                    }}
                    onMouseDown={(e) => handleInteractionStart(e, null)}
                    onTouchStart={(e) => handleInteractionStart(e, null)}
                  >
                    {/* Rule-of-thirds grid */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                      backgroundImage: 'linear-gradient(rgba(52,211,153,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.2) 1px, transparent 1px)',
                      backgroundSize: '33.33% 33.33%'
                    }} />

                    {/* Corner handles */}
                    {(['nw', 'ne', 'se', 'sw'] as ResizeHandle[]).map((corner) => {
                      const isN = corner.includes('n')
                      const isW = corner.includes('w')
                      const cursorMap: Record<string, string> = {
                        nw: 'nw-resize', ne: 'ne-resize', se: 'se-resize', sw: 'sw-resize'
                      }
                      return (
                        <div
                          key={corner}
                          onMouseDown={(e) => handleInteractionStart(e, corner)}
                          onTouchStart={(e) => handleInteractionStart(e, corner)}
                          className="absolute z-30"
                          style={{
                            top: isN ? 0 : '100%',
                            left: isW ? 0 : '100%',
                            transform: 'translate(-50%, -50%)',
                            width: 44,
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: cursorMap[corner],
                            touchAction: 'none'
                          }}
                        >
                          <div style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            background: '#10b981',
                            border: '2px solid white',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.5)'
                          }} />
                        </div>
                      )
                    })}

                    {/* Edge handles (free mode only) */}
                    {cropRatioMode === 'free' && (['n', 's', 'e', 'w'] as ResizeHandle[]).map((edge) => {
                      const posMap: Record<string, React.CSSProperties> = {
                        n: { top: 0, left: '50%', transform: 'translate(-50%, -50%)', cursor: 'n-resize' },
                        s: { top: '100%', left: '50%', transform: 'translate(-50%, -50%)', cursor: 's-resize' },
                        e: { top: '50%', left: '100%', transform: 'translate(-50%, -50%)', cursor: 'e-resize' },
                        w: { top: '50%', left: 0, transform: 'translate(-50%, -50%)', cursor: 'w-resize' }
                      }
                      const isNS = edge === 'n' || edge === 's'
                      return (
                        <div
                          key={edge}
                          onMouseDown={(e) => handleInteractionStart(e, edge)}
                          onTouchStart={(e) => handleInteractionStart(e, edge)}
                          className="absolute z-20"
                          style={{
                            ...posMap[edge],
                            width: 44,
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            touchAction: 'none'
                          }}
                        >
                          <div style={{
                            width: isNS ? 28 : 6,
                            height: isNS ? 6 : 28,
                            borderRadius: 3,
                            background: '#10b981',
                            border: '1.5px solid white',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.5)'
                          }} />
                        </div>
                      )
                    })}

                    {/* Corner L-brackets (visual only) */}
                    {(['nw', 'ne', 'se', 'sw'] as ResizeHandle[]).map((corner) => {
                      const isN = corner.includes('n')
                      const isW = corner.includes('w')
                      return (
                        <div
                          key={`bracket-${corner}`}
                          className="absolute pointer-events-none"
                          style={{
                            top: isN ? 0 : 'auto',
                            bottom: !isN ? 0 : 'auto',
                            left: isW ? 0 : 'auto',
                            right: !isW ? 0 : 'auto',
                            width: 18,
                            height: 18,
                            borderTop: isN ? '3px solid #34d399' : 'none',
                            borderBottom: !isN ? '3px solid #34d399' : 'none',
                            borderLeft: isW ? '3px solid #34d399' : 'none',
                            borderRight: !isW ? '3px solid #34d399' : 'none',
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-950/40 border-t border-slate-800 flex justify-between items-center gap-3 shrink-0">
              <button
                onClick={rotateImage}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700/50 transition-all active:scale-95"
              >
                <RotateCw className="h-4 w-4" />
                <span>หมุน 90°</span>
              </button>

              <button
                onClick={() => setCropBox({ x: 0, y: 0, w: 100, h: 100 })}
                className="flex items-center gap-2 px-3 py-2.5 bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-sm font-semibold rounded-xl border border-slate-700/50 transition-all active:scale-95"
                title="รีเซ็ตเป็นครอบทั้งภาพ"
              >
                <Maximize2 className="h-4 w-4" />
              </button>

              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-sm font-semibold rounded-xl transition-all active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={saveEdits}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-md transition-all active:scale-95"
                >
                  <Check className="h-4 w-4" />
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
