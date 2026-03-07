import { Pressable, PressableProps } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { HapticFeedback } from '../lib/haptics'

interface AnimatedPressableProps extends PressableProps {
  scale?: number
  haptic?: 'light' | 'medium' | 'heavy' | 'none'
  children: React.ReactNode
}

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable)

export function AnimatedPressable({
  scale = 0.98,
  haptic = 'light',
  onPressIn,
  onPressOut,
  onPress,
  children,
  style,
  ...rest
}: AnimatedPressableProps) {
  const scaleValue = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }))

  const handlePressIn: PressableProps['onPressIn'] = (event) => {
    scaleValue.value = withTiming(scale, { duration: 100 })
    if (haptic !== 'none') {
      HapticFeedback[haptic]()
    }
    onPressIn?.(event)
  }

  const handlePressOut: PressableProps['onPressOut'] = (event) => {
    scaleValue.value = withSpring(1, { damping: 15, stiffness: 150 })
    onPressOut?.(event)
  }

  const handlePress: PressableProps['onPress'] = (event) => {
    onPress?.(event)
  }

  return (
    <AnimatedPressableComponent
      style={[animatedStyle, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      {...rest}
    >
      {children}
    </AnimatedPressableComponent>
  )
}
