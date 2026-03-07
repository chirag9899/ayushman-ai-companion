import { StyleSheet, View } from 'react-native'
import { Gradients } from '../styles/designSystem'

type GradientType = 'background' | 'brand' | 'card' | 'wellness' | 'dark'

interface GradientBackgroundProps {
  children: React.ReactNode
  type?: GradientType
  style?: object
}

const gradientConfig: Record<GradientType, { colors: readonly string[]; locations: readonly number[] }> = {
  background: Gradients.background,
  brand: Gradients.brand,
  card: Gradients.card,
  wellness: Gradients.wellness,
  dark: Gradients.dark,
}

export function GradientBackground({ children, type = 'background', style }: GradientBackgroundProps) {
  const config = gradientConfig[type]

  return (
    <View style={[styles.container, style]}>
      {/* Fallback solid color so UI works in older dev builds */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: config.colors[0] }]} />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
