# The village above the field

The hills, houses, roads and fields of the Chernozem village are drawn by these Python scripts and written into
`src/art/village/chernozem.ts` as plain SVG strings, anchors and the payment cart's road.

    python3 export.py        # rewrite src/art/village/chernozem.ts and src/art/village/estate.ts
    python3 estate.py        # only the estate: src/art/village/estate.ts and preview-estate.html
    python3 yard.py          # rewrite src/art/yard.ts (the farmyard over the field)
    python3 preview.py [all|none] [1-5]   # the whole village: preview-summer/-winter/-spring/-autumn.html (house level)

Style: the hybrid chosen on 26.10 (project doc `claude/village-style-brief.md`): the book's ink line and hatching
with the game vector's light, haze and colour; a low sun on the left, shadows to the lower right; winter at dusk
with lit windows. Two drawings are exported: summer and winter; `src/ui/Village.tsx` picks one by the season.
Spring and autumn are the summer drawing under their season class: `V_SEASON_CSS` recolours the hills, the trees
(classes `tl th tb` birch, `al ah ad fr` apple, `lt ld lb` lilac), the gardens and the far fields (`f-wheat`, …),
and shows the season's own pieces (groups `vs vs-sp` / `vs-su` / `vs-au`): apple blossom, ploughland, puddles,
rooks and a man digging in spring; golden birches, stooks, pumpkins, geese, a smouldering leaf pile in autumn.

- `hy.py` — the drawing kit: palettes, the ink renderer (`Hy`), and the shared pieces (izba, long house, shop,
  council, banya, trees, fences, gardens, people, animals, haystack…).
- `pieces.py` — the game's own buildings and props in the same style: the mill, the college, the orphanage, the
  bakery, the restaurant, the barn, the lab, the met station, Palych's bench, the stall, the signpost, the
  building plot, the neighbours' gifts.
- `villageg.py` — the six hills, what stands on each, the roads, the sky; the anchors the game draws at (order
  bubbles, kids, flock), the cart's road and the spots under the buildings (`V_SPOTS`: hill, centre x, ground y,
  width and top of every tappable piece; `house` is the level-1 house, `V_HOUSE_SPOTS` has all five).
- The customers' buildings each have their own silhouette and props: the council's portico, clock, arms and
  tricolour; the college's clock tower with its bell, the sign and the trial plot; the children's home's sun, colours
  and playground; the bakery's pretzel, oven chimney and window of loaves; the restaurant's sign with the chef's
  hat, the terrace with the samovar, the string lights and the menu board. Each marks its roof (`r.roof`) and
  `bubble_over()` puts the order bubble just above it.
- The player's house grows with its level: `homestead(r, cx, y, s, lit, level)` — 1 izba and woodpile, 2 + cellar,
  3 + workshop and sawhorse, 4 + light room with a balcony and carved frames, 5 + columns, a green iron roof, the
  front garden and a painted fence with a gate. The village draws all five (`cond='houseN'`; the game shows one by
  the root class `on-houseN`).
- `estate.py` — the House screen's picture (`ES_VIEW` 360×210): `back`, `houses[0..4]` (the same homestead, larger),
  the yard `items` (hive, greenhouse, scarecrow, barrel, meteo, compost — placed clear of the house at every level),
  `front`; ids in `defs` start with `es-`; `ES_SEASON_CSS` recolours summer under `.estate-v.season-0/2`.
- `life.py` — what moves about: a train on the far ridge, a tractor on the far fields, a boy with a kite, the
  baker and the waiter, a kid on a bicycle, an old man on the street, the yard dog, butterflies, falling leaves and
  petals; in winter snowfall, a sledge and a skier. Everything moving carries `lv` (paused with the village,
  stopped for reduced motion; fallers `lvf` hidden then). Movers' keyframes are generated into `V_SEASON_CSS`,
  the shared ones (fall, flutter, dig, kite…) are in `src/village.css`.
- `roads5.py` — reading SVG path data into points along it.
- `yard.py` — the farmyard over the field in the same style (barrel, fence, gate, crane well, hens, sunflowers):
  `python3 yard.py` rewrites `src/art/yard.ts`; `YardDecor` in `src/art/meadow.tsx` places the pieces.

Python 3, no packages. Markup is kept light: ink is a class (`k`, `kf`, `kn`) coloured by the CSS variable `--vk`
(`src/village.css`), smooth shapes are Béziers, shadows and glows are patterns and gradients, not blur filters.
The road network is shown through `<use>`, where class rules do not reach, so its ink is written as attributes.
Pieces that depend on the farm carry a class (`vc vc-lab`, `vc vc-g-bakery`, …) that the game switches on; moving
parts carry the classes `village.css` animates (sails, cups, vane, flagw, sway, swing, fire, bubbling, bee, nod,
peck, wash, smoke).
