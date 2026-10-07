import {
  T,
  EPS,
  fix,
  clean,
  rel,
  relAll,
  num,
  par,
  isZero,
  coef,
  joinTerms,
  poly,
  shift,
  point,
  degrees,
} from './format.js'

export function analyseLine(form, prm) {
  let m = null
  let c = null
  let xc = null
  let degenerate = null

  if (form === 'slope') {
    m = prm.m
    c = prm.c
  } else if (form === 'point') {
    m = prm.m
    c = fix(prm.y1 - prm.m * prm.x1)
  } else if (form === 'two') {
    const dx = prm.x2 - prm.x1
    const dy = prm.y2 - prm.y1
    if (Math.abs(dx) < EPS) {
      if (Math.abs(dy) < EPS) degenerate = 'The two points are the same, so they do not pick out a single line.'
      else xc = prm.x1
    } else {
      m = fix(dy / dx)
      c = fix(prm.y1 - m * prm.x1)
    }
  } else {
    const { a, b } = prm
    if (Math.abs(b) < EPS) {
      if (Math.abs(a) < EPS) {
        degenerate = isZero(prm.c)
          ? 'With a = b = 0 the equation reads 0 = 0, which every point satisfies, so it is not a line.'
          : 'With a = b = 0 the equation reads 0 = c, which no point satisfies.'
      } else xc = fix(prm.c / a)
    } else {
      m = fix(-a / b)
      c = fix(prm.c / b)
    }
  }

  const vertical = xc !== null
  const ok = !degenerate
  const roots = !ok || vertical ? (vertical ? [xc] : []) : isZero(m) ? [] : [fix(-c / m)]

  const model = {
    kind: 'line',
    form,
    prm: { ...prm },
    ok,
    degenerate,
    vertical,
    xc,
    m,
    a: 0,
    b: m,
    c,
    roots,
    linear: true,
    f: ok && !vertical ? (x) => m * x + c : null,
  }
  model.tex = lineTex(model)
  model.steps = () => lineSteps(model)
  return model
}

export function lineTex(model) {
  const { form, prm } = model
  if (form === 'point') {
    const lhs = isZero(prm.y1) ? 'y' : shift(prm.y1, 'y')
    const rhs = isZero(prm.m) ? '0' : isZero(prm.x1) ? `${coef(prm.m)}x` : `${coef(prm.m)}(${shift(prm.x1)})`
    return `${lhs} = ${rhs}`
  }
  if (form === 'general') {
    return `${joinTerms([{ c: prm.a, v: 'x' }, { c: prm.b, v: 'y' }])} = ${num(prm.c)}`
  }
  if (model.vertical) return `x = ${num(model.xc)}`
  if (!model.ok) return T`\text{no line}`
  return `y = ${poly(0, model.m, model.c)}`
}

function introStep(model) {
  const { form, prm, m, c } = model
  if (form === 'slope') {
    return {
      title: 'The equation',
      blocks: [
        { p: T`Gradient-intercept form $y = mx + c$ shows the gradient $m$ and the y-intercept $c$ directly.` },
        { m: T`m = ${num(m)}, \quad c = ${num(c)}` },
        { m: `y = ${poly(0, m, c)}` },
      ],
    }
  }
  if (form === 'point') {
    const { x1, y1 } = prm
    return {
      title: 'Rearrange to y = mx + c',
      blocks: [
        { p: T`Point-gradient form $y - y_1 = m(x - x_1)$ says: start at the point $(x_1, y_1)$ and move with gradient $m$. Expanding the bracket and adding $y_1$ to both sides gives gradient-intercept form.` },
        { m: T`\begin{aligned} y &= mx + \left(y_1 - m x_1\right) \\ &= ${num(m)}x + \left(${num(y1)} - ${par(m)} \times ${par(x1)}\right) \\ &${rel(c)} ${poly(0, m, c)} \end{aligned}` },
      ],
    }
  }
  if (form === 'two') {
    const { x1, y1, x2, y2 } = prm
    return {
      title: 'Gradient from two points',
      blocks: [
        { p: T`Two points fix a line. Its gradient is the change in $y$ divided by the change in $x$ between them (rise over run).` },
        { m: T`m = \frac{y_2 - y_1}{x_2 - x_1} = \frac{${num(y2)} - ${par(y1)}}{${num(x2)} - ${par(x1)}} = \frac{${num(y2 - y1)}}{${num(x2 - x1)}} ${rel(m)} ${num(m)}` },
        { p: T`Either point satisfies $y = mx + c$, so substituting the first one gives $c$.` },
        { m: T`c = y_1 - m x_1 = ${num(y1)} - ${par(m)} \times ${par(x1)} ${rel(c)} ${num(c)}` },
        { m: `y = ${poly(0, m, c)}` },
      ],
    }
  }
  const { a, b } = prm
  return {
    title: 'Rearrange to y = mx + c',
    blocks: [
      { p: T`General form $ax + by = c$ treats $x$ and $y$ evenly. Solving for $y$ exposes the gradient and intercept. (Here $c$ is the right-hand side of the general form, a different number from the intercept.)` },
      { m: T`by = c - ax \;\Rightarrow\; y = -\frac{a}{b}x + \frac{c}{b}` },
      { m: T`y = -\frac{${num(a)}}{${num(b)}}x + \frac{${num(prm.c)}}{${num(b)}} ${relAll(m, c)} ${poly(0, m, c)}` },
    ],
  }
}

