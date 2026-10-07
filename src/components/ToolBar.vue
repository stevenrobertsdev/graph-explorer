<script setup>
import { prefs, ui, actions, newChallenge, copyShareLink } from '../lib/store.js'

function cycleTheme() {
  const order = ['system', 'light', 'dark']
  prefs.theme = order[(order.indexOf(prefs.theme) + 1) % order.length]
}
const themeLabel = { system: 'Theme: follow system', light: 'Theme: light', dark: 'Theme: dark' }
</script>

<template>
  <header class="toolbar">
    <div class="brand">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M3 4c2.5 13 15.5 13 18 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <path d="M3 20L21 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.55" />
      </svg>
      <span>Graph Explorer</span>
    </div>

    <div class="tool-groups">
      <div class="group" role="group" aria-label="Pointer tool">
        <button type="button" class="tool" :class="{ on: prefs.tool === 'move' }" title="Move: drag to pan, drag handles to reshape (M)" @click="prefs.tool = 'move'">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M8 1.5v13M1.5 8h13M8 1.5L6 3.5M8 1.5l2 2M8 14.5l-2-2M8 14.5l2-2M1.5 8l2-2M1.5 8l2 2M14.5 8l-2-2M14.5 8l-2 2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
          <span class="lbl">Move</span>
        </button>
        <button type="button" class="tool" :class="{ on: prefs.tool === 'points' }" title="Place points by clicking the graph (P)" @click="prefs.tool = prefs.tool === 'points' ? 'move' : 'points'">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="2.4" fill="currentColor" /><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
          <span class="lbl">Place points</span>
        </button>
      </div>

      <div class="group" role="group" aria-label="Overlays">
        <button type="button" class="tool" :class="{ on: prefs.tangent }" :aria-pressed="prefs.tangent" title="Show the tangent and gradient under the cursor (T)" @click="prefs.tangent = !prefs.tangent">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M2 12c3-9 9-9 12 0" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /><path d="M1.5 5.2h13" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.5 2" /></svg>
          <span class="lbl">Tangent</span>
        </button>
        <button type="button" class="tool" :class="{ on: prefs.showIntersections }" :aria-pressed="prefs.showIntersections" title="Mark where graphs meet (I)" @click="prefs.showIntersections = !prefs.showIntersections">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M2 13L14 3M2 4c4 0 8 4 12 9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /><path d="M8.3 5.5l2 2-2 2-2-2z" fill="currentColor" /></svg>
          <span class="lbl">Meeting points</span>
        </button>
      </div>

      <div class="group" role="group" aria-label="View">
        <button type="button" class="tool icon" title="Zoom in (+)" aria-label="Zoom in" @click="actions.zoom?.(1 / 1.4)">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
        </button>
        <button type="button" class="tool icon" title="Zoom out (−)" aria-label="Zoom out" @click="actions.zoom?.(1.4)">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M3.5 8h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
        </button>
        <button type="button" class="tool icon" title="Zoom to fit the selected graph (F)" aria-label="Zoom to fit" @click="actions.fitView?.()">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M2 5.5V2h3.5M14 5.5V2h-3.5M2 10.5V14h3.5M14 10.5V14h-3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <button type="button" class="tool icon" title="Reset the view (0)" aria-label="Reset view" @click="actions.resetView?.()">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v2.8h2.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </div>
    </div>

    <div class="tool-groups end">
      <button type="button" class="tool" :class="{ on: !!ui.challenge }" title="Match a hidden graph using the sliders" @click="newChallenge()">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4" /><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.4" /><circle cx="8" cy="8" r="0.9" fill="currentColor" /></svg>
        <span class="lbl">Challenge</span>
      </button>
      <button type="button" class="tool" title="Copy a link to this exact graph" @click="copyShareLink()">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M6.8 9.2a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-.8.8M9.2 6.8a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l.8-.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
        <span class="lbl">Share</span>
      </button>
      <button type="button" class="tool" title="Download the graph as a PNG" @click="actions.exportPng?.()">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M8 2v8M4.8 6.8L8 10l3.2-3.2M2.5 11.5v2h11v-2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
        <span class="lbl">PNG</span>
      </button>
      <span class="divider" />
      <button type="button" class="tool icon" :title="themeLabel[prefs.theme]" :aria-label="themeLabel[prefs.theme]" @click="cycleTheme">
        <svg v-if="prefs.theme === 'light'" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.4" /><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
        <svg v-else-if="prefs.theme === 'dark'" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" /></svg>
        <svg v-else viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.4" /><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" /></svg>
      </button>
      <button type="button" class="tool icon" title="Help and shortcuts (?)" aria-label="Help" @click="ui.help = true">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4" /><path d="M6.3 6.3a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1v.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /><circle cx="8" cy="11.6" r="0.8" fill="currentColor" /></svg>
      </button>
      <button type="button" class="tool icon" :class="{ on: prefs.inspector }" :title="prefs.inspector ? 'Hide the working panel (W)' : 'Show the working panel (W)'" aria-label="Toggle working panel" @click="prefs.inspector = !prefs.inspector">
        <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><rect x="1.8" y="2.5" width="12.4" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4" /><path d="M10 2.5v11" stroke="currentColor" stroke-width="1.4" /></svg>
      </button>
    </div>
  </header>
</template>
