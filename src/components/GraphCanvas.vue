<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  state,
  prefs,
  ui,
  models,
  selected,
  selectedModel,
  intersections,
  change,
  actions,
  select,
  addCurve,
  beginHandle,
  DEFAULT_SPAN,
} from '../lib/store.js'
import { handlesFor, applyHandle, gradientTriangle, keyPoints, derivative } from '../lib/curves.js'
import { plain } from '../lib/format.js'

const wrap = ref(null)
const svgRef = ref(null)
const W = ref(900)
const H = ref(600)
const view = state.view

const scale = computed(() => W.value / view.span)
const sx = (x) => (x - view.cx) * scale.value + W.value / 2
const sy = (y) => H.value / 2 - (y - view.cy) * scale.value
const wx = (px) => (px - W.value / 2) / scale.value + view.cx
const wy = (py) => (H.value / 2 - py) / scale.value + view.cy

const round = (n, dp = 6) => (Math.sign(n) * Math.round(Math.abs(n) * 10 ** dp + 1e-9)) / 10 ** dp
const label = (n) => {
  const r = round(n, 2)
  return (Object.is(r, -0) ? 0 : r).toString().replace('-', '−')
}

const STEPS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500]
const gridStep = computed(() => STEPS.find((s) => s * scale.value >= 56) ?? 1000)
const minorStep = computed(() => gridStep.value / (String(gridStep.value).replace(/[0.]/g, '').startsWith('2') ? 4 : 5))

function ticks(lo, hi, s) {
  const out = []
  for (let v = Math.ceil(lo / s) * s; v <= hi + 1e-9; v += s) out.push(round(v))
  return out
}
const xLo = computed(() => wx(0))
const xHi = computed(() => wx(W.value))
const yLo = computed(() => wy(H.value))
const yHi = computed(() => wy(0))
const xMajor = computed(() => ticks(xLo.value, xHi.value, gridStep.value))
const yMajor = computed(() => ticks(yLo.value, yHi.value, gridStep.value))
const xMinor = computed(() => ticks(xLo.value, xHi.value, minorStep.value))
const yMinor = computed(() => ticks(yLo.value, yHi.value, minorStep.value))
const axisY = computed(() => Math.min(H.value - 8, Math.max(16, sy(0))))
const axisX = computed(() => Math.min(W.value - 8, Math.max(30, sx(0))))
const xLabels = computed(() => xMajor.value.filter((t) => t !== 0 && sx(t) > 14 && sx(t) < W.value - 24))
const yLabels = computed(() => yMajor.value.filter((t) => t !== 0 && sy(t) > 22 && sy(t) < H.value - 10))

function pathFor(f) {
  const lim = H.value * 4
  let d = ''
  for (let px = -4; px <= W.value + 4; px += 2) {
    const y = Math.max(-lim, Math.min(H.value + lim, sy(f(wx(px)))))
    d += `${d ? 'L' : 'M'}${px},${y.toFixed(2)}`
  }
  return d
}

function tagFor(m) {
  if (m.vertical) return { x: sx(m.xc) + 8, y: 34 }
  for (let px = W.value - 40; px > 40; px -= 6) {
    const y = sy(m.f(wx(px)))
    if (y > 28 && y < H.value - 28) return { x: px, y: y - 12 }
  }
  return null
}

const layers = computed(() =>
  state.curves
    .filter((c) => c.visible)
    .map((c) => {
      const m = models.value.get(c.id)
      const hasF = m && typeof m.f === 'function'
      return {
        c,
        m,
        isSel: c.id === state.selectedId,
        d: hasF ? pathFor(m.f) : null,
        vx: m?.vertical ? sx(m.xc) : null,
        tag: hasF || m?.vertical ? tagFor(m) : null,
      }
    }),
)

const sel = computed(() => {
  const c = selected.value
  const m = selectedModel.value
  if (!c || !m || !c.visible) return null
  const handles = handlesFor(c, m).map((h) => ({ ...h, px: sx(h.x), py: sy(h.y) }))
  const pts = keyPoints(m).map((p) => ({ ...p, px: sx(p.x), py: sy(p.y) }))
  const tri = gradientTriangle(c, m)
  return {
    c,
    m,
    handles,
    pts,
    axis: m.kind !== 'line' && !m.linear && m.h !== null && m.h !== undefined && !m.vertical ? sx(m.h) : null,
    tri: tri && Math.abs(tri.run) > 1e-9
      ? {
          ...tri,
          a: [sx(tri.x0), sy(tri.y0)],
          b: [sx(tri.x0 + tri.run), sy(tri.y0)],
          c: [sx(tri.x0 + tri.run), sy(tri.y0 + tri.rise)],
        }
      : null,
  }
})

