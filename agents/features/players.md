---
feature: players
routes:
  - path: /players
    component: PlayersPage
  - path: /players/create
    component: PlayerCreatePage
  - path: /players/:playerId
    component: PlayerDetailPage
  - path: /players/:playerId/edit
    component: PlayerEditPage
  - path: /players/connection-requests
    component: PlayerConnectionRequestsPage
access:
  read: authenticated
  create/edit: editor+
  delete: editor+
  connection-requests: editor+ (admin strana) i player (self-service iz ProfilePage)
collections:
  - players
  - connectionRequests
---

CRUD igrača i upravljanje vezom između igrača (player doc) i Firebase Auth naloga. Igrač može postojati bez naloga; veza se uspostavlja kroz `connectionRequests`.

## PlayersPage — `/players`

**Firestore (one-time fetch u useEffect):**

- `playersRepository.getAll()` — sve, sortirano po imenu (client-side)

**UI:** Tabela sa avatar, imenom, "linked" badge (ako `player.authUid` postoji). Editor vidi edit/delete akcije.

**Delete:** `playersRepository.delete(playerId)` uz ConfirmDialog. Lokalni state se ažurira nakon brisanja (ne reload).

---

## PlayerCreatePage — `/players/create`

**Access:** editor+

**Upload avatara:**

- Koristi `AvatarUpload` komponentu
- Generiše `tempId = tmp_{uid}_{timestamp}` pre kreiranje (jer playerId još ne postoji)
- `uploadPlayerAvatar(tempId, imageSrc, croppedAreaPixels)` → vraća `avatarUrls` (objekat sa URL-ovima za različite veličine)

**Firestore:**

- `playersRepository.create({ name, avatarUrls, authUid: null, createdBy: user.uid })`
- Timeout pattern: ako Firestore ack kasni >2.5s, unblocks UX i prikazuje info toast

**Nakon submit:** redirect na `/players`

---

## PlayerDetailPage — `/players/:playerId`

**Firestore:**

- `players/{playerId}` — real-time doc

**UI:** Avatar, ime, email, "Linked user" / "No account linked" badge. Placeholder sekcije za "Season stats" i "Competition history" (nisu implementirane — prikazuju `—`). Editor vidi "Edit" dugme.

---

## PlayerEditPage — `/players/:playerId/edit`

**Firestore (one-time fetch):**

- `playersRepository.getById(playerId)` — initial load forme

**Firestore (write):**

- `playersRepository.update(playerId, { name, avatarUrls })`
- `uploadPlayerAvatar(playerId, ...)` za promenu avatara

**Forma:** Samo `name` i avatar. `authUid` se ne menja ovde (ide kroz connection request flow).

---

## PlayerConnectionRequestsPage — `/players/connection-requests`

**Access:** editor+

**Svrha:** Admin odobrava ili odbija zahteve igrača koji žele da povežu svoj Auth nalog sa player profilom. Ili admin može direktno linkovati.

**Firestore (one-time fetch):**

- `connectionRequestsRepository.getAll()` — svi zahtevi, sortirani po `createdAt` desc
- `playersRepository.query([where('authUid', '==', null)])` — nelinkovani igrači (za direct link formu)

**Approve zahteva:**

- `playersRepository.update(request.playerId, { authUid: request.userId })`
- `connectionRequestsRepository.update(request.id, { status: 'approved', resolvedAt, resolvedBy })`

**Reject zahteva:**

- `connectionRequestsRepository.update(request.id, { status: 'rejected', resolvedAt, resolvedBy })`

**Direct link (admin-initiated):**

- Forma: select unlinked player + unos Firebase UID + opcioni email
- `playersRepository.update(playerId, { authUid: userId })`
- `connectionRequestsRepository.create({ ..., status: 'approved', resolvedAt, resolvedBy })` — za audit trail

**Request statusi:** `pending | approved | rejected`

---

## Firestore kolekcije

| Kolekcija            | Pristup           | Napomena                     |
| -------------------- | ----------------- | ---------------------------- |
| `players`            | read/write/delete | playersRepository            |
| `connectionRequests` | read/write        | connectionRequestsRepository |

**Player dokument:**

```js
{ name, avatarUrls, avatarUrl (legacy), authUid (null | Firebase UID), email, createdBy, createdAt, updatedAt }
```

**ConnectionRequest dokument:**

```js
{
  ;(playerId, playerName, userId, userEmail, userName, status, createdAt, resolvedAt, resolvedBy)
}
```
