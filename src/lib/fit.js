import { T, EPS, fix, rel, num, par, poly, joinTerms, point } from './format.js'
import { analyseParabola, parabolaSteps } from './parabola.js'
import { analyseLine, lineSteps } from './line.js'

export const FIT_TYPES = [
  { id: 'auto', label: 'Auto' },
  { id: 'line', label: 'Line' },
  { id: 'parabola', label: 'Parabola' },
  { id: 'none', label: 'None' },
]

function solve3(A, y) {
  const M = A.map((row, i) => [...row, y[i]])
  for (let col = 0; col < 3; col++) {
    let best = col
    for (let r = col + 1; r < 3; r++) if (Math.abs(M[r][col]) > Math.abs(M[best][col])) best = r
    if (Math.abs(M[best][col]) < 1e-12) return null
    ;[M[col], M[best]] = [M[best], M[col]]
    for (let r = 0; r < 3; r++) {
      if (r === col) continue
      const f = M[r][col] / M[col][col]
      for (let k = col; k < 4; k++) M[r][k] -= f * M[col][k]
    }
  }
  return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]]
}

function rSquared(pts, f) {
  const mean = pts.reduce((s, p) => s + p.y, 0) / pts.length
  const ssTot = pts.reduce((s, p) => s + (p.y - mean) ** 2, 0)
  const ssRes = pts.reduce((s, p) => s + (p.y - f(p.x)) ** 2, 0)
  return { ssTot, ssRes, r2: ssTot < EPS ? 1 : 1 - ssRes / ssTot }
}

function wrap(base, extra) {
  const model = { ...base, ...extra, kind: 'points' }
  return model
}

