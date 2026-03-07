import { Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { cn } from '../../lib/utils'

type EmptyStateProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  title: string
  subtitle?: string
  className?: string
}

export function EmptyState({ icon, title, subtitle, className }: EmptyStateProps) {
  return (
    <View className={cn('items-center justify-center py-8', className)}>
      <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-[#f1f5f9]">
        <MaterialCommunityIcons name={icon} size={32} color="#94a3b8" />
      </View>
      <Text className="text-center text-sm font-semibold text-[#475569]">{title}</Text>
      {subtitle ? (
        <Text className="mt-1 text-center text-xs text-[#64748b]">{subtitle}</Text>
      ) : null}
    </View>
  )
}
