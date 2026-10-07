import {
  T,
  EPS,
  fix,
  clean,
  exact,
  rel,
  num,
  par,
  isZero,
  sgn,
  coef,
  poly,
  plus,
  shift,
  point,
} from './format.js'

export function vertexTex(a, h, k) {
  if (isZero(a)) return num(k)
  const sq = isZero(h) ? 'x^2' : `(${shift(h)})^2`
  return `${coef(a)}${sq}${plus(k)}`
}

export function factorTex(a, p, q) {
  if (isZero(a)) return '0'
  const f = (r) => (isZero(r) ? 'x' : `(${shift(r)})`)
  let body
  if (clean(p) === clean(q)) body = isZero(p) ? 'x^2' : `(${shift(p)})^2`
  else body = isZero(q) && !isZero(p) ? f(q) + f(p) : f(p) + f(q)
  return coef(a) + body
}

export function analyseParabola(form, prm) {
  let a, b, c
  if (form === 'standard') ({ a, b, c } = prm)
  else if (form === 'vertex') {
    a = prm.a
    b = -2 * a * prm.h
    c = a * prm.h ** 2 + prm.k
  } else {
    a = prm.a
    b = -a * (prm.p + prm.q)
    c = a * prm.p * prm.q
  }
  b = fix(b)
  c = fix(c)

  const linear = Math.abs(a) < EPS
  const D = fix(b * b - 4 * a * c)
  let h = null
  let k = null
  let roots = []

  if (!linear) {
    if (form === 'vertex') {
      h = prm.h
      k = prm.k
    } else if (form === 'factorised') {
      h = fix((prm.p + prm.q) / 2)
      k = fix(a * (h - prm.p) * (h - prm.q))
    } else {
      h = fix(-b / (2 * a))
      k = fix(c - (b * b) / (4 * a))
    }
    if (form === 'factorised') {
      roots = prm.p === prm.q ? [prm.p] : [prm.p, prm.q].sort((x, y) => x - y)
    } else if (D > EPS) {
      const s = Math.sqrt(D)
      roots = [(-b - s) / (2 * a), (-b + s) / (2 * a)].sort((x, y) => x - y)
    } else if (Math.abs(D) <= EPS) {
      roots = [h]
    }
  } else if (Math.abs(b) > EPS) {
    roots = [-c / b]
  }

  const m = {
    kind: 'parabola',
    form,
    prm: { ...prm },
    a,
    b,
    c,
    D,
    h,
    k,
    roots,
    linear,
    vertical: false,
    f: (x) => a * x * x + b * x + c,
  }
  m.tex = parabolaTex(m)
  m.steps = () => parabolaSteps(m)
  return m
}

export function parabolaTex(m) {
  if (m.form === 'vertex') return `y = ${vertexTex(m.prm.a, m.prm.h, m.prm.k)}`
  if (m.form === 'factorised') return `y = ${factorTex(m.prm.a, m.prm.p, m.prm.q)}`
  return `y = ${poly(m.a, m.b, m.c)}`
}

export function parabolaSteps(m) {
  return m.linear ? linearSteps(m) : quadraticSteps(m)
}

function linearSteps(m) {
  const { b, c } = m
  const steps = [
    {
      title: 'Not a parabola',
      blocks: [
        { p: T`With $a = 0$ the $x^2$ term disappears. What remains has no squared term, so the graph is a straight line rather than a curve.` },
        { m: `y = ${poly(0, b, c)}` },
      ],
    },
    {
      title: 'Gradient and intercept',
      blocks: [
        { p: T`In $y = bx + c$, every step of 1 to the right changes $y$ by $b$, so $b$ is the gradient. At $x = 0$ the $bx$ term vanishes, leaving $y = c$.` },
        { m: T`\text{gradient} = ${num(b)}, \qquad \text{y-intercept} = ${point(0, c)}` },
      ],
    },
  ]
  if (!isZero(b)) {
    const r = -c / b
    steps.push({
      title: 'Where it crosses the x-axis',
      blocks: [
        { p: T`Set $y = 0$ and solve the single linear equation.` },
        { m: T`0 = ${poly(0, b, c)} \;\Rightarrow\; x = -\frac{c}{b} = -\frac{${num(c)}}{${num(b)}} ${rel(r)} ${num(r)}` },
      ],
    })
  } else {
    steps.push({
      title: 'Where it crosses the x-axis',
      blocks: [
        {
          p: isZero(c)
            ? T`With $b = 0$ and $c = 0$ the line is $y = 0$, which lies along the x-axis itself.`
            : T`With $b = 0$ the line is horizontal at $y = ${num(c)}$, so it never meets the x-axis.`,
        },
      ],
    })
  }
  return steps
}

