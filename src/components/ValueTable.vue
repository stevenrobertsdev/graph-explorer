<script setup>
import { ref, computed } from 'vue'
import MathText from './MathText.vue'
import { plain, num, clean, isZero } from '../lib/format.js'

const props = defineProps({
  curve: { type: Object, required: true },
  model: { type: Object, required: true },
})

const start = ref(-3)
const step = ref(1)
const count = 9

const usable = computed(() => typeof props.model.f === 'function')

const rows = computed(() => {
  if (!usable.value) return []
  const h = Number(step.value) || 1
  const x0 = Number(start.value) || 0
  const xs = Array.from({ length: count }, (_, i) => clean(x0 + i * h, 6))
  const ys = xs.map((x) => props.model.f(x))
  const d1 = ys.slice(1).map((y, i) => y - ys[i])
  const d2 = d1.slice(1).map((d, i) => d - d1[i])
  return xs.map((x, i) => ({ x, y: ys[i], d1: d1[i], d2: d2[i] }))
})

const note = computed(() => {
  const m = props.model
  const h = Number(step.value) || 1
  if (!usable.value) return ''
  const a = m.a ?? 0
  const grad = m.m ?? m.b
  if (isZero(a)) {
    return String.raw`For a straight line each step of $${num(h)}$ in $x$ adds the same amount to $y$, so the first differences $\Delta y$ are all equal to $m \times ${num(h)} = ${num(grad * h)}$.`
  }
  return String.raw`For a parabola the first differences change at a steady rate, so the second differences $\Delta^2 y$ are all equal to $2a \times ${num(h)}^2 = ${num(2 * a * h * h)}$. This is how you can recognise a quadratic from a table alone.`
})

const fmt = (v) => (v === undefined ? '' : plain(v))
</script>

<template>
  <div class="value-table">
    <template v-if="usable">
      <div class="table-controls">
        <label>Start <input v-model.number="start" type="number" step="any" /></label>
        <label>Step <input v-model.number="step" type="number" step="any" min="0.01" /></label>
      </div>
      <table>
        <thead>
          <tr>
            <th><MathText src="$x$" tag="span" /></th>
            <th><MathText :src="`$${curve.name}(x)$`" tag="span" /></th>
            <th><MathText src="$\Delta y$" tag="span" /></th>
            <th><MathText src="$\Delta^2 y$" tag="span" /></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.x">
            <td>{{ fmt(r.x) }}</td>
            <td>{{ fmt(r.y) }}</td>
            <td class="diff">{{ fmt(r.d1) }}</td>
            <td class="diff">{{ fmt(r.d2) }}</td>
          </tr>
        </tbody>
      </table>
      <p class="muted">Differences sit on the row where each step starts.</p>
      <MathText :src="note" />
    </template>
    <p v-else class="empty">
      {{ model.vertical ? 'A vertical line has one x-value and every y-value, so it has no table of y against x.' : 'There is no fitted graph to tabulate yet.' }}
    </p>
  </div>
</template>
