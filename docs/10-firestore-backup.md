# Firestore backup & restore

Custom JSON dump kroz Firebase Admin SDK. Ne koristi gcloud / native Firestore export (radi i bez `gcloud` CLI-ja, ne traži GCS bucket).

## Setup (jednom)

1. Firebase Console → Project Settings → Service accounts → **Generate new private key**.
2. Sačuvaj kao `serviceAccountKey.json` u root projekta. (Već u `.gitignore`.)
3. Backupi se pišu u `backups/` (takođe gitignored).

Alternativa: `export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json` umesto fajla u rootu.

## Backup

```bash
npm run backup
```

Šta radi:

- Listuje sve top-level kolekcije.
- Rekurzivno spušta sve dokumente + sve subkolekcije.
- Serijalizuje `Timestamp`, `GeoPoint`, `DocumentReference` u prepoznatljive `__type` markere.
- Piše u `backups/backup-YYYY-MM-DDTHH-MM-SS.json`.

Output primer:

```
Dumping /leagues ... 12 docs
Dumping /players ... 84 docs
...
Done. 412 docs total → backups/backup-2026-05-04T11-32-17-701.json
```

### Rotacija

Ručna. Backup fajlovi se gomilaju u `backups/`. Obriši stare fajlove kad treba:

```bash
ls -t backups/*.json | tail -n +6 | xargs rm   # zadrži poslednjih 5
```

## Restore

```bash
# preview (ne dira Firestore)
npm run restore -- backups/backup-2026-05-04T11-32-17-701.json --dry-run

# pun restore (traži potvrdu)
npm run restore -- backups/backup-2026-05-04T11-32-17-701.json

# restore samo jedne root kolekcije
npm run restore -- backups/<file>.json --collection leagues

# restore jednog dokumenta + svih subkolekcija
npm run restore -- backups/<file>.json --doc leagues/play-liga-2026-c1

# bez interaktivne potvrde
npm run restore -- backups/<file>.json --yes
```

### Šta restore RADI

- `set()` na svaki put → **overwrite** postojećeg dokumenta na istoj putanji.
- Rekurzivno restore-uje subkolekcije.
- Vraća `Timestamp`/`GeoPoint`/`DocumentReference` iz `__type` markera u native Firestore tipove.

### Šta restore NE RADI

- **Ne briše** dokumente koji postoje u Firestore-u a nisu u dump-u. Restore je merge-style overwrite, ne mirror.
- Ne dira Auth users, Storage fajlove, Security Rules. Samo Firestore podaci.
- Nema atomičnost preko cele restore operacije. Ako padne u sredini, parcijalan restore — ponovi.

### Selektivni rollback (npr. samo lige)

```bash
# 1. preview
npm run restore -- backups/backup-...json --collection leagues --dry-run

# 2. pun restore samo /leagues + subkolekcija (enrollments, groups, rounds, rankings)
npm run restore -- backups/backup-...json --collection leagues
```

Subkolekcije se nose **automatski** sa root dokumentom (ugnježdene su u dump fajlu pod `subcollections`). Nema potrebe da listaš `enrollments`/`groups`/`rounds`/`rankings` posebno.

### Ručna inspekcija pre restore-a

Backup je čitljiv JSON:

```bash
jq '.collections.leagues[] | {id, playersPerGroup: .data.playersPerGroup}' backups/backup-...json
```

## Use case: pre destruktivne migracije

Pre svake migracije koja briše/menja Firestore podatke:

1. `npm run backup`
2. Zabeleži ime fajla.
3. Pokreni migraciju.
4. Ako pukne: `npm run restore -- backups/<file>.json --collection <affected>`

## Troubleshooting

**"No credentials"** → `serviceAccountKey.json` ne postoji u rootu, ili `GOOGLE_APPLICATION_CREDENTIALS` ne pokazuje na validan ključ.

**"Permission denied"** → service account nema role. Treba `roles/datastore.user` (čitanje + pisanje Firestore-a). Dodaj u IAM Console.

**Spor backup** → script čita sve kolekcije sekvencijalno. Za velike baze (>10k docs) može trajati par minuta. Nema retry/parallelizam u trenutnoj verziji.
