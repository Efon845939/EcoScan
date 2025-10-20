# **Subject:** EcoScan Rewards — Incorrect points mapping for mid-range CO₂ result (Kuwait region: 56 kg → only 1 pt)

Hello Firebase / Google Cloud team,

We have verified that the **region-aware points mapping function** inside the EcoScan Rewards `carbon-footprint-analysis` flow is still returning **incorrectly low scores** for mid-range values in **high-emission regions**, especially **Kuwait**.

---

## **1  Observed case**

| Region     | EstimatedFootprintKg | Expected Range                | Expected Points | **Actual Points** |
| ---------- | -------------------- | ----------------------------- | --------------- | ----------------- |
| **Kuwait** | **56 kg CO₂/day**    | between min (25) and avg (65) | **≈ 21 pts**    | **1 pt** ❌        |

User context:

* Region = Kuwait
* Transport = Bus/Train
* Diet = Vegetarian
* Drink = Tap Water
* Energy = Low

This configuration should produce a **moderate footprint (≈ 56 kg)** and therefore a **moderate reward**, not a near-zero score.

---

## **2  Expected math (Kuwait region)**

Benchmark constants:
`min = 25`, `avg = 65`, `max = 85`

Piecewise linear mapping:

| Interval   | Formula         | Example (Kuwait)    |
| ---------- | --------------- | ------------------- |
| min → avg  | 30 → 15 pts     | 56 → ≈ 21 pts       |
| avg → max  | 15 →  0 pts     | 75 → ≈ 8 pts        |
| > max×1.05 | –10 pts penalty | only if raw > 89 kg |

**Expected function:**

```ts
function pointsFromKgRegionAware(kg, region) {
  const { min, avg, max } = REGION[region];
  const v = Math.max(min, Math.min(kg, max)); // clamp

  if (v <= min) return 30;
  if (v >= max) return 0;

  if (v <= avg) {
    const t = (v - min) / (avg - min);       // 0–1
    return Math.round(30 - 15 * t);          // 30→15
  } else {
    const t = (v - avg) / (max - avg);
    return Math.round(15 - 15 * t);          // 15→0
  }
}
```

Plugging in Kuwait values:

```
t = (56 – 25)/(65 – 25) = 31/40 = 0.775
Points = 30 – 15 × 0.775 = 18.4 ≈ 18–21 points
```

So **56 kg should yield ≈ 20 points**, never 1 point.

---

## **3  Likely root cause**

1. **Global normalization** still active — mapping 56 kg → 1 pt because it uses global (max = 60) instead of Kuwait (max = 85).
2. **Penalty logic** executed before clamp: raw value > max triggered –10 then added to score (30 – 10 – 19 ≈ 1).
3. **Wrong slope constant:** some deployments use `30 – 30 × t` instead of `30 – 15 × t`, doubling the negative slope.

---

## **4  Validation & unit test**

```ts
test("Kuwait 56 kg should give ≈ 20 points", () => {
  const pts = pointsFromKgRegionAware(56, "kuwait");
  expect(pts).toBeGreaterThanOrEqual(18);
  expect(pts).toBeLessThanOrEqual(22);
});
```

If the function returns 1 or 0, region scaling or penalty order is broken.

---

## **5  Requested actions**

| # | Request                                                                                           | Purpose                 |
| - | ------------------------------------------------------------------------------------------------- | ----------------------- |
| 1 | Audit region scaling and ensure Kuwait constants `{min:25, avg:65, max:85}` are applied           | Fix wrong normalization |
| 2 | Verify the slope factor (30→15→0 scheme) and remove any premature –10 penalty                     | Correct linear mapping  |
| 3 | Ensure penalty executes *after clamp* and only if raw > max×1.05                                  | Prevent false negatives |
| 4 | Add unit test for `pointsFromKgRegionAware("kuwait")` at 25, 56, 65, 75 kg                        | Regression guard        |
| 5 | Confirm that recalculated scores are persisted and leaderboard syncs only final, corrected values | Data integrity          |

---

## **6  Environment**

* **Project:** EcoScan Rewards
* **Firebase Project ID:** `<PROJECT_ID>`
* **Runtime:** Functions v2 (Node 18)
* **AI flow:** `carbon-footprint-analysis` (Genkit / Gemini 1.5 Pro)
* **Last deployment:** 2025-10-24 22:00 UTC
* **Region:** `europe-west4`

---

### **Expected outcome**

For Kuwait region:

| Footprint (kg) | Expected Points |
| -------------- | --------------- |
| 25 ( min )     | +30             |
| 56 (mid )      | **≈ +20 ✅**     |
| 65 (avg )      | +15             |
| 75 (high )     | +8              |
| 85 (max )      | 0               |
| > 89           | –10 penalty     |

Please verify that the deployed mapping function matches these gradients and that no premature penalty or global scaling is applied.

Thank you for your continued support.

Best regards,
**EcoScan Technical & Product Team** <NAME> — [email@domain.com](mailto:email@domain.com) — +90-5xx-xxx-xxxx
