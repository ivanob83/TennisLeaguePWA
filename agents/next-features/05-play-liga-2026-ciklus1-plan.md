# Play Liga 2026 Ciklus 1 → regrupacija u 2 grupe

**Liga:** `Play Liga 2026 Ciklus 1` (Firestore id `trVUL2E5Ul5N2jxYMIVT`, status `draft`). Regrupišemo **istu ligu**.
**Standing:** zvanično `rankings.points` (množilac grupe A×1.0 / B×0.75 / C×0.5; groupWin=100, groupLoss=20).

Cilj: iz rostera izbaci ko nije igrao + odustali, dodaj Muza, podeli u **2 grupe po skoru**.

---

## ✅ Urađeno: approve pending mečeva

Bila 2 meča `pending_approval` (grupa B) — approveovana, `scheduledAt` postavljen na datum unosa skora (`submittedAt`, Europe/Belgrade):

| Meč | Rezultat | scheduledAt |
|---|---|---|
| `J0olM4i…` | D. Stamenovic def Mihajlo Jeremic 6-1 6-2 | 2026-06-25T21:52 |
| `vR08uB4…` | Mirko def Janko Djuric 6-2 1-6 12-10 | 2026-07-05T10:06 |

Rankings preračunat. Promene: Mirko 450→**525**, D. Stamenovic 315→**390**, Janko Djuric 120→**135**, Mihajlo Jeremic 45→**60**.

Ostali mečevi: 40 finished, 3 scheduled, 65 not_scheduled, **0 pending_approval**.

---

## Postojeći standing (26)

| # | Igrač | Grupa | P | W | L | Pts | |
|---|---|---|---|---|---|---|---|
| 1 | Nikola Samardzic | A | 7 | 6 | 1 | **620** | |
| 2 | Mirko | B | 7 | 7 | 0 | **525** | |
| 3 | D. Stamenovic | B | 6 | 5 | 1 | **390** | |
| 4 | Nenad Jankovic | A | 4 | 3 | 1 | **320** | |
| 5 | Aleksandar Jovanovic | A | 3 | 3 | 0 | **300** | |
| 6 | Ivan Blagojevic | A | 6 | 2 | 4 | **280** | |
| 7 | Marko Obrenovic | B | 5 | 3 | 2 | **255** | |
| 8 | Ivan Suvacarevic | A | 3 | 2 | 1 | **220** | |
| 9 | Miljan Milenkovic | A | 3 | 2 | 1 | **220** | |
| 10 | Janko Djuric | B | 5 | 1 | 4 | **135** | |
| 11 | Nikola Jeremic | B | 5 | 1 | 4 | **135** | |
| 12 | Milos | C | 3 | 2 | 1 | **110** | |
| 13 | Goran | C | 2 | 2 | 0 | **100** | |
| 14 | Bojan Cicic | A | 5 | 0 | 5 | **100** | |
| 15 | Alek (Aleksa Vranić) | B | 2 | 1 | 1 | 90 | ❌ odustao |
| 16 | Ivan Obradovic | A | 4 | 0 | 4 | **80** | |
| 17 | Mihajlo Jeremic | B | 4 | 0 | 4 | **60** | |
| 18 | Pedja Standard | B | 2 | 0 | 2 | **30** | |
| 19 | Milan Srejovic (Sreja) | A | 1 | 0 | 1 | 20 | ❌ odustao |
| 20 | Sasa Markovic | C | 1 | 0 | 1 | 10 | ❌ odustao |
| 21 | Miroslav Simovic | C | 1 | 0 | 1 | **10** | |
| 22 | Bojan Milinkovic | C | 1 | 0 | 1 | **10** | |
| 23 | Nenad | C | 0 | 0 | 0 | 0 | ❌ 0 mečeva |
| 24 | Nenad Spasic | B | 0 | 0 | 0 | 0 | ❌ 0 mečeva |
| 25 | Nikola 3M | C | 0 | 0 | 0 | 0 | ❌ 0 mečeva |
| 26 | Marko Cvetkovski | – | 0 | 0 | 0 | 0 | ❌ nije u ciklusu |

