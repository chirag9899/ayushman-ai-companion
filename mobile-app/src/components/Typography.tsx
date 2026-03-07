import { Text, type TextProps, type TextStyle } from 'react-native'
import { Colors, Typography } from '../styles/designSystem'

type Variant = 'hero' | 'h1' | 'h2' | 'h3' | 'bodyLarge' | 'body' | 'bodySmall' | 'caption'

type Props = TextProps & {
  variant?: Variant
  color?: string
  weight?: 'regular' | 'medium' | 'semibold' | 'bold'
  align?: TextStyle['textAlign']
}

function fontWeightValue(weight?: Props['weight']) {
  if (weight === 'bold') return '700'
  if (weight === 'semibold') return '600'
  if (weight === 'medium') return '500'
  return '400'
}

function resolveColor(color: string) {
  if (color === 'primary') return Colors.text.primary
  if (color === 'secondary') return Colors.text.secondary
  if (color === 'tertiary') return Colors.text.tertiary
  if (color === 'muted') return Colors.text.muted
  if (color === 'inverse') return Colors.text.inverse
  return color
}

export function TypographyText({
  variant = 'body',
  color = Colors.text.primary,
  weight,
  align,
  style,
  ...rest
}: Props) {
  return (
    <Text
      {...rest}
      style={[
        Typography[variant],
        { color: resolveColor(color), fontWeight: fontWeightValue(weight), textAlign: align },
        style,
      ]}
    />
  )
}

export const Hero = (props: Omit<Props, 'variant'>) => <TypographyText variant="hero" {...props} />
export const H1 = (props: Omit<Props, 'variant'>) => <TypographyText variant="h1" {...props} />
export const H2 = (props: Omit<Props, 'variant'>) => <TypographyText variant="h2" {...props} />
export const H3 = (props: Omit<Props, 'variant'>) => <TypographyText variant="h3" {...props} />
export const Body = (props: Omit<Props, 'variant'>) => <TypographyText variant="body" {...props} />
export const BodyLarge = (props: Omit<Props, 'variant'>) => <TypographyText variant="bodyLarge" {...props} />
export const BodySmall = (props: Omit<Props, 'variant'>) => <TypographyText variant="bodySmall" {...props} />
export const Caption = (props: Omit<Props, 'variant'>) => <TypographyText variant="caption" {...props} />
