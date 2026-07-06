#!/usr/bin/env node
/**
 * Firestore restore — reads a JSON dump produced by backup-firestore.js and
 * writes documents back into Firestore.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *     node scripts/restore-firestore.js backups/backup-YYYY-MM-DDTHH-MM-SS.json
 *   npm run restore -- backups/backup-YYYY-MM-DDTHH-MM-SS.json
 *
 * Flags:
 *   --collection <name>      Restore only the named root collection (repeatable).
 *   --doc <collection/id>    Restore a single root document (and its subcollections).
 *   --dry-run                Print what would be written; do not call Firestore.
 *   --yes                    Skip confirmation prompt.
 *
 * WARNING: Restore overwrites existing documents at the same paths. It does NOT
 * delete documents that exist in Firestore but are missing from the dump.
 */

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp, GeoPoint } from 'firebase-admin/firestore'
import { readFileSync, existsSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const KEY_PATH = path.join(ROOT, 'serviceAccountKey.json')

function parseArgs(argv) {
  const args = { collections: [], docs: [], dryRun: false, yes: false, file: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--collection') args.collections.push(argv[++i])
    else if (a === '--doc') args.docs.push(argv[++i])
    else if (a === '--dry-run') args.dryRun = true
    else if (a === '--yes' || a === '-y') args.yes = true
    else if (!args.file && !a.startsWith('--')) args.file = a
  }
  return args
}

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

function deserializeValue(db, value) {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map((v) => deserializeValue(db, v))
  if (typeof value === 'object') {
    if (value.__type === 'timestamp') return Timestamp.fromDate(new Date(value.iso))
    if (value.__type === 'geopoint') return new GeoPoint(value.lat, value.lng)
    if (value.__type === 'docref') return db.doc(value.path)
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = deserializeValue(db, v)
    return out
  }
  return value
}

async function writeDocs(db, parentPath, docs, stats, dryRun) {
  for (const doc of docs) {
    const docPath = parentPath ? `${parentPath}/${doc.id}` : doc.id
    const data = deserializeValue(db, doc.data)
    if (dryRun) {
      console.log(`[dry-run] set ${docPath}`)
    } else {
      await db.doc(docPath).set(data)
    }
    stats.docs++
    if (doc.subcollections) {
      for (const [subName, subDocs] of Object.entries(doc.subcollections)) {
        await writeDocs(db, `${docPath}/${subName}`, subDocs, stats, dryRun)
      }
    }
  }
}

async function confirm(message) {
  const rl = createInterface({ input: stdin, output: stdout })
  const answer = await rl.question(`${message} [y/N] `)
  rl.close()
  return /^y(es)?$/i.test(answer.trim())
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.file) {
    console.error(
      'Usage: node scripts/restore-firestore.js <backup-file.json> [--collection X] [--doc col/id] [--dry-run] [--yes]',
    )
    process.exit(1)
  }
  const filePath = path.resolve(args.file)
  if (!existsSync(filePath)) {
    console.error(`Backup file not found: ${filePath}`)
    process.exit(1)
  }

  const backup = JSON.parse(readFileSync(filePath, 'utf8'))
  if (!backup.collections) {
    console.error('Invalid backup format: missing "collections" key.')
    process.exit(1)
  }

  initAdmin()
  const db = getFirestore()

  const collectionFilter = new Set(args.collections)
  const docFilter = args.docs.map((d) => {
    const [col, ...rest] = d.split('/')
    return { col, id: rest.join('/') }
  })

  const targets = []
  for (const [colName, docs] of Object.entries(backup.collections)) {
    if (collectionFilter.size && !collectionFilter.has(colName)) continue
    let chosen = docs
    if (docFilter.length) {
      const ids = docFilter.filter((d) => d.col === colName).map((d) => d.id)
      if (!ids.length) continue
      chosen = docs.filter((d) => ids.includes(d.id))
    }
    targets.push([colName, chosen])
  }

  if (!targets.length) {
    console.error('Nothing to restore (no matching collections/docs in backup).')
    process.exit(1)
  }

  const total = targets.reduce((acc, [, docs]) => acc + countDocs(docs), 0)
  console.log(`Restore plan from ${path.relative(ROOT, filePath)}:`)
  for (const [name, docs] of targets) console.log(`  /${name}: ${countDocs(docs)} docs`)
  console.log(`Total: ${total} docs. Mode: ${args.dryRun ? 'DRY-RUN' : 'WRITE'}.`)

  if (!args.dryRun && !args.yes) {
    const ok = await confirm('This will OVERWRITE existing documents at matching paths. Continue?')
    if (!ok) {
      console.log('Aborted.')
      process.exit(0)
    }
  }

  const stats = { docs: 0 }
  for (const [name, docs] of targets) {
    process.stdout.write(`Restoring /${name} ... `)
    await writeDocs(db, name, docs, stats, args.dryRun)
    console.log('ok')
  }

  console.log(`\nDone. ${stats.docs} docs ${args.dryRun ? 'would be written' : 'written'}.`)
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
