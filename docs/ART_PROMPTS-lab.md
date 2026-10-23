# Лёва, селекционер лаборатории — картинки

В игре Лёва уже есть: векторная модель в лаборатории (`src/art/scientist.tsx`) стоит за столом,
смотрит в лупу, записывает, поднимает глаза на игрока. Его реплики в облачке подсказывают, что сейчас на столах.
Растровый портрет нужен для облачка: когда файл появится, он сам встанет рядом с репликой.

Кто он: Лев Аркадьевич, для всех просто Лёва. Около 28 лет, аспирант Бориса Ильича из агроколледжа.
Увлечённый, немного рассеянный, добрый. Знает про каждое семечко на полке.
Внешность (как у векторной модели, чтобы растр и вектор совпали): рыжие кудри, веснушки,
круглые проволочные очки, белый лабораторный халат нараспашку поверх зелёно-кремового полосатого
свитера, карандаш за ухом, в нагрудном кармане карандаш и красный пакетик семян, в руке лупа.

## Как генерировать
Как и прошлые портреты (`docs/ART_PROMPTS.md`, `docs/ART_PROMPTS-v4.md`): приложи `vera.png` как образец стиля
и начинай с фразы
*«Use the attached image as the style reference: same rendering, outline thickness, shading, palette, framing and transparent background.»*

**Блок стиля портрета:**
> Cozy hand-painted 2D farming-game character portrait, not pixel art. Soft cel shading with gentle gradients, clean dark brown outlines (#3f2a1d) of medium thickness, warm saturated palette (leaf green, wheat gold, terracotta, sky blue), slightly chibi proportions with a large head and friendly expressive eyes, rounded shapes, subtle warm rim light. Head and shoulders, centered, facing slightly to the side and looking at the viewer. Transparent background, no text, no logos, no frame.

## Обязательно

### `scientist.png` — Лёва (PNG 1024×1024, прозрачный фон, по пояс)
> A young enthusiastic Russian plant breeder scientist, about 28, a mop of bright curly ginger-copper hair, freckles across the nose and cheeks, round thin wire-rimmed glasses, a warm curious smile. An open white lab coat with rolled-up sleeves over a knitted sweater with horizontal leaf-green and cream stripes. A yellow pencil tucked behind his ear, a pencil and a small red seed packet in the breast pocket of the coat. He holds a brass magnifying glass up near his face with one hand, peering at a tiny bean sprout in a small clay pot held in the other hand. [блок стиля портрета]

## По желанию

### `scientist_worried.png` — тот же Лёва, озабоченный (1024×1024)
Подставляется сам там, где нужен встревоженный вид (когда понадобится в репликах).
> The same young ginger-haired plant breeder in the same clothes, glasses slid down his nose, eyebrows raised in mild worry, scratching his curly head with the pencil, holding a clipboard with notes. [блок стиля портрета]

### `scientist-body.png` — в полный рост (PNG 1024×1536, прозрачный фон)
Если позже захочется растровую фигуру в самой лаборатории вместо векторной. Тогда её нужно будет
разрезать на части (голова, руки) для анимации; сейчас анимирована векторная модель.
> Full-body standing pose of the same young ginger-haired plant breeder, three-quarter view facing right, a magnifying glass in the right hand raised forward, a wooden clipboard with papers in the left hand held against his side, brown trousers and brown shoes, the lab coat reaching his knees. Same cozy hand-painted farming-game style, clean dark brown outlines (#3f2a1d), soft cel shading, transparent background, no text.