function quadraticSteps(m) {
  const { a, b, c, D, h, k, form, prm } = m
  const steps = []
  const up = a > 0

  if (form === 'standard') {
    steps.push({
      title: 'The equation',
      blocks: [
        { p: T`The sliders set the coefficients of the standard form $y = ax^2 + bx + c$ directly.` },
        { m: T`a = ${num(a)}, \quad b = ${num(b)}, \quad c = ${num(c)}` },
        { m: `y = ${poly(a, b, c)}` },
      ],
    })
  } else if (form === 'vertex') {
    const H = prm.h
    steps.push({
      title: 'Expand to standard form',
      blocks: [
        { p: T`Vertex form is $y = a(x - h)^2 + k$. Expanding the bracket shows which $a$, $b$ and $c$ it corresponds to.` },
        { m: T`\begin{aligned} y &= a(x - h)^2 + k \\ &= a\left(x^2 - 2hx + h^2\right) + k \\ &= ax^2 - 2ah\,x + \left(ah^2 + k\right) \end{aligned}` },
        { p: T`With $a = ${num(a)}$, $h = ${num(H)}$ and $k = ${num(prm.k)}$:` },
        { m: T`\begin{aligned} y &= ${vertexTex(a, H, prm.k)} \\ &= ${coef(a)}\left(${poly(1, -2 * H, H * H)}\right)${plus(prm.k)} \\ &= ${poly(a, b, c)} \end{aligned}` },
        { m: T`b = -2ah = ${num(b)}, \qquad c = ah^2 + k = ${num(c)}` },
      ],
    })
  } else {
    const { p, q } = prm
    steps.push({
      title: 'Expand to standard form',
      blocks: [
        { p: T`Factorised form is $y = a(x - p)(x - q)$, where $p$ and $q$ are the roots. Multiplying out the brackets gives the standard form.` },
        { m: T`\begin{aligned} y &= a(x - p)(x - q) \\ &= a\left(x^2 - (p + q)x + pq\right) \end{aligned}` },
        { p: T`With $a = ${num(a)}$, $p = ${num(p)}$ and $q = ${num(q)}$:` },
        { m: T`\begin{aligned} y &= ${factorTex(a, p, q)} \\ &= ${coef(a)}\left(${poly(1, -(p + q), p * q)}\right) \\ &= ${poly(a, b, c)} \end{aligned}` },
        { m: T`b = -a(p + q) = ${num(b)}, \qquad c = apq = ${num(c)}` },
      ],
    })
  }

  steps.push({
    title: up ? 'It opens upwards' : 'It opens downwards',
    blocks: [
      { p: T`As $x$ moves far from zero in either direction, $x^2$ grows faster than $x$, so the $ax^2$ term outweighs the others and decides the sign of $y$. Since $x^2 \ge 0$, that sign is the sign of $a$.` },
      { m: up ? T`a = ${num(a)} > 0` : T`a = ${num(a)} < 0` },
      {
        p: up
          ? T`So $y \to +\infty$ on both sides. The curve opens upwards and its vertex is the lowest point, a minimum.`
          : T`So $y \to -\infty$ on both sides. The curve opens downwards and its vertex is the highest point, a maximum.`,
      },
    ],
  })

  const absA = Math.abs(a)
  steps.push({
    title: 'How steep the sides are',
    blocks: [
      { p: T`Measure heights from the vertex. From vertex form, moving $d$ units either side of it gives $f(h \pm d) = a d^2 + k$, so the height above (or below) the vertex is $a d^2$.` },
      { m: T`\begin{aligned} d = 1&: \quad ${par(a)} \times 1^2 = ${num(a)} \\ d = 2&: \quad ${par(a)} \times 2^2 = ${num(4 * a)} \\ d = 3&: \quad ${par(a)} \times 3^2 = ${num(9 * a)} \end{aligned}` },
      {
        p:
          clean(absA) === 1
            ? T`Here $|a| = 1$, the same steepness as $y = x^2$, whose heights are $1, 4, 9$.`
            : absA > 1
              ? T`Here $|a| = ${num(absA)} > 1$, so each height is ${num(absA)} times that of $y = x^2$ (which gives $1, 4, 9$). The sides climb faster and the curve looks narrower.`
              : T`Here $|a| = ${num(absA)} < 1$, so each height is only ${num(absA)} times that of $y = x^2$ (which gives $1, 4, 9$). The sides climb more slowly and the curve looks wider.`,
      },
    ],
  })

  steps.push({
    title: 'Where it crosses the y-axis',
    blocks: [
      { p: T`Every point on the y-axis has $x = 0$. Substituting removes the $x^2$ and $x$ terms, leaving only $c$.` },
      { m: T`y = ${par(a)}(0)^2 + ${par(b)}(0) + ${par(c)} = ${num(c)}` },
      { p: T`The curve crosses the y-axis at $${point(0, c)}$.` },
    ],
  })

  if (form === 'standard') {
    const blocks = [
      { p: T`Completing the square rewrites the equation so that $x$ appears only once, inside a squared bracket.` },
      { m: T`\begin{aligned} y &= a\left(x^2 + \tfrac{b}{a}x\right) + c \\ &= a\left[\left(x + \tfrac{b}{2a}\right)^2 - \left(\tfrac{b}{2a}\right)^2\right] + c \\ &= a\left(x + \tfrac{b}{2a}\right)^2 + c - \tfrac{b^2}{4a} \end{aligned}` },
    ]
    if (isZero(b)) {
      blocks.push({ p: T`Here $b = 0$, so there is no $x$ term and the equation is already in this shape:` })
      blocks.push({ m: `y = ${vertexTex(a, 0, c)}` })
    } else {
      const r1 = rel(b / a)
      const r2 = exact(b / a) && exact(h) && exact((b * b) / (4 * a)) ? '=' : T`\approx`
      blocks.push({ p: 'With the numbers in:' })
      blocks.push({
        m: T`\begin{aligned} y &${r1} ${coef(a)}\left(${poly(1, b / a, 0)}\right)${plus(c)} \\ &${r2} ${coef(a)}\left(${shift(h)}\right)^2${plus(-(b * b) / (4 * a))}${plus(c)} \\ &${rel(k)} ${vertexTex(a, h, k)} \end{aligned}`,
      })
    }
    blocks.push(
      { p: T`A square is never negative and is zero only when the bracket is zero. At that value of $x$ the squared term contributes nothing, so $y$ reaches its ${up ? 'smallest' : 'largest'} value. Equal steps either side give equal squares, which is why the curve is a mirror image about that vertical line.` },
      { m: T`h = -\frac{b}{2a} = -\frac{${num(b)}}{2 \times ${par(a)}} ${rel(h)} ${num(h)}` },
      { m: T`k = c - \frac{b^2}{4a} = ${num(c)} - \frac{${par(b)}^2}{4 \times ${par(a)}} ${rel(k)} ${num(k)}` },
    )
    steps.push({ title: 'Axis of symmetry and vertex', blocks })
  } else if (form === 'vertex') {
    steps.push({
      title: 'Axis of symmetry and vertex',
      blocks: [
        { p: T`Vertex form already has $x$ inside a single squared bracket. A square is never negative and is zero only when $x = h$, so that is where $y$ reaches its ${up ? 'smallest' : 'largest'} value, $k$. Equal steps either side of $h$ give equal squares, so the curve is a mirror image about $x = h$.` },
        { m: T`y = ${vertexTex(a, h, k)} \;\Rightarrow\; h = ${num(h)}, \quad k = ${num(k)}` },
        { p: T`The same values follow from the standard-form coefficients:` },
        { m: T`-\frac{b}{2a} = -\frac{${num(b)}}{2 \times ${par(a)}} = ${num(h)}, \qquad c - \frac{b^2}{4a} = ${num(c)} - \frac{${par(b)}^2}{4 \times ${par(a)}} = ${num(k)}` },
      ],
    })
  } else {
    const { p, q } = prm
    steps.push({
      title: 'Axis of symmetry and vertex',
      blocks: [
        { p: T`The curve is a mirror image about its axis, and both roots sit at the same height ($y = 0$). So the axis must lie exactly halfway between them.` },
        { m: T`h = \frac{p + q}{2} = \frac{${num(p)} + ${par(q)}}{2} ${rel(h)} ${num(h)}` },
        { p: T`Substituting $x = h$ gives the height of the vertex.` },
        { m: T`k = ${coef(a)}(${num(h)} - ${par(p)})(${num(h)} - ${par(q)}) ${rel(k)} ${num(k)}` },
      ],
    })
  }
  steps[steps.length - 1].blocks.push({
    p: T`Axis of symmetry $x = ${num(h)}$, vertex at $${point(h, k)}$.`,
  })

  const ratio = D / (4 * a * a)
  const outcome =
    D > EPS
      ? T`$\Delta > 0$, so $(x - h)^2$ equals a positive number. Its square root can be taken with either sign, giving two roots: the curve crosses the x-axis twice.`
      : Math.abs(D) <= EPS
        ? T`$\Delta = 0$, so $(x - h)^2 = 0$ and the only solution is $x = h$. The vertex sits exactly on the x-axis and the curve just touches it.`
        : T`$\Delta < 0$, so $(x - h)^2$ would have to be negative, which no real number can manage. The vertex sits ${k > 0 ? 'above' : 'below'} the x-axis at $y = ${num(k)}$ and the curve opens ${up ? 'upwards' : 'downwards'}, away from it, so there are no x-intercepts.`
  steps.push({
    title: 'The discriminant',
    blocks: [
      { m: T`\Delta = b^2 - 4ac = ${par(b)}^2 - 4 \times ${par(a)} \times ${par(c)} = ${num(D)}` },
      { p: T`To see why it matters, set $y = 0$ in the completed-square form and rearrange:` },
      { m: T`\begin{aligned} a(x - h)^2 + k &= 0 \\ (x - h)^2 &= -\frac{k}{a} = \frac{b^2 - 4ac}{4a^2} = \frac{\Delta}{4a^2} \end{aligned}` },
      { m: T`(x - h)^2 = \frac{${num(D)}}{4 \times ${par(a)}^2} ${rel(ratio)} ${num(ratio)}` },
      { p: T`The denominator $4a^2$ is always positive, so the sign of $\Delta$ alone decides the outcome. ${outcome}` },
    ],
  })

  if (form === 'factorised') {
    const { p, q } = prm
    const same = clean(p) === clean(q)
    steps.push({
      title: same ? 'The repeated root' : 'The roots',
      blocks: [
        { p: T`A product equals zero only when one of its factors is zero (and $a \neq 0$), so each bracket gives a root directly.` },
        {
          m: same
            ? T`${shift(p)} = 0 \;\Rightarrow\; x = ${num(p)}`
            : T`${shift(p)} = 0 \;\Rightarrow\; x = ${num(p)}, \qquad ${shift(q)} = 0 \;\Rightarrow\; x = ${num(q)}`,
        },
        { p: same ? T`Both brackets are the same, so the curve touches the x-axis at one point, its vertex.` : T`The curve crosses the x-axis at $x = ${num(Math.min(p, q))}$ and $x = ${num(Math.max(p, q))}$.` },
      ],
    })
  } else if (D > EPS) {
    const s = Math.sqrt(D)
    const [x1, x2] = m.roots
    steps.push({
      title: 'The roots',
      blocks: [
        { p: T`Taking the square root of both sides of $(x - h)^2 = \frac{\Delta}{4a^2}$ and adding $h$ gives the quadratic formula.` },
        { m: T`x = \frac{-b \pm \sqrt{\Delta}}{2a} = \frac{${num(-b)} \pm \sqrt{${num(D)}}}{${num(2 * a)}}` },
        { m: T`\sqrt{${num(D)}} ${rel(s)} ${num(s)}` },
        { m: T`x_1 ${rel(x1)} ${num(x1)}, \qquad x_2 ${rel(x2)} ${num(x2)}` },
        { p: T`Both roots are the same distance, $\frac{\sqrt{\Delta}}{2|a|} ${rel(s / (2 * absA))} ${num(s / (2 * absA))}$, from the axis $x = ${num(h)}$, as symmetry requires.` },
      ],
    })
  } else if (Math.abs(D) <= EPS) {
    steps.push({
      title: 'The repeated root',
      blocks: [
        { p: T`With $\Delta = 0$ the $\pm\sqrt{\Delta}$ part of the formula is zero, so both roots coincide at the vertex.` },
        { m: T`x = -\frac{b}{2a} ${rel(h)} ${num(h)}` },
      ],
    })
  } else {
    const im = Math.sqrt(-D) / (2 * absA)
    steps.push({
      title: 'No real roots',
      blocks: [
        { p: T`The quadratic formula would need $\sqrt{${num(D)}}$, the square root of a negative number. There is no real value of $x$ where $y = 0$.` },
        { p: T`Allowing complex numbers, the roots are $x = h \pm \frac{\sqrt{-\Delta}}{2|a|}\,i$:` },
        { m: T`x ${rel(im)} ${num(h)} \pm ${num(im)}\,i` },
        { p: 'These have no point on a real graph, which is why the curve misses the x-axis.' },
      ],
    })
  }

  return steps
}

