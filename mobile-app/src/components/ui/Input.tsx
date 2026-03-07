import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { TextInput, type TextInputProps } from 'react-native'
import { cn } from '../../lib/utils'

const inputVariants = cva(
  'min-h-11 rounded-xl border border-[#cbd5e1] bg-white px-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8]'
)

export const Input = forwardRef<TextInput, TextInputProps>(function Input(
  { style, className, ...props },
  ref
) {
  return (
    <TextInput
      ref={ref}
      className={cn(inputVariants(), className)}
      style={style}
      placeholderTextColor="#94a3b8"
      {...props}
    />
  )
})
