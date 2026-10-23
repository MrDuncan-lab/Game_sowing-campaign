# Картинки для v4

Всё новое в v4 нарисовано вектором прямо в коде: дом, лаборатория, амбар, работники-человечки, питомцы, гербы организаций, 12 новых культур, значки. Игра полная и без этих картинок. Растр улучшит только места, где сейчас стоит простая заглушка. Пришли файлы с именами из заголовков, и я их подключу.

Порядок: сначала **А**, потом **Б**. **В** — по желанию.

## Как генерировать
- **Портреты.** Тот же способ, что для первой партии (`docs/ART_PROMPTS.md`): прикладывай `vera.png` как образец стиля и начинай с *«Use the attached image as the style reference: same rendering, outline thickness, shading, palette, framing and transparent background.»* Формат PNG 1024×1024, прозрачный фон, по пояс.
- **Сцены** (места на карте, интерьеры). Прикладывай `cover.webp` как образец и вставляй блок стиля сцены. Формат PNG, 1536×1024 (3:2).

**Блок стиля портрета:**
> Cozy hand-painted 2D farming-game character portrait, not pixel art. Soft cel shading with gentle gradients, clean dark brown outlines (#3f2a1d) of medium thickness, warm saturated palette (leaf green, wheat gold, terracotta, sky blue), slightly chibi proportions with a large head and friendly expressive eyes, rounded shapes, subtle warm rim light. Head and shoulders, centered, facing slightly to the side and looking at the viewer. Transparent background, no text, no logos, no frame.

**Блок стиля сцены:**
> Cozy hand-painted 2D farming-game illustration, not pixel art, not photorealistic. Soft cel shading, clean dark brown outlines (#3f2a1d), warm saturated palette, rounded friendly shapes, gentle morning light, slight top-down three-quarter view. Leave the lower third calm and uncluttered (UI text will sit there). No text, no logos, no people in the foreground.

---

## А. Обязательно (4 файла)

### `loc-chernozem.png` — Черноземье, родная деревня
> A gentle rolling Russian countryside farm in black-earth land: dark rich plowed soil in neat beds, a small wooden house with a carved window frame, a red barn, a few birch trees, a village with a little church dome far away, wheat field edges, soft summer sky. [блок стиля сцены]

### `loc-kuban.png` — Кубанская пойма, хутор у реки
> A hot sunny southern Russian farmstead by a wide slow river: white-washed clay hut with a reed roof, irrigation ditches (aryks) shining with water between green rice paddies, a sandy melon patch with striped watermelons, sunflowers, poplars, hazy heat in the air. [блок стиля сцены]

### `loc-altai.png` — Алтайская заимка в тайге
> A small log cabin homestead in a Siberian Altai taiga clearing: dark cedar and fir forest around, tree stumps from fresh clearing, mossy rocks, a little mountain stream, a row of wooden beehives, sea-buckthorn bushes with orange berries, snowy mountain peaks in the distance, crisp cool air. [блок стиля сцены]

### `watchman.png` — Михалыч, сторож
Сейчас у него временно стоит портрет кладовщика.
> A stocky elderly Russian night watchman, about 65, grey stubble, kind but stern eyes, warm ear-flap hat (ushanka) pushed back, dark green padded jacket (telogreika), holding a flashlight, a small whistle on a cord. [блок стиля портрета]

## Б. Лица организаций (13 файлов)

Сейчас у организаций гербы. С портретами карточка заказа станет живее: лицо рядом с гербом и именем.

**Черноземье**
- `org-orphanage.png` — воспитательница Ольга Петровна. *A warm middle-aged Russian kindergarten teacher, about 50, short curly chestnut hair, round glasses on a chain, mustard knitted cardigan over a flowered blouse, caring smile.*
- `org-council.png` — глава поселения Анна Сергеевна. *A composed Russian village head woman, about 45, neat bun, light grey jacket with a small enamel pin, a clipboard with papers, polite but businesslike look.*
- `org-bakery.png` — пекарь Тимофей. *A jolly round-faced young Russian baker, about 30, flour on his cheeks, white baker's cap and apron, holding a golden loaf of bread.*
- `org-restaurant.png` — шеф Арсений. *A stylish Russian chef, about 35, trimmed dark beard, white double-breasted chef jacket with rolled sleeves, a small tasting spoon, confident raised eyebrow.*
- `org-college.png` — преподаватель Борис Ильич. *An elderly Russian agronomy professor, about 65, tidy white beard, tweed jacket with elbow patches, a sprouting seedling in a small pot in his hand, wise look over half-moon glasses.*

**Кубанская пойма**
- `org-cannery.png` — технолог Ирина. *A brisk Russian food technologist, about 35, dark hair under a white hairnet cap, white lab coat with a factory badge, holding a glass jar of tomatoes.*
- `org-ricemill.png` — мастер Георгий. *A sturdy southern Russian mill foreman, about 50, bushy black mustache, blue work overalls dusted with rice flour, a hard hat tucked under his arm.*
- `org-stanitsa.png` — атаман Иван Савельич. *A dignified Kuban Cossack elder, about 60, big grey mustache, traditional dark Cossack coat (cherkeska) with gazyr cartridge pockets, a tall lambswool papakha hat, proud friendly smile.*
- `org-beekeepers.png` — пасечник Захар. *A calm southern Russian beekeeper, about 40, sun-tanned, straw hat with the bee veil pulled back, light shirt, a honey frame in his hands, a few bees around.*

**Алтайская заимка**
- `org-camp.png` — хозяйка турбазы Светлана. *A cheerful Siberian tourist-camp owner, about 40, sandy hair in a ponytail, red fleece vest over a checked flannel shirt, a hiking map in her hand.*
- `org-forestry.png` — лесничий Егор. *A quiet bearded Russian forester, about 45, dark green forestry uniform jacket with an oak-leaf patch, a hatchet on his belt, pine needles on his shoulder.*
- `org-apiarists.png` — председатель Фёдор. *A wise old Altai beekeepers' chairman, about 70, long white beard, embroidered linen shirt, wooden smoker in his hand, gentle eyes.*
- `org-sanatorium.png` — главврач Лидия Андреевна. *A kind Russian chief physician, about 55, short silver hair, white doctor's coat with a stethoscope, a cup of herbal tea with sea-buckthorn.*

К каждому — блок стиля портрета.

## В. По желанию

### Питомцы (5 файлов, 1024×1024, прозрачный фон, животное целиком, сидит)
Для зала славы и наград. На поле и в доме останутся векторные.
- `pet-dog.png` — Дружок, дворовый пёс. *A loyal scruffy village mutt, tan and white, one floppy ear, red collar, sitting and wagging.*
- `pet-cat.png` — Барсик, кот. *A fluffy grey tabby barn cat with white paws, sitting proudly, tail curled.*
- `pet-geese.png` — Га-Га, гуси. *Two white farm geese with orange beaks, one honking.*
- `pet-hedgehog.png` — Фыр, ёж. *A round little hedgehog sniffing, holding a tiny apple on its spines.*
- `pet-goat.png` — Маня, коза. *A friendly white goat with small horns and a little bell on a collar, chewing grass.*

К каждому:
> Cozy hand-painted 2D farming-game animal, not pixel art, soft cel shading, clean dark brown outlines (#3f2a1d), warm palette, cute rounded proportions, full body, centered. Transparent background, no text.

### Интерьеры (3 файла, сцены 1536×1024)
Фон для шапок разделов вместо векторных: сверху ляжет интерфейс, поэтому середина должна быть спокойной.
- `room-house.png` — *a cozy Russian farmhouse room: wooden log walls, a white tiled stove, a long bench and a table with a samovar, a window with lace curtains looking at the field, empty spots on the bench for characters.*
- `room-lab.png` — *a small rural breeding laboratory in a wooden annex: workbench with seed trays, a microscope, labeled jars of seeds, seedlings under a grow lamp, a chalkboard with a plant cross diagram (no readable text).*
- `room-barn.png` — *the inside of a wooden barn: shelves with crates of vegetables, sacks of grain, a weighing scale, hanging onions and garlic braids, warm light through the boards.*

Культуры, постройки, фермер и значки остаются векторными: растр рядом с вектором на поле будет выбиваться по стилю.
