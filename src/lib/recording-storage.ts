export type SavedRecordingMetadata = {
  id: string
  title: string
  format: 'mp4' | 'webm'
  createdAt: number
  durationSeconds: number
}

export type StoredRecording = {
  metadata: SavedRecordingMetadata
  blob: Blob
}

type RecordingBlobRecord = { id: string; blob: Blob }

const DATABASE_NAME = 'tutorlive-recordings'
const DATABASE_VERSION = 1
const METADATA_STORE = 'recordings'
const BLOB_STORE = 'recording-blobs'

let databasePromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('This browser does not support local recording storage.'))
  }
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(METADATA_STORE)) {
        const metadataStore = database.createObjectStore(METADATA_STORE, { keyPath: 'id' })
        metadataStore.createIndex('createdAt', 'createdAt')
      }
      if (!database.objectStoreNames.contains(BLOB_STORE)) {
        database.createObjectStore(BLOB_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () => {
      databasePromise = null
      reject(request.error ?? new Error('Could not open local recording storage.'))
    }
    request.onblocked = () => {
      databasePromise = null
      reject(new Error('Local recording storage is busy in another tab. Close other TutorLive tabs and try again.'))
    }
  })

  return databasePromise
}

export async function listSavedRecordings(): Promise<SavedRecordingMetadata[]> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(METADATA_STORE, 'readonly')
    const request = transaction.objectStore(METADATA_STORE).getAll() as IDBRequest<SavedRecordingMetadata[]>
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt))
    request.onerror = () => reject(request.error ?? new Error('Could not list saved recordings.'))
  })
}

export async function saveRecording(recording: StoredRecording): Promise<void> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([METADATA_STORE, BLOB_STORE], 'readwrite')
    transaction.objectStore(METADATA_STORE).put(recording.metadata)
    transaction.objectStore(BLOB_STORE).put({ id: recording.metadata.id, blob: recording.blob } satisfies RecordingBlobRecord)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save this recording on the device.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Saving this recording was interrupted.'))
  })
}

export async function getSavedRecording(id: string): Promise<StoredRecording | null> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([METADATA_STORE, BLOB_STORE], 'readonly')
    const metadataRequest = transaction.objectStore(METADATA_STORE).get(id) as IDBRequest<SavedRecordingMetadata | undefined>
    const blobRequest = transaction.objectStore(BLOB_STORE).get(id) as IDBRequest<RecordingBlobRecord | undefined>
    transaction.oncomplete = () => {
      const metadata = metadataRequest.result
      const blob = blobRequest.result?.blob
      resolve(metadata && blob ? { metadata, blob } : null)
    }
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not open this saved recording.'))
  })
}

export async function deleteSavedRecording(id: string): Promise<void> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([METADATA_STORE, BLOB_STORE], 'readwrite')
    transaction.objectStore(METADATA_STORE).delete(id)
    transaction.objectStore(BLOB_STORE).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not delete this saved recording.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Deleting this recording was interrupted.'))
  })
}
