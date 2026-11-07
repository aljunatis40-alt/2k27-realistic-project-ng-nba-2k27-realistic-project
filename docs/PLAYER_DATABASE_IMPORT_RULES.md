# Player Database Import Rules

## Current seed
`prototype3d/src/data/roster-sample-2026-27.json` is a sample dataset supplied by the project owner. It contains only four sample player records across two teams. It is **not** a complete or independently verified 2026–27 roster.

## Data rules
- Keep the original player ID stable; IDs must be unique and prefixed by the team abbreviation.
- Store draft year, round, and pick as separate fields. Do not infer one from another.
- Treat the supplied age as a dated display snapshot. Add an ISO `birthDate` and calculate age against the selected game date when verified birth-date data is available.
- Keep source, verification date, and likeness-rights status with every player record.
- Face mesh IDs are asset references only. An ID ending in `100pct` is not proof of accuracy or permission to use a real person's likeness.
- Do not publish real-player face meshes, photos, team logos, jersey marks, or signature assets without the required rights.
- Validate IDs, team membership, positions, biometric ranges, and draft fields before importing larger datasets.
- Use official or properly licensed sources and manually review roster transactions before marking records verified.

## Validation
The TypeScript helpers in `prototype3d/src/data/PlayerDatabase.ts` provide the shared types, age calculation, and initial integrity checks. Validation errors should block an import; unverified provenance should remain visible as a review status, not silently become verified.
