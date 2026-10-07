import { store4 } from './format.js'

class ParseError extends Error {}

function tokenize(src) {
  const s = src
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/[−–—]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .toLowerCase()
  const tokens = []
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (/[0-9.]/.test(ch)) {
      let j = i
      while (j < s.length && /[0-9.]/.test(s[j])) j++
      const text = s.slice(i, j)
      if ((text.match(/\./g) || []).length > 1 || text === '.') throw new ParseError(`"${text}" is not a number.`)
      tokens.push({ t: 'num', v: Number(text) })
      i = j
      continue
    }
    if (ch === 'x' || ch === 'y') {
      tokens.push({ t: 'var', v: ch })
      i++
      continue
    }
    if ('+-*/^()='.includes(ch)) {
      tokens.push({ t: ch })
      i++
      continue
    }
    throw new ParseError(`Unexpected "${ch}". Use numbers, x, y, + − × ÷ ^ and brackets.`)
  }
  return tokens
}

const key = (i, j) => `${i},${j}`
const P = {
  constant: (c) => new Map(c === 0 ? [] : [[key(0, 0), c]]),
  variable: (v) => new Map([[v === 'x' ? key(1, 0) : key(0, 1), 1]]),
  add(a, b, sign = 1) {
    const out = new Map(a)
    for (const [k, v] of b) {
      const nv = (out.get(k) || 0) + sign * v
      if (Math.abs(nv) < 1e-12) out.delete(k)
      else out.set(k, nv)
    }
    return out
  },
  mul(a, b) {
    let out = new Map()
    for (const [ka, va] of a) {
      const [ia, ja] = ka.split(',').map(Number)
      for (const [kb, vb] of b) {
        const [ib, jb] = kb.split(',').map(Number)
        out = P.add(out, new Map([[key(ia + ib, ja + jb), va * vb]]))
      }
    }
    return out
  },
  isConstant: (a) => [...a.keys()].every((k) => k === key(0, 0)),
  value: (a) => a.get(key(0, 0)) || 0,
}

function parseExpression(tokens) {
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]
  const expect = (t) => {
    if (peek()?.t !== t) throw new ParseError(t === ')' ? 'A bracket is not closed.' : `Expected "${t}".`)
    next()
  }

  function expr() {
    let left = term()
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = next().t
      left = P.add(left, term(), op === '+' ? 1 : -1)
    }
    return left
  }

  function startsFactor(tok) {
    return tok && (tok.t === 'num' || tok.t === 'var' || tok.t === '(')
  }

  function term() {
    let left = unary()
    for (;;) {
      const tok = peek()
      if (tok && tok.t === '*') {
        next()
        left = P.mul(left, unary())
      } else if (tok && tok.t === '/') {
        next()
        const right = unary()
        if (!P.isConstant(right)) throw new ParseError('You can only divide by a number, not by an expression with x or y.')
        const d = P.value(right)
        if (d === 0) throw new ParseError('Division by zero.')
        left = P.mul(left, P.constant(1 / d))
      } else if (startsFactor(tok)) {
        left = P.mul(left, power())
      } else break
    }
    return left
  }

  function unary() {
    const tok = peek()
    if (tok && tok.t === '-') {
      next()
      return P.mul(P.constant(-1), unary())
    }
    if (tok && tok.t === '+') {
      next()
      return unary()
    }
    return power()
  }

  function power() {
    const base = atom()
    if (peek()?.t === '^') {
      next()
      const e = unary()
      if (!P.isConstant(e)) throw new ParseError('Powers must be whole numbers.')
      const n = P.value(e)
      if (!Number.isInteger(n) || n < 0 || n > 6) throw new ParseError('Powers must be whole numbers from 0 to 6.')
      let out = P.constant(1)
      for (let i = 0; i < n; i++) out = P.mul(out, base)
      return out
    }
    return base
  }

  function atom() {
    const tok = next()
    if (!tok) throw new ParseError('The equation ends too early.')
    if (tok.t === 'num') return P.constant(tok.v)
    if (tok.t === 'var') return P.variable(tok.v)
    if (tok.t === '(') {
      const inner = expr()
      expect(')')
      return inner
    }
    throw new ParseError(`Unexpected "${tok.t}".`)
  }

  const result = expr()
  if (pos < tokens.length) throw new ParseError(`Unexpected "${tokens[pos].t === 'num' ? tokens[pos].v : tokens[pos].t}".`)
  return result
}

