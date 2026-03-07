import * as Haptics from 'expo-haptics'

export const HapticFeedback = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  soft: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),
  rigid: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  selection: () => Haptics.selectionAsync(),
}

export const Feedback = {
  buttonPress: () => HapticFeedback.light(),
  medicineTaken: () => HapticFeedback.success(),
  reminderAdded: () => HapticFeedback.medium(),
  reminderSnoozed: () => HapticFeedback.light(),
  saved: () => HapticFeedback.success(),
  deleted: () => HapticFeedback.warning(),
  achievement: () => {
    HapticFeedback.heavy()
    setTimeout(() => HapticFeedback.medium(), 150)
  },
  error: () => HapticFeedback.error(),
  toggle: () => HapticFeedback.soft(),
  longPress: () => HapticFeedback.medium(),
  tabSwitch: () => HapticFeedback.selection(),
}
