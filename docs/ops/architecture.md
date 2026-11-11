# Architecture (MVP)

## Module boundaries
- **Backend as source of truth** for commercial and financial states; n8n orchestrates notifications/integrations.
- **Worker/slicer isolated** from API; no arbitrary shell, timeout/whitelist, structured JSON.
- **Issued/approved quotes are immutable** (snapshot).

## Main flow
Upload → slicing/analysis job → normalized result → pricing → quote snapshot → approval → order/payment/production.

## Note
Initial living document; evolve as modules are implemented.