function parsePoints(src) {
  const re = /\(\s*([-−]?\d*\.?\d+)\s*,\s*([-−]?\d*\.?\d+)\s*\)/g
  const rest = src.replace(re, '').replace(/[\s,;]/g, '')
  if (rest.length) return null
  const pts = [...src.matchAll(re)].map((m) => ({
    x: Number(m[1].replace('−', '-')),
    y: Number(m[2].replace('−', '-')),
  }))
  return pts.length ? pts : null
}

const N = String.raw`\d*\.?\d+`
const leading = (s) => (s === '' || s === '+' ? 1 : s === '-' ? -1 : Number(s))
const VERTEX = new RegExp(String.raw`^y=([-+]?(?:${N})?)\*?\(x([-+]${N})\)\^2([-+]${N})?$`)
const FACTOR = new RegExp(String.raw`^y=([-+]?(?:${N})?)\*?\(x([-+]${N})\)\(x([-+]${N})\)$`)
const POINT = new RegExp(String.raw`^y([-+]${N})=([-+]?(?:${N})?)\*?\(x([-+]${N})\)$`)

function detectForm(src) {
  const s = src.replace(/\s/g, '').replace(/[−–—]/g, '-').toLowerCase()
  let m = s.match(VERTEX)
  if (m) return { kind: 'parabola', form: 'vertex', params: { a: leading(m[1]), h: -Number(m[2]), k: m[3] ? Number(m[3]) : 0 } }
  m = s.match(FACTOR)
  if (m) return { kind: 'parabola', form: 'factorised', params: { a: leading(m[1]), p: -Number(m[2]), q: -Number(m[3]) } }
  m = s.match(POINT)
  if (m) return { kind: 'line', form: 'point', params: { m: leading(m[2]), x1: -Number(m[3]), y1: -Number(m[1]) } }
  return null
}

export function parseInput(raw) {
  const src = raw.trim()
  if (!src) return { ok: false, error: 'Type an equation or some points.' }

  const pts = parsePoints(src)
  if (pts) return { ok: true, kind: 'points', points: pts }

  const detected = detectForm(src)
  if (detected && detected.params.a !== 0 && detected.params.m !== 0) return { ok: true, ...detected }

  try {
    const sides = src.split('=')
    if (sides.length > 2) throw new ParseError('Use at most one "=".')
    const lhsText = sides.length === 2 ? sides[0].trim() : 'y'
    const rhsText = sides.length === 2 ? sides[1] : sides[0]
    if (!lhsText || !rhsText.trim()) throw new ParseError('Both sides of "=" need something.')
    const lhs = parseExpression(tokenize(lhsText))
    const rhs = parseExpression(tokenize(rhsText))
    const eq = P.add(lhs, rhs, -1)

    const coeff = (i, j) => eq.get(key(i, j)) || 0
    for (const k of eq.keys()) {
      const [i, j] = k.split(',').map(Number)
      if (j >= 2) throw new ParseError('Only one power of y is supported. Write the equation as y = … or ax + by = c.')
      if (j === 1 && i >= 1) throw new ParseError('Terms that multiply x by y are not supported.')
    }
    const degX = Math.max(0, ...[...eq.keys()].map((k) => (k.endsWith(',0') ? Number(k.split(',')[0]) : 0)))
    const B = coeff(0, 1)

    if (Math.abs(B) < 1e-12) {
      if (degX === 0) throw new ParseError(coeff(0, 0) === 0 ? 'Both sides are equal for every point, so this is not a graph.' : 'No point satisfies this equation.')
      if (degX === 1) {
        const a = coeff(1, 0)
        const c = -coeff(0, 0)
        const s = a < 0 ? -1 : 1
        return { ok: true, kind: 'line', form: 'general', params: { a: store4(s * a), b: 0, c: store4(s * c) } }
      }
      throw new ParseError('An equation in x alone with a squared term is a pair of vertical lines, which is not supported.')
    }

    if (degX > 2) throw new ParseError(`That is a degree ${degX} curve. Only lines (degree 1) and parabolas (degree 2) are supported.`)
    const a = store4(-coeff(2, 0) / B)
    const b = store4(-coeff(1, 0) / B)
    const c = store4(-coeff(0, 0) / B)

    if (degX === 2) return { ok: true, kind: 'parabola', form: 'standard', params: { a, b, c } }

    const isolated = lhsText.replace(/\s/g, '').toLowerCase() === 'y'
    if (isolated) return { ok: true, kind: 'line', form: 'slope', params: { m: b, c } }
    const s = B < 0 ? -1 : 1
    return {
      ok: true,
      kind: 'line',
      form: 'general',
      params: { a: store4(s * coeff(1, 0)), b: store4(s * B), c: store4(-s * coeff(0, 0)) },
    }
  } catch (e) {
    if (e instanceof ParseError) return { ok: false, error: e.message }
    throw e
  }
}
