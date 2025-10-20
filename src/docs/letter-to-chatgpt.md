# EcoScan Rewards — Leaderboard, Monthly Bill (OCR) bonus flow, and Drink-based carbon factor — implementation plan & Firebase validation requests

Hello Firebase / Google Cloud team,

We’re expanding **EcoScan Rewards** with three production features and request your validation, quota guidance, and best-practice feedback. The features are:

1. **Leaderboard (monthly, region-scoped, anti-fraud aware)**
2. **Monthly Bill Verification** (electricity/water OCR, points, trend bonus)
3. **Drink Category** in daily **carbon footprint** calculator (diet + drink composition)

Below is our consolidated technical brief: data model, Cloud Functions, security, scheduling, and the concrete actions we request from your side.

---

## 0) Environment

* **Project:** EcoScan Rewards
* **Firebase Project ID:** `<PROJECT_ID>`
* **Stack:** Next.js 15 (App Router), React, TypeScript
* **Firebase:** Auth, Firestore (Native), Functions v2 (Node 18), Storage, Hosting
* **AI/OCR:** Google Cloud Vision API (OCR/labels) and Genkit flows (server)
* **Regions:** primary `europe-west4` (Functions/Hosting); OCR region per Vision defaults

---

## 1) Leaderboard (Monthly, Region-Scoped)

### 1.1 Goal

A monthly leaderboard that:

* Resets on the first day of each month
* Is **region-aware** (e.g., “Dubai Top 100”, “Istanbul Top 100”)
* Uses a **composite score** that blends points with sustainability behavior (not just raw points)
* Is resilient to fraud (duplicate images, unrealistic carbon values)

### 1.2 Data model (Firestore)

```
users/{uid}
  - displayName: string
  - region: "ae-dubai" | "tr-istanbul" | ...
  - totalPoints: number
  - carbon: { avgDailyKg: number, last30dSavingsRatio: number }
  - ...

leaderboards/monthly/{YYYY-MM}/entries/{uid}
  - displayName: string
  - region: string
  - totalPoints: number
  - ecoScore: number     // composite
  - rank: number         // optional denormalized
  - snapshotAt: timestamp
```

> We’ll build a composite **ecoScore** such as:
> `ecoScore = (totalPoints / 1000 * 0.5) + (carbonSavingsRatio * 50)`
> where `carbonSavingsRatio = clamp( (baselineKg - last30dAvgKg) / baselineKg , 0 , 1 )`.

### 1.3 Cloud Function (monthly rollup)

* **Scheduler:** `0 0 1 * *` (UTC)
* Reads all active users, computes ecoScore, writes to `leaderboards/monthly/{YYYY-MM}/entries` in batches.
* Optionally computes **top N** per region and stores in a cached doc for fast reads.

**Pseudocode (v2 Functions):**

