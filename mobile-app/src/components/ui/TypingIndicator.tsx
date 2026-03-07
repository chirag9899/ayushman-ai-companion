import { useEffect, useRef } from 'react'
import { Animated, Text, View } from 'react-native'
import { cn } from '../../lib/utils'

type TypingIndicatorProps = {
  text?: string
  className?: string
}

export function TypingIndicator({ text = 'Ayushman is typing', className }: TypingIndicatorProps) {
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      )
    }

    const anim1 = animateDot(dot1, 0)
    const anim2 = animateDot(dot2, 150)
    const anim3 = animateDot(dot3, 300)

    anim1.start()
    anim2.start()
    anim3.start()

    return () => {
      anim1.stop()
      anim2.stop()
      anim3.stop()
    }
  }, [dot1, dot2, dot3])

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  })

  return (
    <View
      className={cn(
        'self-start rounded-2xl border border-[#e6f0f3] bg-[#f8fdff] px-4 py-3',
        className
      )}
    >
      <View className="flex-row items-center gap-1">
        <Text className="text-xs text-[#6b8793]">{text}</Text>
        <View className="flex-row items-end gap-0.5">
          <Animated.View
            className="h-1.5 w-1.5 rounded-full bg-[#94a3b8]"
            style={dotStyle(dot1)}
          />
          <Animated.View
            className="h-1.5 w-1.5 rounded-full bg-[#94a3b8]"
            style={dotStyle(dot2)}
          />
          <Animated.View
            className="h-1.5 w-1.5 rounded-full bg-[#94a3b8]"
            style={dotStyle(dot3)}
          />
        </View>
      </View>
    </View>
  )
}
