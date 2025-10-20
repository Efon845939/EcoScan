# **Subject:** EcoScan Rewards — Deterministic AI Flow Returning Non-Deterministic Results in `carbon-footprint-analysis`

Hello Firebase / Google Cloud team,

We have encountered a **critical inconsistency** in the AI flow `carbon-footprint-analysis` used within the *EcoScan Rewards* project.
Despite deterministic configuration (`temperature: 0`, fixed seed, embedded regional benchmarks), the same survey input produces **significantly different CO₂ estimates** on subsequent runs.

---

## **1. Summary of the Issue**

| Region | Input #1 Result | Input #2 Result (same answers) | Difference           |
| ------ | --------------- | ------------------------------ | -------------------- |
| Turkey | 31.6 kg CO₂/day | 31.6 kg CO₂/day                | 0 ✅ (consistent)     |
| Kuwait | 93 kg CO₂/day   | 106 kg CO₂/day                 | +13 ❌ (inconsistent) |

The 13 kg variance for identical inputs is **not explainable by any stochastic parameter** we configured.
The model appears to ignore either the fixed seed or the normalization clamp defined in the region benchmark table.

---

## **2. Input Set for Both Tests**

**Region:** Turkey → Kuwait (toggled manually)
**Transportation:** “Car (Gasoline)”
**Diet:** “Red meat heavy”
**Energy Usage:** Numeric input `medium consumption` → internally mapped as 1.0× baseline.

These are **multiple-choice + scalar** inputs identical across both runs.

---

## **3. Expected Behavior**

Given deterministic inference, the output for a specific region and identical input vector should remain constant:

```text
f(region="Kuwait", transport="car_gasoline",
  diet="red_meat", energy=1.0) → 93.0 ± 0 kg CO₂
```

Running the same call twice must reproduce the same `estimatedFootprintKg`, `sustainabilityScore`, and derived `points`.
The observed +13 kg variance indicates hidden randomness or unstable scaling.

---

## **4. Possible Root Causes**

1. **Floating-point or unit rounding** in the embedded benchmark normalization.
2. **Model context drift** — if the Genkit flow concatenates prompt instructions each call, it may introduce cumulative noise.
3. **Seed not propagated** — `temperature: 0` prevents sampling noise, but without a fixed `seed` parameter, internal embeddings may still vary.
4. **Prompt over-contextualization:** If the flow prompt dynamically re-inserts regional averages from Firestore or Remote Config, timestamp-based ordering can shift token weights.

---

## **5. Expected Formula Behavior (Reference Implementation)**

To prevent any floating noise, the flow should follow an explicit mathematical clamp after computing `rawFootprintKg`.

```js
// regionBenchmarks pre-defined
const REGION_BENCHMARKS = {
  turkey:  { min: 5,  avg: 10,  max: 25 },
  europe:  { min: 8,  avg: 20,  max: 40 },
  usa:     { min: 15, avg: 40,  max: 60 },
  uae:     { min: 20, avg: 50,  max: 70 },
  kuwait:  { min: 25, avg: 65,  max: 85 }
};

function scaleFootprint(rawKg, regionKey) {
  const { min, avg, max } = REGION_BENCHMARKS[regionKey];
  // Normalize and clamp deterministically
  const scaled = Math.max(min,
                   Math.min(rawKg, max));
  return Number(scaled.toFixed(1));
}
```

All floating-point operations should use `toFixed(1)` or integer rounding before returning results to ensure idempotence.

---

## **6. Validation Procedure for Firebase AI Team**

1. **Run the flow twice** with the same payload (see JSON below) and verify equality of outputs.
2. **Inspect the Genkit prompt configuration** for temperature, seed, and context reset.
3. **Confirm that the region benchmarks table** is injected as static constants, not regenerated dynamically each call.

### Sample Payload

```json
{
  "region": "Kuwait",
  "transportation": "car_gasoline",
  "diet": "red_meat",
  "energyUsage": "medium"
}
```

### Expected Output

```json
{
  "estimatedFootprintKg": 93.0,
  "sustainabilityScore": 4,
  "recommendations": [...],
  "region": "Kuwait"
}
```

Any deviation beyond ±0.1 kg should be flagged as non-deterministic.

---

## **7. Additional Requests**

| # | Request                                                                                          | Purpose            |
| - | ------------------------------------------------------------------------------------------------ | ------------------ |
| 1 | Confirm that `temperature: 0` fully disables stochastic sampling in Genkit AI flows.             | Ensure determinism |
| 2 | Provide support for an explicit `seed` parameter in flow calls.                                  | Reproducibility    |
| 3 | Advise best practice for injecting static region benchmark tables (Firestore vs code constants). | Consistency        |
| 4 | Add optional “debug mode” returning `intermediateCalculations` in the response for audit.        | Transparency       |
| 5 | Review the flow’s numeric rounding method to ensure consistent floating-point handling.          | Stability          |

---

## **8. Environment Details**

* **Project:** EcoScan Rewards
* **Firebase Project ID:** `<PROJE_ID>`
* **Model:** Gemini 1.5 Pro (via Genkit)
* **Runtime:** Node 18 Cloud Functions (Genkit SDK v1.7)
* **Flow:** `carbon-footprint-analysis`
* **Last Deployment:** 2025-10-19 21:42 UTC
* **Language:** `tr` / `en`

---

We kindly request Firebase/Genkit engineering to **audit the deterministic execution path** of this flow and confirm that fixed inputs yield fixed results under the specified regional benchmarks.
Please provide recommendations or patches ensuring mathematical reproducibility across all environments.

Thank you for your continued support.
We can share reproducible JSON payloads and test logs upon request.

Best regards,
**EcoScan Technical & Product Team** <NAME> — [email@domain.com](mailto:email@domain.com) — +90-5xx-xxx-xxxx
