# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobile web inside Telegram (mini-app). Phones first, from 320×568 up; desktop layout is deferred.

## Users

Players on a phone, usually one-handed, in short sessions. Open: the exact audience (age, how casual) has not been stated; the scholarship jury is the first audience that will evaluate the game.

## Product Purpose

«Посевная» is a card farming game: the player sows crops shaped as figures (polyomino-like card shapes) on a limited field, then manages the farm around it: weather, soil life, buildings, workers, the barn, orders from village organizations. Success for this build: a finished, readable mobile game submitted to the scholarship program by 30 Oct 2026.

## Positioning

Crops are cards with shapes, so planting is a spatial puzzle on a small field, played inside a full year of Russian farming life (seasons, frost thresholds, winter crops, the village and its organizations).

## Operating Context

- One week = one turn: the player places cards from a hand onto beds, then ends the week; the morning plays back growth, pests, weather, harvest.
- Sections: Лаборатория · Дом · Поле (center, opens first) · Амбар · Заказы. The user decided sections are reached through the village; the current thin tab row stays.
- Three farms (Черноземье, Кубанская пойма, Алтайская заимка) share fame.

## Capabilities and Constraints

- Stack: Preact + Vite, single-file build; layered CSS; vector (SVG) art.
- The field is the main thing on screen and must never be covered by UI.
- The hand is a real fan («веер») of cards. Cards must be readable at a glance: the crop is recognizable from the card itself.
- Always visible on the field screen: the forecast in the sky, money and the payment, days and «Конец недели».
- Journal, lenses and buildings live behind one round button that unfolds into three round tools.
- No separate hint or readout line for the selected card.
- Balance is not done; numbers are drafts.

## Brand Commitments

- Name «Посевная». Russian copy, warm rural tone. Characters: сторож Михалыч, Палыч (previously).
- Approved motion language «Живая ферма» (growth wave, harvest hop, wind, crows in three acts, animal breath) is binding for animation work: see docs and project doc motion-language.md.

## Evidence on Hand

- Playable build: dist/index.html, posevnaya-preview.html; artifact https://claude.ai/artifact/FJVcsum9cvKVy8RkHqKi3n.
- Audit status: docs/AUDIT-2026-10-24-STATUS.md. Art prompts: docs/ART_PROMPTS-v4.md.
- No player testimonials, metrics or press exist; do not invent them.

## Product Principles

1. The field first: every control earns its place by not stealing field space.
2. Read at a glance: a card, a bed, a threat should be legible without a tooltip.
3. One thumb: primary actions sit where a thumb reaches; rare tools fold away.
4. The farm is alive: state changes are shown on the farm itself, not in side text.

## Accessibility & Inclusion

Small phones (320 px wide) are a first-class target. Respect prefers-reduced-motion (already implemented for the motion language).
