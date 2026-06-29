# 017 — Histórico de Despensa

## WHAT

A read-only monthly history view of the pantry that records snapshots of all
pantry items (with all 7 statuses) each month. The data feeds the AI prediction
engine to forecast consumption velocity and future purchases.

## WHY

- Users need to see what was in their pantry in past months and how items moved
  through the status lifecycle (Nuevo → Terminado / Merma / Eliminado).
- The AI forecast engine currently only uses spending data. Pantry history
  enables consumption-velocity predictions: how fast does a product go from
  "Nuevo" to "Terminado"? This improves purchase recommendations.
- Historical pantry snapshots are read-only to prevent accidental modification
  of past records.

## User Stories

1. As a user, I can view a per-month table of all pantry items and their status
   at that time, organized by month (like Master Lists).
2. As a user, I can see totals per month: item count, count by status, estimated
   value of past pantry inventory.
3. As a user, the history is automatically populated when I consolidate the
   monthly budget (a snapshot is taken of the current pantry).
4. As a user, the AI forecast tool uses pantry history to predict how much of a
   product I'll consume next month, improving purchase recommendations.

## Acceptance Criteria

1. `GET /api/pantry/history` returns a list of months that have history data.
2. `GET /api/pantry/history/:year/:month` returns all history entries for that
   period, each with product info, quantity, and status.
3. Snapshot is taken automatically during budget consolidate/reconcile,
   capturing every current pantry item with its current status.
4. History is read-only: no PATCH/POST/DELETE routes on history entries.
5. A new section "Histórico" appears in the pantry sidebar/tab showing month
   selector + data table.
6. AI forecast incorporates pantry consumption velocity (items that disappear
   via Terminado/Merma predict future need).

## Out of Scope

- Editing/deleting history entries (future feature if needed).
- Real-time pantry change tracking (snapshot-based is sufficient).
