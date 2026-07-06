#!/usr/bin/env node
/**
 * Firestore backup — recursively dumps all collections + subcollections to JSON.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/backup-firestore.js
 *   npm run backup
 *
 * Output: backups/backup-YYYY-MM-DDTHH-MM-SS.json
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const KEY_PATH = path.join(ROOT, 'serviceAccountKey.json')
const OUT_DIR = path.join(ROOT, 'backups')

function initAdmin() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({ credential: applicationDefault() })
    return
  }
  if (existsSync(KEY_PATH)) {
    const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'))
    initializeApp({ credential: cert(key) })
    return
  }
  console.error(
    'No credentials. Set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccountKey.json in project root.',
  )
  process.exit(1)
}

function serializeValue(value) {
  if (value === null || value === undefined) return value
  if (value instanceof Timestamp) {
    return { __type: 'timestamp', iso: value.toDate().toISOString() }
  }
  if (value && typeof value.toDate === 'function' && value.seconds !== undefined) {
    return { __type: 'timestamp', iso: value.toDate().toISOString() }
  }
  if (value && value._latitude !== undefined && value._longitude !== undefined) {
    return { __type: 'geopoint', lat: value._latitude, lng: value._longitude }
  }
  if (value && value.path && typeof value.id === 'string' && typeof value.parent === 'object') {
    return { __type: 'docref', path: value.path }
  }
  if (Array.isArray(value)) return value.map(serializeValue)
  if (typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = serializeValue(v)
    return out
  }
  return value
}

async function dumpCollection(colRef) {
  const snap = await colRef.get()
  const docs = []
  for (const doc of snap.docs) {
    const data = serializeValue(doc.data())
    const subcols = await doc.ref.listCollections()
    const subcollections = {}
    for (const sub of subcols) {
      subcollections[sub.id] = await dumpCollection(sub)
    }
    docs.push({
      id: doc.id,
      data,
      ...(Object.keys(subcollections).length ? { subcollections } : {}),
    })
  }
  return docs
}

async function main() {
  initAdmin()
  const db = getFirestore()

  await mkdir(OUT_DIR, { recursive: true })

  const rootCols = await db.listCollections()
  const backup = { exportedAt: new Date().toISOString(), collections: {} }
  let totalDocs = 0

  for (const col of rootCols) {
    process.stdout.write(`Dumping /${col.id} ... `)
    const docs = await dumpCollection(col)
    backup.collections[col.id] = docs
    const count = countDocs(docs)
    totalDocs += count
    console.log(`${count} docs`)
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', '')
  const file = path.join(OUT_DIR, `backup-${stamp}.json`)
  await writeFile(file, JSON.stringify(backup, null, 2), 'utf8')
  console.log(`\nDone. ${totalDocs} docs total → ${path.relative(ROOT, file)}`)
}

function countDocs(docs) {
  let n = docs.length
  for (const d of docs) {
    if (d.subcollections) {
      for (const sub of Object.values(d.subcollections)) n += countDocs(sub)
    }
  }
  return n
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