const ghost = computed(() => {
  const g = change.value?.ghost
  if (!g || !sel.value) return null
  if (g.vertical) return { vx: sx(g.xc) }
  if (typeof g.f !== 'function') return null
  return { d: pathFor(g.f) }
})

const target = computed(() => (ui.challenge ? pathFor(ui.challenge.target.f) : null))

const meetPoints = computed(() => {
  if (!prefs.showIntersections) return []
  const out = []
  for (const it of intersections.value) {
    const mine = it.a.id === state.selectedId || it.b.id === state.selectedId
    for (const p of it.points) out.push({ ...p, px: sx(p.x), py: sy(p.y), mine })
  }
  return out.filter((p) => p.px > -10 && p.px < W.value + 10 && p.py > -10 && p.py < H.value + 10)
})

const hover = ref(null)
const traceInfo = computed(() => {
  if (!hover.value) return null
  const px = hover.value.px
  const x = wx(px)
  let best = null
  for (const L of layers.value) {
    if (!L.m || typeof L.m.f !== 'function') continue
    const y = L.m.f(x)
    const dist = Math.abs(sy(y) - hover.value.py)
    const bias = L.isSel ? 30 : 0
    if (!best || dist - bias < best.score) best = { L, y, score: dist - bias }
  }
  if (!best || best.score > 70) return null
  const { L, y } = best
  const py = sy(y)
  if (py < -20 || py > H.value + 20) return null
  const grad = derivative(L.m, x)
  return { name: L.c.name, color: L.c.color, x, y, grad, px, py }
})

const tangent = computed(() => {
  const t = traceInfo.value
  if (!prefs.tangent || !t || t.grad === null) return null
  const x0 = wx(0)
  const x1 = wx(W.value)
  return { x1: 0, y1: sy(t.y + t.grad * (x0 - t.x)), x2: W.value, y2: sy(t.y + t.grad * (x1 - t.x)) }
})

function updateStatus() {
  ui.cursor = hover.value ? { x: wx(hover.value.px), y: wy(hover.value.py) } : null
  const t = traceInfo.value
  ui.trace = t ? { name: t.name, color: t.color, x: t.x, y: t.y, grad: t.grad } : null
}

let drag = null

const snapStep = () => gridStep.value / 10
function snap(v, free) {
  const s = free ? gridStep.value / 100 : snapStep()
  return round(Math.round(v / s) * s, 4)
}

function localPoint(e) {
  const r = svgRef.value.getBoundingClientRect()
  return { px: e.clientX - r.left, py: e.clientY - r.top }
}

function onDown(e) {
  if (e.button !== 0) return
  const { px, py } = localPoint(e)
  const handleEl = e.target.closest('[data-handle]')
  const hitEl = prefs.tool === 'points' ? null : e.target.closest('[data-curve]')
  svgRef.value.setPointerCapture(e.pointerId)

  if (handleEl && selected.value) {
    beginHandle(selected.value, handleEl.dataset.handle)
    drag = { mode: 'handle', id: handleEl.dataset.handle, axis: handleEl.dataset.axis, curve: selected.value }
    return
  }
  if (hitEl) select(hitEl.dataset.curve)
  drag = { mode: prefs.tool === 'points' && !hitEl ? 'place' : 'pan', sx: px, sy: py, cx: view.cx, cy: view.cy, moved: false }
}

function onMove(e) {
  const { px, py } = localPoint(e)
  if (drag?.mode === 'handle') {
    const h = handlesFor(drag.curve, models.value.get(drag.curve.id)).find((q) => q.id === drag.id)
    if (!h) return
    const x = drag.axis === 'y' ? h.x : snap(wx(px), e.altKey)
    const y = drag.axis === 'x' ? h.y : snap(wy(py), e.altKey)
    applyHandle(drag.curve, drag.id, x, y)
    hover.value = null
  } else if (drag) {
    const dx = px - drag.sx
    const dy = py - drag.sy
    if (Math.hypot(dx, dy) > 4) drag.moved = true
    if (drag.moved) {
      view.cx = drag.cx - dx / scale.value
      view.cy = drag.cy + dy / scale.value
      hover.value = null
    }
  } else {
    hover.value = { px, py }
  }
  updateStatus()
}

