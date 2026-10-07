<script setup>
import { ref } from 'vue'
import CurveCard from './CurveCard.vue'
import { state, models, addCurve, addFromInput } from '../lib/store.js'

const text = ref('')
const error = ref('')
const input = ref(null)

const EXAMPLES = ['y = 2(x - 1)^2 - 3', 'y = (x + 2)(x - 4)', '3x + 2y = 6', 'y - 1 = 2(x + 1)', 'x = -3', '(0, 1), (2, 5), (4, 3)']

function submit() {
  const err = addFromInput(text.value)
  error.value = err ?? ''
  if (!err) text.value = ''
}

function useExample(e) {
  text.value = e
  error.value = ''
  input.value?.focus()
}
</script>

<template>
  <aside class="sidebar">
    <form class="entry" @submit.prevent="submit">
      <label class="entry-label" for="entry">Add an equation or points</label>
      <div class="entry-row">
        <input
          id="entry"
          ref="input"
          v-model="text"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="y = x^2 - 4"
          @input="error = ''"
        />
        <button type="submit" class="btn primary">Add</button>
      </div>
      <p v-if="error" class="entry-error" role="alert">{{ error }}</p>
      <div class="examples">
        <button v-for="e in EXAMPLES" :key="e" type="button" class="chip" @click="useExample(e)">{{ e }}</button>
      </div>
    </form>

    <div class="quick-add">
      <button type="button" class="btn" @click="addCurve('parabola')">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2 3c1.8 9.5 10.2 9.5 12 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
        Parabola
      </button>
      <button type="button" class="btn" @click="addCurve('line')">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2.5 13.5l11-11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
        Line
      </button>
      <button type="button" class="btn" @click="addCurve('points')">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="4" cy="11" r="1.8" fill="currentColor" /><circle cx="8" cy="6" r="1.8" fill="currentColor" /><circle cx="12.5" cy="9" r="1.8" fill="currentColor" /></svg>
        Points
      </button>
    </div>

    <div class="curve-list">
      <CurveCard
        v-for="c in state.curves"
        :key="c.id"
        :curve="c"
        :model="models.get(c.id)"
        :active="c.id === state.selectedId"
      />
      <p v-if="!state.curves.length" class="empty">Nothing plotted yet. Type an equation above or add a parabola, line or set of points.</p>
    </div>
  </aside>
</template>
