---
feature: news
routes:
  - path: /news
    component: NewsPage
  - path: /news/create
    component: NewsCreatePage
  - path: /news/:articleId
    component: NewsDetailPage
access:
  read: public
  create: editor+
  delete: editor+
collections:
  - news
---

Objavljivanje i pregled vesti/obaveštenja kluba. Nema edit stranice — articles se samo kreiraju i brišu.

## NewsPage — `/news`

**Firestore:**

- `news` — real-time kolekcija, `orderBy('createdAt', 'desc')`

**UI:** Lista kartica, svaka klikabilna → `/news/:articleId`. Prikazuje: naslov, prve dve linije sadržaja (line-clamp-2), datum, autor. Editor vidi dugme `New article`.

---

## NewsCreatePage — `/news/create`

**Access:** editor+. Ako nije editor — prikazuje error Alert (ne redirekuje).

**Firestore:**

- `news` — create (newsRepository.create)

**Payload:**

```js
{ title, content, authorId: user.uid, authorName: profile.displayName || user.email }
```

`createdAt`/`updatedAt` auto-dodaje repository.

**Validacija:** title required, content required.
**Nakon submit:** redirect na `/news`.

---

## NewsDetailPage — `/news/:articleId`

**Firestore:**

- `news/{articleId}` — real-time doc

**UI:** Prikazuje naslov, datum, autora i sadržaj (`whitespace-pre-wrap`). Editor vidi dugme "Delete".

**Delete:**

- `newsRepository.delete(articleId)` — direktno bez ConfirmDialog (koristi `window.confirm`)
- Nakon delete: redirect na `/news`

---

## Firestore kolekcije

| Kolekcija | Pristup           | Napomena       |
| --------- | ----------------- | -------------- |
| `news`    | read/write/delete | newsRepository |

**Firestore dokument struktura:**

```js
{
  title: string,
  content: string,
  authorId: string (uid),
  authorName: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```
