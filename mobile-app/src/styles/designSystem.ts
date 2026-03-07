// Design System for Ayushman AI Companion
// Typography: Inter (body) + Space Grotesk (display)
// Colors: Professional healthcare palette with subtle warmth

import { Platform } from 'react-native'

// ============================================
// FONTS
// ============================================
export const Fonts = {
  // Primary body font - highly legible, professional
  body: Platform.select({
    ios: 'Inter',
    android: 'Inter',
    default: 'Inter',
  }),
  // Display font for headers - distinctive but clean
  display: Platform.select({
    ios: 'SpaceGrotesk',
    android: 'SpaceGrotesk',
    default: 'SpaceGrotesk',
  }),
  // Fallback stack
  fallback: Platform.select({
    ios: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
    android: 'Roboto, "Noto Sans", sans-serif',
    default: 'system-ui, sans-serif',
  }),
}

// Font weights
export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const

// Typography scale
export const Typography = {
  // Display
  hero: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.1,
  },
  // Body
  bodyLarge: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: FontWeight.regular,
    letterSpacing: 0,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FontWeight.regular,
    letterSpacing: 0,
  },
  bodySmall: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: FontWeight.regular,
    letterSpacing: 0.1,
  },
  // Special
  caption: {
    fontFamily: Fonts.body,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: FontWeight.medium,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.2,
  },
} as const

// ============================================
// COLORS
// ============================================
export const Colors = {
  // Primary Brand - Warm, trustworthy teal
  primary: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
  // Accent - Calm blue for secondary actions
  accent: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  // Semantic Colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  // Neutrals - Warm gray for healthcare feel
  gray: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
  },
  // Background tints - Subtle warmth
  background: {
    primary: '#f8fafc',      // Main screen bg - very subtle blue-gray
    secondary: '#f0f9ff',    // Card bg - subtle blue tint
    tertiary: '#ecfdf5',     // Success/wellness areas
    elevated: '#ffffff',     // Cards, modals
  },
  // Text colors
  text: {
    primary: '#1c1917',      // Near black
    secondary: '#57534e',      // Warm gray
    tertiary: '#78716c',     // Lighter gray
    inverse: '#ffffff',      // White text
    muted: '#a8a29e',        // Placeholder text
  },
  // Borders and dividers
  border: {
    light: '#e7e5e4',
    default: '#d6d3d1',
    strong: '#a8a29e',
  },
} as const

// ============================================
// SPACING
// ============================================
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const

// ============================================
// BORDER RADIUS
// ============================================
export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
} as const

// ============================================
// SHADOWS
// ============================================
export const Shadows = {
  sm: {
    shadowColor: Colors.gray[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.gray[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: Colors.gray[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: Colors.gray[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
} as const

// ============================================
// GRADIENT PRESETS
// ============================================
export const Gradients = {
  // Main app background - subtle warm to cool
  background: {
    colors: ['#f8fafc', '#f0f9ff', '#f0fdf4'] as const,
    locations: [0, 0.5, 1] as const,
  },
  // Hero/Landing - Brand forward
  brand: {
    colors: ['#f0fdfa', '#ccfbf1', '#99f6e4'] as const,
    locations: [0, 0.5, 1] as const,
  },
  // Card elevation - subtle depth
  card: {
    colors: ['#ffffff', '#fafaf9'] as const,
    locations: [0, 1] as const,
  },
  // Success/Wellness
  wellness: {
    colors: ['#ecfdf5', '#d1fae5'] as const,
    locations: [0, 1] as const,
  },
  // Dark/Dramatic (for special cards)
  dark: {
    colors: ['#134e4a', '#115e59'] as const,
    locations: [0, 1] as const,
  },
} as const

// ============================================
// LAYOUT CONSTANTS
// ============================================
export const Layout = {
  maxWidth: 480,
  screenPadding: Spacing.lg,
  cardPadding: Spacing.lg,
  sectionGap: Spacing.xl,
  itemGap: Spacing.md,
} as const
