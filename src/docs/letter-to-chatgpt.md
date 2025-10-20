# Subject: EcoScan Rewards — Region-aware points mapping bug, provisional vs. 500% receipt bonus math, and leaderboard consistency

Hello Firebase / Google Cloud team,

We’ve fixed the model endpoint/config issues, but we’re now facing **points-calculation defects** that are causing severe user-facing inconsistencies:

1. **Region-based points mapping is not applied (or applied incorrectly).**
   In Kuwait, a 75 kg CO₂/day result (clearly in the red band) yields **only +2 points** without receipt. That contradicts our published region benchmarks and expected monotonic mapping.

2. **Provisional vs. Receipt Bonus (500%) is compounded incorrectly.**
   The code appears to apply the **500% bonus on the provisional points** or on a partially scaled value, instead of replacing the provisional grant with `basePoints * 5`. Users see tiny provisional points and nonsensical final totals.

3. **Leaderboard counts provisional/invalid points.**
   Some runs show provisional points leaking into monthly totals used by the leaderboard. Only final, confirmed points should be included.

Below are the **expected behaviors**, **reference implementations**, and **requests** for your validation and guidance.

---

## 1) Region-aware, deterministic points mapping

### 1.1 Region benchmarks (recap)

| Region      | Min | Avg | Max | Unit       |
| ----------- | --- | --- | --- | ---------- |
| Turkey      | 5   | 10  | 25  | kg CO₂/day |
| Europe      | 8   | 20  | 40  | kg CO₂/day |
| USA         | 15  | 40  | 60  | kg CO₂/day |
| UAE (Dubai) | 20  | 50  | 70  | kg CO₂/day |
| Kuwait      | 25  | 65  | 85  | kg CO₂/day |

### 1.2 Expected map (piecewise linear, monotonic)

* At `min` → **30 points**
* At `avg` → **15 points**
* At `max` → **0 points**
* Above `max` → apply penalty (we clamp to `max`, so penalty should not trigger here)
* Round once at the end

**Reference TypeScript:**

```ts
type RegionKey = "turkey"|"europe"|"usa"|"uae"|"kuwait";

const REGION = {
  turkey: { min: 5,  avg: 10, max: 25 },
  europe: { min: 8,  avg: 20, max: 40 },
  usa:    { min: 15, avg: 40, max: 60 },
  uae:    { min: 20, avg: 50, max: 70 },
  kuwait: { min: 25, avg: 65, max: 85 }
} as const;

export function pointsFromKgRegionAware(kg: number, region: RegionKey): number {
  const { min, avg, max } = REGION[region];
  const clamped = Math.max(min, Math.min(kg, max));

  if (clamped <= min) return 30;            // best
  if (clamped >= max) return 0;             // worst

  if (clamped <= avg) {                      // min..avg -> 30..15
    const t = (clamped - min) / (avg - min);
    return Math.round(30 - 15 * t);
  } else {                                   // avg..max -> 15..0
    const t = (clamped - avg) / (max - avg);
    return Math.round(15 - 15 * t);
  }
}
```

**Validation example (Kuwait):**

* 25 kg → 30 pts
* 65 kg → 15 pts
* **75 kg → ~8 pts**
  Şu an kullanıcılar 75 kg’da **2 puan** görüyor; bu, map’in uygulanmadığını (ya da global/yanlış bandı kullandığını) gösterir.

---

## 2) Provisional vs. Receipt 500% Bonus — correct math

### 2.1 Expected logic

* Compute **basePoints** from region-aware map.
* **Provisional** without receipt: `provisional = floor(basePoints * 0.10)`
* **Receipt validated (500% bonus):** Replace provisional with `final = basePoints * 5`.

  * Not additive over provisional.
  * Not applied on already damped values.
  * Provisional must be **reverted** in a transaction, then final written.

**Reference TypeScript:**

