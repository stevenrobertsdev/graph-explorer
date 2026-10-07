<script setup>
import { computed } from 'vue'
import katex from 'katex'

const props = defineProps({
  src: { type: String, required: true },
  display: { type: Boolean, default: false },
  tag: { type: String, default: 'p' },
})

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const tex = (s, displayMode) => katex.renderToString(s, { displayMode, throwOnError: false, strict: false })

const html = computed(() => {
  if (props.display) return tex(props.src, true)
  return props.src
    .split(/(\$[^$]+\$)/g)
    .map((part) => (part.startsWith('$') && part.endsWith('$') && part.length > 1 ? tex(part.slice(1, -1), false) : escape(part)))
    .join('')
})
</script>

<template>
  <div v-if="display" class="math-display" v-html="html" />
  <component :is="tag" v-else class="math-text" v-html="html" />
</template>
