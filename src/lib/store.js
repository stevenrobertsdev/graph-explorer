import { reactive, computed, watch } from 'vue'
import {
  DEFAULTS,
  FORMS,
  PALETTE,
  SLIDERS,
  createCurve,
  modelFor,
  convertForm,
  explainChange,
  handleKey,
  sameCurve,
  newId,
} from './curves.js'
import { FIT_TYPES } from './fit.js'
import { intersect, isGraphable } from './intersect.js'
import { parseInput } from './parse.js'
import { vertexTex } from './parabola.js'
import { poly } from './format.js'

const STORAGE = 'graph-explorer:v2'
const PREFS = 'graph-explorer:prefs'
export const DEFAULT_SPAN = 20

export const state = reactive({
  curves: [],
  selectedId: null,
  view: { span: DEFAULT_SPAN, cx: 0, cy: 0 },
})

export const prefs = reactive({
  tool: 'move',
  tangent: false,
  showIntersections: true,
  inspector: true,
  theme: 'system',
})

export const ui = reactive({
  change: null,
  anim: null,
  cursor: null,
  trace: null,
  toast: null,
  notices: {},
  help: false,
  challenge: null,
})

export const actions = {}

export const models = computed(() => {
  const map = new Map()
  for (const c of state.curves) map.set(c.id, modelFor(c))
  return map
})

export const selected = computed(() => state.curves.find((c) => c.id === state.selectedId) ?? null)
export const selectedModel = computed(() => (selected.value ? models.value.get(selected.value.id) : null))

export const intersections = computed(() => {
  const vis = state.curves
    .filter((c) => c.visible)
    .map((c) => ({ c, m: models.value.get(c.id) }))
    .filter((x) => isGraphable(x.m))
  const out = []
  for (let i = 0; i < vis.length; i++) {
    for (let j = i + 1; j < vis.length; j++) {
      const A = vis[i]
      const B = vis[j]
      const res = intersect(A.m, B.m, A.c.name, B.c.name)
      if (res) out.push({ a: A.c, b: B.c, ...res })
    }
  }
  return out
})

export const change = computed(() => {
  const ch = ui.change
  const curve = selected.value
  if (!ch || !curve || ch.id !== curve.id) return null
  const now = models.value.get(curve.id)
  if (!now || now.tex === ch.model.tex) return null
  return {
    ghost: ch.model,
    explanation: explainChange(curve, ch.key, ch.model, now),
  }
})

let lastTouch = 0

export function beginChange(curve, key, source) {
  const now = Date.now()
  const stale = !ui.change || ui.change.id !== curve.id || ui.change.key !== key || now - lastTouch > 1500
  if (source === 'pointer' || source === 'handle' || stale) {
    ui.change = { id: curve.id, key, model: models.value.get(curve.id) }
  }
  lastTouch = now
  if (ui.anim && ui.anim.id === curve.id && ui.anim.key === key) ui.anim = null
}

export function updateParam(curve, key, value) {
  if (!ui.change || ui.change.id !== curve.id || ui.change.key !== key) beginChange(curve, key, 'key')
  lastTouch = Date.now()
  curve.params[curve.form][key] = value
}

export function beginHandle(curve, handleId) {
  beginChange(curve, handleKey(curve, handleId), 'handle')
}

export function select(id) {
  if (state.selectedId !== id) ui.change = null
  state.selectedId = id
}

export function addCurve(kind, opts) {
  const curve = createCurve(state.curves, kind, opts)
  state.curves.push(curve)
  select(curve.id)
  return curve
}

export function addFromInput(text) {
  const res = parseInput(text)
  if (!res.ok) return res.error
  if (res.kind === 'points') {
    addCurve('points', { points: res.points, fit: 'auto' })
  } else {
    addCurve(res.kind, { form: res.form, params: res.params })
  }
  return null
}