---

## Izbačeni (7)

- **0 mečeva / nije u ciklusu:** Nenad, Nenad Spasic, Nikola 3M, Marko Cvetkovski
- **Odustali:** Alek (Aleksa Vranić), Milan Srejović (Sreja), Saša Marković

> ✅ **Aleksandar Jovanović OSTAJE** — nije "Alek". Alek = Aleksa Vranić.

---

## Finalni roster (20)

19 preostalih + **Muza** (novi).

## Podela u 2 grupe

Ručna korekcija: **Muza → Grupa 1**, **Nikola Jeremic → Grupa 2** (Janko Djuric i N. Jeremic izjednačeni 135; oba u Grupi 2).

### Grupa 1 — jači (10)

| # | Igrač | Pts |
|---|---|---|
| 1 | Nikola Samardzic | 620 |
| 2 | Mirko | 525 |
| 3 | D. Stamenovic | 390 |
| 4 | Nenad Jankovic | 320 |
| 5 | Aleksandar Jovanovic | 300 |
| 6 | Ivan Blagojevic | 280 |
| 7 | Marko Obrenovic | 255 |
| 8 | Ivan Suvacarevic | 220 |
| 9 | Miljan Milenkovic | 220 |
| 10 | **Muza** | — (novi) |

### Grupa 2 — slabiji (10)

| # | Igrač | Pts |
|---|---|---|
| 1 | Janko Djuric | 135 |
| 2 | Nikola Jeremic | 135 |
| 3 | Milos | 110 |
| 4 | Goran | 100 |
| 5 | Bojan Cicic | 100 |
| 6 | Ivan Obradovic | 80 |
| 7 | Mihajlo Jeremic | 60 |
| 8 | Pedja Standard | 30 |
| 9 | Miroslav Simovic | 10 |
| 10 | Bojan Milinkovic | 10 |

---

## Beleške za implementaciju

- **Ništa se ne briše.** Izvorni draft `trVUL2E5Ul5N2jxYMIVT` ostaje netaknut (služi samo kao izvor standinga).
- Pravi se **NOVA liga** `Play Liga 2026 Ciklus 2` sa 2 grupe (10+10), prazan raspored round-robin.
- Množioci: **Grupa 1 ×1.0, Grupa 2 ×0.75**.
- Enroll 20 finalnih igrača; grupe kao gore.
- Sezona: **ista** (`uxkuM19mhlOTRTNooHck`).

**Sve odlučeno:**
- [x] Ime nove lige: `Play Liga 2026 Ciklus 2`
- [x] Množioci grupa: ×1.0 / ×0.75
- [x] Sezona — ista (`uxkuM19mhlOTRTNooHck`)

## ✅ Implementacija

Seed stranica (kao ostale), pattern iz `SeedPlayLiga2025CiklusX`:
- `app/src/features/admin/pages/SeedPlayLiga2026Ciklus2Page.jsx` — kreira ligu, 2 grupe (10+10), 45+45 mečeva `not_scheduled`, rankings init na 0. Ciklus 1 se NE dira.
- Ruta `/admin/seed/play-liga-2026-ciklus2` u `app/src/app.jsx`.
- Kartica u `AdminSeedsPage.jsx`.
- playerId-evi hardkodovani (tačni docs iz Ciklusa 1 enrollmenta; Muza `hYKxIwmIHVaB6stuDy45`).
- Liga status: `active`. Round status: `scheduled`. Mečevi: `not_scheduled`, bez skorova.

**Pokretanje:** Admin → Seeds → "Play Liga 2026 — Ciklus 2" → Run (superadmin). Nije još pokrenuto.
- [x] Cvetkovski izbačen (nije u ciklusu)
- [x] Muza → Grupa 1; Nikola Jeremic → Grupa 2
- [x] Pending mečevi approveovani + scheduledAt
