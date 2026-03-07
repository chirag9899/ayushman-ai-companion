import { Text, View } from 'react-native'
import { MascotAvatar } from '../MascotAvatar'
import { cn } from '../../lib/utils'

type HeroHeaderProps = {
  title: string
  subtitle?: string
  mood?: 'default' | 'happy' | 'alert'
  className?: string
}

export function HeroHeader({ title, subtitle, mood = 'default', className }: HeroHeaderProps) {
  return (
    <View className={cn('flex-row items-center justify-between gap-3', className)}>
      <View className="flex-1">
        <Text className="text-[22px] font-extrabold text-[#0f4f5c]">{title}</Text>
        {subtitle ? (
          <Text className="mt-1 text-[13px] leading-[18px] text-[#6b8793]">{subtitle}</Text>
        ) : null}
      </View>
      <MascotAvatar mood={mood} size={56} />
    </View>
  )
}