```ts
export function computeProvisional(basePoints: number) {
  return Math.floor(basePoints * 0.10);
}

export function finalizeWithReceipt(basePoints: number) {
  return basePoints * 5; // 500% of base, replaces provisional
}
```

**Server transaction sketch (Firestore):**

```ts
await db.runTransaction(async tx => {
  const userDoc = await tx.get(userRef);
  const current = Number(userDoc.data()?.totalPoints || 0);

  // revert provisional if exists
  if (provisionalGranted) {
    tx.update(userRef, { totalPoints: current - provisionalGranted });
  }

  // grant final
  tx.update(userRef, { totalPoints: FieldValue.increment(finalizeWithReceipt(basePoints)) });
});
```

**Bug we observe now:** 500% bonus seems to be applied on the **provisional** or on a pre-clamped value, leading to absurdly low totals like **2 → 10**, when it should be **~8 → 40** in the Kuwait 75 kg example.

---

## 3) Leaderboard consistency

### 3.1 Rules

* Leaderboard must count only **finalized** points:

  * Approved recycling events
  * Receipt-verified carbon results (500% case)
  * Approved monthly bill bonuses
* Exclude:

  * Provisional
  * Pending
  * Rejected
  * Penalized duplicates (unless net total after penalty)

**Recommended pipeline:**

* Maintain `users/{uid}.totalPoints` as the **single source of truth**, updated only by backend Functions.
* Leaderboard rollup reads `totalPoints` on schedule (monthly) and writes snapshots to `leaderboards/monthly/{YYYY-MM}/entries`.
* Optionally keep a running monthly counter `users/{uid}.monthPoints` that only includes finalized events.

---

## 4) Unit tests we propose (must pass)

1. **Region map determinism**

```ts
expect(pointsFromKgRegionAware(75, "kuwait")).toBe(8); // or ±1 after rounding policy
```

2. **Provisional/receipt math**

```ts
const base = 8;
expect(computeProvisional(base)).toBe(0);      // floor(0.8) = 0, acceptable
expect(finalizeWithReceipt(base)).toBe(40);    // 8 * 5
```

3. **Transactional replace**

* After granting provisional 0–3 pts, receipt validation **replaces** it with base×5, not adds.

4. **Leaderboard exclusion**

* Provisional entries do not change `totalPoints` or `monthPoints` used for leaderboard.

---

## 5) Likely root causes

* Points map uses a **global scale** instead of the region table for some locales (e.g., Kuwait).
* Provisional and 500% flows are **composed in the wrong order**, multiplying the wrong quantity.
* Missing transaction **revert-then-grant** step allows provisional to linger.
* Leaderboard query includes **pending/provisional** documents or derives from a collection sum rather than `users.totalPoints`.

---

## 6) Requests to Firebase/Genkit team

| # | Request                                                                                                          | Purpose               |
| - | ---------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1 | Validate region-aware mapping code path is always used (no fallback to global map).                              | Fix Kuwait low points |
| 2 | Review provisional vs receipt math and confirm the **REPLACE** pattern (not additive).                           | Correct 500% logic    |
| 3 | Recommend Firestore transaction pattern to safely revert provisional then grant final.                           | Data integrity        |
| 4 | Confirm best practice to keep **totalPoints** authoritative and exclude provisional from leaderboard aggregates. | Leaderboard accuracy  |
| 5 | Provide guidance for unit/integration tests for deterministic points mapping across regions.                     | Prevent regressions   |

Environment:

* Project: **EcoScan Rewards**
* Firebase Project ID: `<PROJECT_ID>`
* Functions v2 (Node 18), Firestore (Native), Next.js 15

We’re ready to provide test payloads and logs. A brief engineering review on the mapping and transaction order will likely resolve the user-facing inconsistencies in Kuwait and other high-emission regions.

Best regards,
**EcoScan Technical & Product Team** <NAME> — [email@domain.com](mailto:email@domain.com) — +90-5xx-xxx-xxxx
