# Промпты для портретов и иллюстраций «Посевной»

Поле, культуры, постройки, фермер, иконки и интерфейс нарисованы в игре вектором. Первая партия картинок (18 портретов, обложка, аватар) уже встроена. Ниже — что ещё нужно (раздел «Вторая партия») и исходные промпты первой партии для справки. Картинки подставляются по именам файлов, без правок кода.

## Как генерировать, чтобы стиль совпадал

1. Сначала сгенерируй **Веру** по промпту ниже. Перегенерируй, пока картинка не понравится: она станет эталоном стиля.
2. Для каждого следующего персонажа **прикладывай картинку Веры** и начинай сообщение так: *«Use the attached image as the style reference: same rendering, outline thickness, shading, palette, framing and transparent background.»* Дальше — промпт персонажа.
3. Формат: PNG, 1024×1024, **прозрачный фон**, по пояс (голова и плечи), персонаж по центру, голова в верхних 60% кадра. Фон делать не нужно: в игре портрет лежит в цветном круге.
4. Названия игры-образца в промптах нет намеренно. Описание стиля даёт свою картинку, а не копию чужой игры, и генератор реже отказывает.
5. Присылай файлы с именами из заголовков (`vera.png`, `marat.png` и т. д.).

## Общий блок стиля

Вставляй его в каждый промпт персонажа после описания:

