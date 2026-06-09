<script lang="ts" setup>
import AppBorder from '@/assets/images/Base_Tiled_Square.png'

const { globalColor } = useGlobalColor()
const props = defineProps<{ color?: string; borderWidth?: number }>()

const color = computed(() => props.color || globalColor.value || '#000000')
const { borderWidth } = useFrameScale()
const effectiveBorderWidth = computed(() => {
  if (props.borderWidth !== undefined) return props.borderWidth
  return borderWidth.value
})

const { getSrc, loaded } = useRecoloredImage(AppBorder, undefined, 768)

// Render the frame shape *once* as a static alpha mask (line pixels opaque, rest
// transparent). The color is irrelevant to the alpha, so any value works. The
// live `color` is then applied via `background-color` on the masked pseudo-
// element — a cheap GPU repaint with no per-frame image decode, which avoids the
// mobile-WebKit border-image decode stall that made the frame vanish mid-
// transition. It stays in lock-step with text/images since both read the same
// per-frame `globalColor`.
const maskSrc = ref('')
watch(
  loaded,
  (isLoaded) => {
    if (isLoaded) maskSrc.value = getSrc('#000000')
  },
  { immediate: true },
)
</script>

<template>
  <ClientOnly>
    <div
      class="frame"
      :style="{
        '--frame-mask': maskSrc ? `url(${maskSrc})` : 'none',
        '--frame-color': color,
        '--frame-border-width': `${effectiveBorderWidth}px`,
      }"
    >
      <slot />
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
  width: 100%;
  min-height: 100vh;
  /* The frame is now painted by the absolutely-positioned ::before overlay,
     which reserves no layout space. Pad the content in by the border width so it
     sits inside the frame, matching the old `border-width` inset. */
  padding: var(--frame-border-width);
}

/* The frame is painted by masking a solid background-color to the border shape.
   Recoloring is then a cheap compositor repaint (just the background) instead of
   decoding a new border-image per frame — which is what stalled on mobile. The
   pseudo-element is childless, so masking it never clips the slot content. */
.frame::before {
  content: '';
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: var(--frame-border-width) solid transparent;
  background-color: var(--frame-color);
  /* `/ 1` sets the mask-border width to 1× border-width. Unlike
     border-image-width (initial value 1), mask-border-width defaults to `auto`
     (the slice's intrinsic px), which would ignore the responsive border-width. */
  -webkit-mask-box-image: var(--frame-mask) 86 / 1 repeat;
  mask-border: var(--frame-mask) 86 / 1 repeat;
  image-rendering: pixelated;
  pointer-events: none;
}

/* round scales tiles to fit on larger screens; repeat keeps the native
   tile size on mobile to avoid over-stretching. */
@media (min-width: 769px) {
  .frame::before {
    -webkit-mask-box-image: var(--frame-mask) 86 / 1 round;
    mask-border: var(--frame-mask) 86 / 1 round;
  }
}

/* Firefox does not support `mask-border` or `-webkit-mask-box-image`.
   Fall back to `border-image` so the tiled frame still renders. */
@supports not ((mask-border: url('') 1) or (-webkit-mask-box-image: url(''))) {
  .frame {
    padding: 0;
    border: var(--frame-border-width) solid transparent;
    border-image-source: var(--frame-mask);
    border-image-slice: 86;
    border-image-width: 1;
    border-image-repeat: repeat;
  }

  .frame::before {
    content: none;
  }

  @media (min-width: 769px) {
    .frame {
      border-image-repeat: round;
    }
  }
}
</style>
