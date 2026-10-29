# Промпты v5 · привести портреты и обложку к одному стилю (29.10.2026)

## Диагноз

В игре три поколения портретов, и в сценах-новеллах они стоят рядом:

| Пакет | Файлы | Как выглядит | Где виден |
|---|---|---|---|
| **A · «книжная иллюстрация», 768 px** | pryakhin, savva, efim, matvey, karpova, varvara, nelli, leva, roza, georgiy, dasha, yakov, petro, gordey, afanasich, alla, nikolay, kostya, grisha, nyura | мягкая гуашь/акварель с текстурой кисти, приглушённая земляная палитра, реальные пропорции, тонкий тёплый контур | Пряхин, соседи, Заречье, встречные |
| **B · «мягкая сказка», ~1200 px** | olga, anna, timofey, arseniy, boris, ivan, zakhar, svetlana, egor, fedor, lidiya, katya, misha | близко к A: мягкие тени, приглушённые цвета, чуть больше гладкости | заказчики дома, Кубани и Алтая |
| **C · «глянцевый 3D-мульт», 256 px** | palych, marat, zina, vera, buyer (+ `_worried`), 10 работников, scientist, agronomist… | блестящая «диснеевская» кожа, огромные глаза, насыщенные цвета, пластиковые блики; 256 px растягивается в сцене до 300–440 px и мылится | **Палыч на интро и в обучении, Марат и Пряхин в первое утро, Зина при выкупе** — первые лица, которые видит игрок |
| Особняком | irina | стикер с белой обводкой, жирный cel-shading | заказчик Кубани |
| Особняком | dasha = nelli | **одна и та же картинка** у студентки-археолога и у руководительницы юннатов | встречные Кубани / Заречье |
| Обложка | cover.webp | мягкая AI-живопись другого регистра, **американский красный амбар** с петухом-флюгером справа | интро, шапка карты |

A и B совместимы и вместе составляют 33 из 55 используемых портретов — это и есть стиль игры. Перерисовать нужно пакет C (хотя бы пять «сюжетных» лиц с их тревожными вариантами), Ирину, Дашу и обложку. Работники (10 штук из пакета C) видны только как маленькие аватары в «Доме» и «Лабе» — их можно оставить на потом.

**Эталон стиля — `src/assets/portraits/pryakhin.webp`** (запасные: `karpova.webp`, `boris.webp`). Старый эталон `vera.png` из `ART_PROMPTS.md` больше не использовать: это как раз пакет C.

## Как генерировать

- К каждому запросу прикладывать `pryakhin.webp` (а для `_worried` — только что сделанный «спокойный» портрет того же персонажа).
- Начинать с фразы: *«Use the attached image strictly as the style reference — same medium, brushwork, line weight, shading, palette saturation, proportions and level of detail. New character, do not copy the face or clothes of the reference.»*
- Потом — описание персонажа (ниже), потом — **блок стиля**, потом — **блок формата**.
- Размер **1024 × 1536** (2:3, портретный). В игре фигура показывается во весь рост сцены (до 440 px высотой на десктопе, 280 px на телефоне) — квадрат 1024×1024 даёт слишком мелкую голову, а 256 px мылится. Готовый PNG конвертировать в webp (`cwebp -q 82 -resize 768 0`) и положить в `src/assets/portraits/<id>.webp` — подключится сам.
- Для пяти сюжетных лиц делать **пару**: `<id>.webp` и `<id>_worried.webp` в одном кадре и одежде.

