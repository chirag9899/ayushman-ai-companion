import { Switch, Text, View } from 'react-native'
import { cn } from '../../lib/utils'

type SwitchFieldProps = {
  label: string
  value: boolean
  onValueChange: (value: boolean) => void
  className?: string
}

export function SwitchField({ label, value, onValueChange, className }: SwitchFieldProps) {
  return (
    <View
      className={cn(
        'flex-row items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-white px-3 py-2.5',
        className
      )}
    >
      <Text className="flex-1 text-sm text-[#334155]">{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  )
}
