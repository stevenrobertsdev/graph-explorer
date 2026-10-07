<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import ToolBar from './components/ToolBar.vue'
import CurveList from './components/CurveList.vue'
import GraphCanvas from './components/GraphCanvas.vue'
import InspectorPanel from './components/InspectorPanel.vue'
import HelpDialog from './components/HelpDialog.vue'
import MathText from './components/MathText.vue'
import { state, prefs, ui, actions, load, newChallenge, endChallenge, DEFAULT_SPAN } from './lib/store.js'
import { plain } from './lib/format.js'

load()

const dismissed = ref(false)

const scaleText = computed(() => `zoom ${Number((DEFAULT_SPAN / state.view.span).toPrecision(3))}×`)

const toolHint = computed(() =>
  prefs.tool === 'points'
    ? 'Click to place a point. It joins the selected points set, or starts a new one.'
    : 'Drag to pan, scroll to zoom, drag a handle to reshape the selected graph.',
)

function onKey(e) {
  if (e.metaKey || e.ctrlKey) return
  const t = e.target
  if (t instanceof HTMLElement && (t.closest('input, textarea, select') || t.isContentEditable)) return
  if (ui.help) return
  const k = e.key
  if (k === '+' || k === '=') actions.zoom?.(1 / 1.4)
  else if (k === '-' || k === '_') actions.zoom?.(1.4)
  else if (k === '0') actions.resetView?.()
  else if (k === 'f' || k === 'F') actions.fitView?.()
  else if (k === 't' || k === 'T') prefs.tangent = !prefs.tangent
  else if (k === 'i' || k === 'I') prefs.showIntersections = !prefs.showIntersections
  else if (k === 'p' || k === 'P') prefs.tool = 'points'
  else if (k === 'm' || k === 'M' || k === 'Escape') prefs.tool = 'move'
  else if (k === 'w' || k === 'W') prefs.inspector = !prefs.inspector
  else if (k === '?') ui.help = true
  else return
  e.preventDefault()
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="small-screen" :class="{ dismissed }" role="alert">
    <div class="small-card">
      <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
        <rect x="6" y="9" width="36" height="24" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.4" />
        <path d="M2 37h44" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
        <path d="M11 27c4-14 9-14 13-6s9 8 13-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <h1>Graph Explorer needs a bigger screen</h1>
      <p>It is built as a desktop tool, with a large graph alongside the controls and working. Please open it on a laptop or desktop computer.</p>
      <button type="button" class="link" @click="dismissed = true">Continue anyway</button>
    </div>
  </div>

  <div class="app" :class="{ 'no-inspector': !prefs.inspector }">
    <ToolBar />
    <CurveList />
    <main class="stage">
      <GraphCanvas />

      <div v-if="ui.challenge" class="challenge" :class="{ solved: ui.challenge.solvedBy }">
        <template v-if="ui.challenge.solvedBy">
          <strong>Matched by {{ ui.challenge.solvedBy }}.</strong>
          <MathText :src="`The target was $${ui.challenge.target.tex}$.`" tag="span" />
        </template>
        <template v-else>
          <strong>Challenge</strong>
          <span>Match the thick faint {{ ui.challenge.target.kind }} using any graph and any form.</span>
          <MathText v-if="ui.challenge.revealed" :src="`$${ui.challenge.target.tex}$`" tag="span" />
        </template>
        <div class="challenge-actions">
          <button v-if="!ui.challenge.revealed" type="button" class="btn small" @click="ui.challenge.revealed = true">Reveal</button>
          <button type="button" class="btn small" @click="newChallenge()">New</button>
          <button type="button" class="btn small" @click="endChallenge()">End</button>
        </div>
      </div>

      <transition name="fade">
        <div v-if="ui.toast" class="toast">{{ ui.toast.text }}</div>
      </transition>

      <footer class="statusbar">
        <span class="status-item mono">
          <template v-if="ui.cursor">x {{ plain(ui.cursor.x) }} &nbsp; y {{ plain(ui.cursor.y) }}</template>
          <template v-else>Cursor off the graph</template>
        </span>
        <span v-if="ui.trace" class="status-item mono">
          <i class="dot" :style="{ background: ui.trace.color }" />
          {{ ui.trace.name }}({{ plain(ui.trace.x) }}) = {{ plain(ui.trace.y) }}
          <template v-if="ui.trace.grad !== null">&nbsp; gradient {{ plain(ui.trace.grad) }}</template>
        </span>
        <span class="status-item hint">{{ toolHint }}</span>
        <span class="status-item mono end">{{ scaleText }}</span>
      </footer>
    </main>
    <InspectorPanel v-show="prefs.inspector" />
  </div>

  <HelpDialog v-if="ui.help" />
</template>
