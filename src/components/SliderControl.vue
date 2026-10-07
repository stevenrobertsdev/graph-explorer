<script setup>
import { computed, useId } from 'vue'
import MathText from './MathText.vue'

const props = defineProps({
  name: { type: String, required: true },
  hint: { type: String, default: '' },
  modelValue: { type: Number, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  step: { type: Number, default: 0.1 },
  playing: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'begin', 'play'])
const id = useId()

const lo = computed(() => Math.min(props.min, Math.floor(props.modelValue)))
const hi = computed(() => Math.max(props.max, Math.ceil(props.modelValue)))

function fromRange(raw) {
  const n = Number(raw)
  if (Number.isFinite(n)) emit('update:modelValue', Math.round(n * 10) / 10)
}

function fromBox(raw) {
  const n = Number(String(raw).replace('−', '-'))
  if (Number.isFinite(n)) emit('update:modelValue', Math.round(n * 10000) / 10000)
}

const pct = (v) => ((v - lo.value) / (hi.value - lo.value)) * 100
const fill = computed(() => {
  const z = pct(Math.min(Math.max(0, lo.value), hi.value))
  const v = pct(props.modelValue)
  return { '--from': `${Math.min(z, v)}%`, '--to': `${Math.max(z, v)}%` }
})
</script>

<template>
  <div class="slider" :class="{ playing }">
    <div class="slider-head">
      <label :for="id">
        <MathText class="slider-name" :src="`$${name}$`" tag="span" />
        <span class="slider-hint">{{ hint }}</span>
      </label>
      <div class="slider-tools">
        <button
          type="button"
          class="icon-btn small"
          :class="{ on: playing }"
          :title="playing ? 'Stop animating' : 'Animate this value'"
          :aria-label="playing ? 'Stop animating' : 'Animate this value'"
          @click="emit('play')"
        >
          <svg v-if="!playing" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M5 3.5v9l7-4.5z" fill="currentColor" /></svg>
          <svg v-else viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" /></svg>
        </button>
        <input
          class="slider-number"
          type="number"
          :aria-label="`${name} value`"
          :value="modelValue"
          step="any"
          @focus="emit('begin', 'key')"
          @change="fromBox($event.target.value)"
        />
      </div>
    </div>
    <input
      :id="id"
      class="slider-range"
      type="range"
      :min="lo"
      :max="hi"
      :step="step"
      :value="modelValue"
      :style="fill"
      @pointerdown="emit('begin', 'pointer')"
      @keydown="emit('begin', 'key')"
      @input="fromRange($event.target.value)"
    />
  </div>
</template>
