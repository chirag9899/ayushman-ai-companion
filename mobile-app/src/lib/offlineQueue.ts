import AsyncStorage from '@react-native-async-storage/async-storage'

type QueueRequest = {
  url: string
  method: 'POST' | 'PUT' | 'DELETE'
  body: unknown
}

const queueKey = 'offline-request-queue'

async function getQueue() {
  const raw = await AsyncStorage.getItem(queueKey)
  if (!raw) return [] as QueueRequest[]
  try {
    return JSON.parse(raw) as QueueRequest[]
  } catch {
    return []
  }
}

async function setQueue(value: QueueRequest[]) {
  await AsyncStorage.setItem(queueKey, JSON.stringify(value))
}

export async function enqueueRequest(url: string, method: QueueRequest['method'], body: unknown) {
  const queue = await getQueue()
  queue.push({ url, method, body })
  await setQueue(queue)
}

export async function getQueueLength() {
  const queue = await getQueue()
  return queue.length
}

export async function flushQueuedRequests() {
  const queue = await getQueue()
  if (queue.length === 0) {
    return {
      processed: 0,
      failed: 0,
    }
  }

  const remaining: QueueRequest[] = []
  let processed = 0
  let failed = 0

  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.body),
      })
      if (!response.ok) {
        remaining.push(item)
        failed += 1
        continue
      }
      processed += 1
    } catch {
      remaining.push(item)
      failed += 1
    }
  }

  await setQueue(remaining)
  return { processed, failed }
}

export async function clearQueue() {
  await AsyncStorage.removeItem(queueKey)
}
