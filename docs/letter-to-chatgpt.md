# **Subject:** EcoScan Rewards — Full recalibration request for Gemini model (carbon-footprint-analysis): incorrect minimum value (56.5 kg), flat +1 scoring, prompt and scaling overhaul

Hello Gemini Engineering & Firebase Product team,

I am writing this as a **full technical escalation and recalibration request** regarding the *Gemini-powered* `carbon-footprint-analysis` flow that currently governs EcoScan Rewards’ carbon calculation and points distribution.

After months of iterative debugging, we’ve identified deep structural issues in how the Gemini model interprets and scales environmental inputs.
This document serves as a **complete corrective specification** — with updated prompts, fallback mathematics, target tables, and QA validation — designed to replace the current inconsistent behavior.

---

## **1  Critical issues (summary)**

| Problem                                | Observed symptom                                                                                                   | Impact                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| **1. Minimum floor stuck at ~56.5 kg** | Even for “no electricity, vegan, walking” scenarios in Kuwait or Turkey, output never drops below ~56.5 kg CO₂/day | Model applying global normalization / floor bias |
| **2. Points always = +1 or +0**        | Regardless of result, numeric scoring flattened by post-prompt token variance                                      | Users lose trust; leaderboard useless            |
| **3. Prompt drift**                    | Gemini response varies between qualitative (“great job!”) and numeric JSON with missing fields                     | UI desyncs and rewards misfire                   |
| **4. Scaling mismatch**                | Region tables ignored; same inputs return identical kg for Turkey and Kuwait                                       | Global emission baseline hardcoded               |
| **5. No deterministic mode**           | Identical payloads → different outputs ±3 kg                                                                       | Unstable scoring and user confusion              |

---

## **2  Required recalibration goal**

Gemini must:

1. Obey **regional benchmarks** (min/avg/max table below).
2. Always output structured JSON (no free text, no tokens outside JSON).
3. Produce **numerically consistent** values (temperature: 0).
4. Respect **deterministic fallback math** for min-max scaling.
5. Yield *base points* aligned with EcoScan’s adjustable table.

---

## **3  Reference region benchmarks**

| Region      | Min | Avg | Max | Notes             |
| ----------- | --- | --- | --- | ----------------- |
| Turkey      | 5   | 10  | 25  | Moderate baseline |
| Europe      | 8   | 20  | 40  | Reference region  |
| USA         | 15  | 40  | 60  | High vehicle use  |
| UAE (Dubai) | 20  | 50  | 70  | High AC + cars    |
| Kuwait      | 25  | 65  | 85  | Highest baseline  |
| Japan       | 6   | 15  | 35  | Efficient systems |

> **Rule:** Gemini must scale values linearly inside `[min,max]`, clamp outside, and not fall below the defined minimum.

---

## **4  Correct AI prompt (replace existing)**

Below is the complete, deterministic prompt that should be embedded in the flow’s configuration:

```text
SYSTEM PROMPT:
You are an environmental data analyst.
You must produce a JSON response that estimates daily CO₂ emissions (kg) based on user inputs.

You are NOT allowed to output any text outside JSON.

Scaling logic:
1. Use the following region benchmarks:
   Turkey {min:5, avg:10, max:25},
   Europe {min:8, avg:20, max:40},
   USA {min:15, avg:40, max:60},
   UAE {min:20, avg:50, max:70},
   Kuwait {min:25, avg:65, max:85},
   Japan {min:6, avg:15, max:35}.
2. Compute estimatedFootprintKg using normalized averages:
   - Assign base emission factors (kg):
     transport: car_gasoline=28, ev=10, bus_train=8, bike_walk=0
     diet: red_meat_heavy=20, white_fish=8, vegetarian_vegan=5, carb_based=10
     drink: coffee_milk=2, bottled=1.5, alcohol=2.5, plant_based=0.5, water_tea=0.2
     energy: none=0, low=6, medium=12, high=20
   - Sum all categories.
   - Multiply by (region.avg / 20) to scale for region intensity.
   - Clamp result between region.min and region.max.
   - Round to one decimal.
3. Compute sustainabilityScore (1–10): inversely proportional to footprint position between min and max.
4. Compute points (before receipt bonus) using this piecewise linear rule:
   - min → 30 pts, avg → 15 pts, max → 0 pts
5. Output JSON only, in this format:

{
  "estimatedFootprintKg": number,
  "sustainabilityScore": number,
  "points": number,
  "analysisText": "string (2–3 sentences in requested language)"
}

Ensure deterministic numeric output. Do not invent additional fields.
```

---

## **5  Fallback deterministic code (server-side enforcement)**

