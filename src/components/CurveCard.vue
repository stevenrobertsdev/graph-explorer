<script setup>
import { computed } from 'vue'
import MathText from './MathText.vue'
import SliderControl from './SliderControl.vue'
import PointsEditor from './PointsEditor.vue'
import { FORMS, SLIDERS, PARAM_TEX, PALETTE, cardTex } from '../lib/curves.js'
import {
  ui,
  select,
  setForm,
  removeCurve,
  duplicateCurve,
  resetCurve,
  beginChange,
  updateParam,
  toggleAnim,
} from '../lib/store.js'

const props = defineProps({
  curve: { type: Object, required: true },
  model: { type: Object, required: true },
  active: { type: Boolean, default: false },
})

const kindLabel = computed(() => ({ parabola: 'Parabola', line: 'Line', points: 'Points' })[props.curve.kind])
const forms = computed(() => FORMS[props.curve.kind] ?? [])
const formTex = computed(() => forms.value.find((f) => f.id === props.curve.form)?.tex ?? '')
const sliders = computed(() => SLIDERS[props.curve.form] ?? [])
const notice = computed(() => ui.notices[props.curve.id])
const problem = computed(() => props.model.degenerate || props.model.message || '')

function cycleColour() {
  const i = PALETTE.indexOf(props.curve.color)
  props.curve.color = PALETTE[(i + 1) % PALETTE.length]
}
</script>

<template>
  <article class="curve-card" :class="{ active, hidden: !curve.visible }" @click="select(curve.id)">
    <header class="curve-head">
      <button
        type="button"
        class="swatch"
        :style="{ '--c': curve.color }"
        :title="curve.visible ? 'Hide' : 'Show'"
        :aria-label="curve.visible ? `Hide ${curve.name}` : `Show ${curve.name}`"
        @click.stop="curve.visible = !curve.visible"
      >
        <svg v-if="!curve.visible" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5M4.2 4.3C2.9 5.2 2 6.5 1.5 8c1.2 3 3.8 5 6.5 5 1.3 0 2.5-.4 3.6-1.1M7 3.1c.3 0 .7-.1 1-.1 2.7 0 5.3 2 6.5 5-.3.8-.8 1.6-1.4 2.3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
      </button>
      <span class="curve-name" :style="{ color: curve.color }">{{ curve.name }}</span>
      <MathText class="curve-eq" :src="`$${cardTex(curve, model)}$`" tag="span" />
      <div class="curve-actions" @click.stop>
        <button type="button" class="icon-btn small" title="Change colour" aria-label="Change colour" @click="cycleColour">
          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.4" /><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" /></svg>
        </button>
        <button type="button" class="icon-btn small" title="Duplicate" aria-label="Duplicate" @click="duplicateCurve(curve.id)">
          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4" /><path d="M3 10.5V3.8C3 3.4 3.4 3 3.8 3h6.7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" /></svg>
        </button>
        <button type="button" class="icon-btn small danger" title="Delete" aria-label="Delete" @click="removeCurve(curve.id)">
          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </div>
    </header>

    <div v-if="active" class="curve-body" @click.stop>
      <div class="curve-meta">
        <span class="kind-tag">{{ kindLabel }}</span>
        <button v-if="curve.kind !== 'points'" type="button" class="link" @click="resetCurve(curve)">Reset</button>
      </div>

      <template v-if="curve.kind !== 'points'">
        <div class="segmented compact" role="group" aria-label="Equation form">
          <button
            v-for="f in forms"
            :key="f.id"
            type="button"
            :class="{ active: curve.form === f.id }"
            :aria-pressed="curve.form === f.id"
            @click="setForm(curve, f.id)"
          >
            {{ f.label }}
          </button>
        </div>
        <p class="form-hint"><MathText :src="`$${formTex}$`" tag="span" /></p>
        <p v-if="notice" class="notice">{{ notice }}</p>
        <p v-if="problem" class="notice warn">{{ problem }}</p>
        <SliderControl
          v-for="s in sliders"
          :key="curve.form + s.key"
          :name="PARAM_TEX[s.key] ?? s.key"
          :hint="s.hint"
          :min="s.min"
          :max="s.max"
          :model-value="curve.params[curve.form][s.key]"
          :playing="ui.anim?.id === curve.id && ui.anim?.key === s.key"
          @begin="(src) => beginChange(curve, s.key, src)"
          @update:model-value="(v) => updateParam(curve, s.key, v)"
          @play="toggleAnim(curve, s)"
        />
      </template>

      <PointsEditor v-else :curve="curve" :model="model" />
    </div>
  </article>
</template>
