
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

Points from the daily carbon footprint survey are calculated based on a user's inputs and their region. The system is designed to provide a fair reward based on impact, with a bonus for verifying activities.

### Regional Benchmarks

To ensure fairness, penalties and rewards are scaled based on regional daily CO₂ averages.

| Region      | Avg (kg/day) | Penalty Threshold (kg/day) |
|-------------|--------------|------------------------------|
| Turkey      | 40           | 70                           |
| Germany     | 35           | 60                           |
| USA         | 50           | 80                           |
| UAE (Dubai) | 50           | 70                           |
| Kuwait      | 65           | 85                           |
| *Default*   | 25           | 50                           |

### Point Calculation Rules:

1.  **Base Points (No Receipt):**
    *   A user's survey inputs are calculated into a `basePoints` value using a tiered system (e.g., 0, 8, 15, 20, 30 points) based on their `estimatedFootprintKg` relative to their region's `min`, `avg`, and `max` values.
    *   These points are awarded to the user's total immediately upon completing the survey. There is no longer incorrect clamping of values to 1.

2.  **High Footprint Penalty (Sliding Scale):**
    *   If `estimatedFootprintKg` is **greater than the region's `max` threshold**, the user starts losing points.
    *   **Formula:** `Penalty = -round((estimatedFootprintKg - max) / 2)`
    *   The penalty is capped at a maximum of **-10 points**.
    *   *Example (Kuwait): 89kg -> -2 points. 95kg -> -5 points. 105kg -> -10 points.*

3.  **Receipt Verification Bonus:**
    *   If a user successfully scans a receipt for one of their day's activities, they receive a bonus.
    *   **Formula:** `Final Points = Base Points * 3`
    *   This is a 3x multiplier on the initial `basePoints`.

4.  **Second Chance Bonus:**
    *   If a user receives a penalty, they can perform one of the AI-recommended actions and submit photo proof.
    *   If the action is verified, the penalty is reversed, and they are awarded an additional **+10 points**.

---

## 3. Reward Redemption Costs & Fraud Penalties

| Parameter                | Value      | Rationale / Description                          |
|--------------------------|------------|--------------------------------------------------|
| **Free Coffee**          | 500 points | Balances the economy for a frequent, small reward. |
| **$5 Off Groceries**     | 900 points |                                                  |
| **$10 Off Clothes**      | 1200 points|                                                  |
| **Streak Bonus**         | +75 points | Awarded for a 7-day streak of completing tasks.  |
| **Fraud Penalty**        | -200 points| Deters submission of AI-generated/fake images.   |
| **Duplicate Penalty**    | -50 points | Prevents spamming the same verification photo.   |
