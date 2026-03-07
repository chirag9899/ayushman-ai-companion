import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Pressable, StyleProp, StyleSheet, Text, type PressableProps, type ViewStyle } from 'react-native'
import { cn } from '../../lib/utils'

type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
  children: ReactNode
  className?: string
  textClassName?: string
  style?: StyleProp<ViewStyle>
  }

const buttonVariants = cva('min-h-11 items-center justify-center rounded-2xl px-4 py-2.5', {
  variants: {
    variant: {
      primary: 'bg-[#14b8a6]',
      secondary: 'border border-[#dbe5ef] bg-[#f8fafc]',
      danger: 'bg-[#ef4444]',
    },
    size: {
      sm: 'min-h-10 px-3 py-2',
      md: 'min-h-11 px-4 py-2.5',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})

const textVariants = cva('text-center text-sm font-bold tracking-[0.2px]', {
  variants: {
    variant: {
      primary: 'text-white',
      secondary: 'text-[#0f4f5c]',
      danger: 'text-white',
    },
    size: {
      sm: 'text-xs',
      md: 'text-sm',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
})

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  className,
  textClassName,
  style,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={cn(buttonVariants({ variant, size }), disabled && 'opacity-60', className)}
      style={({ pressed }) => [pressed ? styles.pressed : null, style]}
      {...props}
    >
      <Text className={cn(textVariants({ variant, size }), textClassName)}>{children}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.94,
  },
})
