import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { cva } from 'class-variance-authority'
import { Animated, Easing, StyleSheet, Text } from 'react-native'
import { cssInterop } from 'nativewind'
import { cn } from '../../lib/utils'

type CardProps = {
  title?: string
  children: ReactNode
  className?: string
  titleClassName?: string
}

const cardVariants = cva(
  'rounded-3xl border border-[#edf2f7] bg-white p-[18px] shadow-sm shadow-[#0f172a]/10'
)

const AnimatedCard = cssInterop(Animated.View, { className: 'style' })

export function Card({ title, children, className, titleClassName }: CardProps) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [anim])

  return (
    <AnimatedCard
      className={cn(cardVariants(), className)}
      style={[
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0],
              }),
            },
          ],
        },
      ]}
    >
      {title ? <Text className={cn('mb-2.5 text-xl font-bold tracking-[0.2px] text-[#0f4f5c]', titleClassName)}>{title}</Text> : null}
      {children}
    </AnimatedCard>
  )
}

const styles = StyleSheet.create({
  // Keep animation-only styles in JS, visual styles move to className.
})
