<script setup>
import MathText from './MathText.vue'

defineProps({ steps: { type: Array, required: true } })
</script>

<template>
  <ol class="steps">
    <li v-for="(s, i) in steps" :key="i" class="step">
      <h3><span class="step-n">{{ i + 1 }}</span>{{ s.title }}</h3>
      <template v-for="(b, j) in s.blocks" :key="j">
        <MathText v-if="b.p" :src="b.p" />
        <MathText v-else :src="b.m" display />
      </template>
    </li>
  </ol>
</template>
