import * as Speech from 'expo-speech'
import { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export type TourFocusFrame = {
  x: number
  y: number
  width: number
  height: number
}

type PresenterOverlayProps = {
  title: string
  script: string
  stepLabel?: string
  stepIndex?: number
  totalSteps?: number
  ctaLabel: string
  onPressCta: () => void
  backLabel?: string
  onPressBack?: () => void
  skipLabel?: string
  onPressSkip?: () => void
  undimmedBottomHeight?: number
  narrationEnabled?: boolean
  narrationLanguage?: 'en' | 'hi' | 'regional'
}

export function PresenterOverlay({
  title,
  script,
  stepLabel,
  stepIndex = 0,
  totalSteps = 0,
  ctaLabel,
  onPressCta,
  backLabel = 'Back',
  onPressBack,
  skipLabel = 'Skip',
  onPressSkip,
  undimmedBottomHeight = 0,
  narrationEnabled = false,
  narrationLanguage = 'en',
}: PresenterOverlayProps) {
  const insets = useSafeAreaInsets()
  const fade = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(14)).current

  const normalizedTotal = Math.max(0, totalSteps)
  const normalizedIndex = Math.min(Math.max(0, stepIndex), normalizedTotal)
  const progressDots = useMemo(
    () => Array.from({ length: normalizedTotal }, (_, idx) => idx < normalizedIndex),
    [normalizedIndex, normalizedTotal]
  )

  useEffect(() => {
    fade.setValue(0)
    translateY.setValue(14)
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [fade, translateY, title, script, stepLabel])

  useEffect(() => {
    if (!narrationEnabled) return
    const text = `${title}. ${script}`.trim()
    if (!text) return
    void Speech.stop()
    Speech.speak(text, {
      language: narrationLanguage === 'hi' || narrationLanguage === 'regional' ? 'hi-IN' : 'en-IN',
      pitch: 1.0,
      rate: 0.95,
    })
    return () => {
      void Speech.stop()
    }
  }, [narrationEnabled, narrationLanguage, title, script])

  return (
    <View style={styles.root}>
      <View style={[styles.dimFill, undimmedBottomHeight > 0 ? { bottom: undimmedBottomHeight } : null]} />
      {undimmedBottomHeight > 0 ? (
        <View style={[styles.bottomTouchBlocker, { height: undimmedBottomHeight }]} />
      ) : null}

      <Animated.View
        style={[
          styles.container,
          { bottom: Math.max(16, insets.bottom + 12) },
          { opacity: fade, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.card}>
          {stepLabel ? <Text style={styles.stepLabel}>{stepLabel}</Text> : null}
          {normalizedTotal > 0 ? (
            <View style={styles.progressRow}>
              {progressDots.map((active, idx) => (
                <View key={idx} style={[styles.progressDot, active && styles.progressDotActive]} />
              ))}
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.script}>{script}</Text>
          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.actionButton, styles.secondary, !onPressBack && styles.disabled]}
              onPress={onPressBack}
              disabled={!onPressBack}
            >
              <Text style={styles.secondaryText}>{backLabel}</Text>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.primary]} onPress={onPressCta}>
              <Text style={styles.primaryText}>{ctaLabel}</Text>
            </Pressable>
          </View>
          {onPressSkip ? (
            <Pressable style={styles.skipButton} onPress={onPressSkip}>
              <Text style={styles.skipText}>{skipLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
  },
  dimFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.62)',
  },
  bottomTouchBlocker: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cde4d8',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#14532d',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  progressRow: {
    marginBottom: 8,
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c8d8cf',
  },
  progressDotActive: {
    backgroundColor: '#16a34a',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f3f32',
  },
  script: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#275747',
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  primary: {
    backgroundColor: '#16a34a',
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondary: {
    borderWidth: 1,
    borderColor: '#9fb6aa',
    backgroundColor: '#ffffff',
  },
  secondaryText: {
    color: '#244e40',
    fontSize: 14,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
  skipButton: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbd5c8',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: '#355d50',
    fontSize: 13,
    fontWeight: '700',
  },
})

