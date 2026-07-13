# Privacy event catalog

Implementation: `src/analytics/events.ts`.

Catalog version: `2026-07-client-journey-v1`.

Allowed event properties are limited to event name, catalog version, app version, route, contract version, stable result code, stable error code, redacted correlation ID, and duration bucket.

The helper rejects prohibited property names associated with names, email, phone, address, DOB, SSN, member IDs, policy numbers, payer details, diagnoses, clinical answers, message contents, raw IDs, raw request/response bodies, and tokens.
