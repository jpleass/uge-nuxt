<script lang="ts" setup>
const props = withDefaults(
  defineProps<{ src: string; color?: string; alt?: string }>(),
  {
    // Concrete value, not `var(--color-brown)`: the composable resolves colours
    // via canvas `fillStyle`, which doesn't understand CSS variables.
    color: '#844d49',
  },
)

// No dimensions passed, so the asset's natural size is used.
const { src: tinted } = useRecoloredImage(props.src, () => props.color)
</script>

<template>
  <img :src="tinted" :alt="alt" style="image-rendering: pixelated" />
</template>
