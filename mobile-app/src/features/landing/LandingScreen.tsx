import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AnimatedPressable } from '../../components/AnimatedPressable'
import { Hero, Body, BodySmall } from '../../components/Typography'
import { MascotAvatar } from '../../components/MascotAvatar'
import { tk } from '../../lib/i18n'
import { useAppState } from '../../state/AppState'
import { Colors, Gradients, Spacing, Shadows, Radius } from '../../styles/designSystem'
import type { RootStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>

export function LandingScreen({ navigation }: Props) {
  const { profile } = useAppState()
  const insets = useSafeAreaInsets()
  const tt = (key: Parameters<typeof tk>[1]) => tk(profile.language, key)
  const isHindi = profile.language === 'hi'

  return (
    <View style={styles.container}>
      {/* Soft background fallback (works without native gradient module) */}
      <View style={styles.bgFallback} />

      {/* Decorative circles */}
      <View style={[styles.bgCircle, styles.bgCircle1]} />
      <View style={[styles.bgCircle, styles.bgCircle2]} />

      {/* Main scrollable content */}
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: insets.bottom + 100, // Space for fixed button
          },
        ]}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.appLabelContainer}>
            <MascotAvatar mood="happy" size={32} />
            <BodySmall color="secondary" weight="medium" style={styles.appLabel}>
              {tt('appName')}
            </BodySmall>
          </View>

          <Hero color="primary" style={styles.heroTitle}>
            {isHindi
              ? 'अपना हेलथ\journey शुरू करें'
              : 'Start Your Health\nJourney Today'}
          </Hero>

          <Body color="secondary" style={styles.valueSubtitle}>
            {isHindi
              ? 'दवा, लक्षण और रोज के एक्शन स्टेप्स के लिए आपका पर्सनल AI साथी।'
              : 'Your personalized AI companion for medicines, symptoms, and daily wellness.'}
          </Body>
        </View>

        {/* Visual Section with Mascot */}
        <View style={styles.visualCard}>
          <View style={styles.accentBand} />

          <Image
            source={require('../../../assets/Gemini_Generated_Image_78t78978t78978t7-cutout.png')}
            style={styles.bigMascot}
            resizeMode="contain"
          />

          {/* Chat bubble */}
          <View style={styles.chatBubble}>
            <BodySmall color="primary" weight="medium">
              {isHindi ? 'हाय! आज कैसे हैं?' : 'Hi! Ready to feel better?'}
            </BodySmall>
          </View>

          {/* Trust badges */}
          <View style={styles.trustBar}>
            <View style={styles.trustItem}>
              <View style={[styles.trustIcon, { backgroundColor: Colors.primary[100] }]}>
                <MaterialCommunityIcons name="shield-check" size={14} color={Colors.primary[600]} />
              </View>
              <BodySmall color="secondary" weight="medium">
                {isHindi ? 'सुरक्षित' : 'Secure'}
              </BodySmall>
            </View>

            <View style={styles.trustItem}>
              <View style={[styles.trustIcon, { backgroundColor: Colors.accent[100] }]}>
                <MaterialCommunityIcons name="heart-pulse" size={14} color={Colors.accent[600]} />
              </View>
              <BodySmall color="secondary" weight="medium">
                {isHindi ? 'पर्सनलाइज़्ड' : 'Personalized'}
              </BodySmall>
            </View>

            <View style={styles.trustItem}>
              <View style={[styles.trustIcon, { backgroundColor: '#fef3c7' }]}>
                <MaterialCommunityIcons name="lightning-bolt" size={14} color="#d97706" />
              </View>
              <BodySmall color="secondary" weight="medium">
                {isHindi ? 'तुरंत' : 'Instant'}
              </BodySmall>
            </View>
          </View>
        </View>

        {/* Feature highlights */}
        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.primary[100] }]}>
              <MaterialCommunityIcons name="pill" size={20} color={Colors.primary[600]} />
            </View>
            <BodySmall color="secondary" align="center">
              {isHindi ? 'दवा रिमाइंडर' : 'Reminders'}
            </BodySmall>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.accent[100] }]}>
              <MaterialCommunityIcons name="message-text" size={20} color={Colors.accent[600]} />
            </View>
            <BodySmall color="secondary" align="center">
              {isHindi ? 'AI कोच' : 'AI Coach'}
            </BodySmall>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: '#fef3c7' }]}>
              <MaterialCommunityIcons name="chart-line" size={20} color="#d97706" />
            </View>
            <BodySmall color="secondary" align="center">
              {isHindi ? 'हैल्थ ट्रैकिंग' : 'Tracking'}
            </BodySmall>
          </View>
        </View>
      </View>

      {/* Fixed CTA Button at bottom */}
      <View style={[styles.ctaContainer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <AnimatedPressable
          onPress={() => navigation.navigate('Onboarding')}
          scale={0.97}
          haptic="medium"
          style={styles.ctaButton}
        >
          <View style={styles.ctaGradient}>
            <Body color="inverse" weight="semibold">
              {isHindi ? 'स्वास्थ्य यात्रा शुरू करें' : 'Start Your Health Journey'}
            </Body>
            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color={Colors.text.inverse}
            />
          </View>
        </AnimatedPressable>

        <BodySmall color="muted" align="center" style={styles.disclaimer}>
          {isHindi
            ? 'मुफ्त शुरू करें • कोई क्रेडिट कार्ड नहीं'
            : 'Free to start • No credit card required'}
        </BodySmall>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: Colors.primary[50],
  },
  bgCircle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
    opacity: 0.6,
  },
  bgCircle2: {
    width: 200,
    height: 200,
    bottom: 200,
    left: -50,
    opacity: 0.4,
  },
  hero: {
    marginTop: Spacing.sm,
  },
  appLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  appLabel: {
    letterSpacing: 0.5,
  },
  heroTitle: {
    marginTop: Spacing.xs,
    maxWidth: 320,
  },
  valueSubtitle: {
    marginTop: Spacing.md,
    maxWidth: '90%',
    lineHeight: 24,
  },
  visualCard: {
    marginTop: Spacing.xl,
    height: 300,
    borderRadius: Radius['2xl'],
    backgroundColor: Colors.background.elevated,
    overflow: 'hidden',
    ...Shadows.md,
    position: 'relative',
  },
  accentBand: {
    position: 'absolute',
    left: -60,
    right: -40,
    top: 140,
    height: 60,
    backgroundColor: Colors.primary[400],
    opacity: 0.15,
    transform: [{ rotate: '-8deg' }],
  },
  bigMascot: {
    position: 'absolute',
    right: -34,
    bottom: -28,
    width: 320,
    height: 390,
  },
  chatBubble: {
    position: 'absolute',
    left: Spacing.md,
    top: Spacing.md,
    maxWidth: '60%',
    borderRadius: Radius.lg,
    backgroundColor: Colors.background.elevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  trustBar: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.background.secondary,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  trustIcon: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  featureItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  ctaContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
  },
  ctaButton: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary[600],
  },
  disclaimer: {
    marginTop: Spacing.sm,
  },
})
