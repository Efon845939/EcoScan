# **Subject:** EcoScan Rewards — Carbon Footprint Flow: incorrect region scaling and negative score at minimum-impact input (Kuwait region)

Hello Firebase / Google Cloud team,

We are encountering a **critical logic error** in the EcoScan Rewards `carbon-footprint-analysis` flow.
Even when users select the **lowest-impact combination** of options (no electricity use, walking transport, vegetarian/vegan diet, tap-water drinks), the AI flow returns **≈ 56 kg CO₂/day** and assigns a **–10 points penalty** in the **Kuwait** region.
This contradicts the region’s benchmark table and all expected behaviors.

---

## 1  Observed behavior

| Region | Transport | Diet  | Drink         | Energy     | Result (kg CO₂) | Points  |
| ------ | --------- | ----- | ------------- | ---------- | --------------- | ------- |
| Kuwait | Bike/Walk | Vegan | Tap Water/Tea | None / Low | **56 kg**       | **–10** |

The same configuration in Turkey yields ≈ 12 kg CO₂ and +28 points — correct.
So region scaling or clamp ordering is broken specifically for high-emission regions.

---

## 2  Expected logic

From our deterministic rule engine:

| Region      | Min | Avg | Max | Unit       |
| ----------- | --- | --- | --- | ---------- |
| Turkey      | 5   | 10  | 25  | kg CO₂/day |
| Europe      | 8   | 20  | 40  | kg CO₂/day |
| USA         | 15  | 40  | 60  | kg CO₂/day |
| UAE (Dubai) | 20  | 50  | 70  | kg CO₂/day |
| **Kuwait**  | 25  | 65  | 85  | kg CO₂/day |

* A *minimum*-impact lifestyle in Kuwait should approach **≈ 25 kg**, never exceed 30 kg.
* Points mapping is:

  * ≤ min → +30 pts
  * avg → +15 pts
  * ≥ max → 0 pts, optional –10 penalty only if raw > max × 1.05

Therefore, a result of 56 kg CO₂ should correspond to roughly +8 points —not –10.

---

## 3  Probable root causes

1. **Global fallback scale** is being applied instead of the region-specific clamp:

   ```ts
   const neutralAvg = 20; // Europe baseline
   kg = base * (neutralAvg / avg); // inverted ratio?
   ```

   → Reversing numerator/denominator inflates low-impact scores in high-average regions.

2. **Penalty computed before clamping:**
   The raw (pre-clamped) kg value exceeds `max`, triggering –10 points even though the final value was clamped to 56 kg (< max 85).

3. **Enum fallback:**
   `"none"` or `"low"` energy inputs not parsed → defaults to `"high"`, adding +20 kg.
   (We verified this by instrumenting the parser — unrecognized values silently default.)

---

## 4  Validation plan & reference implementation

### Deterministic baseline

```ts
function computeKg(region, transport, diet, drink, energy) {
  const base = TRANSPORT_KG[transport] + DIET_KG[diet] + DRINK_KG[drink] + ENERGY_KG[energy];
  const { min, avg, max } = REGION[region];
  const scale = avg / 20;          // Europe avg = 20 baseline
  let kg = base * scale;
  kg = Math.max(min, Math.min(kg, max));
  return Number(kg.toFixed(1));
}
```

### Points mapping (should never yield negative unless raw > max × 1.05)

```ts
function pointsFromKg(kg, region) {
  const { min, avg, max } = REGION[region];
  const v = Math.max(min, Math.min(kg, max));
  if (v <= min) return 30;
  if (v >= max) return 0;
  if (v <= avg) {
    const t = (v - min) / (avg - min);
    return Math.round(30 - 15 * t);
  }
  const t = (v - avg) / (max - avg);
  return Math.round(15 - 15 * t);
}
```

Test expectation (Kuwait / minimal input):

```ts
expect(computeKg("kuwait","bike_walk","vegetarian_vegan","drink_water_tea","none"))
  .toBeLessThanOrEqual(30);

expect(pointsFromKg(25,"kuwait")).toBe(30);
```

---

## 5  Requests to Firebase/Genkit team

| # | Request                                                                                                                    | Purpose                         |
| - | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1 | Audit the `carbon-footprint-analysis` flow’s region-scaling logic; confirm numerator/denominator in scale factor.          | Fix inflated low-impact results |
| 2 | Ensure `penalty` calculation executes **after clamping**.                                                                  | Prevent false –10 scores        |
| 3 | Validate `energy` parser accepts `"none"` and `"low"` (no silent default).                                                 | Input integrity                 |
| 4 | Provide best practice for embedding immutable region constants in Genkit prompts or Functions runtime (not dynamic fetch). | Determinism                     |
| 5 | Confirm that Firestore’s stored `estimatedFootprintKg` and `points` are recalculated once model patch is deployed.         | Data consistency                |

---

## 6  Environment

* **Project:** EcoScan Rewards
* **Firebase Project ID:** `<PROJECT_ID>`
* **Region:** `europe-west4`
* **Runtime:** Functions v2 (Node 18)
* **AI Flow:** `carbon-footprint-analysis` (Genkit / Gemini 1.5 Pro)
* **Last Deployment:** 2025-10-22 22:00 UTC

---

### Desired outcome

* Lowest-impact users (e.g., no electricity, vegan, walking) in Kuwait should produce ≈ 25 kg CO₂/day and **+30 points**.
* No scenario should yield –10 points unless raw CO₂ > max × 1.05.
* Region tables must apply deterministically and consistently across all locales.

We can supply detailed logs and test payloads to reproduce the 56 kg / –10 issue.
Please verify the region scaling and penalty order inside the deployed flow.

Thank you for your continued assistance.

Best regards,
**EcoScan Technical & Product Team** <NAME> — [email@domain.com](mailto:email@domain.com) — +90-5xx-xxx-xxxx

    