export function lineSteps(model) {
  if (!model.ok) {
    return [{ title: 'No single line', blocks: [{ p: model.degenerate }] }]
  }
  if (model.vertical) return verticalSteps(model)

  const { m, c } = model
  const steps = [introStep(model)]
  const deg = degrees(m)

  steps.push({
    title: 'The gradient',
    blocks: [
      { p: T`The gradient is the rise for each unit of run: every step of 1 to the right changes $y$ by $m$. On the graph this is the small right-angled triangle drawn on the selected line.` },
      { m: T`m = ${num(m)}` },
      {
        p:
          m > 0
            ? 'It is positive, so the line rises from left to right.'
            : m < 0
              ? 'It is negative, so the line falls from left to right.'
              : T`It is zero, so the line is horizontal: $y$ takes the same value for every $x$.`,
      },
      { p: T`Rise over run is also $\tan\theta$, where $\theta$ is the angle the line makes with the positive x-axis.` },
      { m: T`\theta = \tan^{-1}(${num(m)}) ${rel(deg)} ${num(deg)}^\circ` },
    ],
  })

  steps.push({
    title: 'Where it crosses the y-axis',
    blocks: [
      { p: T`On the y-axis $x = 0$, so the $mx$ term vanishes and only $c$ is left.` },
      { m: T`y = ${par(m)}(0) + ${par(c)} = ${num(c)}` },
      { p: T`The line crosses the y-axis at $${point(0, c)}$.` },
    ],
  })

  if (!isZero(m)) {
    const r = -c / m
    steps.push({
      title: 'Where it crosses the x-axis',
      blocks: [
        { p: T`On the x-axis $y = 0$. Setting $y = 0$ and solving gives the root.` },
        { m: T`0 = ${poly(0, m, c)} \;\Rightarrow\; x = -\frac{c}{m} = -\frac{${num(c)}}{${num(m)}} ${rel(r)} ${num(r)}` },
        { p: T`The line crosses the x-axis at $${point(r, 0)}$.` },
      ],
    })
  } else {
    steps.push({
      title: 'Where it crosses the x-axis',
      blocks: [
        {
          p: isZero(c)
            ? T`With $m = 0$ and $c = 0$ the line is $y = 0$, the x-axis itself.`
            : T`A horizontal line at $y = ${num(c)}$ never reaches $y = 0$, so there is no root.`,
        },
      ],
    })
  }

  const perp = isZero(m) ? null : -1 / m
  steps.push({
    title: 'Parallel and perpendicular lines',
    blocks: [
      { p: T`Parallel lines never meet, so they must rise at the same rate. Any line with gradient $${num(m)}$ is parallel to this one; only $c$ differs.` },
      perp === null
        ? { p: 'A line perpendicular to a horizontal line is vertical, and a vertical line has no gradient.' }
        : { p: T`Turning a line through $90^\circ$ swaps its rise and run and reverses one of them. So a perpendicular gradient is $-\frac{1}{m}$, and the two gradients multiply to $-1$.` },
      ...(perp === null
        ? []
        : [{ m: T`m_\perp = -\frac{1}{${num(m)}} ${rel(perp)} ${num(perp)}, \qquad ${par(m)} \times ${par(perp)} ${rel(m * perp)} -1` }]),
    ],
  })

  return steps
}