export function analysePoints(points, fitType) {
  const pts = points.map((p) => ({ x: p.x, y: p.y }))
  const n = pts.length
  const distinctX = new Set(pts.map((p) => fix(p.x))).size
  const type = fitType === 'auto' ? (n >= 3 && distinctX >= 3 ? 'parabola' : n >= 2 ? 'line' : 'none') : fitType

  const empty = {
    kind: 'points',
    pts,
    fit: null,
    ok: true,
    vertical: false,
    f: null,
    roots: [],
    a: null,
    b: null,
    c: null,
    tex: n === 0 ? T`\text{no points yet}` : pts.map((p) => point(p.x, p.y)).join(',\ '),
  }

  const scatterSteps = (message) => () => [
    {
      title: 'Points',
      blocks: [
        { p: message },
        ...(n ? [{ m: pts.map((p) => point(p.x, p.y)).join(',\\ ') }] : []),
      ],
    },
  ]

  if (type === 'none' || n === 0) {
    return { ...empty, steps: scatterSteps(n ? 'These points are plotted without a fitted curve. Choose Line or Parabola to fit one through them.' : 'Add points with the table, or choose Place points in the toolbar and click on the graph.') }
  }

  if (type === 'line') {
    if (n < 2) return { ...empty, message: 'A line needs at least two points.', steps: scatterSteps('A line needs at least two points.') }
    if (distinctX === 1) {
      const base = analyseLine('two', { x1: pts[0].x, y1: pts[0].y, x2: pts[0].x, y2: pts[0].y + 1 })
      return wrap(base, {
        pts,
        fit: { type: 'line', method: 'vertical' },
        tex: `x = ${num(pts[0].x)}`,
        steps: () => [
          { title: 'All points share one x-value', blocks: [{ p: T`Every point has $x = ${num(pts[0].x)}$, so the only line through them is vertical.` }, { m: `x = ${num(pts[0].x)}` }] },
          ...lineSteps(base).slice(1),
        ],
      })
    }
    if (n === 2) {
      const [p1, p2] = pts
      const base = analyseLine('two', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
      return wrap(base, { pts, fit: { type: 'line', method: 'exact' }, tex: `y = ${poly(0, base.m, base.c)}` })
    }
    return leastSquaresLine(pts)
  }

  if (distinctX < 3) {
    const msg = 'A parabola needs at least three points with different x-values.'
    return { ...empty, message: msg, steps: scatterSteps(msg) }
  }
  if (n === 3) return exactParabola(pts)
  return leastSquaresParabola(pts)
}

function exactParabola(points) {
  const pts = [...points].sort((p, q) => p.x - q.x)
  const [P1, P2, P3] = pts
  const s12 = (P2.y - P1.y) / (P2.x - P1.x)
  const s23 = (P3.y - P2.y) / (P3.x - P2.x)
  const a = fix((s23 - s12) / (P3.x - P1.x))
  const b = fix(s12 - a * (P1.x + P2.x))
  const c = fix(P1.y - a * P1.x ** 2 - b * P1.x)
  const base = analyseParabola('standard', { a, b, c })
  const eq = (p) => `${num(p.y)} &= ${joinTerms([{ c: p.x * p.x, v: 'a' }, { c: p.x, v: 'b' }, { c: 1, v: 'c' }])}`
  const fitStep = {
    title: 'Fit a parabola through three points',
    blocks: [
      { p: T`Each point must satisfy $y = ax^2 + bx + c$. Substituting the three points gives three equations in the three unknowns $a$, $b$ and $c$.` },
      { m: T`\begin{aligned} ${eq(P1)} \\ ${eq(P2)} \\ ${eq(P3)} \end{aligned}` },
      { p: T`Subtracting neighbouring equations removes $c$. Dividing each result by the change in $x$ gives the average gradient between the two points, which works out as $a(x_i + x_j) + b$.` },
      { m: T`\frac{${num(P2.y)} - ${par(P1.y)}}{${num(P2.x)} - ${par(P1.x)}} ${rel(s12)} ${num(s12)} = ${num(P1.x + P2.x)}a + b` },
      { m: T`\frac{${num(P3.y)} - ${par(P2.y)}}{${num(P3.x)} - ${par(P2.x)}} ${rel(s23)} ${num(s23)} = ${num(P2.x + P3.x)}a + b` },
      { p: T`Subtracting these two removes $b$, leaving $a$ on its own. Back-substitution then gives $b$ and $c$.` },
      { m: T`a = \frac{${num(s23)} - ${par(s12)}}{${num(P3.x)} - ${par(P1.x)}} ${rel(a)} ${num(a)}` },
      { m: T`b = ${num(s12)} - ${par(a)} \times ${par(P1.x + P2.x)} ${rel(b)} ${num(b)}` },
      { m: T`c = ${num(P1.y)} - ${par(a)} \times ${par(P1.x)}^2 - ${par(b)} \times ${par(P1.x)} ${rel(c)} ${num(c)}` },
      { m: `y = ${poly(a, b, c)}` },
    ],
  }
  if (base.linear) {
    fitStep.blocks.push({ p: T`$a = 0$, so the three points lie on a straight line and the "parabola" is really a line.` })
  }
  return wrap(base, {
    pts: points,
    fit: { type: 'parabola', method: 'exact' },
    tex: `y = ${poly(a, b, c)}`,
    steps: () => [fitStep, ...parabolaSteps(base).slice(1)],
  })
}

function leastSquaresLine(pts) {
  const n = pts.length
  const Sx = pts.reduce((s, p) => s + p.x, 0)
  const Sy = pts.reduce((s, p) => s + p.y, 0)
  const Sxx = pts.reduce((s, p) => s + p.x * p.x, 0)
  const Sxy = pts.reduce((s, p) => s + p.x * p.y, 0)
  const top = n * Sxy - Sx * Sy
  const bottom = n * Sxx - Sx * Sx
  const m = fix(top / bottom)
  const c = fix((Sy - m * Sx) / n)
  const base = analyseLine('slope', { m, c })
  const { ssRes, ssTot, r2 } = rSquared(pts, base.f)
  const step = {
    title: 'Least-squares line',
    blocks: [
      { p: T`With more than two points, a single line usually cannot pass through them all. The least-squares line is the one that makes the total of the squared vertical gaps between the points and the line as small as possible.` },
      { m: T`n = ${n}, \quad \textstyle\sum x = ${num(Sx)}, \quad \sum y = ${num(Sy)}, \quad \sum x^2 = ${num(Sxx)}, \quad \sum xy = ${num(Sxy)}` },
      { m: T`m = \frac{n\sum xy - \sum x \sum y}{n\sum x^2 - \left(\sum x\right)^2} = \frac{${num(top)}}{${num(bottom)}} ${rel(m)} ${num(m)}` },
      { m: T`c = \frac{\sum y - m \sum x}{n} = \frac{${num(Sy)} - ${par(m)} \times ${par(Sx)}}{${n}} ${rel(c)} ${num(c)}` },
      { m: `y = ${poly(0, m, c)}` },
      { p: T`$R^2$ compares the leftover squared gaps with the total spread of the $y$-values. A value of $1$ means every point lies exactly on the line.` },
      { m: T`R^2 = 1 - \frac{SS_\text{res}}{SS_\text{tot}} = 1 - \frac{${num(ssRes)}}{${num(ssTot)}} ${rel(r2)} ${num(r2)}` },
    ],
  }
  return wrap(base, {
    pts,
    fit: { type: 'line', method: 'least squares', r2 },
    tex: `y = ${poly(0, m, c)}`,
    steps: () => [step, ...lineSteps(base).slice(1)],
  })
}

function leastSquaresParabola(pts) {
  const n = pts.length
  const S = (fn) => pts.reduce((s, p) => s + fn(p), 0)
  const x1 = S((p) => p.x)
  const x2 = S((p) => p.x ** 2)
  const x3 = S((p) => p.x ** 3)
  const x4 = S((p) => p.x ** 4)
  const y = S((p) => p.y)
  const xy = S((p) => p.x * p.y)
  const x2y = S((p) => p.x ** 2 * p.y)
  const sol = solve3(
    [
      [x4, x3, x2],
      [x3, x2, x1],
      [x2, x1, n],
    ],
    [x2y, xy, y],
  )
  if (!sol) return analysePoints(pts, 'line')
  const [a, b, c] = sol.map(fix)
  const base = analyseParabola('standard', { a, b, c })
  const { ssRes, ssTot, r2 } = rSquared(pts, base.f)
  const step = {
    title: 'Least-squares parabola',
    blocks: [
      { p: T`More than three points generally do not lie on one parabola. The least-squares parabola minimises the sum of squared vertical gaps. Setting the derivative of that sum with respect to each of $a$, $b$ and $c$ to zero gives three linear equations, the normal equations.` },
      { m: T`\begin{pmatrix} \sum x^4 & \sum x^3 & \sum x^2 \\ \sum x^3 & \sum x^2 & \sum x \\ \sum x^2 & \sum x & n \end{pmatrix} \begin{pmatrix} a \\ b \\ c \end{pmatrix} = \begin{pmatrix} \sum x^2 y \\ \sum xy \\ \sum y \end{pmatrix}` },
      { m: T`\begin{pmatrix} ${num(x4)} & ${num(x3)} & ${num(x2)} \\ ${num(x3)} & ${num(x2)} & ${num(x1)} \\ ${num(x2)} & ${num(x1)} & ${n} \end{pmatrix} \begin{pmatrix} a \\ b \\ c \end{pmatrix} = \begin{pmatrix} ${num(x2y)} \\ ${num(xy)} \\ ${num(y)} \end{pmatrix}` },
      { p: 'Solving this system (by elimination) gives:' },
      { m: T`a ${rel(a)} ${num(a)}, \quad b ${rel(b)} ${num(b)}, \quad c ${rel(c)} ${num(c)}` },
      { m: `y = ${poly(a, b, c)}` },
      { m: T`R^2 = 1 - \frac{SS_\text{res}}{SS_\text{tot}} = 1 - \frac{${num(ssRes)}}{${num(ssTot)}} ${rel(r2)} ${num(r2)}` },
    ],
  }
  return wrap(base, {
    pts,
    fit: { type: 'parabola', method: 'least squares', r2 },
    tex: `y = ${poly(a, b, c)}`,
    steps: () => [step, ...parabolaSteps(base).slice(1)],
  })
}