function onUp(e) {
  if (drag?.mode === 'place' && !drag.moved) {
    const { px, py } = localPoint(e)
    let curve = selected.value
    if (!curve || curve.kind !== 'points') curve = addCurve('points', { points: [] })
    curve.points.push({ x: snap(wx(px), e.altKey), y: snap(wy(py), e.altKey) })
  }
  drag = null
}

function onLeave() {
  if (!drag) {
    hover.value = null
    updateStatus()
  }
}

function zoomAt(factor, px = W.value / 2, py = H.value / 2) {
  const wx0 = wx(px)
  const wy0 = wy(py)
  const span = Math.min(400, Math.max(0.5, view.span * factor))
  view.span = span
  const s = W.value / span
  view.cx = wx0 - (px - W.value / 2) / s
  view.cy = wy0 + (py - H.value / 2) / s
}

function onWheel(e) {
  const { px, py } = localPoint(e)
  const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
  zoomAt(Math.exp(delta * 0.0015), px, py)
  if (hover.value) updateStatus()
}

function resetView() {
  view.span = DEFAULT_SPAN
  view.cx = 0
  view.cy = 0
}

function fitView() {
  const pts = []
  const add = (c, m) => {
    if (!m) return
    for (const p of keyPoints(m)) pts.push(p)
    if (c.kind === 'points') pts.push(...c.points)
  }
  if (selected.value?.visible) add(selected.value, selectedModel.value)
  else for (const c of state.curves.filter((q) => q.visible)) add(c, models.value.get(c.id))
  const finite = pts.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  if (!finite.length) return resetView()
  const xs = finite.map((p) => p.x)
  const ys = finite.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const wNeed = Math.max(4, maxX - minX)
  const hNeed = Math.max(4, maxY - minY)
  view.span = Math.min(400, Math.max(wNeed, (hNeed * W.value) / H.value) * 1.5)
  view.cx = (minX + maxX) / 2
  view.cy = (minY + maxY) / 2
}

