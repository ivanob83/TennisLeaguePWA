---
feature: seasons
routes:
  - path: /seasons
    component: SeasonsPage
  - path: /seasons/create
    component: SeasonCreatePage
  - path: /seasons/:seasonId/edit
    component: SeasonEditPage
access:
  read: authenticated (SeasonsPage nema ProtectedRoute ali pretpostavlja auth)
  create/edit: editor+
  delete: superadmin
collections:
  - seasons
---

CRUD sezona. Sezona je kontejner za lige i turnire. Mora se kreirati pre nego što se kreira liga ili turnir.

## SeasonsPage — `/seasons`

**Firestore (real-time):**
- `seasons` — `orderBy('startDate', 'desc')`

**UI:** Grid kartica; svaka prikazuje naziv i opseg datuma. Editor vidi edit ikonu, superadmin vidi delete ikonu.

**Delete:** `seasonsRepository.delete(id)` + ConfirmDialog. Napomena: brisanje sezone ne briše automatski lige/turnire koji je referenciraju.

---

## SeasonCreatePage — `/seasons/create`

**Access:** editor+

**Firestore:**
- `seasonsRepository.create({ name, startDate, endDate, createdBy: user.uid, status: 'active' })`
- Timeout pattern (2.5s): ako Firestore kasni, UI se deblokira sa info toast

**Validacija:** name required; startDate required; endDate required; endDate mora biti posle startDate.

**Datumi:** čuvaju se kao ISO string (`YYYY-MM-DD`), ne kao Timestamp.

**Nakon submit:** redirect na `/seasons`

---

## SeasonEditPage — `/seasons/:seasonId/edit`

**Firestore:**
- `seasons/{seasonId}` — real-time doc (initial load forme)
- `seasonsRepository.update(seasonId, { name, startDate, endDate })` — write
- Timeout pattern (2.5s)

**Forma:** name, startDate, endDate — iste validacije kao create.

**Napomena:** `status` se ne menja kroz edit formu.

---

## Firestore kolekcije

| Kolekcija | Pristup | Napomena |
|---|---|---|
| `seasons` | read/write/delete | seasonsRepository |

**Seasons dokument:**
```js
{
  name: string,
  startDate: string (YYYY-MM-DD),
  endDate: string (YYYY-MM-DD),
  status: 'active',
  createdBy: uid,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```
