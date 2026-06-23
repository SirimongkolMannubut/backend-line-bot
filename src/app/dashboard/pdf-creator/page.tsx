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
  Maximize2,
} from 'lucide-react'
import jsPDF from 'jspdf'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImageItem {
  id: string
  name: string
  src: string        // original base64
  editedSrc: string  // after crop/rotate
  rotation: number   // 0,90,180,270 — last applied rotation
}

interface CropBox {
  x: number  // % 0-100
  y: number
  w: number
  h: number
}

type RatioMode = 'free' | '1:1' | 'a4' | '4:3' | '16:9'
type Handle = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

/** Render src image rotated by `deg` onto a new canvas, return dataURL */
function renderRotatedCanvas(src: string, deg: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const is90or270 = deg === 90 || deg === 270
      const cw = is90or270 ? img.naturalHeight : img.naturalWidth
      const ch = is90or270 ? img.naturalWidth : img.naturalHeight
      const canvas = document.createElement('canvas')
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')!
      ctx.translate(cw / 2, ch / 2)
      ctx.rotate((deg * Math.PI) / 180)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      resolve(canvas.toDataURL('image/jpeg', 0.95))
    }
    img.onerror = reject
    img.src = src
  })
}

/** Crop a dataURL by cropBox percentages → new dataURL */
function cropCanvas(src: string, box: CropBox): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const sx = (box.x / 100) * img.naturalWidth
      const sy = (box.y / 100) * img.naturalHeight
      const sw = (box.w / 100) * img.naturalWidth
      const sh = (box.h / 100) * img.naturalHeight
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, sw)
      canvas.height = Math.max(1, sh)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.onerror = reject
    img.src = src
  })
}

