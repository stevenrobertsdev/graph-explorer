<script setup>
import { ref, computed } from 'vue'
import MathText from './MathText.vue'
import StepList from './StepList.vue'
import ValueTable from './ValueTable.vue'
import { selected, selectedModel, intersections, change, prefs } from '../lib/store.js'
import { features, cardTex } from '../lib/curves.js'
import { poly, joinTerms, num } from '../lib/format.js'
import { vertexTex, factorTex } from '../lib/parabola.js'

const tab = ref('working')

const feats = computed(() => features(selectedModel.value))
const steps = computed(() => (selectedModel.value ? selectedModel.value.steps() : []))

const mine = computed(() => {
  const id = selected.value?.id
  if (!id) return []
  return intersections.value
    .filter((it) => it.a.id === id || it.b.id === id)
    .map((it) => ({ ...it, other: it.a.id === id ? it.b : it.a }))
})

const others = computed(() => {
  const m = selectedModel.value
  if (!m || m.ok === false) return []
  if (m.vertical) return [{ label: 'Vertical', tex: `x = ${num(m.xc)}` }]
  if (typeof m.f !== 'function') return []
  if (m.linear) {
    const mm = m.m ?? m.b
    return [
      { label: 'Gradient', tex: `y = ${poly(0, mm, m.c)}` },
      { label: 'General', tex: `${joinTerms([{ c: -mm, v: 'x' }, { c: 1, v: 'y' }])} = ${num(m.c)}` },
    ]
  }
  const rows = [
    { label: 'Standard', tex: `y = ${poly(m.a, m.b, m.c)}` },
    { label: 'Vertex', tex: `y = ${vertexTex(m.a, m.h, m.k)}` },
  ]
  if (m.roots.length) {
    const [p, q = p] = m.roots
    rows.push({ label: 'Factorised', tex: `y = ${factorTex(m.a, p, q)}` })
  } else rows.push({ label: 'Factorised', none: 'no real roots' })
  return rows
})

const approx = computed(() => {
  const m = selectedModel.value
  if (!m) return false
  return [m.h, m.k, m.c, m.b, ...(m.roots ?? [])].some((v) => v !== null && v !== undefined && Math.abs(Number(num(v)) - v) > 1e-9)
})

const SHAPES = { vertex: 'shape-vertex', root: 'shape-root', int: 'shape-int' }
</script>

<template>
  <aside class="inspector" :class="{ closed: !prefs.inspector }">
    <template v-if="selected && selectedModel">
      <header class="insp-head">
        <div class="insp-title">
          <span class="curve-name big" :style="{ color: selected.color }">{{ selected.name }}</span>
          <MathText class="insp-eq" :src="cardTex(selected, selectedModel)" display />
        </div>
        <dl class="features">
          <div v-for="f in feats" :key="f.label" class="feature">
            <dt>
              <i v-if="f.kind" :class="['shape', SHAPES[f.kind]]" :style="{ '--c': selected.color }" />
              {{ f.label }}
            </dt>
            <dd>{{ f.value }}</dd>
          </div>
        </dl>
        <nav class="tabs" role="tablist">
          <button type="button" role="tab" :aria-selected="tab === 'working'" :class="{ active: tab === 'working' }" @click="tab = 'working'">Working</button>
          <button type="button" role="tab" :aria-selected="tab === 'table'" :class="{ active: tab === 'table' }" @click="tab = 'table'">Table</button>
          <button type="button" role="tab" :aria-selected="tab === 'meet'" :class="{ active: tab === 'meet' }" @click="tab = 'meet'">
            Meeting points<span v-if="mine.length" class="count">{{ mine.reduce((n, it) => n + it.points.length, 0) }}</span>
          </button>
        </nav>
      </header>

      <div class="insp-body">
        <template v-if="tab === 'working'">
          <section v-if="change && change.explanation" class="change-card" aria-live="polite">
            <h3>What changed</h3>
            <template v-for="(b, i) in change.explanation" :key="i">
              <MathText v-if="b.p" :src="b.p" />
              <MathText v-else :src="b.m" display />
            </template>
            <p class="muted">The dashed curve shows where it started.</p>
          </section>

          <section v-if="others.length" class="forms-block">
            <h3>Same graph, other forms</h3>
            <ul class="forms-list">
              <li v-for="r in others" :key="r.label">
                <span class="forms-name">{{ r.label }}</span>
                <MathText v-if="r.tex" :src="`$${r.tex}$`" tag="span" />
                <span v-else class="muted">{{ r.none }}</span>
              </li>
            </ul>
            <p v-if="approx" class="muted">Some values are rounded to 3 decimal places.</p>
          </section>

          <StepList :steps="steps" />
        </template>

        <ValueTable v-else-if="tab === 'table'" :curve="selected" :model="selectedModel" />

        <template v-else>
          <p v-if="!prefs.showIntersections" class="notice">Meeting points are hidden on the graph. Turn them on from the toolbar.</p>
          <p v-if="!mine.length" class="empty">
            No other visible graphs to compare with. Add another line or parabola and this tab works out where they meet.
          </p>
          <section v-for="it in mine" :key="it.other.id" class="meet">
            <h3>
              <span class="curve-name" :style="{ color: selected.color }">{{ selected.name }}</span>
              and
              <span class="curve-name" :style="{ color: it.other.color }">{{ it.other.name }}</span>
              <span class="meet-count">{{ it.identical ? 'same graph' : it.points.length ? `${it.points.length} point${it.points.length > 1 ? 's' : ''}` : 'never meet' }}</span>
            </h3>
            <template v-for="(b, i) in it.blocks" :key="i">
              <MathText v-if="b.p" :src="b.p" />
              <MathText v-else :src="b.m" display />
            </template>
          </section>
        </template>
      </div>
    </template>

    <div v-else class="insp-empty">
      <p>Select a graph to see its working, a table of values and where it meets other graphs.</p>
    </div>
  </aside>
</template>
