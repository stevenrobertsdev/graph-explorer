import { T, EPS, fix, rel, num, par, poly, point, isZero } from './format.js'

export const isGraphable = (m) => m && m.ok !== false && (m.vertical || typeof m.f === 'function')

export function intersect(A, B, nameA, nameB) {
  if (!isGraphable(A) || !isGraphable(B)) return null
  const blocks = []
  const points = []
  let identical = false

  if (A.vertical && B.vertical) {
    if (Math.abs(A.xc - B.xc) < EPS) {
      identical = true
      blocks.push({ p: T`Both are the line $x = ${num(A.xc)}$, so they overlap everywhere.` })
    } else {
      blocks.push({ p: T`Two different vertical lines, $x = ${num(A.xc)}$ and $x = ${num(B.xc)}$, are parallel and never meet.` })
    }
    return { points, identical, blocks }
  }

  if (A.vertical || B.vertical) {
    const V = A.vertical ? A : B
    const F = A.vertical ? B : A
    const fname = A.vertical ? nameB : nameA
    const y = fix(F.f(V.xc))
    points.push({ x: V.xc, y })
    blocks.push({ p: T`A vertical line fixes $x = ${num(V.xc)}$, so substitute that into the other equation.` })
    blocks.push({ m: T`${fname}(${num(V.xc)}) = ${poly(F.a, F.b, F.c).replace(/x/g, `(${num(V.xc)})`)} ${rel(y)} ${num(y)}` })
    blocks.push({ p: T`They meet once, at $${point(V.xc, y)}$.` })
    return { points, identical, blocks }
  }

  const da = fix(A.a - B.a)
  const db = fix(A.b - B.b)
  const dc = fix(A.c - B.c)

  blocks.push({ p: T`Where the graphs meet they share both coordinates, so set $${nameA}(x) = ${nameB}(x)$.` })
  blocks.push({ m: `${poly(A.a, A.b, A.c)} = ${poly(B.a, B.b, B.c)}` })
  blocks.push({ p: 'Collect everything on one side:' })
  blocks.push({ m: `${poly(da, db, dc)} = 0` })

  let xs = []
  if (!isZero(da)) {
    const D = fix(db * db - 4 * da * dc)
    blocks.push({ p: T`This is a quadratic, so its discriminant decides how many meeting points there are.` })
    blocks.push({ m: T`\Delta = ${par(db)}^2 - 4 \times ${par(da)} \times ${par(dc)} = ${num(D)}` })
    if (D > EPS) {
      const s = Math.sqrt(D)
      xs = [(-db - s) / (2 * da), (-db + s) / (2 * da)].sort((p, q) => p - q)
      blocks.push({ p: T`$\Delta > 0$, so the graphs cross at two points.` })
      blocks.push({ m: T`x = \frac{${num(-db)} \pm \sqrt{${num(D)}}}{${num(2 * da)}} \;\Rightarrow\; x ${rel(xs[0])} ${num(xs[0])} \ \text{or}\ x ${rel(xs[1])} ${num(xs[1])}` })
    } else if (Math.abs(D) <= EPS) {
      xs = [-db / (2 * da)]
      blocks.push({ p: T`$\Delta = 0$, so there is exactly one meeting point. The graphs touch there without crossing, which means they share a tangent at that point.` })
      blocks.push({ m: T`x = -\frac{${num(db)}}{2 \times ${par(da)}} ${rel(xs[0])} ${num(xs[0])}` })
    } else {
      blocks.push({ p: T`$\Delta < 0$, so there is no real solution: the graphs never meet.` })
    }
  } else if (!isZero(db)) {
    xs = [-dc / db]
    blocks.push({
      p: isZero(A.a)
        ? 'The equation is linear, so there is exactly one solution.'
        : T`The $x^2$ terms cancel because both have the same $a$, leaving a linear equation with one solution.`,
    })
    blocks.push({ m: T`x = -\frac{${num(dc)}}{${num(db)}} ${rel(xs[0])} ${num(xs[0])}` })
  } else if (!isZero(dc)) {
    blocks.push({
      p: isZero(A.a)
        ? T`The $x$ terms cancel, leaving $${num(dc)} = 0$, which is false. The lines have the same gradient but different intercepts, so they are parallel and never meet.`
        : T`Everything involving $x$ cancels, leaving $${num(dc)} = 0$, which is false. One graph is the other shifted vertically, so they never meet.`,
    })
  } else {
    identical = true
    blocks.push({ p: T`Every term cancels, leaving $0 = 0$. The two equations describe the same graph, so they meet everywhere.` })
  }

  for (const x of xs) {
    const y = fix(A.f(x))
    points.push({ x: fix(x), y })
  }
  if (points.length) {
    blocks.push({ p: T`Substitute back into $${nameA}$ to find each $y$:` })
    blocks.push({ m: points.map((p) => T`${nameA}(${num(p.x)}) ${rel(p.y)} ${num(p.y)}`).join(T`, \qquad `) })
    blocks.push({ p: T`Meeting ${points.length === 1 ? 'point' : 'points'}: ${points.map((p) => `$${point(p.x, p.y)}$`).join(' and ')}.` })
  }
  return { points, identical, blocks }
}
