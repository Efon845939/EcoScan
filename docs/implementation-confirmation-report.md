# **Subject:** EcoScan — 404 on Generative Language API model path; request model availability + method matrix

Hello Firebase / Google AI team,

We’re receiving:

```
404 Not Found
models/gemini-1.5-pro is not found for API version v1beta, or is not supported for generateContent.
```

Request:

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent
```

Actions we took:

* Switching to `gemini-1.5-pro-latest` resolves the 404 on Generative Language API.
* On Vertex AI, the working path is:
  `.../publishers/google/models/gemini-1.5-pro-002:generateContent` (OAuth)

Please confirm:

1. The current **model name → method** support matrix for **v1beta**.
2. Whether `gemini-1.5-pro` (without suffix) is deprecated on v1beta for `generateContent`.
3. Recommended **stable alias** for production (e.g., `*-latest`) vs. **rev-pinned** (`-002`) names.
4. Any **region restrictions** we should be aware of.

Env:

* Project: EcoScan Rewards
* Endpoint family: Generative Language API (and Vertex AI in CI)
* Regions tested: us-central1, europe-west4

Thanks,
EcoScan Technical Team
