# Comprehensive Project Brief: EcoScan Rewards

Hello ChatGPT,

This document provides a detailed overview of the "EcoScan Rewards" web application. We have built a sophisticated platform that gamifies eco-friendly actions, and this brief will bring you up to speed on its functionality, architecture, and core logic.

---

## 1. Core Concept & Vision

EcoScan Rewards is a Next.js application designed to encourage and reward users for making environmentally conscious decisions. The core loop is simple: users perform green actions, verify them using their device's camera and our AI backend, and earn points. These points can then be redeemed for real-world rewards.

The app's primary functions are:
1.  **Recycling Verification:** Identifying the material of an item and verifying that the user disposes of it correctly.
2.  **Carbon Footprint Tracking:** Allowing users to assess their daily carbon impact, rewarding sustainable choices, and providing actionable feedback for improvement.

---

## 2. Key Features & User Flows

### A. Recycling & Material Identification Flow

This is the primary point-earning mechanism for recycling.

1.  **Initial Scan (`scan` step):** From the home screen, the user chooses to "Scan Product Packaging."
2.  **Camera Input (`camera` step):** The app opens the device's camera. The user can either take a live photo of the item's packaging or upload an image file.
3.  **AI Material Identification:** The captured image (as a data URI) is sent to a Genkit AI flow (`material-identification-from-scan`). This flow uses a multimodal AI model to analyze the image and returns:
    *   `material`: The identified material (e.g., "Plastic", "Glass", "Aluminum").
    *   `confidence`: A numerical score (0-1) of the AI's confidence.
4.  **Low Confidence & Barcode Assistance:** If the AI's confidence is low (< 0.5), the user is prompted to enter the product's barcode number. This triggers a second AI flow (`confidence-based-assistance`) that uses the barcode as the primary source of truth to re-identify the material with higher confidence.
5.  **Confirmation (`confirm` step):** The user is shown the identified material and the confidence level. They are then instructed to proceed with disposal.
6.  **Disposal Verification (`verifyDisposal` step):** The camera opens again. The user must take a photo of themselves (or their hand) placing the item into the correct recycling bin.
7.  **AI Fraud & Action Detection:** This new image is sent to the `verify-disposal-action` AI flow. This powerful flow is designed to:
    *   Verify the action (is an item being placed in a bin?).
    *   Detect fraud, such as duplicate submissions or AI-generated images.
8.  **Points Awarded (`disposed` step):**
    *   If the disposal is valid, the user is awarded points based on the material's value (logic in `src/lib/points.ts`).
    *   If the AI detects fraud, a **-50 point penalty** is applied.
    *   The user's point total in their Firestore user profile is updated accordingly.

### B. Carbon Footprint Survey Flow

This feature provides a daily assessment of the user's environmental impact.

1.  **Initiate Survey (`carbonFootprint` step):** From the home screen, the user can start the daily survey. There is a 24-hour cooldown timer displayed, but the button remains active.
2.  **User Input:** The user answers questions about their daily transportation, diet, and home energy use.
3.  **AI Analysis:** The user's answers, along with their selected **Region** (e.g., "Dubai, UAE", "Turkey"), are sent to the `carbon-footprint-analysis` AI flow. This flow is specifically prompted to be deterministic and to scale its calculations based on regional averages, ensuring that the same input in Dubai yields a higher footprint than in Turkey.
4.  **Results & Point Calculation:** The AI returns a detailed analysis, including:
    *   `estimatedFootprintKg`: The estimated daily CO₂ footprint.
    *   `sustainabilityScore`: A score from 1 to 10.
    *   `recommendations` and `extraTips` for improvement.
    *   The system then calculates points:
        *   **Penalty:** If `estimatedFootprintKg` is > 30kg, a sliding scale penalty is applied (max -10 points).
        *   **Provisional Reward:** If no penalty, the user gets a small provisional reward (`sustainabilityScore * 0.5`).
5.  **Receipt Verification (500% Bonus):**
    *   The user is encouraged to scan a receipt from their day to get a **500% bonus**.
    *   The receipt image is sent to the `receipt-ocr-flow`, which validates if it's a real receipt and extracts data.
    *   If the receipt is valid, the bonus points are calculated based on the *original* sustainability score (not the provisional points) and added to the user's total, replacing the provisional amount.
6.  **Second Chance (Penalty Reversal):**
    *   If the user received a penalty, they are given a "second chance."
    *   They can take a photo of themselves performing one of the AI's recommended sustainable actions.
    *   This image is sent to the `verify-sustainability-action` flow.
    *   If the action is verified, the initial penalty points are reversed, and an additional **+15 bonus points** are awarded.

### C. Rewards & Settings

*   **Rewards (`rewards` step):** A dedicated section where users can see a list of available rewards (e.g., "Free Coffee") and redeem them using their points. Partner names and reward titles are fully translated.
*   **Settings:** A modal dialog accessible from the header. It allows users to:
    *   Change the **Region:** This directly impacts the carbon footprint calculation.
    *   Change the **Language:** This affects all UI text via a comprehensive i18n system.
    *   Preferences are saved to the browser's `localStorage` to persist between sessions.

---

## 3. Technical Architecture

*   **Frontend:** Next.js 15 (App Router), React, TypeScript.
*   **UI:** ShadCN UI components, Tailwind CSS. Custom fonts (`Poppins`, `PT Sans`) are used for body and headlines.
*   **Backend & Database:**
    *   **Firebase Authentication:** Used for anonymous user sign-in. Each user gets a unique UID.
    *   **Firestore:** The primary database. Key collections include:
        *   `/users/{userId}`: Stores the user's profile, including `totalPoints` and `lastCarbonSurveyDate`.
*   **Generative AI:**
    *   **Genkit:** The core framework for all AI functionality. AI logic is organized into server-side "flows" in `src/ai/flows/`.
    *   **Google AI (Gemini):** The primary model used for all multimodal (image + text) analysis tasks.

### Internationalization (i18n)

The app is fully internationalized to support multiple languages.
*   **Locale Files:** Language strings are stored in JSON files under `src/lib/locales/` (e.g., `en.json`, `tr.json`).
*   **Key-Based System:** All text is referenced by a key (e.g., `scan_card_title`). We do **not** store JSX or objects in the translation files.
*   **`useTranslation` Hook:** A custom React hook (`src/hooks/use-translation.tsx`) provides a `t()` function that retrieves the correct string for the current language.
*   **Dynamic Placeholders:** The system uses an ICU-like syntax (`{placeholder}`) to inject dynamic values into translated strings. Example: `t('confirm_card_confidence', { confidence: 95 })`.
*   **AI Translation:** The `carbon-footprint-analysis` flow is instructed to generate its entire response in the user's selected language.

---

This project represents a complete, feature-rich application with a sophisticated, AI-driven backend and a responsive, internationalized frontend. The logic is designed to be robust, handling complex user flows, fraud detection, and regional nuances. Please use this document as your guide for any future work on the EcoScan Rewards app.
