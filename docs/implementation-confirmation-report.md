# **Subject:** EcoScan Rewards — Critical `carbon-footprint-analysis` runtime error & full multilingual (Arabic/Japanese) deployment validation

Hello Firebase / Google Cloud team,

We are reporting a **critical runtime failure** in our `carbon-footprint-analysis` Genkit flow (AI module) and, in parallel, requesting confirmation and support for our **multilingual rollout (Arabic/Japanese)** architecture.

This document consolidates both issues for comprehensive review.

---

## **1. Critical Runtime Failure — `analyzeCarbonFootprint`**

### **1.1 Error Log**

```
async analyzeCarbonFootprint@rsc://React/Server/file:///home/user/studio/.next/server/chunks/ssr/%5Broot-of-the-server%5D__3e587834._.js?13:843:24
resolveErrorDev@https://6000-firebase-studio-1760721535711.cluster-utvmpwb6ojhlcsay7va6s7qkck.cloudworkstations.dev/_next/static/chunks/node_modules_next_dist_compiled_2ce9398a._.js:17582:65
processFullStringRow@https://6000-firebase-studio-1760721535711.cluster-utvmpwb6ojhlcsay7va6s7qkck.cloudworkstations.dev/_next/static/chunks/node_modules_next_dist_compiled_2ce9398a._.js:17798:23
processFullBinaryRow@https://6000-firebase-studio-1760721535711.cluster-utvmpwb6ojhlcsay7va6s7qkck.cloudworkstations.dev/_next/static/chunks/node_modules_next_dist_compiled_2ce9398a._.js:17786:29
progress@https://6000-firebase-studio-1760721535711.cluster-utvmpwb6ojhlcsay7va6s7qkck.cloudworkstations.dev/_next/static/chunks/node_modules_next_dist_compiled_2ce9398a._.js:17932:102
```

### **1.2 Description**

The **`carbon-footprint-analysis`** Genkit flow intermittently fails during SSR execution inside Next.js (`rsc://React/Server/file` stack trace).
This coincides with inconsistent or implausible AI results — especially in the **Kuwait** region, where worst-case inputs yield **19–20 kg/day** (below the regional minimum of 25 kg) and inconsistent point scores (2–4 pts).

Repeated runs of identical input vectors occasionally trigger internal exceptions like the stack trace above, indicating that either:

* Genkit returns incomplete or malformed JSON,
* Streaming tokens are being processed as binary rows by Next.js’s RSC renderer,
* or the AI flow itself throws an unhandled Promise rejection during numeric scaling.

---

### **1.3 Reproducible Input**

```json
{
  "region": "kuwait",
  "transportation": "car_gasoline",
  "diet": "red_meat_heavy",
  "energyUsage": "high"
}
```

### **1.4 Observed Results**

| Run | estimatedFootprintKg | sustainabilityScore | Points | Comment                     |
| --- | -------------------- | ------------------- | ------ | --------------------------- |
| 1   | 19                   | 4                   | +4     | Too low for region          |
| 2   | 20                   | 2                   | +2     | Same input, different score |
| 3   | (error)              | —                   | —      | Stack trace above           |

### **1.5 Expected Behavior**

1. Deterministic output (identical inputs → identical outputs).
2. Region-based scaling to Kuwait benchmarks:

   * Min: 25 kg/day
   * Avg: 65 kg/day
   * Max: 85 kg/day
3. Numerical clamping and rounding at one decimal place (`toFixed(1)`).
4. Stable JSON returned to the React server component.

---

### **1.6 Suggested Technical Fix (Pseudocode)**

```ts
// Deterministic clamp + rounding
function normalizeFootprint(rawKg: number, regionKey: string) {
  const { min, max } = REGION[regionKey];
  const clamped = Math.max(min, Math.min(rawKg, max));
  return Number(clamped.toFixed(1));
}

// Wrap AI call
async function analyzeCarbonFootprint(input) {
  const ai = await runFlow("carbon-footprint-analysis", {
    ...input,
    temperature: 0,
    seed: 42,
  });
  if (!ai || typeof ai.estimatedFootprintKg !== "number")
    throw new Error("Invalid AI response");
  return normalizeFootprint(ai.estimatedFootprintKg, input.region);
}
```

### **1.7 Requests**

