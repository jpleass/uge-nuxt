<script lang="ts" setup>
import AppBorder from '@/assets/images/Base_Tiled_Square.png'

const { globalColor } = useGlobalColor()
const props = defineProps<{ color?: string; borderWidth?: number }>()

const color = computed(() => props.color || globalColor.value || '#000000')

const { width: windowWidth } = useWindowSize()
const effectiveBorderWidth = computed(() => {
  if (props.borderWidth !== undefined) return props.borderWidth
  // Linear interpolation: 34px at 320px viewport → 80px at 1920px
  const t = Math.min(1, Math.max(0, (windowWidth.value - 320) / (1920 - 320)))
  return Math.round(34 + t * (80 - 34))
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

const { getSrc, loaded } = useRecoloredImage(AppBorder, undefined, 768)

const currentSrc = ref('')
// Each time the color changes we increment this key to remount the ghost,
// which restarts the CSS fade-out animation with the outgoing border image.
const ghostSrc = ref('')
const ghostKey = ref(0)

watch(loaded, (isLoaded) => {
  if (isLoaded) currentSrc.value = getSrc(color.value)
})

watch(color, (newColor, oldColor) => {
  if (!loaded.value) return
  ghostSrc.value = getSrc(oldColor)
  ghostKey.value++
  currentSrc.value = getSrc(newColor)
})
</script>

<template>
  <ClientOnly>
    <div
      ref="frame"
      class="frame"
      :style="{
        borderImageSource: ready && currentSrc ? `url(${currentSrc})` : 'none',
        borderWidth: `${effectiveBorderWidth}px`,
      }"
    >
      <!-- Ghost: outgoing border fades out via CSS animation. Positioned with
           negative inset so it covers exactly the frame's border area. -->
      <div
        v-if="ghostSrc"
        :key="ghostKey"
        class="border-ghost"
        :style="{
          borderImageSource: `url(${ghostSrc})`,
          borderWidth: `${effectiveBorderWidth}px`,
          inset: `-${effectiveBorderWidth}px`,
        }"
      />
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
  position: relative;
  box-sizing: border-box;
  max-width: 100%;
  margin: 0 auto;
  border-style: solid;
  border-color: transparent;
  border-image-slice: 86;
  border-image-repeat: round;
  image-rendering: pixelated;
}

.border-ghost {
  position: absolute;
  pointer-events: none;
  box-sizing: border-box;
  border-style: solid;
  border-color: transparent;
  border-image-slice: 86;
  border-image-repeat: round;
  image-rendering: pixelated;
  animation: border-ghost-fade 300ms ease-out forwards;
}

@keyframes border-ghost-fade {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
</style>
