import { Text, View } from 'react-native'
import { cn } from '../../lib/utils'

type NavHintProps = {
  children: string
  className?: string
}

export function NavHint({ children, className }: NavHintProps) {
  return (
    <View
      className={cn(
        'rounded-xl border border-[#d7eadf] bg-[#edf9f2] px-3 py-2',
        className
      )}
    >
      <Text className="text-xs font-semibold text-[#166534]">{children}</Text>
    </View>
  )
}