export function removeCurve(id) {
  const i = state.curves.findIndex((c) => c.id === id)
  if (i < 0) return
  state.curves.splice(i, 1)
  if (state.selectedId === id) select(state.curves[Math.min(i, state.curves.length - 1)]?.id ?? null)
  if (ui.anim?.id === id) ui.anim = null
}

export function duplicateCurve(id) {
  const src = state.curves.find((c) => c.id === id)
  if (!src) return
  const copy = JSON.parse(JSON.stringify(src))
  const fresh = createCurve(state.curves, src.kind)
  copy.id = fresh.id
  copy.name = fresh.name
  copy.color = fresh.color
  const i = state.curves.indexOf(src)
  state.curves.splice(i + 1, 0, copy)
  select(copy.id)
}

export function setForm(curve, form) {
  if (curve.form === form) return
  const model = models.value.get(curve.id)
  ui.notices[curve.id] = convertForm(curve, model, form)
  ui.change = null
  if (ui.anim?.id === curve.id) ui.anim = null
}

export function resetCurve(curve) {
  if (curve.kind === 'points') return
  Object.assign(curve.params[curve.form], structuredClone(DEFAULTS[curve.kind][curve.form]))
  ui.change = null
  ui.notices[curve.id] = ''
}

export function toast(text) {
  ui.toast = { text, at: Date.now() }
  const at = ui.toast.at
  setTimeout(() => {
    if (ui.toast?.at === at) ui.toast = null
  }, 2200)
}

function animTick(t) {
  const a = ui.anim
  if (!a) return
  const curve = state.curves.find((c) => c.id === a.id)
  if (!curve || curve.form !== a.form) {
    ui.anim = null
    return
  }
  if (a.t0 === null) a.t0 = t
  const phase = ((t - a.t0) / 1000) * ((2 * Math.PI) / a.period) + a.offset
  curve.params[a.form][a.key] = Math.round((a.centre + a.amp * Math.sin(phase)) * 100) / 100
  requestAnimationFrame(animTick)
}

export function toggleAnim(curve, def) {
  if (ui.anim && ui.anim.id === curve.id && ui.anim.key === def.key) {
    ui.anim = null
    return
  }
  const v = curve.params[curve.form][def.key]
  const centre = (def.min + def.max) / 2
  const amp = (def.max - def.min) / 2
  const start = Math.max(-1, Math.min(1, (v - centre) / amp))
  ui.change = null
  const fresh = !ui.anim
  ui.anim = { id: curve.id, form: curve.form, key: def.key, centre, amp, period: 8, offset: Math.asin(start), t0: null }
  if (fresh) requestAnimationFrame(animTick)
}

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const range = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)

export function newChallenge() {
  let target
  if (Math.random() < 0.6) {
    const a = pick([-2, -1, -0.5, 0.5, 1, 2])
    const h = pick(range(-4, 4))
    const k = pick(range(-5, 5))
    target = { kind: 'parabola', a, b: -2 * a * h, c: a * h * h + k, tex: `y = ${vertexTex(a, h, k)}` }
  } else {
    const m = pick([-3, -2, -1, -0.5, 0.5, 1, 2, 3])
    const c = pick(range(-5, 5))
    target = { kind: 'line', a: 0, b: m, c, tex: `y = ${poly(0, m, c)}` }
  }
  target.f = (x) => target.a * x * x + target.b * x + target.c
  ui.challenge = { target, solvedBy: null, revealed: false }
  const hasKind = state.curves.some((c) => c.kind === target.kind && c.visible)
  if (!hasKind) addCurve(target.kind)
}

export function endChallenge() {
  ui.challenge = null
}

watch(models, (map) => {
  const ch = ui.challenge
  if (!ch || ch.solvedBy) return
  for (const c of state.curves) {
    if (c.visible && sameCurve(map.get(c.id), ch.target)) {
      ch.solvedBy = c.name
      ch.revealed = true
      return
    }
  }
})

function encode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

