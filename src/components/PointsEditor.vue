<script setup>
import { FIT_TYPES } from '../lib/fit.js'
import { prefs } from '../lib/store.js'

const props = defineProps({
  curve: { type: Object, required: true },
  model: { type: Object, required: true },
})

function setValue(i, axis, raw) {
  const n = Number(String(raw).replace('−', '-'))
  if (Number.isFinite(n)) props.curve.points[i] = { ...props.curve.points[i], [axis]: Math.round(n * 10000) / 10000 }
}

function addPoint() {
  const last = props.curve.points.at(-1)
  props.curve.points.push(last ? { x: last.x + 1, y: last.y } : { x: 0, y: 0 })
}
</script>

<template>
  <div class="points-editor">
    <div class="segmented compact" role="group" aria-label="Fit">
      <button
        v-for="f in FIT_TYPES"
        :key="f.id"
        type="button"
        :class="{ active: curve.fit === f.id }"
        :aria-pressed="curve.fit === f.id"
        @click="curve.fit = f.id"
      >
        {{ f.label }}
      </button>
    </div>
    <p v-if="model.message" class="notice warn">{{ model.message }}</p>

    <table class="points-table">
      <thead>
        <tr><th></th><th>x</th><th>y</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="(p, i) in curve.points" :key="i">
          <td class="idx">{{ i + 1 }}</td>
          <td><input type="number" step="any" :value="p.x" :aria-label="`Point ${i + 1} x`" @change="setValue(i, 'x', $event.target.value)" /></td>
          <td><input type="number" step="any" :value="p.y" :aria-label="`Point ${i + 1} y`" @change="setValue(i, 'y', $event.target.value)" /></td>
          <td>
            <button type="button" class="icon-btn small danger" :aria-label="`Remove point ${i + 1}`" title="Remove" @click="curve.points.splice(i, 1)">
              <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="points-actions">
      <button type="button" class="btn small" @click="addPoint">Add point</button>
      <button type="button" class="btn small" :class="{ on: prefs.tool === 'points' }" @click="prefs.tool = prefs.tool === 'points' ? 'move' : 'points'">
        {{ prefs.tool === 'points' ? 'Stop placing' : 'Place on graph' }}
      </button>
    </div>
    <p class="muted">Drag points on the graph to move them. The fit updates as you go.</p>
  </div>
</template>
