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

Points from the daily carbon footprint survey are calculated based on a `sustainabilityScore` (from 1 to 10) and an `estimatedFootprintKg` provided by the AI analysis.

This logic is located in `src/components/carbon-footprint-survey.tsx`.

### Point Calculation Rules:

1.  **High Footprint Penalty:**
    *   If `estimatedFootprintKg` is **greater than 40 kg**, the user **loses 10 points**.

2.  **Standard Reward:**
    *   If the footprint is not over 40kg, points are awarded based on the `sustainabilityScore`.
    *   **Formula:** `Points = sustainabilityScore * 2.5`
    *   This results in a maximum of **25 points** for a perfect score of 10.

| Sustainability Score | Points Awarded |
|----------------------|----------------|
| 10                   | 25             |
| 9                    | 22.5 (rounded) |
| 8                    | 20             |
| ...                  | ...            |
| 1                    | 2.5 (rounded)  |

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
