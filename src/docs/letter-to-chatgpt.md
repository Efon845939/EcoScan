# **Subject:** EcoScan Rewards — Reward balance clarification, verification layers, and scoring bug (always +1 / +0 points)

Hello Firebase / Google Cloud team,

We’re providing a full technical brief covering both **reward system validation** and a **critical scoring bug** now observed in the production build of EcoScan Rewards.

The document outlines:

1. Reward economy balance and verification logic
2. Fraud prevention and penalties
3. Scoring malfunction that causes users to always receive only **+1 or +0** points, regardless of region or behavior
4. Proposed fix and deployment recommendations

---

## **1  Reward balance context**

After the receipt-verification flow was introduced, a theoretical scenario emerged where a user could obtain a “Free Coffee” reward in six days (250 pts threshold).
However, in practice, the economy remains fair due to multiple verification and penalty layers.

### **1.1  Theoretical vs. practical gain**

| Factor                                    | Value | Notes                                      |
| ----------------------------------------- | ----- | ------------------------------------------ |
| Base daily points (best case, no receipt) | 20    | Only if all lowest-impact answers selected |
| Receipt verification multiplier           | ×5    | Requires valid daily OCR-verified receipt  |
| Free Coffee cost                          | 250   | Current baseline                           |

**Theoretical maximum:** 100 pts/day × 6 days = 600 pts.
**Practical average:** 40–60 pts/day due to missed receipts, failed verifications, and penalties.

---

## **2  Real-world stabilizers**

### **2.1  Daily verification**

* Each receipt validated via Vision OCR (merchant name, timestamp, hash deduplication).
* Duplicates or invalid receipts trigger **–50 pts** penalty.
* Missing a day resets the streak bonus counter.

### **2.2  Monthly utility verification**

* Monthly electricity/water bills required for long-term bonuses.
* Consumption increase > 5 % triggers **–200 pts** penalty.
* OCR trend checks detect falsified “no electricity use” declarations.

### **2.3  Consistency checks**

* Daily “no electricity use” + high monthly bill → **automatic fraud flag**.
* Verified by server transaction; user’s total adjusted immediately.

### **2.4  Leaderboard normalization**

* Leaderboard aggregates only **finalized points** (post-penalty).
* Provisional and pending points excluded.
* Helps expose anomalies and discourages abuse.

---

## **3  New bug — all users receive only +1 or +0 points**

### **3.1  Description**

Regardless of footprint result, region, or inputs, the backend currently assigns **+1** (or occasionally +0) provisional points, even for ideal inputs that should yield 20–30 points.
This behavior persists unless the score exceeds the “max point threshold”, in which case the user correctly receives 0.

### **3.2  Root cause analysis**

From logs and stack traces:

```ts
let basePoints = pointsFromKgRegionAware(kg, region);
if (basePoints > MAX_POINTS) basePoints = MAX_POINTS;
if (basePoints < 1) basePoints = 1; // safeguard — now always 1
```

That “safeguard” line was introduced to prevent negative numbers but effectively clamps *all* small values to 1.

Additionally, in some deployments:

```ts
const awarded = Math.min(1, Math.floor(basePoints));
```

was used as a fallback when Firestore transactions failed, causing all fractional results (e.g., 19.8) to round to **1**.

### **3.3  Corrective solution**

#### **Backend fix**

Replace the fallback and rounding logic:

```ts
// current faulty logic
const awarded = Math.min(1, Math.floor(basePoints)); // always 0 or 1

// corrected deterministic logic
const awarded = Math.round(basePoints);
```

and remove the global minimum clamp (`if (basePoints < 1) basePoints = 1;`).

#### **Transaction fix**

Ensure the transaction uses the **real computed points**, not a placeholder constant:

```ts
await db.runTransaction(async tx => {
  const userDoc = await tx.get(userRef);
  const total = userDoc.data().totalPoints || 0;
  tx.update(userRef, { totalPoints: total + awarded });
});
```

#### **QA unit test**

```ts
test("Kuwait min footprint returns 30 pts", () => {
  const pts = pointsFromKgRegionAware(25, "kuwait");
  expect(pts).toBe(30);
});
test("Kuwait mid footprint returns ~20 pts", () => {
  const pts = pointsFromKgRegionAware(56, "kuwait");
  expect(pts).toBeGreaterThan(18);
});
test("Low footprint not clamped to 1", () => {
  const pts = pointsFromKgRegionAware(30, "kuwait");
  expect(pts).not.toBe(1);
});
```

---

## **4  Recommended configuration update**

| Parameter                 | Current  | Proposed    | Reason                       |
| ------------------------- | -------- | ----------- | ---------------------------- |
| Base daily (no receipt)   | 20 pts   | **15 pts**  | Smooth curve                 |
| Receipt multiplier        | ×5       | **×3**      | Prevent rapid reward farming |
| Free Coffee reward        | 250 pts  | **500 pts** | Balanced economy             |
| Weekly streak bonus       | —        | **+75 pts** | Sustained engagement         |
| Fraud penalty             | –200 pts | keep        | Strong deterrent             |
| Duplicate receipt penalty | –50 pts  | keep        | Anti-spam                    |

---

## **5  Requested actions from Firebase/Genkit team**

| # | Request                                                                                                     | Purpose                     |
| - | ----------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1 | Audit backend `pointsFromKgRegionAware()` integration and confirm it no longer clamps all values to 1 or 0. | Fix primary scoring bug     |
| 2 | Verify deterministic region scaling `{min, avg, max}` and post-clamp penalty order.                         | Accurate scoring            |
| 3 | Validate Firestore transactions use real `awarded` values.                                                  | Prevent fallback overwrites |
| 4 | Ensure penalty/bonus updates are atomic with total points ledger.                                           | Consistency                 |
| 5 | Review reward table update and leaderboard aggregation.                                                     | Prevent legacy imbalance    |

---

## **6  Environment**

* **Project:** EcoScan Rewards
* **Firebase Project ID:** `<PROJECT_ID>`
* **Region:** `europe-west4`
* **Runtime:** Node 18 (Functions v2)
* **AI flow:** `carbon-footprint-analysis` (Genkit / Gemini 1.5 Pro)
* **Deployment:** 2025-10-25 20:00 UTC

---

## **7  Expected outcomes**

| Scenario                      | Expected Points (Base) | With 500 % Receipt Bonus | Icon/Text              |
| ----------------------------- | ---------------------- | ------------------------ | ---------------------- |
| Kuwait, min footprint (25 kg) | +30                    | +150                     | 👍 “Excellent”         |
| Kuwait, mid (56 kg)           | +20                    | +100                     | 🙂 “Good job”          |
| Kuwait, avg (65 kg)           | +15                    | +75                      | 😐 “Average”           |
| Kuwait, high (75 kg)          | +8                     | +40                      | 👎 “Needs improvement” |
| Kuwait, max (85 kg)           | 0                      | 0                        | 👎 “High emissions”    |
| Fraud or mismatch             | —                      | –200                     | 🔴 “Penalty applied”   |

---

### **Outcome summary**

After this patch:

* Scores will once again scale correctly (not 0/1).
* Daily base and receipt bonuses produce realistic totals.
* UI sentiment (text + icon) aligns with numeric points.
* Fraud penalties and monthly verification keep the system fair.

---

Thank you for reviewing and helping us deploy this correction safely.
We can provide test payloads and logs demonstrating the +1/+0 behavior for your engineers.

Best regards,
**EcoScan Technical & Product Team** <NAME> — [email@domain.com](mailto:email@domain.com) — +90-5xx-xxx-xxxx