async function exportPng() {
  const node = svgRef.value.cloneNode(true)
  node.querySelectorAll('[data-noexport]').forEach((n) => n.remove())
  const css = getComputedStyle(document.documentElement)
  let src = new XMLSerializer().serializeToString(node)
  src = src.replace(/var\((--[\w-]+)\)/g, (_, v) => css.getPropertyValue(v).trim() || '#000')
  const img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`
  await img.decode()
  const k = 2
  const canvas = document.createElement('canvas')
  canvas.width = W.value * k
  canvas.height = H.value * k
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  canvas.toBlob((blob) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'graph.png'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  })
}

let ro
onMounted(() => {
  ro = new ResizeObserver(([entry]) => {
    W.value = Math.max(240, entry.contentRect.width)
    H.value = Math.max(200, entry.contentRect.height)
  })
  ro.observe(wrap.value)
  Object.assign(actions, {
    zoom: (f) => zoomAt(f),
    resetView,
    fitView,
    exportPng,
  })
})
onBeforeUnmount(() => ro?.disconnect())

const handleCursor = (axis) => (axis === 'x' ? 'ew-resize' : axis === 'y' ? 'ns-resize' : 'grab')
const LABEL = { 'paint-order': 'stroke', stroke: 'var(--surface)', 'stroke-width': 4, 'stroke-linejoin': 'round' }
</script>

<template>
  <div ref="wrap" class="graph" :class="[`tool-${prefs.tool}`]">
    <svg
      ref="svgRef"
      xmlns="http://www.w3.org/2000/svg"
      :viewBox="`0 0 ${W} ${H}`"
      :width="W"
      :height="H"
      font-family="Inter Variable, Inter, system-ui, sans-serif"
      role="img"
      aria-label="Graph"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @pointerleave="onLeave"
      @wheel.prevent="onWheel"
    >
      <rect x="0" y="0" :width="W" :height="H" fill="var(--surface)" />

      <g stroke="var(--grid-minor)" stroke-width="1">
        <line v-for="t in xMinor" :key="'nx' + t" :x1="sx(t)" :x2="sx(t)" y1="0" :y2="H" />
        <line v-for="t in yMinor" :key="'ny' + t" x1="0" :x2="W" :y1="sy(t)" :y2="sy(t)" />
      </g>
      <g stroke="var(--grid)" stroke-width="1">
        <line v-for="t in xMajor" :key="'gx' + t" :x1="sx(t)" :x2="sx(t)" y1="0" :y2="H" />
        <line v-for="t in yMajor" :key="'gy' + t" x1="0" :x2="W" :y1="sy(t)" :y2="sy(t)" />
      </g>
      <g stroke="var(--axis)" stroke-width="1.4">
        <line x1="0" :x2="W" :y1="sy(0)" :y2="sy(0)" />
        <line :x1="sx(0)" :x2="sx(0)" y1="0" :y2="H" />
      </g>
      <g font-size="11" fill="var(--faint)" style="font-variant-numeric: tabular-nums">
        <text v-for="t in xLabels" :key="'lx' + t" :x="sx(t)" :y="axisY + 15" text-anchor="middle">{{ label(t) }}</text>
        <text v-for="t in yLabels" :key="'ly' + t" :x="axisX - 7" :y="sy(t) + 4" text-anchor="end">{{ label(t) }}</text>
        <text v-if="sx(0) > 0 && sx(0) < W && sy(0) > 0 && sy(0) < H" :x="sx(0) - 7" :y="sy(0) + 15" text-anchor="end">0</text>
      </g>
      <g font-size="14" font-style="italic" font-family="KaTeX_Math, Times New Roman, serif" fill="var(--muted)">
        <text :x="W - 12" :y="axisY - 8" text-anchor="end">x</text>
        <text :x="axisX + 10" y="18">y</text>
      </g>

      <path
        v-if="target"
        :d="target"
        fill="none"
        stroke="var(--target)"
        stroke-width="10"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.35"
      />

      <line v-if="sel && sel.axis !== null" :x1="sel.axis" :x2="sel.axis" y1="0" :y2="H" :stroke="sel.c.color" stroke-width="1" stroke-dasharray="4 5" opacity="0.6" />

      <template v-if="ghost">
        <path v-if="ghost.d" :d="ghost.d" fill="none" stroke="var(--ghost)" stroke-width="1.75" stroke-dasharray="6 6" />
        <line v-else :x1="ghost.vx" :x2="ghost.vx" y1="0" :y2="H" stroke="var(--ghost)" stroke-width="1.75" stroke-dasharray="6 6" />
      </template>

      <g v-for="L in layers" :key="L.c.id">
        <path
          v-if="L.d"
          :d="L.d"
          fill="none"
          :stroke="L.c.color"
          :stroke-width="L.isSel ? 3 : 2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          :opacity="L.isSel || !state.selectedId ? 1 : 0.85"
        />
        <line v-if="L.vx !== null" :x1="L.vx" :x2="L.vx" y1="0" :y2="H" :stroke="L.c.color" :stroke-width="L.isSel ? 3 : 2.2" />
        <path v-if="L.d" :d="L.d" fill="none" stroke="transparent" stroke-width="14" :data-curve="L.c.id" class="hit" data-noexport />
        <line v-if="L.vx !== null" :x1="L.vx" :x2="L.vx" y1="0" :y2="H" stroke="transparent" stroke-width="14" :data-curve="L.c.id" class="hit" data-noexport />
        <template v-if="L.c.kind === 'points' && !L.isSel">
          <circle v-for="(p, i) in L.c.points" :key="i" :cx="sx(p.x)" :cy="sy(p.y)" r="4" :fill="L.c.color" stroke="var(--surface)" stroke-width="1.5" />
        </template>
        <text
          v-if="L.tag"
          :x="L.tag.x"
          :y="L.tag.y"
          font-size="14"
          font-weight="600"
          font-style="italic"
          font-family="KaTeX_Math, Times New Roman, serif"
          text-anchor="middle"
          :fill="L.c.color"
          v-bind="LABEL"
        >{{ L.c.name }}</text>
      </g>

      <g v-if="sel && sel.tri" :stroke="sel.c.color" fill="none" stroke-width="1.5" stroke-dasharray="4 3">
        <path :d="`M${sel.tri.a[0]},${sel.tri.a[1]} L${sel.tri.b[0]},${sel.tri.b[1]} L${sel.tri.c[0]},${sel.tri.c[1]}`" />
      </g>
      <g v-if="sel && sel.tri" font-size="11.5" font-weight="500" :fill="sel.c.color" v-bind="LABEL">
        <text :x="(sel.tri.a[0] + sel.tri.b[0]) / 2" :y="sel.tri.a[1] + (sel.tri.rise >= 0 ? 15 : -7)" text-anchor="middle">run {{ label(sel.tri.run) }}</text>
        <text :x="sel.tri.b[0] + (sel.tri.run >= 0 ? 7 : -7)" :y="(sel.tri.b[1] + sel.tri.c[1]) / 2 + 4" :text-anchor="sel.tri.run >= 0 ? 'start' : 'end'">rise {{ label(sel.tri.rise) }}</text>
      </g>

      <g v-if="sel">
        <template v-for="(p, i) in sel.pts" :key="'kp' + i">
          <circle v-if="p.type === 'vertex'" :cx="p.px" :cy="p.py" r="5.5" :fill="sel.c.color" stroke="var(--surface)" stroke-width="2" />
          <circle v-else-if="p.type === 'root'" :cx="p.px" :cy="p.py" r="4.5" fill="var(--surface)" :stroke="sel.c.color" stroke-width="2.2" />
          <rect v-else :x="p.px - 4.5" :y="p.py - 4.5" width="9" height="9" rx="1.5" :fill="sel.c.color" stroke="var(--surface)" stroke-width="2" />
        </template>
        <g font-size="12" font-weight="500" :fill="sel.c.color" v-bind="LABEL" style="font-variant-numeric: tabular-nums">
          <template v-for="(p, i) in sel.pts" :key="'kl' + i">
            <text
              v-if="p.type === 'vertex'"
              :x="p.px"
              :y="p.py + ((sel.m.a ?? 0) < 0 ? -13 : 23)"
              text-anchor="middle"
            >({{ label(p.x) }}, {{ label(p.y) }})</text>
            <text v-else-if="p.type === 'root'" :x="p.px" :y="p.py + ((sel.m.a ?? 0) < 0 || sel.m.vertical ? -10 : 20)" text-anchor="middle">{{ label(p.x) }}</text>
            <text v-else :x="p.px - 9" :y="p.py - 9" text-anchor="end">(0, {{ label(p.y) }})</text>
          </template>
        </g>
      </g>

      <g v-if="meetPoints.length">
        <g v-for="(p, i) in meetPoints" :key="'ip' + i">
          <path :d="`M${p.px},${p.py - 6} L${p.px + 6},${p.py} L${p.px},${p.py + 6} L${p.px - 6},${p.py} Z`" fill="var(--surface)" stroke="var(--text)" stroke-width="1.8" />
          <text
            v-if="p.mine"
            :x="p.px + 9"
            :y="p.py - 9"
            font-size="11.5"
            font-weight="500"
            fill="var(--text)"
            v-bind="LABEL"
          >({{ label(p.x) }}, {{ label(p.y) }})</text>
        </g>
      </g>

      <g v-if="tangent" data-noexport>
        <line :x1="tangent.x1" :y1="tangent.y1" :x2="tangent.x2" :y2="tangent.y2" stroke="var(--text)" stroke-width="1.25" stroke-dasharray="7 5" opacity="0.7" />
      </g>

      <g v-if="sel">
        <g
          v-for="h in sel.handles"
          :key="'h' + h.id"
          class="handle"
          data-noexport
          :data-handle="h.id"
          :data-axis="h.axis"
          :style="{ cursor: handleCursor(h.axis) }"
        >
          <circle :cx="h.px" :cy="h.py" r="12" fill="transparent" />
          <circle :cx="h.px" :cy="h.py" r="7" fill="var(--surface)" :stroke="sel.c.color" stroke-width="2.5" />
          <circle :cx="h.px" :cy="h.py" r="2.5" :fill="sel.c.color" />
        </g>
      </g>

      <g v-if="traceInfo" data-noexport pointer-events="none">
        <line :x1="traceInfo.px" :x2="traceInfo.px" y1="0" :y2="H" stroke="var(--border-strong)" stroke-width="1" />
        <circle :cx="traceInfo.px" :cy="traceInfo.py" r="4.5" :fill="traceInfo.color" stroke="var(--surface)" stroke-width="2" />
        <text
          :x="traceInfo.px + (traceInfo.px > W - 170 ? -12 : 12)"
          :y="traceInfo.py - 12"
          :text-anchor="traceInfo.px > W - 170 ? 'end' : 'start'"
          font-size="12"
          font-weight="500"
          fill="var(--text)"
          v-bind="LABEL"
          style="font-variant-numeric: tabular-nums"
        >{{ traceInfo.name }}({{ label(traceInfo.x) }}) = {{ label(traceInfo.y) }}<tspan v-if="prefs.tangent && traceInfo.grad !== null" fill="var(--muted)">   gradient {{ plain(traceInfo.grad) }}</tspan></text>
      </g>
    </svg>
  </div>
</template>
