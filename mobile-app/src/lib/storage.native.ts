import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite'

type SQLiteDb = {
  execAsync: (sql: string) => Promise<void>
  runAsync: (sql: string, params?: unknown[]) => Promise<unknown>
  getFirstAsync: <T>(sql: string, params?: unknown[]) => Promise<T | null>
  getAllAsync: <T>(sql: string, params?: unknown[]) => Promise<T[]>
}

let dbPromise: Promise<SQLiteDb> | null = null

async function getDb() {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync('ayushman_mobile.db') as unknown as Promise<SQLiteDb>
  }
  const db = await dbPromise
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);'
  )
  return db
}

export async function storageSetJson<T>(key: string, value: T) {
  const db = await getDb()
  await db.runAsync('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)', [
    key,
    JSON.stringify(value),
  ])
}

export async function storageGetJson<T>(key: string): Promise<T | null> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM kv_store WHERE key = ?',
    [key]
  )
  if (!row?.value) return null
  try {
    return JSON.parse(row.value) as T
  } catch {
    return null
  }
}

export async function storageRemove(key: string) {
  const db = await getDb()
  await db.runAsync('DELETE FROM kv_store WHERE key = ?', [key])
}

export async function storageListByPrefix<T>(prefix: string): Promise<Array<{ key: string; value: T }>> {
  const db = await getDb()
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM kv_store WHERE key LIKE ?',
    [`${prefix}%`]
  )
  return rows
    .map((row) => {
      try {
        return { key: row.key, value: JSON.parse(row.value) as T }
      } catch {
        return null
      }
    })
    .filter((item): item is { key: string; value: T } => !!item)
}

export async function storageClearAll() {
  const db = await getDb()
  await db.execAsync('DELETE FROM kv_store;')
}
