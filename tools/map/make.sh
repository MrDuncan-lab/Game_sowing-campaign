#!/bin/sh
# Rebuilds src/assets/map-base.webp: parchment → SVG page → 4× screenshot → WebP.
# usage: sh tools/map/make.sh <old-standard-tt fontsource dir>
set -e
cd "$(dirname "$0")/../.."
mkdir -p tools/map/out
python3 tools/map/parchment.py tools/map/out/parchment.png
npx tsx --tsconfig tsconfig.tools.json tools/map/build.tsx tools/map/out "$1"
node tools/map/render.cjs tools/map/out
python3 -c "from PIL import Image; Image.open('tools/map/out/map.png').convert('RGB').save('src/assets/map-base.webp', 'WEBP', quality=84, method=6)"
