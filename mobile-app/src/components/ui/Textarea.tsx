import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { TextInput, type TextInputProps } from 'react-native'
import { cn } from '../../lib/utils'

const textareaVariants = cva(
  'min-h-28 rounded-xl border border-[#cbd5e1] bg-white px-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8]'
)

export const Textarea = forwardRef<TextInput, TextInputProps>(function Textarea(
  { style, className, ...props },
  ref
) {
  return (
    <TextInput
      ref={ref}
      multiline
      textAlignVertical="top"
      className={cn(textareaVariants(), className)}
      style={style}
      placeholderTextColor="#94a3b8"
      {...props}
    />
  )
})
