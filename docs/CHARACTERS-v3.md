# «Посевная»: люди вылазок, соперник и встречные

**Дата:** 28.10.2026. К прогрессии v3 (`docs/PROGRESSION-v3.md`): у каждой вылазки свои заказчики и свои встречные, дома — свои.

Правила голоса для всех: живой характер через дело и деталь, без карикатурного диалекта, без жалобного нажима, без обещаний «лечебных свойств». У каждого — одна привычка, одна тайна или слабость и одна линия, которая развивается по цепочке заказов. Реплики короткие: они стоят на карточке заказа и в сцене встречи.

## Как генерировать портреты

Тот же способ, что для первой партии (`docs/ART_PROMPTS.md`, `docs/ART_PROMPTS-v4.md`): прикладывать `vera.png` как образец и начинать с *«Use the attached image as the style reference: same rendering, outline thickness, shading, palette, framing and transparent background.»* PNG 1024×1024, прозрачный фон, по пояс. В конце каждого промпта — блок стиля портрета:

> Cozy hand-painted 2D farming-game character portrait, not pixel art. Soft cel shading with gentle gradients, clean dark brown outlines (#3f2a1d) of medium thickness, warm saturated palette (leaf green, wheat gold, terracotta, sky blue), slightly chibi proportions with a large head and friendly expressive eyes, rounded shapes, subtle warm rim light. Head and shoulders, centered, facing slightly to the side and looking at the viewer. Transparent background, no text, no logos, no frame.

Пока картинок нет, у всех новых людей в игре — векторный портрет из генератора лиц (`src/art/portraits.tsx`).

---

## 1. Соперник

### Аркадий Семёнович Пряхин — крепкий хозяин из Заречья · `rival-pryakhin.png`
**55 лет.** Бывший агроном колхоза, теперь держит половину земли в Заречье и сдаёт участки приезжим. На ярмарке выкупает лучшее, если зазеваешься. Не злодей: гордый, одинокий вдовец, с 1987 года ведёт тетрадь урожаев всего района и уважает только результат.
- **Привычка:** записывает всё карандашом в карманную тетрадь, даже цену чая.
- **Слабость:** яблоневый сад покойной жены засох, и он не может его поднять. Сорт — старая антоновка «Пряхинская».
- **Голос:** сухо, по делу, иногда цитирует старые агрономические справочники.
- **Линия:** сначала перекупает лоты и проверяет арендатора. Если обыграть его на празднике урожая, отдаёт черенок своей антоновки и впервые говорит «сосед».
- **Реплики:** «Земля любит хозяина, а не мечтателя». · «Записал. Посмотрим, что скажет осень». · «Пырей у вас на третьей грядке. Это тоже записал». · «Неплохо. Для приезжего — неплохо».
> A tall gaunt Russian farmer, about 55, short grey crew cut, steel-rimmed round glasses, clean-shaven with deep lines around a stern mouth, quilted dark olive vest over a pressed light blue shirt buttoned to the top, a small pocket notebook with a pencil stub in his hand, a faint wry half-smile.

---

## 2. Заречье — Аренда у Пряхина

Село по ту сторону реки, где земля принадлежит Пряхину. Здесь всё знают про всех, а про Пряхина — больше всех.

### Варвара Кузьминична — чайная «Самовар» у трассы · `org-teahouse.png`
**60 лет.** Держит чайную для дальнобойщиков: пирожки, борщ, и все новости трассы раньше, чем в районе. Громкая и щедрая, всех зовёт «голубчик». Ведёт тетрадь долгов, которые никто не отдаёт, и никогда не требует.
- **Привычка:** считает на старых счётах, хотя есть калькулятор.
- **Тайна:** берёт у Пряхина газеты «почитать» и не возвращает уже двадцать лет; оба делают вид, что не замечают.
- **Хочет:** картофель, капусту, лук, тыкву — на пирожки и борщ.
- **Линия:** пирожки для трассы → борщ на сто тарелок → свадьба племянницы → чайную вписали в путеводитель по трассе, на вывеске — ваша ферма.
- **Реплики:** «Голубчик, у меня фура к обеду, а капуста кончилась». · «Это тебе не ресторан — тут едят, а не фотографируют». · «Пряхин опять заходил, спрашивал, как у тебя дела. Сам не признается, что интересно».
> A plump cheerful Russian roadside tea-house owner, about 60, rosy cheeks, grey hair in a bun under a bright patterned headscarf tied at the back, a flour-dusted apron with big pockets over a red cardigan, holding a tray with a steaming glass of tea in a metal glass holder and a pirozhok, laughing eyes.

### Нелли Марковна — кружок юннатов при школе · `org-school.png`
**28 лет.** Приехала из города учительницей биологии «на год» — живёт пятый. Ведёт кружок юных натуралистов: дети ставят опыты на вашем поле, у каждой грядки табличка и журнал наблюдений. Серьёзная, всё записывает в таблицы, ходит в смешных жёлтых резиновых сапогах.
- **Привычка:** говорит «гипотеза» про всё, даже про погоду.
- **Слабость:** боится коров, но никому не признаётся.
- **Хочет:** образцы разных культур, фасоль, подсолнечник, кукурузу.
- **Линия:** образцы для практикума → опытная делянка → районная олимпиада → «школьный сорт», выведенный вместе с вами.
- **Реплики:** «Гипотеза: фасоль рядом с кукурузой даст больше. Проверим на вашем поле?» · «Дети подписали каждую грядку. Не обижайтесь на „ТЫКВА — КОРОЛЕВА“». · «Нам нужен контрольный образец. То есть самый обычный. Не надо его хвалить».
> A young earnest Russian village biology teacher, about 28, dark hair in a practical braid, big round tortoiseshell glasses, a green raincoat over a striped sweater, bright yellow rubber boots visible at the bottom edge, a clipboard with a seedling chart in one hand and a magnifying glass in the other, a determined little smile.

### Лёва Пряхин — приказчик дяди · `org-steward.png`
**24 года.** Племянник Пряхина, отучился на экономиста в Воронеже, вернулся и работает на дядю: ведёт закупки, считает аренду. Мечтает открыть фермерскую лавку в райцентре. Дядю уважает и побаивается, а арендатору тайком помогает — подсказывает, когда Пряхин собирается на ярмарку.
- **Привычка:** всё считает в таблице на телефоне и показывает графики, даже когда не просят.
- **Тайна:** уже снял помещение под лавку и не знает, как сказать дяде.
- **Хочет:** пшеницу, гречку, ровные крупные поставки.
- **Линия:** пробная партия → контракт на крупу → тайная поставка для своей лавки → лавка открыта, дядя пришёл на открытие.
- **Реплики:** «Дядя сказал взять у вас подешевле. Я записал среднюю цену». · «Только не говорите ему, что я вам сказал: в субботу он едет на ярмарку». · «Смотрите, какой график! Ладно, не смотрите».
> A lanky friendly young Russian man, about 24, messy light brown hair, thin beginner's mustache, a slightly too big tweed jacket over a hoodie, a smartphone showing a bar chart in one hand and a paper invoice in the other, an apologetic hopeful grin.

### Роза Ахметовна — сельский клуб · `org-club.png`
**45 лет.** Завклубом, в молодости пела в районном ансамбле. Ставит спектакли, устраивает праздники урожая, украшает сцену подсолнухами и тыквами. Говорит восклицаниями, верит, что любой праздник спасает село.
- **Привычка:** напевает, когда считает деньги.
- **Слабость:** до сих пор хранит афишу своего единственного концерта в области.
- **Хочет:** подсолнечник, тыкву, клубнику — на украшения и угощение.
- **Линия:** осенний концерт → спектакль «Репка» (нужна настоящая репа — то есть редис!) → праздник урожая → смотр, где выступит и Пряхин.
- **Реплики:** «Без подсолнухов сцена — как без занавеса!» · «Пряхин записался в жюри. Он всегда ставит четвёрки. Даже себе». · «Нужна самая большая тыква. Самая! Это не каприз, это декорация».
> A dramatic warm-hearted Russian village club director, about 45, black hair in a voluminous updo with a sunflower pinned in it, bold red lipstick, large amber earrings, a shawl with a bright floral pattern over a dark dress, one hand raised as if about to sing, an armful of sunflowers.

---

## 3. Кубанская пойма — заказчики переписаны

Имена и файлы портретов прежние (`org-cannery.png` и т. д.); описания и промпты заменяют старые.

### Ирина — технолог консервного завода «Кубанские дары»
**35 лет.** Бывшая чемпионка края по стрельбе из лука: всё делает с первого раза и терпеть не может слово «примерно». Носит три ручки: красной вычёркивает, синей хвалит, зелёной пишет рецепты. Мечтает выпустить ассорти под своим именем.
- **Реплики:** «Мне нужно четырнадцать початков. Не „около пятнадцати“». · «Синей ручкой отмечаю редко. Сегодня — отмечаю». · «Ассорти — это не мешанина. Это баланс».
> A sharp focused Russian food technologist, about 35, dark hair tucked under a white hairnet cap, white lab coat with three pens — red, blue and green — in the breast pocket, holding a glass jar of bright pickled vegetables up to the light and inspecting it with one raised eyebrow.

### Георгий — мастер рисового комбината
**50 лет.** Немногословен, зато поёт, когда рис хороший. Качество проверяет, раскусывая зерно. Сырости не прощает. Держит на комбинате кота по имени Рисовод.
- **Реплики:** «Зерно сухое. Хорошо». · «Слышите? Это я пою. Значит, партия годная». · «Рисовод опять спит на мешке с вашим рисом. Это высшая оценка».
> A sturdy southern Russian rice-mill foreman, about 50, bushy black mustache going grey, blue work overalls dusted with white rice flour, a single rice grain between his teeth, a fat ginger cat draped over his shoulder, calm proud eyes.

### Иван Савельич — атаман станицы
**60 лет.** Знает родословную каждой коровы в станице, споры решает за самоваром. Проигрывает в нарды внуку и гордится этим. К приезжим относится с хитрецой: сначала проверит, держишь ли слово.
- **Реплики:** «Слово дал — держи. Арбузы — тоже». · «Внук опять обыграл. Растёт смена!» · «Кабаны в балке ходят. Мы своих хлопцев на ночь выставим, а ты не зевай».
> A dignified Kuban Cossack elder, about 60, a big grey mustache, a dark Cossack coat (cherkeska) with cartridge pockets on the chest, a tall lambswool papakha hat, a backgammon (nardy) piece between his fingers, a sly friendly squint.

### Захар — пасечник хутора Медовый
**40 лет.** Бывший программист из Москвы, пять лет назад сбежал на хутор. Разговаривает с пчёлами, ведёт блог, который никто не читает, и считает ульи в двоичной системе.
- **Реплики:** «У меня сто один улей. В двоичной — пять. Шучу». · «Пчёлы сегодня нервные. Наверное, суховей идёт». · «Написал про ваш подсолнечник пост. Три просмотра — это успех».
> A calm bearded beekeeper, about 40, sun-tanned, thin rectangular glasses, a straw hat with the bee veil pulled back, a faded t-shirt with a tiny binary-code print under an open linen shirt, a honey frame in his hands, a few bees around, a gentle absent-minded smile.

---

## 4. Алтайская заимка — заказчики переписаны

### Светлана — хозяйка турбазы «Кедр»
**40 лет.** Бывшая альпинистка: сломала ногу на Белухе и осталась внизу «на сезон» — пятнадцать лет назад. Ведёт турбазу как экспедицию: чек-листы, рации, костёр ровно в восемь. Смеётся громче всех и плачет, когда уезжают дети-туристы.
- **Реплики:** «Группа на подходе. Продукты — это не просьба, это снаряжение». · «Костёр в двадцать ноль-ноль. Похлёбка — в двадцать ноль пять». · «Медведь у ручья? Значит, малина поспела. Предупрежу группу».
> A cheerful sturdy Siberian tourist-camp owner, about 40, sandy hair in a high ponytail, sunburned nose, a red fleece vest over a checked flannel shirt, a walkie-talkie clipped to her chest and a carabiner of keys at her belt, holding a laminated checklist, a loud warm laugh caught mid-moment.

### Егор — лесничий
**45 лет.** Говорит мало и по делу. Знает каждого медведя в округе по имени: Хромой, Рыжая, Бухгалтер. В кармане всегда семена кедра — сажает, где проходит.
- **Реплики:** «Бухгалтер вышел к реке. Он считает ульи, не яблоки». · «Гарь — не беда. Через десять лет здесь будет кедр». · «Дым на северном склоне. Окапывайте край поля».
> A quiet bearded Russian forester, about 45, dark green forestry uniform jacket with an oak-leaf patch, a hatchet on his belt, a handful of cedar seeds in his open palm, pine needles on his shoulder, watchful kind eyes.

### Фёдор — председатель пасечного товарищества
**70 лет.** Спорит со всеми о породе пчёл: алтайская тёмная лесная — лучшая, и точка. Пишет стихи про мёд и читает их на собраниях; перебивать не принято.
- **Реплики:** «Тёмная лесная — пчела с характером. Как я». · «Послушайте четверостишие. Нет, лучше два». · «Медведь у нас тоже пасечник. Только без лицензии».
> A wise old Altai beekeepers' chairman, about 70, a long white beard, an embroidered linen shirt, a wooden bee smoker in one hand and a folded sheet of handwritten verse in the other, gentle stubborn eyes.

### Лидия Андреевна — главврач санатория «Сосны»
**55 лет.** Строгая и смешливая сразу. Всех угощает клюквенным морсом и выгоняет на прогулки. Терпеть не может слово «панацея». Собирает старинные аптечные пузырьки.
- **Реплики:** «Морс — это не лекарство. Это морс. И он вкусный». · «Отдыхающие спрашивают, чья капуста. Я сказала — ваша». · «Пузырёк тысяча девятисотого года. Не трогайте, пожалуйста».
> A kind but strict Russian chief physician, about 55, short silver hair, half-moon glasses on a chain, a white doctor's coat with a stethoscope, holding a tall glass of red cranberry mors with ice, a tiny antique pharmacy bottle peeking from her pocket, a stern face just about to break into a smile.

---

## 5. Встречные — приходят в лагерь на вылазке

Раз в две-три недели (не зимой) к лагерю кто-то приходит. Выбор — сразу, до конца недели; промолчать — тоже выбор.

### Кубань

**Студенты-археологи — Даша и профессор Семён Ильич** · `visit-archaeologists.png`
Даша (20) раскопала курган у соседей и уверена, что следующий — под вашим полем. Профессор (70) с лупой на шнурке давно ничего не ищет — он рассказывает.
- *«Можно шурф на одной грядке? Три недели, честное слово».* → Разрешить (грядка закрыта на 3 недели; в половине случаев — находка: скифская бусина) · Отказать.
> Two archaeologists: an energetic young woman, about 20, in a sun hat and a dusty t-shirt holding a trowel, and a tiny elderly professor, about 70, with a white goatee and a big magnifying glass on a cord, both beaming. Two characters side by side, head and shoulders.

**Чабан Яков с отарой** · `visit-shepherd.png`
Бывший тракторист, теперь гонит отару по стерне. Молчаливый, в бурке даже летом.
- *«Пустишь отару по пустым грядкам? Навоз — тебе, трава — им».* → Пустить (пустые грядки +1 плодородие, но молодые всходы у края теряют неделю роста) · Пустить за плату (он платит, но ест больше) · Отказать.
> A weathered silent Russian shepherd, about 55, a felt burka cloak over his shoulders, a long crook staff, a sheep peeking in from the side of the frame, squinting at the sun.

**Бахчевник Петро Никифорович** · `visit-melonman.png`
Знает про арбузы всё и немного больше. Продаёт семена «сахарного» сорта, которые вывел сам.
- *«Сахарный, урожайный. Отдам горсть — для хорошего человека дешевле».* → Купить (карта арбуза с признаком «урожайный») · Отказать.
> A jolly round Russian melon grower, about 65, a huge straw hat, an embroidered shirt, a big striped watermelon cut open in his arms showing red flesh, a twinkle in his eye.

**Казачий разъезд — урядник Гордей** · `visit-patrol.png`
Молодой и важный, на рыжем коне. Станица выставляет ночные посты от кабанов.
- *«За арбузы постоим у твоего поля неделю»* → Отдать 4 арбуза (кабаны не придут две недели, станица довольна) · Отказать.
> A proud young Cossack patrol leader, about 25, a papakha tilted back, a neat cherkeska, a lantern in one hand, the head of a chestnut horse beside him.

### Алтай

**Охотник Афанасьич с лайкой** · `visit-hunter.png`
Восемьдесят лет в тайге. Знает медведей, как соседей. Лайка Пурга умнее большинства людей.
- *«Хромой к ручью ходит. Могу посторожить пару ночей».* → Нанять (2 недели медведь не тронет) · Отдать 4 мёда за щенка от Пурги (находка «Лайка Пурга») · Отказать.
> An old Siberian hunter, about 80, a weathered face with a white stubble, a fur hat with ear flaps, a patched quilted jacket, a white-and-grey husky-like laika dog pressing its head into his hand.

**Геолог Алла Викторовна** · `visit-geologist.png`
С молотком, рюкзаком и картой, исчерченной карандашом. Ищет то ли нефрит, то ли молодость.
- *«Переночевать пустите? Я плачу картами».* → Накормить (3 ед. урожая; находка «Старая карта») · Отказать.
> A tough cheerful Russian field geologist, about 50, short grey-streaked hair under a bandana, a rock hammer on her belt, a big map tube on her shoulder, a pebble held up to the light with a satisfied look.

**Погорельцы — Николай Звягин с семьёй** · `visit-firefamily.png`
Деревню за перевалом зацепил пожар. Николай — плотник, рукастый и гордый, просит не милостыню, а работу.
- *«Возьмёшь на время? Руки есть, инструмент есть».* → Взять (работник на 6 недель бесплатно) · Дать денег (слава +5) · Отказать.
> A tired but proud Russian carpenter, about 40, soot on his cheek, a cap, a canvas toolbag over his shoulder, a small daughter peeking from behind his arm holding a rescued cat.

**Шишкари — бригадир Костя** · `visit-pinecones.png`
Артель кедровых шишкарей. Шумные, весёлые, с колотами и мешками.
- *«Дай побить кедрач у твоего края — заплатим сразу».* → Разрешить (деньги сейчас, грибов до осени меньше) · Отказать.
> A cheerful scruffy pine-cone gatherer, about 30, a beanie, a striped sailor undershirt under an open work jacket, a heavy wooden mallet over his shoulder, a sack of cedar cones, sap on his fingers.

### Везде

**Коробейник дядя Гриша** · `visit-peddler.png`
Объезжает хутора на велосипеде с прицепом. Продаёт «нужные вещи»: одну редкую находку за деньги.
> A wiry talkative Russian peddler, about 65, a flat cap, a waistcoat with many pockets, a bicycle handlebar with a bell in the corner, holding up an old brass object with a showman's grin.

**Почтальонка Нюра** · `visit-postwoman.png`
Везёт письмо из дома: новости и небольшая весточка (деньги, семена или кто-то ищет работу).
> A brisk friendly Russian village postwoman, about 35, a dark blue postal jacket, a big leather mail bag across her body, an envelope in her raised hand, wind-blown hair.

### Заречье

**Пряхин с проверкой.** Раз в сезон обходит арендованное поле с тетрадью. Сорняки и запущенные грядки — повод поднять аренду, чистое поле — повод промолчать (это и есть похвала).

---

## 6. Соседи дома (фаза 4, для заказа картинок заранее)

- **Зина** — соседка, уже в игре. Восстановленный двор: тёплая изба, теплица, внук Миша.
- **Кузнец Савва** · `neighbor-smith.png` — 50 лет, огромный и тихий, в кузне поёт басом, чинит всё, кроме своей калитки. > A huge gentle Russian blacksmith, about 50, a soot-streaked leather apron, rolled sleeves, a hammer resting on his shoulder, a soft shy smile under a black beard.
- **Плотник Ефим** · `neighbor-carpenter.png` — 35 лет, щеголь в чистой рубахе, у которого стружка — в волосах всегда. > A dapper young Russian carpenter, about 35, a clean embroidered shirt, curly hair with wood shavings in it, a pencil behind his ear, a folding ruler in his hand.
- **Мельник Матвей** · `neighbor-miller.png` — 65 лет, белый от муки, мечтает, чтобы мельница снова махала крыльями. > An old flour-white Russian miller, about 65, bushy eyebrows dusted with flour, a linen shirt and a felt cap, a wooden scoop of grain, wistful eyes looking up.
- **Татьяна Карпова с детьми** · `neighbor-karpova.png` — 38 лет, вдова, четверо детей, всё успевает и никого не просит. > A strong tired-but-smiling Russian mother, about 38, hair in a kerchief, a quilted vest, a toddler on her hip and three kids' heads around her, a basket of potatoes.