export function explainParabolaChange(key, before, after) {
  const from = before.prm[key]
  const to = after.prm[key]
  if (from === undefined || clean(from) === clean(to)) return null
  const d = to - from
  const out = [{ p: T`$${key}$ went from $${num(from)}$ to $${num(to)}$.` }]

  if (before.linear || after.linear) {
    out.push({
      p: after.linear
        ? T`With $a = 0$ the squared term vanishes and the graph flattens into a straight line.`
        : T`A non-zero $a$ brings back the $x^2$ term, bending the line into a parabola.`,
    })
    return out
  }

  const vtx = (m) => point(m.h, m.k)
  const moveV = T`The vertex moved from $${vtx(before)}$ to $${vtx(after)}$.`
  const flipped = sgn(before.a) !== sgn(after.a)

  if (after.form === 'standard') {
    if (key === 'c') {
      out.push({ p: T`$c$ is added to every $y$-value, so the whole curve moved ${d > 0 ? 'up' : 'down'} by $${num(Math.abs(d))}$ without changing shape. The axis stays at $x = ${num(after.h)}$. ${moveV}` })
    } else if (key === 'a') {
      out.push({ p: T`$a$ only multiplies $x^2$, which is zero at $x = 0$, and its contribution to the gradient there ($2ax$) is zero too. So the curve still passes through $${point(0, after.c)}$ with gradient $b = ${num(after.b)}$, and pivots about that point.${flipped ? ' The sign of $a$ changed, so the curve flipped over.' : ''} ${moveV}` })
    } else {
      out.push({ p: T`The y-intercept stays at $${point(0, after.c)}$, but $b$ sets the gradient there, so the curve tilts and the axis $x = -\frac{b}{2a}$ moved from $x = ${num(before.h)}$ to $x = ${num(after.h)}$.` })
      out.push({ p: T`As $b$ varies the vertex slides along a fixed path, found by putting $x = h$ into $k = c - ah^2$:` })
      out.push({ m: `y = ${poly(-after.a, 0, after.c)}` })
    }
  } else if (after.form === 'vertex') {
    if (key === 'h') {
      out.push({ p: T`Replacing $x$ with $x - h$ slides the whole curve ${d > 0 ? 'right' : 'left'} by $${num(Math.abs(d))}$. The shape is unchanged. The y-intercept moved from $${num(before.c)}$ to $${num(after.c)}$ because a different part of the curve now sits over $x = 0$.` })
    } else if (key === 'k') {
      out.push({ p: T`$k$ is added to every $y$-value, so the whole curve moved ${d > 0 ? 'up' : 'down'} by $${num(Math.abs(d))}$. The axis stays at $x = ${num(after.h)}$.` })
    } else {
      out.push({ p: T`The vertex stays at $${vtx(after)}$. Every height measured from it, $a d^2$, is rescaled, so the sides ${Math.abs(after.a) > Math.abs(before.a) ? 'steepened' : 'flattened'}.${flipped ? ' The sign of $a$ changed, so the curve flipped about the line $y = k$.' : ''}` })
    }
  } else if (key === 'a') {
    out.push({ p: T`The roots did not move: at $x = p$ or $x = q$ one bracket is zero, so $y = 0$ whatever $a$ is. Every other height is multiplied by $a$, so the vertex moved along the axis from $${vtx(before)}$ to $${vtx(after)}$.` })
  } else {
    out.push({ p: T`One root moved by $${num(d)}$. The axis is the midpoint of the roots, so it moved by half that, from $x = ${num(before.h)}$ to $x = ${num(after.h)}$. ${moveV}` })
  }
  return out
}
