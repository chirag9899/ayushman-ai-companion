import { useMemo, useState } from 'react'
import { Image, type ImageSourcePropType, View } from 'react-native'
import Svg, { Circle, Ellipse, Path } from 'react-native-svg'

type MascotAvatarProps = {
  size?: number
  mood?: 'default' | 'happy' | 'thinking' | 'alert'
  framed?: boolean
}

export function MascotAvatar({ size = 72, mood = 'default', framed = true }: MascotAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const source = useMemo<ImageSourcePropType>(() => {
    // Using your blue mascot images from assets/updated/
    if (mood === 'happy') return require('../../assets/updated/Gemini_Generated_Image_qiy1njqiy1njqiy1.png')
    if (mood === 'thinking') return require('../../assets/updated/Gemini_Generated_Image_jx10bajx10bajx10.png')
    if (mood === 'alert') return require('../../assets/updated/Gemini_Generated_Image_iv2v3yiv2v3yiv2v.png')
    // default uses the cheerful blue mascot
    return require('../../assets/updated/Gemini_Generated_Image_qiy1njqiy1njqiy1.png')
  }, [mood])

  const mouthPath =
    mood === 'happy'
      ? 'M36 46 C40 50, 48 50, 52 46'
      : mood === 'alert'
        ? 'M38 48 L50 48'
        : mood === 'thinking'
          ? 'M38 47 C42 45, 46 45, 50 47'
          : 'M39 47 C42 48, 46 48, 49 47'

  return (
    <View
      style={{
        height: size,
        width: size,
        borderRadius: framed ? size / 2 : 0,
        backgroundColor: framed ? '#e0f2fe' : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: framed ? 1 : 0,
        borderColor: '#7dd3fc',
        overflow: 'hidden',
      }}
    >
      {!imageFailed ? (
        <Image
          source={source}
          onError={() => setImageFailed(true)}
          style={{
            width: size * (framed ? 0.94 : 1),
            height: size * (framed ? 0.94 : 1),
            borderRadius: framed ? size / 2 : 0,
          }}
          resizeMode="cover"
        />
      ) : (
        <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 88 88">
          <Circle cx="44" cy="44" r="30" fill="#0ea5e9" opacity="0.15" />
          <Circle cx="44" cy="40" r="22" fill="#ffffff" />
          <Circle cx="36" cy="38" r="3.2" fill="#0f172a" />
          <Circle cx="52" cy="38" r="3.2" fill="#0f172a" />
          <Path d={mouthPath} stroke="#0f172a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <Ellipse cx="44" cy="63" rx="14" ry="6" fill="#0ea5e9" opacity="0.25" />
          {mood === 'alert' ? (
            <Circle cx="62" cy="24" r="4.5" fill="#f97316" />
          ) : (
            <Circle cx="62" cy="24" r="3.5" fill="#0ea5e9" />
          )}
        </Svg>
      )}
    </View>
  )
}