> Cozy hand-painted 2D farming-game character portrait, not pixel art. Soft cel shading with gentle gradients, clean dark brown outlines (#3f2a1d) of medium thickness, warm saturated palette (leaf green, wheat gold, terracotta, sky blue), slightly chibi proportions with a large head and friendly expressive eyes, rounded shapes, subtle warm rim light. Head and shoulders, centered, facing slightly to the side and looking at the viewer, warm smile. Transparent background, no text, no logos, no frame.

## Главные персонажи

### `vera.png` — Вера, агроном (наставник игрока)
> A young Russian woman agronomist, about 25 years old, auburn hair in a long side braid, freckles, bright green baseball cap with a small leaf patch, denim work overalls over a light checked shirt, a pencil behind her ear, confident and kind expression. [общий блок стиля]

### `marat.png` — Марат, агрофинансист (банк, кредиты)
> A friendly Tatar man in his mid-30s, agricultural finance advisor, short neat black hair, round thin-rimmed glasses, slate-blue knitted vest over a white shirt with rolled sleeves, a small notebook in his hand, calm reassuring smile. [общий блок стиля]

### `palych.png` — Палыч, синоптик-старожил (прогнозы, торги)
> A cheerful old Russian village weather watcher, about 70, bushy white mustache and eyebrows, weathered rosy cheeks, grey flat cap, olive quilted work jacket, a small brass barometer hanging on a strap, squinting knowingly. [общий блок стиля]

### `zina.png` — Зина, соседка (тихие недели, советы по дому)
> A warm talkative Russian village woman about 60, round rosy face, grey hair in a bun under a light-blue headscarf with small white polka dots, pink knitted cardigan, holding a jar of homemade jam, cheerful gossipy grin. [общий блок стиля]

### `buyer.png` — Покупатель (заказы на доске)
> A friendly middle-aged market buyer and restaurant supplier, neat brown mustache, red baseball cap, tan work apron over a cream shirt, a clipboard with an order form in one hand, businesslike but kind smile. [общий блок стиля]

Фермер во дворе остаётся векторным: он анимирован по частям (ноги, рука, инструмент), и картинка из генератора это сломает. Если захочется его перерисовать — нужен спрайт-лист, это отдельная задача.

## Вторая партия — встроена

Всё в том же стиле: прикладывай `vera.png` как эталон, PNG, прозрачный фон для персонажей.

### 1. Недостающие портреты (1024×1024, прозрачный фон)
- `zina.png` и `buyer.png` — промпты выше, в «Главных персонажах». Сейчас в игре на их месте векторные заглушки, они заметно выбиваются.

### 2. Встревоженные лица (1024×1024, прозрачный фон, тот же ракурс и одежда)
Показываются в диалогах с плохими новостями (град, саранча, нехватка на платёж, сорванный заказ). Начинай промпт так: *«Same character as the attached image, same outfit, framing, lighting and transparent background, only the expression changes:»* и дальше:
- `vera_worried.png` — *slightly frowning, eyebrows raised with concern, biting her lip, holding a wilted seedling.*
- `palych_worried.png` — *squinting at the sky with a troubled frown, hand shading his eyes, mustache drooping.*
- `marat_worried.png` — *serious look over his glasses, mouth in a flat line, tapping his notebook with a pen.*
- `zina_worried.png` — *hand on her cheek, worried sympathetic look, eyebrows up.*
- `buyer_worried.png` — *disappointed, arms crossed over the clipboard, shaking his head.*

### 3. Иллюстрации осенних испытаний (1536×864, 16:9, без текста)
Показываются в реплике Палыча, когда он предупреждает об осеннем испытании. Общий блок для всех восьми: *«Cozy hand-painted 2D farming-game illustration in the same style and palette as the attached cover image, soft cel shading, clean dark brown outlines, warm saturated colors, wide 16:9 scene, no text, no letters, no logos, no people in the foreground.»*
- `bosses/droughtyear.png` — Засушливый год: *a cracked dry field under a white-hot sun, wilted sunflowers, an old wooden well with an empty bucket, heat haze.*
- `bosses/exportban.png` — Экспорт закрыт: *a grain elevator with its gates shut and a red-and-white barrier, sacks of wheat and sunflower seeds piling up, grey sky.*
- `bosses/audit.png` — Банковская проверка: *a desk in a small rural bank office stacked with folders and ledgers, a magnifying glass, a rubber stamp, a desk lamp, serious mood.*
- `bosses/plague.png` — Нашествие саранчи: *a dark cloud of locusts descending on a golden field, leaves being eaten, dramatic light.*
- `bosses/earlyfrost.png` — Ранние заморозки: *pumpkins and cabbages covered with frost at dawn, ice crystals on leaves, a few early snowflakes, pale pink sky.*
- `bosses/dumping.png` — Демпинг «Горизонта»: *a village market where a huge grey truck unloads mountains of cheap identical vegetables in front of small farmer stalls.*
- `bosses/inflation.png` — Инфляция: *a seed shop counter with seed packets and fertilizer bags, price tags with upward red arrows, a nearly empty coin purse.*
- `bosses/rainy.png` — Дождливая осень: *heavy rain over a muddy field with deep puddles, rubber boots stuck in the mud, drooping crops, grey clouds.*

## Третья партия — по желанию

Первые две партии встроены полностью. Код для третьей уже готов: файлы с этими именами сами появятся в игре.

### 1. Регионы для стартового экрана (1536×864, 16:9, без текста) — `regions/<id>.png`
Показываются сверху на карточке выбора региона. Общий блок — как у осенних испытаний: *«Cozy hand-painted 2D farming-game illustration in the same style and palette as the attached cover image, soft cel shading, clean dark brown outlines, warm saturated colors, wide 16:9 landscape, no text, no letters, no logos, no people in the foreground.»*
- `regions/chernozem.png` — Черноземье: *flat endless black-earth fields with neat rows, a small farmhouse, birch trees on the horizon, gentle summer sky.*
- `regions/kuban.png` — Кубань: *sunny southern farmland with sunflower and corn fields, a winding river with reeds cutting through the fields, white clay cottage, hot golden light.*
- `regions/volga.png` — Поволжье: *wide dry steppe with sandy patches and golden wheat, the broad Volga river in the distance, a grain elevator, big sky.*
- `regions/nonchernozem.png` — Нечерноземье: *small fields cleared in a pine and birch forest, marshy ponds with cattails, misty morning, wooden village houses.*
- `regions/altai.png` — Алтай: *mountain valley with rocky meadows, a clear mountain stream, beehives and buckwheat in bloom, snow-capped peaks.*

### 2. События недели (1536×864, 16:9, без текста) — `events/<id>.png`
Показываются в утренних новостях над репликой персонажа. Общий блок тот же.
- `events/drought.png` — Засуха: *cracked dry garden beds, wilting seedlings, a hot white sun, an empty watering can.*
- `events/rain.png` — Ливень: *warm summer downpour over vegetable beds, puddles, glistening leaves, a rainbow starting to appear.*
- `events/hail.png` — Град: *dark storm cloud dropping ice pellets onto a field, battered leaves, hailstones on the ground.*
- `events/frost.png` — Заморозок: *frost-covered young seedlings at dawn, icy crystals, pale blue light.*
- `events/warm.png` — Тёплая неделя: *lush green beds in soft warm sunlight, butterflies, plants visibly thriving.*
- `events/locust.png` — Саранча: *a swarm of locusts landing on one patch of a field, close-up of chewed leaves.*
- `events/beetle.png` — Колорадский жук: *striped potato beetles crawling over potato plants, close-up, chewed leaves.*
- `events/superpest.png` — Новый вредитель: *strange glowing purple caterpillars on crops at dusk, eerie but cozy.*
- `events/flood.png` — Паводок: *a river overflowing its banks into the nearest garden beds, muddy water, floating leaves.*
- `events/export.png` — Экспортный спрос: *trucks lining up at a grain elevator, sacks of wheat, a cargo train in the background.*
- `events/crash.png` — Обвал цены: *a village market stall with a mountain of unsold vegetables and price tags crossed out.*
- `events/fair.png` — Ярмарка выходного дня: *a cheerful weekend fair with pumpkins, honey jars and buckwheat sacks, bunting flags.*
- `events/fertprice.png` — Дорогие удобрения: *fertilizer bags in a shop with big red price tags, a farmer's empty coin purse on the counter.*
- `events/helpers.png` — Соседи помогают: *neighbors with hoes and baskets coming down a country road to help on the farm.*
- `events/calm.png` — Спокойная неделя: *a peaceful farm morning, cat sleeping on a fence, steam rising from a cup of tea on the porch.*

## Специалисты (нанимаются зимой)

| Файл | Кто | Промпт (+ общий блок стиля) |
| --- | --- | --- |
| `agronomist.png` | Нина, агроном | A woman in her 40s, dark hair in a bun, light green work shirt, holding a small soil sample jar, focused gentle smile. |
| `foreman.png` | Степан, бригадир | A sturdy man in his 40s, stubble, red cap, orange work jacket with reflective stripe, gloves tucked in pocket, energetic grin. |
| `beekeeper.png` | Пётр, пчеловод | A bearded man in his 50s, wide straw hat with a lifted mesh veil, cream beekeeper shirt, a honey frame in hand, two cartoon bees nearby. |
| `irrigator.png` | Айдар, мелиоратор | A young Kazakh man, short black hair, blue work shirt, coiled green hose over his shoulder, droplets sparkling. |
| `marketer.png` | Ксения, маркетолог | A young woman with a blonde bob, pink cardigan, holding a smartphone showing a little chart, bright smile. |
| `accountant.png` | Галина, бухгалтер | A woman in her 50s, grey hair in a bun, purple blouse, reading glasses, an abacus-style calculator in hand, wise smile. |
| `soilsci.png` | Олег, почвовед | A curly-haired bearded man in his 30s, brown field vest with many pockets, small trowel in hand. |
| `coop.png` | Тамара, кооператор | A warm woman in her 40s, red headscarf over long auburn hair, green blouse, arms open in a welcoming gesture. |
| `mechanic.png` | Руслан, механик | A man in his 30s, navy cap, grey overalls with an oil smudge on the cheek, wrench in hand. |
| `greenhouser.png` | Лиза, тепличница | A young woman with a dark braid, teal apron, holding a small tomato seedling pot. |
| `trader.png` | Артём, трейдер | A sharp young man, short dark hair, glasses, dark navy jacket, tablet showing a rising candlestick chart. |
| `logist.png` | Денис, логист | A man in his 30s, green cap, mustard work jacket, clipboard with a checklist, grain sack behind him. |
| `broker.png` | Эльвира, брокер | A confident woman in her 30s, long black hair, dark blazer, holding a rolled contract with a red wax seal. |
| `riskman.png` | Виктор, риск-менеджер | A grey-haired bearded man in his 50s, glasses, blue shirt, holding a small umbrella with a shield emblem. |
| `breeder.png` | Мария, селекционер | A woman in her 30s, ginger hair in a bun, white lab coat over a green shirt, glasses, holding a pea pod and magnifying glass. |

## Обложка и аватар

### `cover.png` — обложка (стартовый экран, превью в канале, слайд 1)
> Wide 16:9 cozy hand-painted farming game key art, not pixel art. A small Russian family farm at golden hour seen slightly from above: neat rows of crops (wheat, sunflowers, pumpkins, corn, buckwheat with pink flowers), a wooden barn with a red roof, a small glass greenhouse, beehives, a dirt path, birch trees, distant rolling fields and a weathervane. Soft cel shading, clean dark brown outlines, warm saturated palette, gentle sunlight. Empty sky in the upper third for a title. No text, no logos.

### `avatar.png` — аватар Telegram-бота
> Round-icon friendly emblem for a farming game: a seed packet with a green sprout and a golden wheat ear, cozy hand-painted style with dark brown outline, warm palette, centered, fills the frame, plain warm cream background, no text.

## Как картинки встроены

- Портреты: `src/assets/portraits/<id>.webp`, 256×256, ~20 КБ. Встревоженные лица — `<id>_worried.webp`, показываются при плохих новостях. Как портрет садится в кружок, настраивается в `FRAMES` в `src/art/portraits.tsx`.
- Крупные персонажи для диалогов: `src/assets/vn/<id>.webp`, 448×448.
- Осенние испытания: `src/assets/bosses/<id>.webp`, 960×540. Показываются в предупреждении Палыча, по тапу на плашку испытания и на экране осенних торгов.
- Регионы и события (третья партия): `src/assets/regions/<id>.webp` и `src/assets/events/<id>.webp` — подхватятся автоматически.
- Обложка: `src/assets/cover.webp`, аватар для бота: `docs/brand/avatar-512.png`.