function getRatioValue(mode: RatioMode, imgW: number, imgH: number): number {
  if (mode === '1:1') return 1
  if (mode === '4:3') return 4 / 3
  if (mode === '16:9') return 16 / 9
  if (mode === 'a4') return imgW > imgH ? 297 / 210 : 210 / 297
  return -1 // free
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PdfCreatorPage() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'original'>('a4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto')
  const [margin, setMargin] = useState<'none' | 'small' | 'medium'>('none')
  const [generating, setGenerating] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // ── Editor states ─────────────────────────────────────────────────────────
  const [editingItem, setEditingItem] = useState<ImageItem | null>(null)
  /** Pre-rendered working image (already rotated) displayed in the editor */
  const [workingSrc, setWorkingSrc] = useState<string>('')
  /** Current total rotation accumulated while editor is open */
  const [editorRotation, setEditorRotation] = useState(0)
  const [cropBox, setCropBox] = useState<CropBox>({ x: 10, y: 10, w: 80, h: 80 })
  const [ratioMode, setRatioMode] = useState<RatioMode>('free')
  const [editorLoading, setEditorLoading] = useState(false)

  const overlayRef = useRef<HTMLDivElement | null>(null)
  const workingImgRef = useRef<HTMLImageElement | null>(null)

  // Interaction state (not in React state to avoid re-renders mid-drag)
  const interaction = useRef<{
    type: 'drag' | 'resize'
    handle: Handle | null
    startX: number
    startY: number
    startBox: CropBox
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // ── File handling ─────────────────────────────────────────────────────────

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        if (!result) return
        setImages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            src: result,
            editedSrc: result,
            rotation: 0,
          },
        ])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  // ── Reorder ───────────────────────────────────────────────────────────────

  const handleDelete = (id: string) => setImages((p) => p.filter((i) => i.id !== id))

  const moveItem = (index: number, dir: 'up' | 'down') => {
    const t = dir === 'up' ? index - 1 : index + 1
    if (t < 0 || t >= images.length) return
    const a = [...images]
    ;[a[index], a[t]] = [a[t], a[index]]
    setImages(a)
  }

  const handleDragStart = (i: number) => setDraggedIndex(i)
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  const handleDrop = (i: number) => {
    if (draggedIndex === null || draggedIndex === i) return
    const a = [...images]
    const [item] = a.splice(draggedIndex, 1)
    a.splice(i, 0, item)
    setImages(a)
    setDraggedIndex(null)
  }

  // ── Open editor ───────────────────────────────────────────────────────────
  /**
   * KEY ARCHITECTURE:
   * We pre-render the image+rotation into a canvas (workingSrc) BEFORE showing
   * the editor. The editor only sees a normal un-rotated image. Crop box % maps
   * directly to the displayed image pixels — no CSS transform math needed.
   */
  const openEditor = async (item: ImageItem) => {
    setEditorLoading(true)
    setEditingItem(item)
    setEditorRotation(item.rotation)
    setRatioMode('free')
    setCropBox({ x: 5, y: 5, w: 90, h: 90 })

    try {
      const rotated = await renderRotatedCanvas(item.src, item.rotation)
      setWorkingSrc(rotated)
    } catch {
      setWorkingSrc(item.editedSrc)
    } finally {
      setEditorLoading(false)
    }
  }

  // ── Rotate in editor (bakes into workingSrc) ──────────────────────────────

  const rotateInEditor = async () => {
    if (!workingSrc) return
    setEditorLoading(true)
    const newRot = (editorRotation + 90) % 360
    try {
      // Rotate workingSrc by additional 90°
      const rotated = await renderRotatedCanvas(workingSrc, 90)
      setWorkingSrc(rotated)
      setEditorRotation(newRot)
      setCropBox({ x: 5, y: 5, w: 90, h: 90 })
      setRatioMode('free')
    } finally {
      setEditorLoading(false)
    }
  }

  // ── Aspect ratio preset ───────────────────────────────────────────────────

  const handleRatioChange = (mode: RatioMode) => {
    setRatioMode(mode)
    if (mode === 'free') return

    const img = workingImgRef.current
    if (!img) return

    const ratio = getRatioValue(mode, img.naturalWidth, img.naturalHeight)
    if (ratio < 0) return

    // Display ratio = naturalWidth / naturalHeight of the working (already-rotated) image
    const displayRatio = img.naturalWidth / img.naturalHeight
    // pctRatio: how much wider (in %) is the crop box compared to the container
    const pctRatio = ratio / displayRatio

    let newW = 85
    let newH = newW / pctRatio
    if (newH > 85) { newH = 85; newW = newH * pctRatio }
    if (newW > 92) { newW = 92; newH = newW / pctRatio }

    setCropBox({
      x: (100 - newW) / 2,
      y: (100 - newH) / 2,
      w: newW,
      h: newH,
    })
  }

  // ── Drag / Resize interaction ─────────────────────────────────────────────

  const getPointer = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      const t = (e as any).touches
      if (t.length > 0) return { x: t[0].clientX, y: t[0].clientY }
      const ct = (e as any).changedTouches
      if (ct?.length > 0) return { x: ct[0].clientX, y: ct[0].clientY }
    }
    return { x: (e as any).clientX, y: (e as any).clientY }
  }

  const startInteraction = useCallback(
    (e: React.MouseEvent | React.TouchEvent, handle: Handle | null) => {
      e.stopPropagation()
      if (e.cancelable) e.preventDefault()
      const { x, y } = getPointer(e)
      interaction.current = {
        type: handle ? 'resize' : 'drag',
        handle,
        startX: x,
        startY: y,
        startBox: { ...cropBox },
      }
    },
    [cropBox]
  )

  useEffect(() => {
    if (!editingItem) return

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!interaction.current) return
      if (e.cancelable) e.preventDefault()

      const overlay = overlayRef.current
      if (!overlay) return

      const rect = overlay.getBoundingClientRect()
      const { x: cx, y: cy } = getPointer(e)
      const { startX, startY, startBox, type, handle } = interaction.current

      // Convert px delta → % of overlay
      const dx = ((cx - startX) / rect.width) * 100
      const dy = ((cy - startY) / rect.height) * 100

      if (type === 'drag') {
        setCropBox({
          ...startBox,
          x: clamp(startBox.x + dx, 0, 100 - startBox.w),
          y: clamp(startBox.y + dy, 0, 100 - startBox.h),
        })
        return
      }

      // resize
      if (!handle) return
      const L = startBox.x, R = startBox.x + startBox.w
      const T = startBox.y, B = startBox.y + startBox.h
      const img = workingImgRef.current

      if (ratioMode === 'free') {
        let nL = L, nR = R, nT = T, nB = B
        if (handle.includes('w')) nL = clamp(L + dx, 0, R - 5)
        if (handle.includes('e')) nR = clamp(R + dx, L + 5, 100)
        if (handle.includes('n')) nT = clamp(T + dy, 0, B - 5)
        if (handle.includes('s')) nB = clamp(B + dy, T + 5, 100)
        setCropBox({ x: nL, y: nT, w: nR - nL, h: nB - nT })
      } else {
        const ratio = img
          ? getRatioValue(ratioMode, img.naturalWidth, img.naturalHeight) /
            (img.naturalWidth / img.naturalHeight)
          : 1

        let nX = L, nY = T, nW = startBox.w, nH = startBox.h

        if (handle === 'se') {
          nW = clamp(startBox.w + dx, 5, 100 - L)
          nH = nW / ratio
          if (T + nH > 100) { nH = 100 - T; nW = nH * ratio }
          nX = L; nY = T
        } else if (handle === 'sw') {
          nW = clamp(startBox.w - dx, 5, R)
          nH = nW / ratio
          if (T + nH > 100) { nH = 100 - T; nW = nH * ratio }
          nX = R - nW; nY = T
        } else if (handle === 'ne') {
          nW = clamp(startBox.w + dx, 5, 100 - L)
          nH = nW / ratio
          if (nH > B) { nH = B; nW = nH * ratio }
          nX = L; nY = B - nH
        } else if (handle === 'nw') {
          nW = clamp(startBox.w - dx, 5, R)
          nH = nW / ratio
          if (nH > B) { nH = B; nW = nH * ratio }
          nX = R - nW; nY = B - nH
        } else {
          // edge handles in ratio mode
          nW = clamp(startBox.w + dx, 5, 100 - L)
          nH = nW / ratio
          if (T + nH > 100) { nH = 100 - T; nW = nH * ratio }
          nX = L; nY = T
        }
        setCropBox({ x: nX, y: nY, w: nW, h: nH })
      }
    }

    const onUp = () => { interaction.current = null }

    window.addEventListener('mousemove', onMove, { passive: false })
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [editingItem, ratioMode])

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveEdits = async () => {
    if (!editingItem || !workingSrc) return
    setEditorLoading(true)
    try {
      // workingSrc is already rotated — just crop it directly
      const cropped = await cropCanvas(workingSrc, cropBox)
      setImages((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? { ...item, editedSrc: cropped, rotation: editorRotation }
            : item
        )
      )
      setEditingItem(null)
    } finally {
      setEditorLoading(false)
    }
  }

  // ── PDF generation ────────────────────────────────────────────────────────

  const generatePdf = async () => {
    if (images.length === 0) return
    setGenerating(true)
    try {
      const loaded = await Promise.all(
        images.map((item) =>
          new Promise<{ w: number; h: number }>((resolve, reject) => {
            const img = new Image()
            img.src = item.editedSrc
            img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
            img.onerror = reject
          })
        )
      )

      const a4W = 210, a4H = 297
      const ltW = 215.9, ltH = 279.4
      const mg = margin === 'none' ? 0 : margin === 'small' ? 10 : 20

      let fpW = a4W, fpH = a4H
      if (pageSize === 'letter') { fpW = ltW; fpH = ltH }
      else if (pageSize === 'original' && loaded.length > 0) {
        fpW = loaded[0].w * 0.264583; fpH = loaded[0].h * 0.264583
      }

      let fOri: 'p' | 'l' = 'p'
      if (pageSize !== 'original' && loaded.length > 0) {
        const fi = loaded[0]
        if (orientation === 'landscape' || (orientation === 'auto' && fi.w > fi.h)) {
          fOri = 'l'; [fpW, fpH] = [fpH, fpW]
        }
      }

      const pdf = new jsPDF({
        orientation: fOri,
        unit: 'mm',
        format: pageSize === 'original' ? [fpW, fpH] : pageSize,
      })

      for (let i = 0; i < loaded.length; i++) {
        const { w: iW, h: iH } = loaded[i]
        let pgW = a4W, pgH = a4H
        if (pageSize === 'letter') { pgW = ltW; pgH = ltH }
        else if (pageSize === 'original') { pgW = iW * 0.264583; pgH = iH * 0.264583 }

        let ori: 'portrait' | 'landscape' = 'portrait'
        if (orientation === 'landscape' || (orientation === 'auto' && iW > iH)) ori = 'landscape'
        if (ori === 'landscape' && pageSize !== 'original') [pgW, pgH] = [pgH, pgW]

        if (i > 0) {
          if (pageSize === 'original') pdf.addPage([pgW, pgH], 'p')
          else pdf.addPage(pageSize, ori === 'landscape' ? 'l' : 'p')
        }

        const pw = pgW - mg * 2, ph = pgH - mg * 2
        const ir = iW / iH, pr = pw / ph
        let dw = pw, dh = ph
        if (ir > pr) dh = pw / ir; else dw = ph * ir

        pdf.setPage(i + 1)
        pdf.addImage(images[i].editedSrc, 'JPEG', mg + (pw - dw) / 2, mg + (ph - dh) / 2, dw, dh)
      }

      pdf.save(`LouisAI_PDF_${Date.now()}.pdf`)
    } catch (err) {
      console.error(err)
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
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold rounded-2xl shadow-lg transition-all active:scale-95 shrink-0"
        >
          {generating ? (
            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>กำลังสร้าง PDF...</span></>
          ) : (
            <><Download className="h-5 w-5" /><span>ดาวน์โหลด PDF ({images.length} หน้า)</span></>
          )}
        </button>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Image list */}
        <div className="lg:col-span-2 space-y-6">
          {images.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-900/30 hover:bg-slate-900/50 rounded-3xl p-12 text-center cursor-pointer transition-all group flex flex-col items-center justify-center space-y-4 min-h-[350px]"
            >
              <div className="p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl group-hover:scale-110 transition-transform">
                <Upload className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-white font-bold text-base">อัปโหลดรูปภาพเพื่อเริ่มทำ PDF</h3>
                <p className="text-sm text-slate-400 max-w-xs">ลากไฟล์มาวางหรือคลิกเพื่อเลือก</p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-500">
                <Info className="h-3.5 w-3.5" /> PNG, JPG, JPEG
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  ลำดับหน้า ({images.length} หน้า)
                </span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> เพิ่มรูป
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
                    className={`bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 space-y-3 relative transition-all cursor-grab active:cursor-grabbing ${
                      draggedIndex === idx ? 'opacity-30 border-emerald-500' : 'hover:border-slate-700'
                    }`}
                  >
                    <div className="absolute top-4 left-4 z-10 px-2 py-0.5 bg-slate-950/80 backdrop-blur border border-slate-800 text-[10px] font-bold text-slate-300 rounded-lg">
                      หน้า {idx + 1}
                    </div>
                    <div className="aspect-[3/4] w-full bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.editedSrc} alt={img.name} className="max-w-full max-h-full object-contain pointer-events-none" />
                    </div>
                    <div className="truncate text-xs font-medium text-slate-300 px-1">{img.name}</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => openEditor(img)}
                        className="flex items-center justify-center gap-1 py-1.5 bg-slate-800/60 hover:bg-emerald-600 hover:text-white text-slate-300 text-[10px] font-bold rounded-xl border border-slate-700/40 transition-all"
                      >
                        <Crop className="h-3 w-3" /> ครอบ/หมุน
                      </button>
                      <button
                        onClick={() => handleDelete(img.id)}
                        className="flex items-center justify-center gap-1 py-1.5 bg-slate-800/60 hover:bg-rose-600 hover:text-white text-slate-300 text-[10px] font-bold rounded-xl border border-slate-700/40 transition-all"
                      >
                        <Trash2 className="h-3 w-3" /> ลบออก
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button disabled={idx === 0} onClick={() => moveItem(idx, 'up')} className="flex-1 flex items-center justify-center py-1 bg-slate-950/40 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg disabled:opacity-20 transition-all">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button disabled={idx === images.length - 1} onClick={() => moveItem(idx, 'down')} className="flex-1 flex items-center justify-center py-1 bg-slate-950/40 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg disabled:opacity-20 transition-all">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Settings sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
              🛠️ การตั้งค่าเอกสาร
            </h2>
            {[
              {
                label: 'ขนาดหน้ากระดาษ',
                opts: [{ v: 'a4', l: 'A4' }, { v: 'letter', l: 'Letter' }, { v: 'original', l: 'ดั้งเดิม' }],
                val: pageSize, set: setPageSize,
              },
              {
                label: 'การวางแนว',
                opts: [{ v: 'auto', l: 'ออโต้' }, { v: 'portrait', l: 'แนวตั้ง' }, { v: 'landscape', l: 'แนวนอน' }],
                val: orientation, set: setOrientation,
              },
              {
                label: 'ระยะขอบกระดาษ',
                opts: [{ v: 'none', l: 'ไม่มี' }, { v: 'small', l: '10 มม.' }, { v: 'medium', l: '20 มม.' }],
                val: margin, set: setMargin,
              },
            ].map(({ label, opts, val, set }) => (
              <div key={label} className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
                <div className="grid grid-cols-3 gap-2">
                  {opts.map((o) => (
                    <button
                      key={o.v}
                      onClick={() => (set as any)(o.v)}
                      className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all ${
                        val === o.v ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-emerald-500" /> คำแนะนำ
              </div>
              <p>1. กด <strong>ครอบ/หมุน</strong> เพื่อตัดและหมุนรูป</p>
              <p>2. ลากกล่องสีเขียวเพื่อย้าย ดึงมุมเพื่อปรับขนาด</p>
              <p>3. ลากการ์ดหรือใช้ปุ่ม ⬆️⬇️ เพื่อเรียงลำดับ</p>
            </div>
          </div>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />

      {/* ── Crop Editor Modal ── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[96vh]">

            {/* Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Crop className="h-4 w-4 text-emerald-400" /> ครอบตัด &amp; หมุนรูปภาพ
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">ลากกล่องเพื่อย้าย • ดึงจุดมุมเพื่อปรับขนาด</p>
              </div>
              <button onClick={() => setEditingItem(null)} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Ratio preset buttons */}
            <div className="px-4 pt-3 pb-2.5 sm:px-6 bg-slate-950/30 border-b border-slate-800/60 shrink-0">
              <div className="flex flex-wrap gap-2 justify-center">
                {([
                  { v: 'free', l: '✂️ อิสระ' },
                  { v: '1:1',  l: '⬛ 1:1'  },
                  { v: 'a4',   l: '📄 A4'   },
                  { v: '4:3',  l: '🖼 4:3'  },
                  { v: '16:9', l: '🎬 16:9' },
                ] as { v: RatioMode; l: string }[]).map(({ v, l }) => (
                  <button
                    key={v}
                    onClick={() => handleRatioChange(v)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      ratioMode === v
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow shadow-emerald-950'
                        : 'bg-slate-950/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas area */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 sm:p-6 min-h-[260px] overflow-hidden">
              {editorLoading ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">กำลังโหลด...</span>
                </div>
              ) : workingSrc ? (
                /**
                 * LAYOUT:
                 * - `relative inline-block` parent → shrinks to image size
                 * - img displayed naturally (no CSS rotation)
                 * - overlay div is `absolute inset-0` → exactly matches image px
                 * - crop box % maps 1:1 to image display px — no math tricks
                 */
                <div className="relative inline-block" style={{ lineHeight: 0, maxWidth: '100%' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={workingImgRef}
                    src={workingSrc}
                    alt="Working"
                    draggable={false}
                    style={{
                      display: 'block',
                      maxWidth: 'min(100vw - 32px, 560px)',
                      maxHeight: 'min(42vh, 360px)',
                      objectFit: 'contain',
                      userSelect: 'none',
                      pointerEvents: 'none',
                      borderRadius: 8,
                    }}
                  />

                  {/* Crop overlay — same exact bounds as img */}
                  <div
                    ref={overlayRef}
                    className="absolute inset-0 overflow-hidden rounded-lg"
                  >
                    {/* Dark mask outside crop */}
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(0,0,0,0)' }} />

                    {/* Crop window */}
                    <div
                      className="absolute"
                      style={{
                        left: `${cropBox.x}%`,
                        top: `${cropBox.y}%`,
                        width: `${cropBox.w}%`,
                        height: `${cropBox.h}%`,
                        // Box shadow creates dark mask outside crop area
                        boxShadow: '0 0 0 9999px rgba(0,0,0,0.62)',
                        border: '2px solid #34d399',
                        borderRadius: 2,
                        cursor: 'move',
                        touchAction: 'none',
                      }}
                      onMouseDown={(e) => startInteraction(e, null)}
                      onTouchStart={(e) => startInteraction(e, null)}
                    >
                      {/* Rule-of-thirds grid */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage:
                            'linear-gradient(rgba(52,211,153,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.25) 1px, transparent 1px)',
                          backgroundSize: '33.33% 33.33%',
                        }}
                      />

                      {/* Corner L-brackets */}
                      {(['nw','ne','se','sw'] as Handle[]).map((c) => {
                        const n = c.includes('n'), w = c.includes('w')
                        return (
                          <div
                            key={`lb-${c}`}
                            className="absolute pointer-events-none"
                            style={{
                              top: n ? 0 : 'auto', bottom: !n ? 0 : 'auto',
                              left: w ? 0 : 'auto', right: !w ? 0 : 'auto',
                              width: 16, height: 16,
                              borderTop: n ? '3px solid #10b981' : 'none',
                              borderBottom: !n ? '3px solid #10b981' : 'none',
                              borderLeft: w ? '3px solid #10b981' : 'none',
                              borderRight: !w ? '3px solid #10b981' : 'none',
                            }}
                          />
                        )
                      })}

                      {/* Corner handles (always visible) */}
                      {(['nw','ne','se','sw'] as Handle[]).map((c) => {
                        const n = c.includes('n'), w = c.includes('w')
                        const cursorMap: Record<string, string> = { nw:'nw-resize', ne:'ne-resize', se:'se-resize', sw:'sw-resize' }
                        const cur = cursorMap[c]
                        return (
                          <div
                            key={`ch-${c}`}
                            onMouseDown={(e) => startInteraction(e, c)}
                            onTouchStart={(e) => startInteraction(e, c)}
                            className="absolute z-30 flex items-center justify-center"
                            style={{
                              top: n ? 0 : '100%', left: w ? 0 : '100%',
                              transform: 'translate(-50%,-50%)',
                              width: 44, height: 44,
                              cursor: cur, touchAction: 'none',
                            }}
                          >
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#10b981', border: '2.5px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
                          </div>
                        )
                      })}

                      {/* Edge handles (free mode only) */}
                      {ratioMode === 'free' && (['n','s','e','w'] as Handle[]).map((edge) => {
                        const isNS = edge === 'n' || edge === 's'
                        const posMap: Record<string, React.CSSProperties> = {
                          n: { top: 0, left: '50%', transform: 'translate(-50%,-50%)', cursor: 'n-resize' },
                          s: { top: '100%', left: '50%', transform: 'translate(-50%,-50%)', cursor: 's-resize' },
                          e: { top: '50%', left: '100%', transform: 'translate(-50%,-50%)', cursor: 'e-resize' },
                          w: { top: '50%', left: 0, transform: 'translate(-50%,-50%)', cursor: 'w-resize' },
                        }
                        const pos = posMap[edge]
                        return (
                          <div
                            key={`eh-${edge}`}
                            onMouseDown={(e) => startInteraction(e, edge)}
                            onTouchStart={(e) => startInteraction(e, edge)}
                            className="absolute z-20 flex items-center justify-center"
                            style={{ ...pos, width: 44, height: 44, touchAction: 'none' }}
                          >
                            <div style={{ width: isNS ? 28 : 5, height: isNS ? 5 : 28, borderRadius: 3, background: '#10b981', border: '1.5px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Bottom actions */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-950/50 border-t border-slate-800 flex items-center gap-2 shrink-0">
              <button
                onClick={rotateInEditor}
                disabled={editorLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700/50 transition-all active:scale-95"
              >
                <RotateCw className="h-4 w-4" /> หมุน 90°
              </button>

              <button
                onClick={() => setCropBox({ x: 0, y: 0, w: 100, h: 100 })}
                title="ครอบทั้งหมด"
                className="p-2.5 bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-700/50 transition-all active:scale-95"
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
                  disabled={editorLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl shadow-md transition-all active:scale-95"
                >
                  <Check className="h-4 w-4" /> บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
