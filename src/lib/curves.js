import { fix, store4, plain, degrees } from './format.js'
import { analyseParabola, explainParabolaChange } from './parabola.js'
import { analyseLine, explainLineChange } from './line.js'
import { analysePoints } from './fit.js'

export const PALETTE = ['#2f5bea', '#d9480f', '#0f8a6c', '#9c36b5', '#c2255c', '#1c7ed6', '#b7791f', '#2b8a3e']
const NAMES = ['f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'u', 'v', 'w']

export const FORMS = {
  parabola: [
    { id: 'standard', label: 'Standard', tex: 'y = ax^2 + bx + c' },
    { id: 'vertex', label: 'Vertex', tex: 'y = a(x - h)^2 + k' },
    { id: 'factorised', label: 'Factorised', tex: 'y = a(x - p)(x - q)' },
  ],
  line: [
    { id: 'slope', label: 'Gradient', tex: 'y = mx + c' },
    { id: 'point', label: 'Point', tex: 'y - y_1 = m(x - x_1)' },
    { id: 'two', label: 'Two points', tex: '(x_1, y_1),\\ (x_2, y_2)' },
    { id: 'general', label: 'General', tex: 'ax + by = c' },
  ],
}

export const SLIDERS = {
  standard: [
    { key: 'a', hint: 'coefficient of x²', min: -5, max: 5 },
    { key: 'b', hint: 'coefficient of x', min: -10, max: 10 },
    { key: 'c', hint: 'constant term', min: -10, max: 10 },
  ],
  vertex: [
    { key: 'a', hint: 'stretch and direction', min: -5, max: 5 },
    { key: 'h', hint: 'horizontal shift', min: -10, max: 10 },
    { key: 'k', hint: 'vertical shift', min: -10, max: 10 },
  ],
  factorised: [
    { key: 'a', hint: 'stretch and direction', min: -5, max: 5 },
    { key: 'p', hint: 'first root', min: -10, max: 10 },
    { key: 'q', hint: 'second root', min: -10, max: 10 },
  ],
  slope: [
    { key: 'm', hint: 'gradient', min: -10, max: 10 },
    { key: 'c', hint: 'y-intercept', min: -10, max: 10 },
  ],
  point: [
    { key: 'm', hint: 'gradient', min: -10, max: 10 },
    { key: 'x1', hint: 'point, x', min: -10, max: 10 },
    { key: 'y1', hint: 'point, y', min: -10, max: 10 },
  ],
  two: [
    { key: 'x1', hint: 'first point, x', min: -10, max: 10 },
    { key: 'y1', hint: 'first point, y', min: -10, max: 10 },
    { key: 'x2', hint: 'second point, x', min: -10, max: 10 },
    { key: 'y2', hint: 'second point, y', min: -10, max: 10 },
  ],
  general: [
    { key: 'a', hint: 'coefficient of x', min: -10, max: 10 },
    { key: 'b', hint: 'coefficient of y', min: -10, max: 10 },
    { key: 'c', hint: 'right-hand side', min: -10, max: 10 },
  ],
}

export const PARAM_TEX = { x1: 'x_1', y1: 'y_1', x2: 'x_2', y2: 'y_2' }

export const DEFAULTS = {
  parabola: {
    standard: { a: 1, b: -2, c: -3 },
    vertex: { a: 1, h: 1, k: -4 },
    factorised: { a: 1, p: -1, q: 3 },
  },
  line: {
    slope: { m: 1, c: 1 },
    point: { m: 1, x1: 2, y1: 3 },
    two: { x1: -2, y1: -1, x2: 3, y2: 4 },
    general: { a: 1, b: 1, c: 2 },
  },
}

let counter = 0
export const newId = () => `c${Date.now().toString(36)}${(counter++).toString(36)}`

export function nextName(curves) {
  const used = new Set(curves.map((c) => c.name))
  for (const n of NAMES) if (!used.has(n)) return n
  let i = 2
  for (;;) {
    for (const n of NAMES) if (!used.has(`${n}${i}`)) return `${n}${i}`
    i++
  }
}

export function nextColour(curves) {
  const used = curves.map((c) => c.color)
  return PALETTE.find((p) => !used.includes(p)) ?? PALETTE[curves.length % PALETTE.length]
}

export function createCurve(curves, kind, opts = {}) {
  const base = {
    id: newId(),
    name: nextName(curves),
    color: nextColour(curves),
    visible: true,
    kind,
  }
  if (kind === 'points') {
    return { ...base, points: opts.points ?? [], fit: opts.fit ?? 'auto' }
  }
  const params = structuredClone(DEFAULTS[kind])
  const form = opts.form ?? (kind === 'parabola' ? 'standard' : 'slope')
  if (opts.params) params[form] = { ...params[form], ...opts.params }
  return { ...base, form, params }
}

export function modelFor(curve) {
  if (curve.kind === 'points') return analysePoints(curve.points, curve.fit)
  if (curve.kind === 'line') return analyseLine(curve.form, curve.params[curve.form])
  return analyseParabola(curve.form, curve.params[curve.form])
}

export function explainChange(curve, key, before, after) {
  if (!key || before.form !== after.form) return null
  if (curve.kind === 'parabola') return explainParabolaChange(key, before, after)
  if (curve.kind === 'line') return explainLineChange(key, before, after)
  return null
}

export function convertForm(curve, model, to) {
  if (curve.form === to) return ''
  const set = (vals) => {
    for (const [k, v] of Object.entries(vals)) curve.params[to][k] = store4(v)
  }
  let notice = ''
  if (curve.kind === 'parabola') {
    if (to === 'standard') set({ a: model.a, b: model.b, c: model.c })
    else if (model.linear) notice = 'With a = 0 there is no parabola to convert, so this form keeps its previous values.'
    else if (to === 'vertex') set({ a: model.a, h: model.h, k: model.k })
    else if (!model.roots.length) notice = 'This curve has no real roots, so it cannot be written in factorised form. The previous factorised values are shown instead.'
    else set({ a: model.a, p: model.roots[0], q: model.roots[model.roots.length - 1] })
  } else if (!model.ok) {
    notice = 'This equation does not describe a line, so the new form keeps its previous values.'
  } else if (model.vertical) {
    if (to === 'two') {
      const y1 = curve.params.two.y1
      set({ x1: model.xc, x2: model.xc, y1, y2: y1 === curve.params.two.y2 ? y1 + 1 : curve.params.two.y2 })
    } else if (to === 'general') set({ a: 1, b: 0, c: model.xc })
    else notice = 'A vertical line has no gradient, so it cannot be written in this form. The previous values are shown instead.'
  } else {
    const { m, c } = model
    const f = (x) => m * x + c
    if (to === 'slope') set({ m, c })
    else if (to === 'point') {
      const x1 = curve.params.point.x1
      set({ m, x1, y1: f(x1) })
    } else if (to === 'two') {
      let { x1, x2 } = curve.params.two
      if (Math.abs(x1 - x2) < 1e-9) x2 = x1 + 1
      set({ x1, y1: f(x1), x2, y2: f(x2) })
    } else set({ a: -m, b: 1, c })
  }
  curve.form = to
  return notice
}

export function handlesFor(curve, model) {
  if (curve.kind === 'points') return curve.points.map((p, i) => ({ id: `pt${i}`, x: p.x, y: p.y, axis: 'xy' }))
  if (curve.kind === 'parabola') {
    if (model.linear) return []
    if (curve.form === 'factorised') {
      const { p, q } = curve.params.factorised
      return [
        { id: 'p', x: p, y: 0, axis: 'x' },
        { id: 'q', x: q, y: 0, axis: 'x' },
      ]
    }
    return [{ id: 'vertex', x: model.h, y: model.k, axis: 'xy' }]
  }
  if (!model.ok) return []
  const prm = curve.params[curve.form]
  if (curve.form === 'slope') {
    return [
      { id: 'c', x: 0, y: prm.c, axis: 'y' },
      { id: 'm', x: 1, y: prm.c + prm.m, axis: 'y' },
    ]
  }
  if (curve.form === 'point') {
    return [
      { id: 'pt', x: prm.x1, y: prm.y1, axis: 'xy' },
      { id: 'm', x: prm.x1 + 1, y: prm.y1 + prm.m, axis: 'y' },
    ]
  }
  if (curve.form === 'two') {
    return [
      { id: 'p1', x: prm.x1, y: prm.y1, axis: 'xy' },
      { id: 'p2', x: prm.x2, y: prm.y2, axis: 'xy' },
    ]
  }
  return []
}

export function handleKey(curve, id) {
  if (curve.kind === 'parabola' && (id === 'p' || id === 'q')) return id
  if (curve.kind === 'line') {
    if (id === 'c' || id === 'm') return id
  }
  return null
}

export function applyHandle(curve, id, x, y) {
  if (curve.kind === 'points') {
    const i = Number(id.slice(2))
    curve.points[i] = { x: store4(x), y: store4(y) }
    return
  }
  const prm = curve.params[curve.form]
  if (curve.kind === 'parabola') {
    if (id === 'p' || id === 'q') prm[id] = store4(x)
    else if (curve.form === 'vertex') {
      prm.h = store4(x)
      prm.k = store4(y)
    } else {
      prm.b = store4(-2 * prm.a * x)
      prm.c = store4(prm.a * x * x + y)
    }
    return
  }
  if (id === 'c') prm.c = store4(y)
  else if (id === 'm') prm.m = store4(curve.form === 'slope' ? y - prm.c : y - prm.y1)
  else if (id === 'pt') {
    prm.x1 = store4(x)
    prm.y1 = store4(y)
  } else if (id === 'p1') {
    prm.x1 = store4(x)
    prm.y1 = store4(y)
  } else if (id === 'p2') {
    prm.x2 = store4(x)
    prm.y2 = store4(y)
  }
}

export function gradientTriangle(curve, model) {
  if (curve.kind !== 'line' || !model.ok || model.vertical) return null
  const prm = curve.params[curve.form]
  if (curve.form === 'slope') return { x0: 0, y0: prm.c, run: 1, rise: prm.m }
  if (curve.form === 'point') return { x0: prm.x1, y0: prm.y1, run: 1, rise: prm.m }
  if (curve.form === 'two') return { x0: prm.x1, y0: prm.y1, run: prm.x2 - prm.x1, rise: prm.y2 - prm.y1 }
  return { x0: 0, y0: model.c, run: 1, rise: model.m }
}

export function keyPoints(model) {
  const out = []
  if (!model || model.ok === false) return out
  if (model.vertical) {
    out.push({ x: model.xc, y: 0, type: 'root' })
    return out
  }
  if (typeof model.f !== 'function') return out
  if (model.kind !== 'line' && !model.linear && model.h !== null && model.h !== undefined) {
    out.push({ x: model.h, y: model.k, type: 'vertex' })
  }
  for (const r of model.roots) out.push({ x: r, y: 0, type: 'root' })
  out.push({ x: 0, y: model.c, type: 'int' })
  return out
}

export function features(model) {
  const out = []
  if (!model) return out
  if (model.kind === 'points') {
    out.push({ label: 'Points', value: String(model.pts.length) })
    if (!model.fit) {
      out.push({ label: 'Fit', value: model.message ? 'needs more points' : 'none' })
      return out
    }
    out.push({ label: 'Fit', value: `${model.fit.method === 'least squares' ? 'best-fit' : 'exact'} ${model.fit.type}` })
    if (model.fit.r2 !== undefined) out.push({ label: 'R²', value: plain(model.fit.r2) })
  }
  if (model.ok === false) {
    out.push({ label: 'Status', value: 'not a line' })
    return out
  }
  if (model.vertical) {
    out.push({ label: 'Line', value: `x = ${plain(model.xc)}` })
    out.push({ label: 'Gradient', value: 'undefined' })
    out.push({ label: 'x-intercept', value: `(${plain(model.xc)}, 0)`, kind: 'root' })
    return out
  }
  if (model.linear) {
    const m = model.m ?? model.b
    out.push({ label: 'Gradient', value: plain(m) })
    out.push({ label: 'Angle', value: `${plain(degrees(m))}°` })
  } else {
    out.push({ label: 'Opens', value: model.a > 0 ? 'upwards' : 'downwards' })
    out.push({ label: 'Vertex', value: `(${plain(model.h)}, ${plain(model.k)})`, kind: 'vertex' })
    out.push({ label: 'Axis', value: `x = ${plain(model.h)}` })
  }
  out.push({ label: 'y-intercept', value: `(0, ${plain(model.c)})`, kind: 'int' })
  out.push({
    label: model.roots.length === 1 ? 'Root' : 'Roots',
    value: model.roots.length ? model.roots.map(plain).join(', ') : 'none',
    kind: 'root',
  })
  if (!model.linear) out.push({ label: 'Discriminant', value: plain(model.D) })
  return out
}

export function derivative(model, x) {
  if (!model || model.vertical || typeof model.f !== 'function') return null
  return fix(2 * (model.a ?? 0) * x + model.b)
}

export function sameCurve(model, target) {
  if (!model || model.vertical || typeof model.f !== 'function') return false
  return (
    Math.abs((model.a ?? 0) - target.a) < 0.02 &&
    Math.abs(model.b - target.b) < 0.05 &&
    Math.abs(model.c - target.c) < 0.05
  )
}

export function cardTex(curve, model) {
  if (curve.kind === 'points') {
    if (!model.fit) return model.pts.length ? `${model.pts.length}\\ \\text{point${model.pts.length === 1 ? '' : 's'}}` : '\\text{no points yet}'
    return model.tex
  }
  return model.tex
}
