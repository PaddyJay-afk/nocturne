# Nocturne · Sky & Signal — coding-agent handoff

## Current state

The production app is a private, mobile-first sky observation field lab. It combines a calculated sky chart, optional camera overlay, iPhone motion alignment, local capture and observation storage, reproducible audio/light experiments, guided sessions, a field journal, and a bounded public-satellite comparison layer.

The September 2026 repair backlog is complete in this source:

- iOS motion permission and missing-sensor recovery
- camera, recording, storage-quota, and flashlight failure handling
- full active-satellite catalog processing with bounded markers and three comparison paths
- persistent Simple and Advanced control modes
- concise circled-question-mark help for every form setting and adjustment
- 48 px slider interaction area with a 24 px thumb and 8 px track
- mobile scrolling, safe-area, offline, and local-export handling

## Architecture

- `app/page.tsx`: primary client interface and device workflows
- `app/api/satellites/route.ts`: backend proxy/cache policy for the public CelesTrak feed
- `hooks/use-satellites.ts`: worker lifecycle, catalog loading, selection, and search
- `lib/motion.ts`: iOS permission and orientation normalization
- `lib/storage.ts`: IndexedDB sessions and media with binary fallback
- `lib/signals.ts`: Web Audio scheduling and signal/control timing
- `lib/sky.ts`: astronomy calculations and projection
- `lib/satellites.ts`, `lib/satellite-overlay.ts`, `lib/satellite-worker.ts`: orbital parsing, propagation, path limits, and drawing
- `public/sw.js`: offline cache behavior
- `native/`: optional Capacitor wrapper scaffold; it is separate from the deployed web app

The deployed web app intentionally stores observations and media on the user's device. D1 and R2 are not configured. The only server route needed by the current product is the satellite feed proxy. This keeps private observation data out of a remote account and matches `PRODUCT.md`.

## Development and verification

Use Node 22.13 or newer.

```bash
npm ci
npm test
```

`npm test` builds the deployable Worker and runs 58 checks across signals, sky projection, motion permissions, satellite parsing/propagation/render limits, API caching, offline behavior, IndexedDB persistence, quota failures, and rendered UI primitives.

For local interactive work in a Sites-compatible environment, use the managed preview flow described by the Sites tooling. The standard production build is:

```bash
npm run build
```

## Device checks

Browser automation cannot certify physical iPhone sensors. Before treating a new sensor-related change as complete, check these on the target iPhone in Safari or the installed Home Screen app:

1. Allow location, camera, and motion when prompted.
2. Verify the heading changes while turning the phone and calibrate against a known star.
3. Record a short clip, stop it, open Journal, and save the file.
4. Test Screen patch output. Test Flashlight only if Settings reports the API as available.
5. Prepare offline files, close the app, reopen it without connectivity, and confirm the sky chart loads.
6. Load satellites, search for a known NORAD number, and select up to three paths.

## Product limits that must remain explicit

- A catalog match is a candidate, not identification proof.
- CelesTrak's active public catalog is not every orbiting object; classified, untracked, inactive, and debris objects are incomplete.
- Browser compass, camera alignment, torch access, storage limits, and background behavior vary by iOS and browser context.
- Generated light/audio timing is requested by the browser and is not calibrated laboratory output.
- The qCode public specification is not independently available; imported qCode data remains user supplied.

## Source control and deployment

The Sites project identity is stored in `.openai/hosting.json`. Keep that exact `project_id`. Build, commit, push the exact source revision, package the build output, save one Sites version, and deploy that saved version to the existing audience. Do not create a replacement Sites project.

