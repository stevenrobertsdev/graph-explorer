<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { ui } from '../lib/store.js'

const close = () => (ui.help = false)
const onKey = (e) => e.key === 'Escape' && close()
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const SYNTAX = [
  ['y = 2x^2 - 3x + 1', 'parabola, standard form'],
  ['y = 2(x - 1)^2 + 3', 'parabola, vertex form'],
  ['y = (x + 2)(x - 4)', 'parabola, factorised form'],
  ['y = 0.5x - 2', 'line, gradient form'],
  ['y - 3 = 2(x - 1)', 'line, point-gradient form'],
  ['3x + 2y = 6', 'line, general form'],
  ['x = 4', 'vertical line'],
  ['(1, 2), (3, 5), (4, 1)', 'points, with a fitted curve'],
]
const KEYS = [
  ['Scroll', 'zoom around the cursor'],
  ['Drag the graph', 'pan'],
  ['Drag a handle', 'reshape the selected graph'],
  ['Alt while dragging', 'finer snapping'],
  ['Click a graph', 'select it'],
  ['+  /  −', 'zoom in and out'],
  ['F', 'zoom to fit the selected graph'],
  ['0', 'reset the view'],
  ['T', 'toggle the tangent'],
  ['I', 'toggle meeting points'],
  ['P  /  M', 'place points  /  move'],
  ['W', 'show or hide the working panel'],
]
</script>

<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <header class="modal-head">
        <h2 id="help-title">How to use Graph Explorer</h2>
        <button type="button" class="icon-btn" aria-label="Close" @click="close">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
        </button>
      </header>
      <div class="modal-cols">
        <section>
          <h3>Things you can type</h3>
          <table class="kv">
            <tr v-for="[k, v] in SYNTAX" :key="k"><td><code>{{ k }}</code></td><td>{{ v }}</td></tr>
          </table>
          <p class="muted">Use <code>^</code> for powers, brackets freely, and <code>/</code> to divide by a number. Multiplication can be implicit, as in <code>2x</code> or <code>3(x - 1)</code>.</p>
        </section>
        <section>
          <h3>Mouse and keyboard</h3>
          <table class="kv">
            <tr v-for="[k, v] in KEYS" :key="k"><td><kbd>{{ k }}</kbd></td><td>{{ v }}</td></tr>
          </table>
        </section>
      </div>
      <section class="modal-foot">
        <h3>Ideas to try</h3>
        <ul>
          <li>Press play on <em>b</em> in standard form and watch the vertex trace out a second parabola.</li>
          <li>Plot a line and a parabola, then slide the line until the two meet at exactly one point. Check the discriminant in Meeting points.</li>
          <li>Open the Table tab for a parabola and look at the second differences. Then try a line.</li>
          <li>Turn on Tangent and hover across a parabola. Where is the gradient zero?</li>
          <li>Place five rough points on the graph and switch the fit between Line and Parabola. Compare R².</li>
        </ul>
      </section>
    </div>
  </div>
</template>
