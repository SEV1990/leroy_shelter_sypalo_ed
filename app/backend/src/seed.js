// Initial content — mirrors the original design. Photos point at the local
// assets shipped with the frontend (animalN.jpg == p1..p12, teamN.jpg).

export const SEED_ANIMALS = [
  { name: 'Джек Кардан', type: 'dog', gender: 'м', age: '3 роки', breed: 'Вівчарка', status: 'shelter', descr: 'Дружелюбний пес.', photo: '/assets/img/animal1.jpg' },
  { name: 'Бусоля', type: 'dog', gender: 'ж', age: '2 роки', breed: 'Метис', status: 'shelter', descr: 'Ніжна та лагідна.', photo: '/assets/img/animal2.jpg' },
  { name: 'Сарбона', type: 'dog', gender: 'ж', age: '4 роки', breed: 'Середня', status: 'shelter', descr: 'Спокійна.', photo: '/assets/img/animal3.jpg' },
  { name: 'Барон', type: 'dog', gender: 'м', age: '5 років', breed: 'Вівчарка', status: 'shelter', descr: 'Потрібен досвідчений господар.', photo: '/assets/img/animal4.jpg' },
  { name: 'Малиш', type: 'dog', gender: 'м', age: '1 рік', breed: 'Метис, малий', status: 'shelter', descr: 'Молодий та енергійний.', photo: '/assets/img/animal5.jpg' },
  { name: 'Ріка', type: 'dog', gender: 'ж', age: '3 роки', breed: 'Лабрадор-метис', status: 'foster', descr: 'На перетримці. Ніжна.', photo: '/assets/img/animal6.jpg' },
  { name: 'Мія', type: 'dog', gender: 'ж', age: '2 роки', breed: 'Метис', status: 'shelter', descr: 'Весела та грайлива.', photo: '/assets/img/animal7.jpg' },
  { name: 'Адік', type: 'dog', gender: 'м', age: '6 років', breed: 'Вівчарка', status: 'shelter', descr: 'Мудрий пес.', photo: '/assets/img/animal8.jpg' },
  { name: 'Шархан', type: 'dog', gender: 'м', age: '4 роки', breed: 'Великий', status: 'adopted', descr: '✅ Знайшов родину!', photo: '/assets/img/animal9.jpg' },
  { name: 'Сірий', type: 'dog', gender: 'м', age: '3 роки', breed: 'Метис, сірий', status: 'shelter', descr: 'Вірний пес.', photo: '/assets/img/animal10.jpg' },
  { name: 'Єва', type: 'cat', gender: 'ж', age: '2 роки', breed: 'Таббі, сіра', status: 'shelter', descr: 'Ніжна кішечка.', photo: '/assets/img/animal11.jpg' },
  { name: 'Мурчик', type: 'cat', gender: 'м', age: '1 рік', breed: 'Руде кошеня', status: 'adopted', descr: '✅ Прилаштований!', photo: '/assets/img/animal12.jpg' },
];

export const SEED_TEAM = [
  { name: 'Олексій Коваль', role: 'Засновник · Керівник евакуацій', descr: 'З першого дня організовує виїзди в зони бойових дій. Особисто бере участь у найнебезпечніших операціях.', photo: '/assets/img/team1.jpg', sort: 1 },
  { name: 'Марія Лисенко', role: 'Ветеринарний координатор', descr: 'Ветеринарка з 10-річним досвідом. Забезпечує медичний супровід всіх евакуйованих тварин.', photo: '/assets/img/team2.jpg', sort: 2 },
  { name: 'Дмитро Савченко', role: 'Логістика · Транспорт', descr: 'Організовує всі маршрути евакуації. Знає кожну дорогу Донеччини та Херсонщини.', photo: '/assets/img/team3.jpg', sort: 3 },
  { name: 'Аня Петренко', role: 'Куратор шелтеру', descr: 'Відповідає за щоденний догляд тварин. Організовує пошук нових родин.', photo: '/assets/img/team4.jpg', sort: 4 },
  { name: 'Сергій Іванченко', role: 'Волонтер-евакуатор', descr: 'Понад 50 виїздів. Спеціалізується на роботі з агресивними тваринами.', photo: '/assets/img/team5.jpg', sort: 5 },
  { name: 'Катерина Мороз', role: 'SMM · Комунікації', descr: 'Веде Telegram-канал на 7 000+ підписників. Організовує благодійні заходи.', photo: '/assets/img/team6.jpg', sort: 6 },
];

