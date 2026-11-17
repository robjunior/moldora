# n8n payment event workflow

`n8n/workflows/print3d-payment-events.json` is an importable workflow for the
payment lifecycle events emitted by the API:

- `payment.confirmed`
- `payment.refunded`
- `payment.cancelled`

## Import and activate

1. Open the n8n UI from the Compose stack at `http://localhost:5678`.
2. Import `n8n/workflows/print3d-payment-events.json`.
3. Activate the workflow. The production webhook URL is
   `POST http://localhost:5678/webhook/print3d-events`.
4. Configure the API with the same `N8N_BASE_URL`,
   `N8N_EVENTS_WEBHOOK_PATH=/webhook/print3d-events`, and `N8N_WEBHOOK_SECRET`.

The workflow returns `202` for known payment events and `400` for unknown event
types. It is intentionally side-effect-free beyond acknowledging the event;
replace the three response nodes with business actions when those workflows are
defined.

## Security

The committed workflow has no credentials so it can be imported in development.
The API sends `x-print3d-webhook-secret`, but the workflow does not validate that
header by default. Keep n8n bound to a trusted network in development and add
n8n Header Auth or an equivalent secret-validation node before exposing the
webhook outside that network.
