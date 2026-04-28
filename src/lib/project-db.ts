import type { Annotation } from '@/types/annotations'

const DB_NAME = 'pdf-editor-projects'
const DB_VERSION = 1
const STORE_NAME = 'projects'

export interface ProjectRecord {
  id: string
  name: string
  pdfBytes: Uint8Array
  annotations: Record<number, Annotation[]>
  currentPage: number
  totalPages: number
  updatedAt: number  // timestamp
  thumbnail?: string  // base64 data URL
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const MAX_PROJECTS = 5

export async function saveProject(project: ProjectRecord): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(project)
    // After put, enforce max projects limit by deleting oldest
    const getAllReq = store.getAll()
    getAllReq.onsuccess = () => {
      const all = (getAllReq.result as ProjectRecord[]).sort((a, b) => b.updatedAt - a.updatedAt)
      if (all.length > MAX_PROJECTS) {
        for (const p of all.slice(MAX_PROJECTS)) {
          store.delete(p.id)
        }
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadProject(id: string): Promise<ProjectRecord | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => {
      const projects = request.result as ProjectRecord[]
      projects.sort((a, b) => b.updatedAt - a.updatedAt)
      resolve(projects.slice(0, MAX_PROJECTS))
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