// Enclosures for the shelter map. block: 'top' | 'bottom'.
// status: 'occ' (occupied) | 'empty' | 'nof' (non-functional). span: 1 | 2.
export const SEED_ENCLOSURES = [
  // top block
  { code: '10', occupant: '—', status: 'empty', span: 1, block: 'top', sort: 1 },
  { code: '11', occupant: 'Малиш', status: 'occ', span: 1, block: 'top', sort: 2 },
  { code: '12', occupant: '—', status: 'empty', span: 1, block: 'top', sort: 3 },
  { code: '13', occupant: 'Чорно-білий', status: 'occ', span: 2, block: 'top', sort: 4 },
  { code: '14', occupant: 'Чорний вівчар', status: 'occ', span: 1, block: 'top', sort: 5 },
  { code: '15', occupant: 'Ріка', status: 'occ', span: 1, block: 'top', sort: 6 },
  { code: '16', occupant: 'Мія', status: 'occ', span: 1, block: 'top', sort: 7 },
  { code: '17', occupant: 'Єва', status: 'occ', span: 1, block: 'top', sort: 8 },
  { code: '18', occupant: '—', status: 'empty', span: 1, block: 'top', sort: 9 },
  { code: '19', occupant: 'Шархан', status: 'occ', span: 1, block: 'top', sort: 10 },
  { code: '20', occupant: 'Не функц.', status: 'nof', span: 1, block: 'top', sort: 11 },
  // bottom block
  { code: '1', occupant: 'Джек', status: 'occ', span: 1, block: 'bottom', sort: 1 },
  { code: '2', occupant: 'Бусоля', status: 'occ', span: 1, block: 'bottom', sort: 2 },
  { code: '3', occupant: '—', status: 'empty', span: 1, block: 'bottom', sort: 3 },
  { code: '4', occupant: '—', status: 'empty', span: 1, block: 'bottom', sort: 4 },
  { code: '5', occupant: '—', status: 'empty', span: 1, block: 'bottom', sort: 5 },
  { code: '6', occupant: 'Сарбона', status: 'occ', span: 1, block: 'bottom', sort: 6 },
  { code: '7', occupant: 'Барон', status: 'occ', span: 1, block: 'bottom', sort: 7 },
  { code: '8', occupant: 'Сірий метис', status: 'occ', span: 2, block: 'bottom', sort: 8 },
  { code: '', occupant: '', status: 'empty', span: 1, block: 'bottom', sort: 9 },
  { code: '9', occupant: 'Адік', status: 'occ', span: 2, block: 'bottom', sort: 10 },
];

export const SEED_SETTINGS = {
  contact_site: 'saveanimals.org.ua',
  contact_instagram: '@saveanimals_ukraine',
  contact_telegram: '~7 000 підписників',
  contact_address: 'Обухівка, Дніпропетровська обл.',
};

