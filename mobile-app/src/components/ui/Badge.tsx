import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Text, View } from 'react-native'
import { cn } from '../../lib/utils'

type BadgeProps = {
  children: ReactNode
  className?: string
  textClassName?: string
} & VariantProps<typeof badgeVariants>

const badgeVariants = cva('self-start rounded-full border px-2 py-1', {
  variants: {
    tone: {
      neutral: 'border-[#cbd5e1] bg-[#f1f5f9]',
      success: 'border-[#a7f3d0] bg-[#ecfdf5]',
      warning: 'border-[#fde68a] bg-[#fffbeb]',
      danger: 'border-[#fecaca] bg-[#fef2f2]',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
})

const badgeTextVariants = cva('text-[11px] font-bold', {
  variants: {
    tone: {
      neutral: 'text-[#334155]',
      success: 'text-[#047857]',
      warning: 'text-[#b45309]',
      danger: 'text-[#b91c1c]',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
})

export function Badge({ children, tone = 'neutral', className, textClassName }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ tone }), className)}>
      <Text className={cn(badgeTextVariants({ tone }), textClassName)}>{children}</Text>
    </View>
  )
}