const finite = (n, d = 0) => (Number.isFinite(Number(n)) ? Number(n) : d)

function sanitise(raw, existing) {
  if (!raw || !['parabola', 'line', 'points'].includes(raw.kind)) return null
  const base = createCurve(existing, raw.kind)
  const curve = {
    ...base,
    id: typeof raw.id === 'string' ? raw.id : newId(),
    name: typeof raw.name === 'string' && raw.name.length < 8 ? raw.name : base.name,
    color: PALETTE.includes(raw.color) ? raw.color : base.color,
    visible: raw.visible !== false,
  }
  if (raw.kind === 'points') {
    curve.points = Array.isArray(raw.points) ? raw.points.slice(0, 200).map((p) => ({ x: finite(p?.x), y: finite(p?.y) })) : []
    curve.fit = FIT_TYPES.some((f) => f.id === raw.fit) ? raw.fit : 'auto'
    return curve
  }
  curve.form = FORMS[raw.kind].some((f) => f.id === raw.form) ? raw.form : base.form
  for (const f of FORMS[raw.kind]) {
    for (const s of SLIDERS[f.id]) {
      const v = raw.params?.[f.id]?.[s.key]
      if (v !== undefined) curve.params[f.id][s.key] = finite(v, curve.params[f.id][s.key])
    }
  }
  return curve
}

function loadCurves(list) {
  const out = []
  for (const raw of Array.isArray(list) ? list.slice(0, 30) : []) {
    const c = sanitise(raw, out)
    if (c) out.push(c)
  }
  return out
}

function snapshot() {
  return { v: 2, curves: JSON.parse(JSON.stringify(state.curves)), view: { ...state.view } }
}

function applySnapshot(data) {
  const curves = loadCurves(data?.curves)
  if (!curves.length && data?.curves?.length) return false
  state.curves = curves
  state.selectedId = curves[0]?.id ?? null
  if (data?.view) {
    state.view.span = Math.min(400, Math.max(1, finite(data.view.span, DEFAULT_SPAN)))
    state.view.cx = finite(data.view.cx)
    state.view.cy = finite(data.view.cy)
  }
  return true
}

function seed() {
  state.curves = []
  addCurve('parabola')
  addCurve('line')
  select(state.curves[0].id)
}

export function load() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS) || 'null')
    if (p) {
      for (const k of Object.keys(prefs)) if (k in p && typeof p[k] === typeof prefs[k]) prefs[k] = p[k]
    }
  } catch {}
  applyTheme()

  const hash = location.hash.match(/^#s=(.+)$/)
  if (hash) {
    try {
      if (applySnapshot(decode(hash[1]))) {
        history.replaceState(null, '', location.pathname + location.search)
        toast('Loaded a shared graph')
        return
      }
    } catch {}
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null')
    if (saved && applySnapshot(saved) && state.curves.length) return
  } catch {}
  seed()
}

export function startOver() {
  ui.change = null
  ui.anim = null
  ui.challenge = null
  state.view.span = DEFAULT_SPAN
  state.view.cx = 0
  state.view.cy = 0
  seed()
}

let saveTimer = null
watch(
  () => [state.curves, state.view],
  () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE, JSON.stringify(snapshot()))
      } catch {}
    }, 400)
  },
  { deep: true },
)

watch(
  prefs,
  () => {
    try {
      localStorage.setItem(PREFS, JSON.stringify(prefs))
    } catch {}
    applyTheme()
  },
  { deep: true },
)

export function applyTheme() {
  const root = document.documentElement
  if (prefs.theme === 'system') delete root.dataset.theme
  else root.dataset.theme = prefs.theme
}

export async function copyShareLink() {
  const url = `${location.origin}${location.pathname}#s=${encode(snapshot())}`
  try {
    await navigator.clipboard.writeText(url)
    toast('Link copied to the clipboard')
  } catch {
    window.prompt('Copy this link', url)
  }
}
