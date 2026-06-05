<script lang="ts" setup>
import AppBorder from '@/assets/images/Base_Tiled_Square.png'

const { globalColor } = useGlobalColor()
const props = defineProps<{ color?: string; borderWidth?: number }>()

const color = computed(() => props.color || globalColor.value || '#000000')

const { width: windowWidth } = useWindowSize()
const effectiveBorderWidth = computed(() => {
  if (props.borderWidth !== undefined) return props.borderWidth
  // Linear interpolation: 43px at 320px viewport → 80px at 1920px
  const t = Math.min(1, Math.max(0, (windowWidth.value - 320) / (1920 - 320)))
  return Math.round(43 + t * (80 - 43))
})

const imageSize = 768
const slicePx = 86 // fixed: source image design property
const edgeTile = computed(
  () => ((imageSize - 2 * slicePx) * effectiveBorderWidth.value) / slicePx,
)

const frame = ref<HTMLElement | null>(null)
const inner = ref<HTMLElement | null>(null)

const { ready } = useTiledFrame(
  frame,
  inner,
  () => effectiveBorderWidth.value,
  () => edgeTile.value,
)

const { src: borderSrc } = useRecoloredImage(AppBorder, color, 768)
</script>

<template>
  <ClientOnly>
    <div
      ref="frame"
      class="frame"
      :style="{
        borderImageSource: ready ? `url(${borderSrc})` : 'none',
        borderWidth: `${effectiveBorderWidth}px`,
      }"
    >
      <div ref="inner">
        <slot />
      </div>
    </div>
    <template #fallback>
      <slot />
    </template>
  </ClientOnly>
</template>

<style scoped>
.frame {
  box-sizing: border-box;
  max-width: 100%;
  margin: 0 auto;
  border-style: solid;
  border-color: transparent;
  border-image-slice: 86;
  border-image-repeat: round;
  image-rendering: pixelated;
}
</style>
