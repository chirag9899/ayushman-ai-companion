import { useEffect } from 'react'
import { Animated, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { cn } from '../../lib/utils'

type ToastTone = 'success' | 'error' | 'info'

type ToastProps = {
  message: string
  tone?: ToastTone
  onDismiss?: () => void
  duration?: number
  className?: string
}

const toneStyles: Record<ToastTone, { bg: string; border: string; icon: string; iconColor: string }> = {
  success: { bg: 'bg-[#ecfdf5]', border: 'border-[#a7f3d0]', icon: 'check-circle', iconColor: '#10b981' },
  error: { bg: 'bg-[#fef2f2]', border: 'border-[#fecaca]', icon: 'alert-circle', iconColor: '#ef4444' },
  info: { bg: 'bg-[#eff6ff]', border: 'border-[#bfdbfe]', icon: 'information', iconColor: '#3b82f6' },
}

export function Toast({
  message,
  tone = 'info',
  onDismiss,
  duration = 3000,
  className,
}: ToastProps) {
  const opacity = new Animated.Value(1)
  const translateY = new Animated.Value(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -10,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss?.()
      })
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onDismiss, opacity, translateY])

  const styles = toneStyles[tone]

  return (
    <Animated.View
      className={cn(
        'absolute left-4 right-4 top-4 z-50 flex-row items-center gap-2 rounded-xl border px-4 py-3 shadow-sm',
        styles.bg,
        styles.border,
        className
      )}
      style={{ opacity, transform: [{ translateY }] }}
    >
      <MaterialCommunityIcons
        name={styles.icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={20}
        color={styles.iconColor}
      />
      <Text className="flex-1 text-sm font-medium text-[#334155]">{message}</Text>
    </Animated.View>
  )
}
