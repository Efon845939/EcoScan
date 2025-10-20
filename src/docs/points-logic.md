# EcoScan Rewards: Points System Logic

This document outlines the mathematical calculations and logic used for awarding, deducting, and redeeming points within the EcoScan Rewards application.

---

## 1. Recycling Points (by Material)

Points are awarded based on the environmental harm prevented by recycling a specific material. The more damaging the material is to the environment when not recycled, the more points a user receives for recycling it correctly.

This logic is located in `src/lib/points.ts`.

| Material      | Points Awarded | Rationale                                               |
|---------------|----------------|---------------------------------------------------------|
| **Battery**   | 30             | Prevents highly toxic materials from leaking into soil. |
| **Plastic**   | 18             | Reduces long-term pollution and microplastic spread.    |
| **Glass**     | 14             | Saves energy; never decomposes in landfills.            |
| **Metal**     | 12             | Saves significant energy vs. producing from raw ore.    |
| **Aluminum**  | 12             | Same as Metal.                                          |
| **Paper**     | 8              | Saves trees and water.                                  |
| **Cardboard** | 8              | Same as Paper.                                          |
| **Unrecyclable**| 4              | Rewards correct sorting to prevent contamination.       |
| *Other*       | 3              | A small reward for any other scannable item.            |

---

## 2. Carbon Footprint Survey Points

Points from the daily carbon footprint survey are calculated based on a `sustainabilityScore` (from 1 to 10) and an `estimatedFootprintKg` provided by the AI analysis. The system is designed to provide a small provisional reward, with a large bonus for verifying with a receipt. This logic is located in `src/components/carbon-footprint-survey.tsx`.

### Regional Benchmarks

To ensure fairness, penalties and rewards are scaled based on regional daily CO₂ averages.

| Region      | Avg (kg/day) | Penalty Threshold (kg/day) |
|-------------|--------------|------------------------------|
| Turkey      | 24           | 30                           |
| Germany     | 27           | 35                           |
| USA         | 45           | 55                           |
| UAE (Dubai) | 55           | 65                           |
| Kuwait      | 70           | 80                           |
| *Default*   | 25           | 30                           |

### Point Calculation Rules:

1.  **High Footprint Penalty (Sliding Scale):**
    *   If `estimatedFootprintKg` is **greater than the region's Penalty Threshold**, the user starts losing points.
    *   **Formula:** `Penalty = -round((estimatedFootprintKg - PenaltyThreshold) / 2)`
    *   The penalty is capped at a maximum of **-10 points**.
    *   *Example (Dubai): 69kg -> -2 points. 75kg -> -5 points. 85kg -> -10 points.*

2.  **Provisional Reward (No Receipt):**
    *   If the footprint is not over the penalty threshold, provisional points are awarded based on the `sustainabilityScore`.
    *   **Formula:** `Provisional Points = sustainabilityScore * 0.5`
    *   This results in a maximum of **5 points** for a perfect score of 10.

| Sustainability Score | Provisional Points |
|----------------------|--------------------|
| 10                   | 5                  |
| 9                    | 4.5 (rounded)      |
| 8                    | 4                  |
| ...                  | ...                |
| 1                    | 0.5 (rounded)      |


3. **Receipt Verification Bonus:**
    * If a user successfully scans a receipt to verify their daily activities, they receive a **500% bonus** on top of the base points (not the provisional points).
    * **Example:** A score of 8 gives a base of `8 * 2.5 = 20` points. The bonus is `20 * 5 = 100` points. The provisional points are replaced.
    
4. **Second Chance Bonus:**
    * If a user receives a penalty, they can perform one of the AI-recommended actions and submit photo proof.
    * If the action is verified, the penalty is reversed, and they are awarded an additional **+15 points**.

---

## 3. Reward Redemption Costs

The cost of rewards is set to make them feel valuable and earned, encouraging continued participation in recycling activities. There is no direct dollar-to-point conversion rate; instead, points function as a measure of consistent positive action.

This logic is defined in `src/components/rewards-section.tsx`.

| Reward                | Partner Store         | Points Cost |
|-----------------------|-----------------------|-------------|
| **Free Coffee**       | The Daily Grind       | 250         |
| **$5 Off Groceries**  | Green Grocer          | 600         |
| **$10 Off Clothes**   | Eco Threads           | 850         |
| **Free Movie Ticket** | Cineplex Green        | 1200        |
| **$15 Off Shoes**     | Sustainable Soles     | 1500        |
