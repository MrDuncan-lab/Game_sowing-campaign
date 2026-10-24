# The village above the field

The hills, houses, roads and fields of the Chernozem village are drawn by these Python scripts and written into
`src/art/village/chernozem.ts` as plain SVG strings, anchors and the payment cart's road.

    python3 export.py        # rewrite src/art/village/chernozem.ts
    python3 preview.py       # a still picture of the whole village with every optional piece on (preview.html)

- `villageg.py` — the six hills, what stands on each, the anchors the game draws at (order bubbles, kids, flock).
- `roads5.py` — roads as ribbons of changing width with a rim, ruts, a grass strip and verges.
- `fields5.py` — the patchwork of fields on the far slope.
- `v4art.py`, `art3.py`, `art2.py` — the buildings and props, in the game's ink.
- `artgen/*.json` — SVG fragments of the game's own art (crops, people, pets, icons), rendered from `src` once and
  kept here so the drawing does not depend on a browser.

Python 3, no packages. Pieces that depend on the farm carry a class (`vc vc-lab`, `vc vc-g-bakery`, …) that
`src/ui/Village.tsx` switches on.
