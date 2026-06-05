export const useGlobalColor = () => {
  const globalColor = useState<string>('globalColor', () => '#333333')

  const setGlobalColor = (color: string) => {
    globalColor.value = color
    document.documentElement.style.setProperty('--color-global', color)
  }

  return {
    globalColor,
    setGlobalColor,
  }
}

export const useGlobalColorObserver = () => {
  const { setGlobalColor } = useGlobalColor()

  onMounted(() => {
    const observed = new WeakSet<Element>()

    const intersection = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const color = (entry.target as HTMLElement).dataset.color
            if (color) setGlobalColor(color)
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )

    const observeAll = () => {
      document.querySelectorAll<HTMLElement>('[data-color]').forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el)
          intersection.observe(el)
        }
      })
    }

    observeAll()

    const mutation = new MutationObserver(observeAll)
    mutation.observe(document.body, { childList: true, subtree: true })

    onUnmounted(() => {
      intersection.disconnect()
      mutation.disconnect()
    })
  })
}
