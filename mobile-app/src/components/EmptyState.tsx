import { MaterialCommunityIcons } from '@expo/vector-icons'
import { View, StyleSheet, Pressable } from 'react-native'
import { MascotAvatar } from './MascotAvatar'
import { Body, H2, BodySmall } from './Typography'
import { Colors, Spacing, Shadows, Radius } from '../styles/designSystem'
import { HapticFeedback } from '../lib/haptics'

type EmptyStateVariant = 'default' | 'reminders' | 'history' | 'symptoms' | 'success' | 'search'

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  mascotSize?: number
}

const variantConfig: Record<EmptyStateVariant, {
  icon: string
  mascotMood: 'default' | 'happy' | 'thinking' | 'alert'
  defaultTitle: string
  defaultSubtitle: string
}> = {
  default: {
    icon: 'inbox-outline',
    mascotMood: 'thinking',
    defaultTitle: 'Nothing here yet',
    defaultSubtitle: 'Get started by adding your first item',
  },
  reminders: {
    icon: 'pill-off',
    mascotMood: 'happy',
    defaultTitle: 'No reminders set',
    defaultSubtitle: 'Add your first medication reminder to stay on track',
  },
  history: {
    icon: 'history',
    mascotMood: 'thinking',
    defaultTitle: 'No chat history',
    defaultSubtitle: 'Start a conversation with your AI coach',
  },
  symptoms: {
    icon: 'emoticon-happy-outline',
    mascotMood: 'happy',
    defaultTitle: 'No symptoms logged',
    defaultSubtitle: 'Great! Keep tracking to maintain your wellness',
  },
  success: {
    icon: 'check-circle-outline',
    mascotMood: 'happy',
    defaultTitle: 'All caught up!',
    defaultSubtitle: 'You are doing great with your health routine',
  },
  search: {
    icon: 'magnify',
    mascotMood: 'thinking',
    defaultTitle: 'No results found',
    defaultSubtitle: 'Try adjusting your search terms',
  },
}

export function EmptyState({
  variant = 'default',
  title,
  subtitle,
  actionLabel,
  onAction,
  mascotSize = 120,
}: EmptyStateProps) {
  const config = variantConfig[variant]

  const handleAction = () => {
    HapticFeedback.light()
    onAction?.()
  }

  return (
    <View style={styles.container}>
      {/* Decorative background circles */}
      <View style={[styles.bgCircle, styles.bgCircle1]} />
      <View style={[styles.bgCircle, styles.bgCircle2]} />

      {/* Mascot with bounce animation container */}
      <View style={styles.mascotWrapper}>
        <MascotAvatar mood={config.mascotMood} size={mascotSize} />
      </View>

      {/* Icon badge */}
      <View style={styles.iconBadge}>
        <MaterialCommunityIcons
          name={config.icon as any}
          size={24}
          color={Colors.primary[600]}
        />
      </View>

      {/* Text content */}
      <H2 color="primary" align="center" style={styles.title}>
        {title || config.defaultTitle}
      </H2>

      <Body color="secondary" align="center" style={styles.subtitle}>
        {subtitle || config.defaultSubtitle}
      </Body>

      {/* Action button */}
      {onAction && actionLabel && (
        <Pressable
          style={styles.actionBtn}
          onPress={handleAction}
        >
          <MaterialCommunityIcons
            name="plus"
            size={20}
            color={Colors.text.inverse}
          />
          <Body color="inverse" weight="medium">
            {actionLabel}
          </Body>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    position: 'relative',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: Colors.primary[50],
  },
  bgCircle1: {
    width: 200,
    height: 200,
    top: 20,
    left: -50,
    opacity: 0.5,
  },
  bgCircle2: {
    width: 150,
    height: 150,
    bottom: 100,
    right: -30,
    opacity: 0.3,
  },
  mascotWrapper: {
    marginBottom: Spacing.lg,
  },
  iconBadge: {
    position: 'absolute',
    top: '30%',
    right: '25%',
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  title: {
    marginBottom: Spacing.sm,
    maxWidth: 280,
  },
  subtitle: {
    maxWidth: 280,
    lineHeight: 22,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary[600],
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    marginTop: Spacing.xl,
    ...Shadows.md,
  },
})
