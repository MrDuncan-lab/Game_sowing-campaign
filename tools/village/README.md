# The village above the field

The hills, houses, roads and fields of the Chernozem village are drawn by these Python scripts and written into
`src/art/village/chernozem.ts` as plain SVG strings, anchors and the payment cart's road.

    python3 export.py        # rewrite src/art/village/chernozem.ts
    python3 preview.py       # still pictures of the whole village: preview-summer.html, preview-winter.html

Style: the hybrid chosen on 26.10 (project doc `claude/village-style-brief.md`): the book's ink line and hatching
with the game vector's light, haze and colour; a low sun on the left, shadows to the lower right; winter at dusk
with lit windows. Two drawings are exported: summer (spring and autumn recolour it through `V_SEASON_CSS`) and
winter; `src/ui/Village.tsx` picks one by the season.

- `hy.py` — the drawing kit: palettes, the ink renderer (`Hy`), and the shared pieces (izba, long house, shop,
  council, banya, trees, fences, gardens, people, animals, haystack…).
- `pieces.py` — the game's own buildings and props in the same style: the mill, the college, the orphanage, the
  bakery, the restaurant, the barn, the lab, the met station, Palych's bench, the stall, the signpost, the
  building plot, the neighbours' gifts.
- `villageg.py` — the six hills, what stands on each, the roads, the sky; the anchors the game draws at (order
  bubbles, kids, flock) and the cart's road.
- `roads5.py` — reading SVG path data into points along it.

Python 3, no packages. Markup is kept light: ink is a class (`k`, `kf`, `kn`) coloured by the CSS variable `--vk`
(`src/village.css`), smooth shapes are Béziers, shadows and glows are patterns and gradients, not blur filters.
The road network is shown through `<use>`, where class rules do not reach, so its ink is written as attributes.
Pieces that depend on the farm carry a class (`vc vc-lab`, `vc vc-g-bakery`, …) that the game switches on; moving
parts carry the classes `village.css` animates (sails, cups, vane, flagw, sway, swing, fire, bubbling, bee, nod,
peck, wash, smoke).
