
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

Points from the daily carbon footprint survey are calculated based on a user's inputs and their region. The system awards a base score immediately, with a large bonus available for verifying activities with a receipt.

### Regional Benchmarks

To ensure fairness, penalties and rewards are scaled based on regional daily CO₂ averages.

| Region      | Avg (kg/day) | Penalty Threshold (kg/day) |
|-------------|--------------|------------------------------|
| Turkey      | 10           | 25                           |
| Germany     | 20           | 40                           |
| USA         | 40           | 60                           |
| UAE (Dubai) | 50           | 70                           |
| Kuwait      | 65           | 85                           |
| *Default*   | 25           | 50                           |

### Point Calculation Rules:

1.  **Base Points (No Receipt):**
    *   A user's survey inputs are calculated into a `basePoints` value, ranging from 0 (at the regional max kg) to 30 (at or below the regional min kg).
    *   These points are awarded to the user's total immediately upon completing the survey.

2.  **High Footprint Penalty (Sliding Scale):**
    *   If `estimatedFootprintKg` is **greater than the region's Penalty Threshold**, the user starts losing points.
    *   **Formula:** `Penalty = -round((estimatedFootprintKg - PenaltyThreshold) / 2)`
    *   The penalty is capped at a maximum of **-10 points**.
    *   *Example (Dubai): 74kg -> -2 points. 80kg -> -5 points. 90kg -> -10 points.*

3.  **Receipt Verification Bonus:**
    *   If a user successfully scans a receipt for one of their day's activities (e.g., a meal or drink), they receive a large bonus.
    *   **Formula:** `Final Points = Base Points * 5`
    *   This bonus replaces the initial base points. For example, if a user earned 11 base points, verifying with a receipt changes their total award for the survey to 55 points.

4.  **Second Chance Bonus:**
    *   If a user receives a penalty, they can perform one of the AI-recommended actions and submit photo proof.
    *   If the action is verified, the penalty is reversed, and they are awarded an additional **+10 points**.

---

## 3. Reward Redemption Costs

The cost of rewards is set to make them feel valuable and earned, encouraging continued participation in recycling activities.

This logic is defined in `src/components/rewards-section.tsx`.

| Reward                | Partner Store         | Points Cost |
|-----------------------|-----------------------|-------------|
| **Free Coffee**       | The Daily Grind       | 500         |
| **$5 Off Groceries**  | Green Grocer          | 900         |
| **$10 Off Clothes**   | Eco Threads           | 1200        |
| **Free Movie Ticket** | Cineplex Green        | 1600        |
| **$15 Off Shoes**     | Sustainable Soles     | 2000        |
