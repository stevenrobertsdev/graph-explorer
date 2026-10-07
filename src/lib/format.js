export const T = String.raw
export const EPS = 1e-9

export const fix = (n) => Math.round(n * 1e10) / 1e10

export function clean(n, dp = 3) {
  if (!Number.isFinite(n)) return n
  const f = 10 ** dp
  const r = (Math.sign(n) * Math.round(Math.abs(n) * f + 1e-9)) / f
  return Math.abs(r) < EPS ? 0 : r
}

export const store4 = (n) => clean(n, 4)

export const exact = (n) => Math.abs(clean(n) - n) < 1e-9
export const rel = (n) => (exact(n) ? '=' : T`\approx`)
export const relAll = (...ns) => (ns.every(exact) ? '=' : T`\approx`)

export function num(n) {
  const r = clean(n)
  return r < 0 ? `-${Math.abs(r)}` : `${r}`
}

export const plain = (n) => num(n).replace('-', '−')

export const par = (n) => (clean(n) < 0 ? `(${num(n)})` : num(n))
export const isZero = (n) => clean(n) === 0
export const isOne = (n) => clean(Math.abs(n)) === 1
export const sgn = (n) => (clean(n) > 0 ? 1 : clean(n) < 0 ? -1 : 0)

export function coef(a) {
  if (clean(a) === 1) return ''
  if (clean(a) === -1) return '-'
  return num(a)
}

export function joinTerms(terms) {
  const out = terms.filter((t) => !isZero(t.c))
  if (!out.length) return '0'
  return out
    .map((t, i) => {
      const neg = clean(t.c) < 0
      const abs = Math.abs(t.c)
      const body = t.v ? (isOne(abs) ? t.v : num(abs) + t.v) : num(abs)
      if (i === 0) return (neg ? '-' : '') + body
      return (neg ? ' - ' : ' + ') + body
    })
    .join('')
}

export const poly = (a, b, c) =>
  joinTerms([
    { c: a, v: 'x^2' },
    { c: b, v: 'x' },
    { c, v: '' },
  ])

export const plus = (n) =>
  isZero(n) ? '' : clean(n) < 0 ? ` - ${num(Math.abs(n))}` : ` + ${num(n)}`

export function shift(h, v = 'x') {
  if (isZero(h)) return v
  return clean(h) > 0 ? `${v} - ${num(h)}` : `${v} + ${num(Math.abs(h))}`
}

export const point = (x, y) => T`\left(${num(x)},\ ${num(y)}\right)`

export const degrees = (m) => (Math.atan(m) * 180) / Math.PI
