import AsyncStorage from '@react-native-async-storage/async-storage'

export async function storageSetJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value))
}

export async function storageGetJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function storageRemove(key: string) {
  await AsyncStorage.removeItem(key)
}

export async function storageListByPrefix<T>(prefix: string): Promise<Array<{ key: string; value: T }>> {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix))
  const values = await Promise.all(
    keys.map(async (key) => [key, await AsyncStorage.getItem(key)] as const)
  )
  return values
    .map(([key, value]: readonly [string, string | null]) => {
      if (!value) return null
      try {
        return { key, value: JSON.parse(value) as T }
      } catch {
        return null
      }
    })
    .filter((item): item is { key: string; value: T } => !!item)
}

export async function storageClearAll() {
  await AsyncStorage.clear()
}
