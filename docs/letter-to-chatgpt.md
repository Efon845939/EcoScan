# **Subject:** EcoScan — Cooldown bypass-to-verify, camera-only verification center, and consistent scoring

Hello Firebase / Google Cloud team,

We’ve reworked the UX so the Carbon Footprint Survey button remains visually disabled during cooldown but is still clickable and routes to `/verify`. The `/verify` hub enforces **camera-only live capture** for transport/meal/drink (no gallery uploads) and monthly OCR for utilities.
Server Functions validate EXIF timestamps, dedupe via SHA-256 + pHash, and write points **transactionally**. The “always +1” bug is eliminated: provisional = `floor(base*0.10)` and receipt replaces provisional with `base*5`.
Please validate the storage triggers and confirm best practices for camera-only enforcement and EXIF checks across browsers/devices.