**Блок стиля (общий для всех портретов):**
> Storybook illustration for a cozy Russian farming game, hand-painted look: soft gouache and watercolour shading with visible brush texture and paper grain, muted earthy palette (ochre, moss green, clay, faded indigo, cream), thin warm-brown line (#5a3a22) used sparingly on contours and folds, gentle warm side light from the upper left, realistic yet friendly proportions with normal-sized eyes and real noses, calm natural expression. NOT a 3D render, NOT Pixar/Disney style, NO glossy plastic skin or specular highlights, NO oversized anime eyes, NO thick black outlines, NO white sticker outline, NO bloom or lens flare, no neon or candy colours.

**Блок формата:**
> Three-quarter view, waist-up figure cut cleanly at the hips with a straight bottom edge so it can stand on a dialogue box; head in the upper third with ~5% headroom; the character turned slightly to the right and looking at the viewer. Fully transparent background (PNG alpha), nothing behind the figure, no ground shadow, no frame, no text, no logo, no watermark. 1024×1536.

**Для тревожного варианта (`_worried`) добавить вместо последней фразы описания:**
> Same character, same clothes, same framing and same lighting as the attached portrait, but now worried: eyebrows drawn together and raised at the inner ends, lips pressed, a small anxious gesture (one hand lifted, fingers slightly spread, or a hand at the chest), shoulders a little tense. Still kind, not angry, not crying.

---

## 1. Сюжетные лица (пакет C → стиль A)

### `palych.webp` + `palych_worried.webp` — Палыч, старожил и наставник
Голос: тёплый, неторопливый, объявляет звания и ведёт обучение. Сохранить узнаваемость нынешнего: седая широкая борода, усы, кепка, стёганая куртка, часы на шнурке.
> An elderly Russian village old-timer, about 70, broad white beard and thick white moustache, rosy weathered cheeks, kind pale-blue eyes with crow's feet, a grey tweed flat cap, a quilted olive-green work jacket over a blue-and-brown checked flannel shirt, an old brass pocket watch hanging on a cord around his neck, a small radish with its leaves held up in one hand as if showing it, warm half-smile of a patient teacher. Russian countryside, not a Western farmer.

### `marat.webp` + `marat_worried.webp` — Марат, банк
Голос: вежливый, корректный, про залог и выкуп дома. Сохранить: молодой, очки, синий вязаный жилет, белая рубашка, зелёная папка с ростком.
> A polite young Russian bank clerk, about 28, short neat black hair, thin round glasses, clean-shaven, a navy knitted sleeveless vest over a crisp white shirt with sleeves rolled to the elbow, a slim dark-green ledger folder with a small embossed sprout emblem held against his chest, a reserved friendly smile, the look of someone who brings paperwork but means well.

### `zina.webp` + `zina_worried.webp` — Зина, соседка через забор
Голос: добрая, хлопотливая, меняется овощами на компост и варенье. Сохранить: полная пожилая женщина, седой пучок под синим платком в горошек, розовая кофта, банка варенья.
> A plump warm-hearted Russian village neighbour, about 65, silver hair in a bun under a blue kerchief with small white polka dots tied behind the head, round rosy face, laugh lines, a hand-knitted dusty-pink cardigan over a brown-and-cream checked apron, holding a glass jar of red berry jam with a cloth lid tied with string, offering it over an imaginary fence with a cheerful conspiratorial smile.

### `vera.webp` + `vera_worried.webp` — Вера, агроном (голос поля)
Говорит о дроне и засохших посадках. Сохранить: рыжая коса, зелёная кепка с ростком, клетчатая рубашка, джинсовый комбинезон.
> A young Russian agronomist, about 26, long copper-red hair in a single thick braid over her shoulder, freckles, green eyes, a moss-green baseball cap with a small white sprout emblem, a light green-and-cream gingham shirt under a faded denim bib overall, a soil moisture probe or a small notebook with a pencil in her hand, attentive practical expression, sleeves rolled up, a smudge of earth on one cheek.

### `buyer.webp` + `buyer_worried.webp` — Покупатель (перекупщик у ворот)
Говорит про ящики во дворе и продажу урожая. Сохранить: кепка, усы, светлая рубашка.
> A middle-aged Russian wholesale produce buyer, about 50, weather-beaten tan, a thick dark moustache, a rust-red flat cap, a cream linen shirt with the top button open under a brown corduroy waistcoat, a folded invoice and a stub of pencil in his breast pocket, one hand resting on the edge of a wooden vegetable crate, a shrewd but good-natured appraising look.

## 2. Ирина — убрать стикер

### `irina.webp` — технолог консервного завода «Кубанские дары»
> A sharp, focused Russian food technologist, about 35, dark hair tucked under a white hairnet cap, a white lab coat with a small factory badge and three pens — red, blue and green — in the breast pocket, holding a glass jar of bright pickled vegetables up to the light at eye level and inspecting it with one raised eyebrow, lips pressed in concentration. Clean soft painterly rendering, no outline around the figure.

## 3. Даша — своя картинка вместо копии Нелли

### `dasha.webp` — студентка-археолог (встречная на Кубани)
> An energetic young Russian archaeology student, about 20, sun-tanned, short dark hair under a wide straw sun hat, a dusty grey t-shirt and a field vest with many pockets, a trowel in one hand and a small clay potsherd in the other, dirt under her fingernails, beaming excited grin, a coil of measuring tape on her belt.

## 4. Обложка

### `cover.webp` — вид на хозяйство (1536×1024, 3:2, непрозрачная)
Сейчас: американский амбар. Нужно русское Черноземье в стиле игры; нижняя треть спокойная (там заголовок «Посевная»).
> Storybook illustration of a Russian black-earth village homestead at golden morning light, hand-painted gouache look with visible brush texture, muted earthy palette: in the foreground neat dark-soil vegetable beds with cabbage, carrots and sunflowers along a sandy path; a log izba with carved white window frames and a tin roof, a low wattle fence, a well with a long crane-pole (журавль), a few beehives under birches; behind, rolling fields of wheat, a slow river with a wooden footbridge, a distant village with a small church dome, haystacks; soft clouds. No red American barn, no silos, no people, no text, no logo. Keep the lower third calm and uncluttered. Consistent with the attached portrait style (same medium and palette).
К запросу приложить `pryakhin.webp` и, как второй референс, скриншот поля из игры — чтобы палитра зелени и земли совпала с векторной частью.

## 5. По желанию, позже

- **Работники (10, пакет C, 256 px):** foreman, agronomist, irrigator, beekeeper, marketer, mechanic, breeder, soilsci, logist/watchman, greenhouser — видны как аватары 64–170 px; описания в `ART_PROMPTS-v4.md` (`watchman.png`) и `ART_PROMPTS.md`, стиль — блоки выше, размер 1024×1024, по плечи.
- **nikolay.webp** — грубее остальных в пакете A; описание в `CHARACTERS-v3.md` («Погорельцы»).
- **Сцены испытаний** `bosses/earlyfrost|plague|droughtyear.webp` — другой, более «постерный» стиль; если останется время, перегенерировать тем же блоком стиля, 1536×1024, без людей.

## Что уже сделано в коде 29.10
- Лишние портреты (coop, broker, accountant, riskman), папка `assets/vn/` и пять неиспользуемых картинок испытаний удалены; большие портреты ужаты до 768 px; шрифты Alegreya переведены в subset-woff2. Сборка 15,9 → 11,5 МБ.