// Generic repeating collections (bilingual). kind groups them.
// Each row's `data` is a JSON object with the fields below.
export const SEED_COLLECTIONS = [
  // ── statistics (sf-stats bar) ──
  { kind: 'stat', sort: 1, data: { value: '3 417+', label_uk: 'Тварин евакуйовано', label_en: 'Animals evacuated' } },
  { kind: 'stat', sort: 2, data: { value: '2 800+', label_uk: 'Знайшли родину', label_en: 'Found a family' } },
  { kind: 'stat', sort: 3, data: { value: '95 805', label_uk: 'кг корму передано', label_en: 'kg of food delivered' } },
  { kind: 'stat', sort: 4, data: { value: '7 000', label_uk: 'підписників Telegram', label_en: 'Telegram subscribers' } },

  // ── partners ──
  { kind: 'partner', sort: 1, data: { title_uk: '«Годівнички Зооцентру»', title_en: 'Zoocentre Feeders', text_uk: '47 станцій у прифронтових містах, нанесені на карту.', text_en: '47 feeding stations in frontline cities, mapped.' } },
  { kind: 'partner', sort: 2, data: { title_uk: '#Водутваринам', title_en: '#WaterForAnimals', text_uk: 'Поїлки у Дніпрі, Гуляйполі та Часовому Яру.', text_en: 'Water bowls in Dnipro, Huliaipole and Chasiv Yar.' } },
  { kind: 'partner', sort: 3, data: { title_uk: '«Корм замість подарунку»', title_en: 'Food Instead of a Gift', text_uk: 'Люди дарують корм замість речей — тисячі кілограмів.', text_en: 'People give food instead of presents — thousands of kilograms.' } },
  { kind: 'partner', sort: 4, data: { title_uk: 'Leroy Shelter', title_en: 'Leroy Shelter', text_uk: 'Центр перетримки з 2024 року для евакуйованих тварин.', text_en: 'A care centre since 2024 for evacuated animals.' } },
  { kind: 'partner', sort: 5, data: { title_uk: 'База загублених тварин', title_en: 'Lost Animals Database', text_uk: 'Електронна база пошуку. Благодійні стендап-вечірки.', text_en: 'An electronic search database. Charity stand-up evenings.' } },
  { kind: 'partner', sort: 6, data: { title_uk: 'Паралельна допомога ЗСУ', title_en: 'Parallel Support for the Armed Forces', text_uk: 'Евакуація авто, посилки військовим, зменшення демаскування.', text_en: 'Vehicle evacuation, parcels for soldiers, reduced unmasking.' } },

  // ── evacuation steps ──
  { kind: 'evac_step', sort: 1, data: { num: '01', title_uk: 'Безпека', title_en: 'Safety', text_uk: 'Робота з наляканими й агресивними тваринами. Спецпідготовка волонтерів.', text_en: 'Working with frightened and aggressive animals. Special volunteer training.' } },
  { kind: 'evac_step', sort: 2, data: { num: '02', title_uk: 'Логістика', title_en: 'Logistics', text_uk: 'Транспорт, клітки, маршрути. Виїзди в 5 областях з урахуванням ситуації.', text_en: 'Transport, crates, routes. Trips across 5 regions depending on the situation.' } },
  { kind: 'evac_step', sort: 3, data: { num: '03', title_uk: 'Медицина', title_en: 'Medicine', text_uk: 'Перша ветдопомога та лікування. Співпраця з клініками і волонтерами.', text_en: 'First veterinary aid and treatment. Cooperation with clinics and volunteers.' } },
  { kind: 'evac_step', sort: 4, data: { num: '04', title_uk: 'Розміщення', title_en: 'Housing', text_uk: 'Leroy Shelter приймає евакуйованих собак до знаходження постійного дому.', text_en: 'Leroy Shelter takes in evacuated dogs until a permanent home is found.' } },

  // ── chatbot responses (quick_* optional → shown as a quick button) ──
  { kind: 'chat', sort: 1, data: { keyword: 'взяти', quick_uk: 'Взяти тварину', quick_en: 'Adopt an animal', reply_uk: 'Обери тварину в каталозі, натисни «Хочу взяти» і заповни форму 🐾', reply_en: 'Choose an animal in the catalogue, click “I want to adopt” and fill out the form 🐾' } },
  { kind: 'chat', sort: 2, data: { keyword: 'донат', quick_uk: 'Задонатити', quick_en: 'Donate', reply_uk: 'Приймаємо через Monobank, PrivatBank, PayPal та IBAN. Розділ «Допомогти шелтеру».', reply_en: 'We accept via Monobank, PrivatBank, PayPal and IBAN. See the “Help the shelter” section.' } },
  { kind: 'chat', sort: 3, data: { keyword: 'волонтер', quick_uk: 'Волонтерство', quick_en: 'Volunteering', reply_uk: 'Виїзди, перетримка, SMM, пошук родин. Напиши через Контакти.', reply_en: 'Field trips, fostering, SMM, finding families. Write to us via Contacts.' } },
  { kind: 'chat', sort: 4, data: { keyword: 'де', quick_uk: 'Адреса', quick_en: 'Address', reply_uk: 'Обухівка, Дніпропетровська область.', reply_en: 'Obukhivka, Dnipropetrovsk region.' } },
  { kind: 'chat', sort: 5, data: { keyword: 'корм', quick_uk: '', quick_en: '', reply_uk: 'Сухий/вологий корм і ветпрепарати. Привезти або передати через волонтерів.', reply_en: 'Dry/wet food and vet supplies. Bring them in person or hand over via volunteers.' } },

  // ── evacuation-page stats trio (label may use line breaks) ──
  { kind: 'evac_stat', sort: 1, data: { value: '3 417+', label_uk: 'тварин евакуйовано\nстаном на грудень 2025', label_en: 'animals evacuated\nas of December 2025' } },
  { kind: 'evac_stat', sort: 2, data: { value: '2 800+', label_uk: 'тварин знайшли\nнові родини', label_en: 'animals found\nnew families' } },
  { kind: 'evac_stat', sort: 3, data: { value: '5', label_uk: 'областей охоплено\nрегулярними евакуаціями', label_en: 'regions covered\nby regular evacuations' } },
];

// Home-page photo gallery ("Подаруй шанс"). Seeded separately so it also
// back-fills databases created before this block existed.
export const SEED_SHOWCASE = [
  { kind: 'showcase', sort: 1, data: { photo: '/assets/img/showcase1.jpg', caption_uk: 'Подаруй шанс на щастя — візьми з шелтеру', caption_en: 'Give a chance for happiness — adopt from the shelter' } },
  { kind: 'showcase', sort: 2, data: { photo: '/assets/img/showcase3.jpg', caption_uk: 'Shelter Leroy · Обухівка', caption_en: 'Shelter Leroy · Obukhivka' } },
  { kind: 'showcase', sort: 3, data: { photo: '/assets/img/showcase2.jpg', caption_uk: 'Кожен знаходить свого друга', caption_en: 'Everyone finds their friend' } },
];

// Partner name chips for the scrolling strip on the home page.
export const SEED_PARTNER_CHIPS = [
  { kind: 'partner_chip', sort: 1, data: { name: 'UAnimals' } },
  { kind: 'partner_chip', sort: 2, data: { name: 'We Support Ukraine' } },
  { kind: 'partner_chip', sort: 3, data: { name: 'United for Animals' } },
  { kind: 'partner_chip', sort: 4, data: { name: 'Схід SOS' } },
  { kind: 'partner_chip', sort: 5, data: { name: "Hill's" } },
  { kind: 'partner_chip', sort: 6, data: { name: 'Барбус' } },
  { kind: 'partner_chip', sort: 7, data: { name: 'Життєлюб' } },
  { kind: 'partner_chip', sort: 8, data: { name: 'Save Pets of Ukraine' } },
  { kind: 'partner_chip', sort: 9, data: { name: 'Neftek' } },
  { kind: 'partner_chip', sort: 10, data: { name: 'Leroy Real' } },
];