| # | Request                                                                     | Goal                      |
| - | --------------------------------------------------------------------------- | ------------------------- |
| 1 | Audit Genkit AI flow output format (ensure valid JSON, no stream tokens)    | Fix RSC crash             |
| 2 | Confirm `temperature: 0` and `seed` parameter handling for true determinism | Remove variance           |
| 3 | Review region-scaling math inside flow prompt/system code                   | Prevent sub-min values    |
| 4 | Add “safe JSON mode” flag for flows to avoid React streaming interference   | Prevent SSR runtime crash |
| 5 | Provide example for error boundary wrapping around `await runFlow()` in RSC | Resilient SSR behavior    |

---

## **2. Multilingual (Arabic/Japanese) Rollout Validation**

Parallel to the AI issue, we are finalizing full localization support.

### **2.1 Goals**

* **Arabic (ar):** Proper RTL rendering, Arabic-Indic numerals.
* **Japanese (ja):** Correct font fallback and typographic spacing.
* **AI responses localized** according to selected language.
* **Firestore / Remote Config** enforce *string-only* translations.
* **Firebase Hosting** configured for multilingual caching.

### **2.2 Current Setup**

* `src/lib/locales/{lang}.json` (en, tr, ar, ja, fr, de).
* Next.js App Router with `<html lang dir>` switching.
* Tailwind + CSS logical properties for RTL.
* `useTranslation()` hook with ICU placeholders.
* Cloud Translation API pipeline to pre-fill missing keys.
* Genkit `"language": locale` parameter passed on every AI call.

### **2.3 Problems to Verify**

* **RTL Mirroring:** Occasional layout drift on nested flex containers.
* **Number formatting:** Ensure `Intl.NumberFormat("ar", { numberingSystem: "arab" })`.
* **Hosting cache:** Need `Vary: Accept-Language` to avoid wrong-language SSR caching.
* **AI fallback:** Sometimes defaults to English under heavy load despite `"language": "ar"`.

### **2.4 Requests**

| # | Request                                                              | Purpose                          |
| - | -------------------------------------------------------------------- | -------------------------------- |
| 1 | Validate Hosting `Vary: Accept-Language` and TTL headers             | Prevent cross-locale cache bleed |
| 2 | Confirm Firestore/Remote Config reject non-string translation writes | Type safety                      |
| 3 | Approve Cloud Translation API quota + glossary for ar/ja             | Pre-fill automation              |
| 4 | Review Genkit language enforcement logic                             | Guarantee localized AI output    |
| 5 | Advise best practices for RTL with App Router                        | CSS logical consistency          |

### **2.5 Example Hosting Header Config**

```json
{
  "headers": [
    {
      "source": "/locales/**",
      "headers": [
        { "key": "Cache-Control", "value": "public,max-age=3600" },
        { "key": "Vary", "value": "Accept-Language" }
      ]
    },
    {
      "source": "**",
      "headers": [
        { "key": "Vary", "value": "Accept-Language" }
      ]
    }
  ]
}
```

### **2.6 QA Plan**

* ✅ Arabic RTL: mirrored layout, Arabic-Indic numerals.
* ✅ Japanese: font fallback, proper line breaks.
* ✅ Language toggle works client-side; no hydration mismatch.
* ✅ Genkit outputs fully localized content.
* ✅ Firestore returns only strings, no `[object Object]`.

---

## **3. Environment Details**

* Project: **EcoScan Rewards**
* Firebase Project ID: `<PROJECT_ID>`
* Framework: Next.js 15 (App Router)
* Genkit Model: Gemini 1.5 Pro
* Runtime: Node 18 (Functions v2)
* Languages: en, tr, ar, ja, fr, de
* Deployed: 2025-10-20 UTC

---

## **4. Summary of Requests**

| Category                 | Key Actions                                                                         | Priority  |
| ------------------------ | ----------------------------------------------------------------------------------- | --------- |
| **AI Flow Stability**    | Audit JSON streaming, add safe-JSON flag, verify determinism (seed + temperature 0) | 🔴 High   |
| **Region Scaling**       | Enforce min/avg/max clamps, fix Kuwait sub-min issue                                | 🔴 High   |
| **Multilingual Support** | Approve Arabic/Japanese localization headers, Translation API quota                 | 🟠 Medium |
| **Firestore i18n**       | Validate string-only translation schema                                             | 🟠 Medium |
| **Hosting**              | Confirm Vary: Accept-Language & caching rules                                       | 🟢 Low    |

---

We appreciate your support in resolving the `carbon-footprint-analysis` runtime errors and helping us finalize the multilingual rollout for Arabic and Japanese.
We’re available to share live logs, payloads, and environment access for debugging.

Best regards,
**EcoScan Technical & Product Team** <NAME> — [email@domain.com](mailto:email@domain.com) — +90-5xx-xxx-xxxx
