export const useGlobalColor = () => {
  const globalColor = useState<string>('globalColor', () => '#333333')

  const setGlobalColor = (color: string) => {
    console.log('Setting global color to', color)
    globalColor.value = color
  }

  return {
    globalColor,
    setGlobalColor,
  }
}