function verticalSteps(model) {
  const { form, prm, xc } = model
  const intro =
    form === 'two'
      ? T`Both points have $x = ${num(prm.x1)}$, so the run between them is zero and the line is vertical.`
      : T`With $b = 0$ there is no $y$ term. The equation $ax = c$ gives $x = \frac{c}{a} = \frac{${num(prm.c)}}{${num(prm.a)}}$, whatever $y$ is.`
  return [
    {
      title: 'A vertical line',
      blocks: [{ p: intro }, { m: `x = ${num(xc)}` }],
    },
    {
      title: 'The gradient is undefined',
      blocks: [
        { p: T`Gradient is rise over run. Along a vertical line the run is always $0$, and division by zero has no value, so the line has no gradient. It is steeper than any line of the form $y = mx + c$, which is why it cannot be written that way.` },
      ],
    },
    {
      title: 'Intercepts',
      blocks: [
        {
          p: isZero(xc)
            ? T`This line is $x = 0$, the y-axis itself.`
            : T`It crosses the x-axis at $${point(xc, 0)}$. It runs parallel to the y-axis, so it never crosses it.`,
        },
      ],
    },
  ]
}

export function explainLineChange(key, before, after) {
  const from = before.prm[key]
  const to = after.prm[key]
  if (from === undefined || clean(from) === clean(to)) return null
  const d = to - from
  const label = { x1: 'x_1', y1: 'y_1', x2: 'x_2', y2: 'y_2' }[key] || key
  const out = [{ p: T`$${label}$ went from $${num(from)}$ to $${num(to)}$.` }]

  if (!after.ok) {
    out.push({ p: after.degenerate })
    return out
  }
  if (before.vertical !== after.vertical || !before.ok) {
    out.push({ p: after.vertical ? 'The run dropped to zero, so the line is now vertical and has no gradient.' : 'The run is no longer zero, so the line has a gradient again.' })
    return out
  }
  if (after.vertical) {
    out.push({ p: T`The vertical line moved from $x = ${num(before.xc)}$ to $x = ${num(after.xc)}$.` })
    return out
  }

  const turn = T`The gradient went from $${num(before.m)}$ to $${num(after.m)}$, so the angle with the x-axis changed from $${num(degrees(before.m))}^\circ$ to $${num(degrees(after.m))}^\circ$.`
  const intercept = T`The y-intercept moved from $${num(before.c)}$ to $${num(after.c)}$.`

  if (after.form === 'slope') {
    if (key === 'm') out.push({ p: T`The y-intercept $${point(0, after.c)}$ does not depend on $m$, so the line pivots about it. ${turn}` })
    else out.push({ p: T`Adding to $c$ raises every point by the same amount, so the line moved ${d > 0 ? 'up' : 'down'} by $${num(Math.abs(d))}$ and stays parallel to where it was.` })
  } else if (after.form === 'point') {
    if (key === 'm') out.push({ p: T`The line must still pass through $${point(after.prm.x1, after.prm.y1)}$, so it pivots about that point. ${turn}` })
    else out.push({ p: T`The gradient is unchanged, so the line slid parallel to itself to keep passing through $${point(after.prm.x1, after.prm.y1)}$. ${intercept}` })
  } else if (after.form === 'two') {
    const other = key.endsWith('1') ? point(after.prm.x2, after.prm.y2) : point(after.prm.x1, after.prm.y1)
    out.push({ p: T`The other point, $${other}$, stayed put, so the line pivots about it. ${turn}` })
  } else if (key === 'c') {
    out.push({ p: T`With $a$ and $b$ fixed, the gradient $-\frac{a}{b}$ is unchanged. Changing $c$ slides the line parallel to itself. ${intercept}` })
  } else {
    out.push({ p: T`The gradient is $-\frac{a}{b}$, so changing $${key}$ turns the line. ${turn}` })
  }
  return out
}