```ts
export const rollupMonthlyLeaderboard = onSchedule("0 0 1 * *", async () => {
  const batch = db.batch();
  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,"0")}`;
  const snap = await db.collection("users").select("displayName","region","totalPoints","carbon").get();

  for (const doc of snap.docs) {
    const u = doc.data();
    const ratio = Math.max(0, Math.min(1, Number(u?.carbon?.last30dSavingsRatio || 0)));
    const ecoScore = (Number(u.totalPoints||0)/1000*0.5) + (ratio*50);
    const ref = db.doc(`leaderboards/monthly/${ym}/entries/${doc.id}`);
    batch.set(ref, {
      displayName: u.displayName || "User",
      region: u.region || "unknown",
      totalPoints: Number(u.totalPoints || 0),
      ecoScore: Number(ecoScore.toFixed(2)),
      snapshotAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  await batch.commit();
});
```

### 1.4 Security & Indexing

* **Reads:** public or authenticated (as per product), but write only via Functions SA.
* **Rules:** deny client writes to `leaderboards/**`.
* **Indexes:** composite for querying top by `region` ordered by `ecoScore` desc.

```rules
match /leaderboards/{period}/{ym}/entries/{uid} {
  allow read: if true;
  allow write: if false; // only backend
}
```

**Requested validation from Firebase**

* Confirm recommended **batch size** and best practice for writing thousands of entries monthly.
* Guidance for **denormalized rank** calculation (Cloud Functions side vs client sort).
* Quota advice if we compute region top lists (e.g., aggregation strategies).

---

## 2) Monthly Bill Verification (Electricity/Water OCR + Points)

### 2.1 Goal

Users submit **one electricity and one water bill per month**. We OCR the bill to extract date and consumption and award points based on trend vs previous month. Anti-fraud includes hashing, EXIF vs OCR validation, and dedupe.

### 2.2 Data model

```
users/{uid}/bills/{billId}
  - type: "electricity" | "water"
  - month: "YYYY-MM"
  - consumption: number       // kWh or m³
  - previousMonth: number     // last known
  - deltaPercent: number
  - bonusPoints: number
  - status: "approved" | "pending" | "rejected" | "duplicate"
  - provider: string
  - ocrConfidence: number
  - imageHash: string
  - createdAt, processedAt
```

### 2.3 Upload & OCR flow

1. Client captures bill photo (camera-only, gallery disabled UI) and uploads to **Storage**
2. `onFinalize` triggers Cloud Function `processBillImage`
3. Function:

   * Downloads, computes **SHA-256** and **pHash**
   * Runs **Vision OCR** to extract:

     * `provider` (electricity/water keyword match)
     * `statementDate` → derive `month`
     * `consumption` (kWh or m³)
   * Dedupe: same user + same month + same type + same hash → `duplicate` → **-50 pts** penalty (optional policy)
   * Reads previous month bill to compute `deltaPercent`
   * Computes bonus:

     * decrease > 5% → **+75**
     * within ±5% → **+50**
     * increase → **+25** (honesty bonus)
   * Writes doc and updates user’s points in a **transaction**

**Pseudocode extract:**

```ts
const bonus = delta <= -0.05 ? 75 : (Math.abs(delta) <= 0.05 ? 50 : 25);
await db.runTransaction(async tx => {
  tx.set(billRef, { ...fields, bonusPoints: bonus, status: "approved" });
  tx.update(userRef, { totalPoints: FieldValue.increment(bonus) });
});
```

### 2.4 Anti-fraud & validation

* **Duplicate**: same SHA-256 → reject/penalize
* **Temporal check**: OCR date vs EXIF vs server time (drift > 7 days → `pending/reject`)
* **Provider filter**: must match electricity/water providers dictionary
* **One bill per type per month** enforced by query or unique key (`users/{uid}/bills/{type}-{YYYY-MM}`)

### 2.5 Security Rules (excerpt)

```rules
match /users/{uid}/bills/{billId} {
  allow read: if request.auth != null && request.auth.uid == uid;
  allow create: if request.auth != null && request.auth.uid == uid
                && request.resource.data.keys().hasOnly(["type","imagePath","createdAt"]);
  allow update, delete: if false; // backend only
}
```

**Requested validation from Firebase**

* Confirm Vision OCR quotas and pricing estimates for **monthly spikes** (billing cycles).
* Recommended pattern to **auto-delete raw images** in 24h via **lifecycle** or scheduled Function.
* Best practice for **dictionary/regex** provider matching with multilingual bills (ar/tr/en).
* Guidance on **atomic uniqueness** for “one bill per month per type” (document ID strategy vs transaction guard).

---

## 3) Drink Category (Diet + Drink in Carbon Footprint)

### 3.1 Goal

Improve daily carbon model by adding a **drink** dimension (production + packaging impact). Options (example):

* `drink_coffee_milk` — Coffee or milk-based drinks (~2.0 kg)
* `drink_bottled` — Bottled water/soda/juice (~1.5 kg)
* `drink_alcohol` — Alcoholic drinks (~2.5 kg)
* `drink_plant_based` — Plant-based / homemade (~0.5 kg)
* `drink_water_tea` — Tap water / tea / herbal tea (~0.2 kg)

### 3.2 Back-end composition

```ts
const DIET_KG = {
  red_meat_heavy: 20,
  white_fish: 8,
  vegetarian_vegan: 5,
  carb_based: 10
};
const DRINK_KG = {
  drink_coffee_milk: 2.0,
  drink_bottled: 1.5,
  drink_alcohol: 2.5,
  drink_plant_based: 0.5,
  drink_water_tea: 0.2
};

export function calcDailyDietDrinkKg(dietKey: keyof typeof DIET_KG, drinkKey: keyof typeof DRINK_KG) {
  return DIET_KG[dietKey] + DRINK_KG[drinkKey];
}
```

* We integrate this into the existing **region-aware** calculator (min/avg/max clamp) to produce `estimatedFootprintKg`.
* All outputs are **rounded to one decimal** for determinism.

### 3.3 i18n

Add keys in `locales/ar.json`, `ja.json`, `tr.json`, etc.
Ensure AI analysis text also reflects the chosen drink category (language enforced via `"language"` param).

**Requested validation from Firebase**

* No special quotas needed, but please confirm **Genkit** guidance for ensuring the model includes the `drink` factor when composing analysis (system prompt structure, determinism).

---

## 4) End-to-End Security & Rules Summary

* **Client cannot alter points directly.** All point grants/deductions only via Cloud Functions transactions.
* **Images**: read/write by owner; processing fields updated only by backend SA.
* **Leaderboards**: read-only to clients, write-only by backend.
* **Bills**: one per type per month enforced. Duplicate hashes penalized.
* **Translations**: string-only; no JSX/functions in Firestore.

---

## 5) Hosting & Caching (short)

* `Vary: Accept-Language` for localized content
* Cache static assets immutable; locale JSON TTL 1h
* Optional: cache **leaderboard top lists** via a denormalized doc for fast reads

---

## 6) Actions we request from Firebase/GCP

| # | Request                                                                                             | Reason                                   | Priority |
| - | --------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------- |
| 1 | Validate Firestore schema & Rules for **leaderboards monthly writes** and region-scoped queries     | Prevent hot-spotting & ensure safe reads | High     |
| 2 | Confirm Cloud Functions **scheduler & batch** best practices for monthly rollup                     | Reliability at scale                     | High     |
| 3 | Approve **Vision OCR quota** for monthly bill spikes and share cost guidance                        | Predictable billing                      | High     |
| 4 | Advise on **unique-per-month** pattern for bills (`type-YYYY-MM` doc IDs vs transaction guard)      | Data integrity                           | High     |
| 5 | Review **anti-fraud** hashing and dedupe (SHA-256 + pHash) and provide any recommended improvements | Abuse prevention                         | Medium   |
| 6 | Confirm Genkit guidance for **deterministic analysis** and for including `drink` factor explicitly  | Consistency                              | Medium   |
| 7 | Share best practice for **caching leaderboard snapshots** (top N per region)                        | Performance                              | Medium   |

---

## 7) Appendices

### 7.1 Example Firestore composite indexes

* `leaderboards/monthly/{YYYY-MM}/entries` order by `region` asc, `ecoScore` desc
* `users/{uid}/bills` where `type` equals, `month` equals (for uniqueness checks)

### 7.2 Sample client strings (TR/AR/EN excerpts)

* TR: “**Elektrik Faturanı Onayla** — Bu ay: {kwh} kWh • Geçen ay: {prev} kWh”
* AR: “**تحقق من فاتورة الكهرباء** — هذا الشهر: {kwh} ك.و.س • الشهر الماضي: {prev} ك.و.س”
* EN: “**Verify Electricity Bill** — This month: {kwh} kWh • Last month: {prev} kWh”

---

We are ready to proceed and can share a staging environment for joint QA.
Thank you for reviewing our implementation plan and for your guidance on quotas, rules, and best practices.

Best regards,
**EcoScan Technical & Product Team**
`<NAME>` — `<email@domain.com>` — `+90-5xx-xxx-xxxx`
Firebase Project ID: `<PROJECT_ID>`

    