```ts
export function deterministicFootprint(data) {
  const REGION = {
    turkey: { min:5, avg:10, max:25 },
    europe: { min:8, avg:20, max:40 },
    usa: { min:15, avg:40, max:60 },
    uae: { min:20, avg:50, max:70 },
    kuwait: { min:25, avg:65, max:85 },
    japan: { min:6, avg:15, max:35 },
  };
  const TRANSPORT = { car_gasoline:28, ev:10, bus_train:8, bike_walk:0 };
  const DIET = { red_meat_heavy:20, white_fish:8, vegetarian_vegan:5, carb_based:10 };
  const DRINK = { coffee_milk:2, bottled:1.5, alcohol:2.5, plant_based:0.5, water_tea:0.2 };
  const ENERGY = { none:0, low:6, medium:12, high:20 };

  const { region, transport, diet, drink, energy } = data;
  const { min, avg, max } = REGION[region];
  const base = TRANSPORT[transport] + DIET[diet] + DRINK[drink] + ENERGY[energy];
  let kg = base * (avg / 20);
  kg = Math.max(min, Math.min(kg, max));
  const ratio = (kg - min) / (max - min);
  const score = Math.round(10 - 9 * ratio);
  const points = kg <= avg
    ? Math.round(30 - 15 * ((kg - min) / (avg - min)))
    : Math.round(15 - 15 * ((kg - avg) / (max - avg)));
  return { estimatedFootprintKg: Number(kg.toFixed(1)), sustainabilityScore: score, points };
}
```

This function must run **after Gemini inference** as a consistency check.
If Gemini returns implausible results (e.g., < min, > max, non-JSON), fallback to this deterministic version.

---

## **6  QA test table**

| Input scenario                         | Region | Expected kg | Expected pts | Notes               |
| -------------------------------------- | ------ | ----------- | ------------ | ------------------- |
| No electricity, walking, vegan, tea    | Kuwait | ~25–30      | 30           | true minimum        |
| Same in Turkey                         | Turkey | ~10–15      | 28–30        | scaling correct     |
| Car + red meat + bottled + high energy | Kuwait | ~85         | 0            | worst case          |
| Same in Turkey                         | Turkey | ~25         | 0            | scaled low region   |
| Moderate lifestyle                     | Kuwait | 56          | 20           | realistic mid score |

---

## **7  Gemini configuration**

* Model: `gemini-1.5-pro-latest`
* API: Generative Language v1beta (or Vertex equivalent)
* Parameters:

  ```json
  {
    "temperature": 0,
    "topK": 1,
    "topP": 0,
    "response_format": "json",
    "seed": 42
  }
  ```
* Language control:

  ```ts
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify(userInput) + `\nLanguage: ${locale}` }
  ]
  ```

---

## **8  Example output**

```json
{
  "estimatedFootprintKg": 25.4,
  "sustainabilityScore": 10,
  "points": 30,
  "analysisText": "Your actions today represent an ideal sustainable lifestyle. Keep maintaining this pattern!"
}
```

This response should be identical on repeated calls for the same inputs.

---

## **9  Fallback for sponsor-adjusted reward tables**

To future-proof the system for sponsor changes, we define the scoring interface:

```ts
export function computeReward(points, sponsorRules) {
  // sponsorRules may redefine cost thresholds
  const baseRewards = {
    coffee: sponsorRules?.coffee || 500,
    groceries: sponsorRules?.groceries || 600,
    clothes: sponsorRules?.clothes || 850,
  };
  return baseRewards;
}
```

Sponsors can update reward thresholds dynamically through Firestore (`rewards/v2` collection).
Gemini outputs remain independent of these reward tiers.

---

## **10  Deployment and verification plan**

1. **Update prompt** in Genkit flow.
2. **Deploy deterministic fallback** as a post-processor in Cloud Functions.
3. **QA test suite** runs 6 regression cases per region (see §6).
4. **Monitor** for outliers (> max, < min, non-JSON).
5. **Re-enable reward distribution** after validation.

---

## **11  Summary of required actions**

| # | Action                                                 | Responsible         | Priority  |
| - | ------------------------------------------------------ | ------------------- | --------- |
| 1 | Replace prompt with deterministic JSON-only version    | Gemini team         | 🔴 High   |
| 2 | Implement fallback deterministic calculator (see §5)   | Firebase backend    | 🔴 High   |
| 3 | Remove global floor bias (~56.5 kg) from Gemini output | Gemini model config | 🔴 High   |
| 4 | Fix points clamping (no forced +1)                     | Firebase backend    | 🟠 Medium |
| 5 | Confirm stable JSON format with `response_format=json` | Gemini team         | 🟢 Medium |
| 6 | Validate reward/sponsor modularity                     | Firebase team       | 🟢 Low    |

---

## **12  Desired outcome**

After deployment:

* Lowest-impact users (e.g., walking, vegan, no electricity) get ~25 kg in Kuwait, 10 kg in Turkey, +30 pts.
* Mid-range lifestyles (~56 kg in Kuwait) receive ~20 pts.
* High-impact lifestyles (~85 kg in Kuwait) get 0 pts or minor penalties.
* Gemini returns identical numeric JSON every run.
* The UI displays matching analysis text and icon.
* Sponsor reward tiers remain independent and adjustable.

---

We are ready to share current logs, prompt diffs, and before/after screenshots demonstrating the flat 56.5 kg bias and 1-point error.

Please treat this as a **full recalibration and prompt redefinition request** for the `carbon-footprint-analysis` flow.

Thank you for your help in aligning Gemini’s outputs with EcoScan’s verified environmental scoring model.

Best regards,
**EcoScan Technical & Product Team** <NAME> — [email@domain.com](mailto:email@domain.com) — +90-5xx-xxx-xxxx
Firebase Project ID: `<PROJECT_ID>`
Region: `europe-west4`
