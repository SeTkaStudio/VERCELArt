import { OutputMode, ResolutionOption, BackgroundOption, ShotType, ClothingOption, FaceSelectionShotType, AdapterBackgroundOption } from './types';

export const SHOT_TYPE_OPTIONS = [
    ShotType.CloseUp,
    ShotType.WaistUp,
    ShotType.KneeUp,
    ShotType.FullBody,
];

export const RESOLUTION_OPTIONS = [
    ResolutionOption.Square,
    ResolutionOption.Landscape,
    ResolutionOption.Portrait,
];

export const CLOTHING_OPTIONS = [
    ClothingOption.Classic,
    ClothingOption.Leisure,
    ClothingOption.Beach,
    ClothingOption.Custom,
    ClothingOption.Upload,
];

export const BACKGROUND_OPTIONS = [
    BackgroundOption.Automatic,
    BackgroundOption.White,
    BackgroundOption.Green,
    BackgroundOption.Desert,
    BackgroundOption.Sea,
    BackgroundOption.Mountains,
    BackgroundOption.Upload,
];

export const ADAPTER_BACKGROUND_OPTIONS = [
    AdapterBackgroundOption.StudioGray,
    AdapterBackgroundOption.StudioBright,
    AdapterBackgroundOption.StudioDim,
    AdapterBackgroundOption.Park,
    AdapterBackgroundOption.Office,
    AdapterBackgroundOption.Cafe,
    AdapterBackgroundOption.Bar,
    AdapterBackgroundOption.Custom,
    AdapterBackgroundOption.Upload,
];

export const ADAPTER_BACKGROUND_PROMPT_MAP: { [key in AdapterBackgroundOption]?: string } = {
    [AdapterBackgroundOption.StudioBright]: 'In a brightly lit professional photo studio with clean lighting.',
    [AdapterBackgroundOption.StudioDim]: 'In a professional photo studio with soft, dim, atmospheric lighting.',
    [AdapterBackgroundOption.StudioGray]: 'On a solid, neutral gray studio background.',
    [AdapterBackgroundOption.Park]: 'Outdoors in a city park with a soft focus background, sunny day.',
    [AdapterBackgroundOption.Office]: 'In a modern office space with large windows and a blurred city view.',
    [AdapterBackgroundOption.Cafe]: 'In a cozy café with a warmly lit, blurred background.',
    [AdapterBackgroundOption.Bar]: 'In a dimly lit, atmospheric bar with subtle neon lights in the background.',
};


export const AUTOMATIC_BACKGROUND_SUGGESTIONS = [
    'The person is in a minimalist apartment with soft, indirect lighting.',
    'The person is in a cozy café with a warmly lit, blurred background.',
    'The person is outdoors in a city park during the golden hour with a soft focus background.',
    'The person is against a textured, neutral-colored studio backdrop.',
    'The person is in a modern office space with large windows and a blurred city view.',
    'The person is in a library with warm lighting and bookshelves in the background.',
    'The person is on a balcony overlooking a serene beach at sunset.',
];

export const BASE_PROMPT = `A high-quality, photorealistic image that accurately preserves the identity of the person in the uploaded photo. Aim for fine details, such as realistic skin texture, individual hair strands, and natural eye reflections. Use soft, cinematic lighting for depth, with a sharp focus on the subject and a natural bokeh effect. The style should be that of a professional photograph, not digital art. 8k resolution preferred.`;

export const SHOT_TYPE_PROMPT_MAP: { [key in ShotType]: string } = {
    [ShotType.CloseUp]: 'A tight close-up portrait, focusing strictly on the face from the top of the head to just below the chin. Only the head and neck should be visible.',
    [ShotType.WaistUp]: 'A medium shot of the person from the waist up, clearly showing their stomach, torso, shoulders, and head completely.',
    [ShotType.KneeUp]: 'A medium-long shot of the person from the knees up, clearly showing their legs from the knees, torso, arms, and head completely.',
    [ShotType.FullBody]: 'A full-body shot of the person, showing them standing from head to toe. The person\'s feet must be clearly visible, and they are wearing simple, plain shoes.',
};

export const CLOTHING_PROMPT_MAP: { [key in ClothingOption]?: string } = {
    [ClothingOption.Classic]: 'The person is dressed formally. If a man, he is wearing a classic black suit with a white shirt and no tie. If a woman, she is wearing a classic black suit with a skirt.',
    [ClothingOption.Leisure]: 'The person is wearing a white tight-fitting t-shirt and blue jeans.',
    [ClothingOption.Beach]: 'The person is dressed for the beach. If a man, he is wearing white beach shorts. If a woman, she is wearing a white triangle top bikini.',
};

export const RESOLUTION_PROMPT_MAP: { [key in ResolutionOption]: string } = {
    [ResolutionOption.Square]: 'The final image should have a square (1:1) aspect ratio.',
    [ResolutionOption.Landscape]: 'The final image should have a wide landscape orientation (16:9) aspect ratio.',
    [ResolutionOption.Portrait]: 'The final image should have a tall portrait orientation (9:16) aspect ratio.',
};

export const BACKGROUND_PROMPT_MAP: { [key in BackgroundOption]?: string } = {
    [BackgroundOption.White]: 'On a clean, solid white studio background.',
    [BackgroundOption.Green]: 'On a solid green screen background.',
    [BackgroundOption.Desert]: 'The person is in a desert landscape.',
    [BackgroundOption.Sea]: 'The person is on a background of the sea.',
    [BackgroundOption.Mountains]: 'The person is in a mountainous area.',
};

export const VARIATION_PROMPTS = {
    [OutputMode.Angles]: [
        { id: 'angle_1', text: 'A frontal view portrait (slightly different from the original).' },
        { id: 'angle_2', text: 'A 3/4 view portrait (slightly turned to the left).' },
        { id: 'angle_3', text: 'A side profile portrait (turned to the right).' },
        { id: 'angle_4', text: 'A portrait from a high angle, looking down (bird\'s-eye view).' },
        { id: 'angle_5', text: 'A 3/4 view portrait (slightly turned to the right).' },
        { id: 'angle_6', text: 'A side profile portrait (turned to the left).' },
        { id: 'angle_7', text: 'A portrait from a low angle, looking up (worm\'s-eye view).' },
        { id: 'angle_8', text: 'A portrait with the head slightly tilted to the side.' },
        { id: 'angle_9', text: 'A portrait looking over the left shoulder.' },
        { id: 'angle_10', text: 'A close-up portrait focusing on the face.' },
    ],
    [OutputMode.Expressions]: [
        { id: 'expr_1', text: 'A portrait with a light, gentle smile.' },
        { id: 'expr_2', text: 'A portrait with a wide, joyful smile.' },
        { id: 'expr_3', text: 'A portrait showing a sad or melancholic expression.' },
        { id: 'expr_4', text: 'A portrait with a surprised expression (mouth slightly open, eyebrows raised).' },
        { id: 'expr_5', text: 'A portrait with a thoughtful and pensive expression.' },
        { id: 'expr_6', text: 'A portrait with a serious, neutral expression.' },
        { id: 'expr_7', text: 'A portrait with a playful wink.' },
        { id: 'expr_8', text: 'A portrait showing a confident and determined look.' },
        { id: 'expr_9', text: 'A portrait that is laughing heartily.' },
        { id: 'expr_10', text: 'A portrait showing an annoyed or grumpy expression.' },
    ],
};

// --- Новые константы OhMyGPT ---
export const OHMYGPT_MODELS = [
    { id: 'dall-e', name: 'DALL-E (OhMyGPT)', enabled: true, maxImages: 10, supportsImageInput: false },
    { id: 'flux-1.1-pro', name: 'Flux Pro (OhMyGPT)', enabled: true, maxImages: 8, supportsImageInput: false },
];

// --- Обновленные константы для Photo Generation Page ---
export const PHOTO_GENERATION_MODELS = [
    // Google Models
    { id: 'gemini-2.5-flash-image', name: 'Nano Banana (Быстрый и универсальный)', enabled: true, maxImages: 20, supportsImageInput: true },
    { id: 'imagen-4.0-generate-001', name: 'Imagen 4 (Максимальное качество)', enabled: true, maxImages: 8, supportsImageInput: false },
    // OhMyGPT Models (добавлены)
    ...OHMYGPT_MODELS,
];

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export const MODEL_ASPECT_RATIOS: Record<string, { ratio: AspectRatio; label: string; }[]> = {
    'gemini-2.5-flash-image': [
        { ratio: '1:1', label: 'Квадрат (1:1)' },
        { ratio: '16:9', label: 'Горизонтальное (16:9)' },
        { ratio: '9:16', label: 'Вертикальное (9:16)' },
    ],
    'imagen-4.0-generate-001': [
        { ratio: '1:1', label: 'Квадрат (1:1)' },
        { ratio: '16:9', label: 'Горизонтальное (16:9)' },
        { ratio: '9:16', label: 'Вертикальное (9:16)' },
        { ratio: '4:3', label: 'Альбомное (4:3)' },
        { ratio: '3:4', label: 'Портретное (3:4)' },
    ],
    // Добавлены OhMyGPT модели
    'dall-e': [
        { ratio: '1:1', label: 'Квадрат (1:1)' },
        { ratio: '16:9', label: 'Горизонтальное (16:9)' },
        { ratio: '9:16', label: 'Вертикальное (9:16)' },
    ],
    'flux-1.1-pro': [
        { ratio: '1:1', label: 'Квадрат (1:1)' },
        { ratio: '16:9', label: 'Горизонтальное (16:9)' },
        { ratio: '9:16', label: 'Вертикальное (9:16)' },
    ],
};

export const RESOLUTION_OPTIONS_MAP: Record<AspectRatio, { label: string; value: string; }[]> = {
    '1:1': [
        { label: '2048x2048 (Макс)', value: '2048x2048' },
        { label: '1024x1024', value: '1024x1024' },
        { label: '512x512 (Мин)', value: '512x512' },
    ],
    '16:9': [
        { label: '2560x1440 (Макс)', value: '2560x1440' },
        { label: '1920x1080', value: '1920x1080' },
        { label: '1280x720 (Мин)', value: '1280x720' },
    ],
    '9:16': [
        { label: '1440x2560 (Макс)', value: '1440x2560' },
        { label: '1080x1920', value: '1080x1920' },
        { label: '720x1280 (Мин)', value: '720x1280' },
    ],
    '4:3': [
        { label: '2048x1536 (Макс)', value: '2048x1536' },
        { label: '1024x768', value: '1024x768' },
        { label: '800x600 (Мин)', value: '800x600' },
    ],
    '3:4': [
        { label: '1536x2048 (Макс)', value: '1536x2048' },
        { label: '768x1024', value: '768x1024' },
        { label: '600x800 (Мин)', value: '600x800' },
    ],
};

export const ASPECT_RATIO_PROMPT_MAP: { [key in AspectRatio]: string } = {
    '1:1': 'The final output image MUST be a perfect square (1:1 aspect ratio).',
    '16:9': 'The final output image MUST be in a wide landscape orientation (16:9 aspect ratio).',
    '9:16': 'The final output image MUST be in a tall portrait orientation (9:16 aspect ratio).',
    '4:3': 'The final output image MUST be in a standard landscape orientation (4:3 aspect ratio).',
    '3:4': 'The final output image MUST be in a standard portrait orientation (3:4 aspect ratio).',
};

export const IMAGE_VARIATION_BASE_PROMPT = `The provided image is a reference. Create a new, photorealistic, high-resolution 8k image based on it, guided by the text prompt. It's very important that the identity, face, and key features of any person in the reference image are accurately preserved. The final image should look like a professional photograph with great detail, avoiding any digital art or cartoonish style.`;

export const VARIATION_STRENGTH_PROMPT_MAP: { [key: number]: string } = {
    1: 'Make only minimal, subtle changes to the original image, introducing less than 10% creative variation. Stick as closely as possible to the source.',
    2: 'Introduce minor creative variations while keeping the result very close to the original image.',
    3: 'Apply some noticeable creative changes, but the core composition and subject should remain clearly derived from the original.',
    4: 'Add a moderate level of creative interpretation. The output should be a clear variation but still strongly resemble the original.',
    5: 'Balance the original image and creative freedom equally (50/50). Create a distinct variation that is clearly inspired by the source.',
    6: 'Lean more towards creative interpretation, using the original image as a strong inspiration for a new composition.',
    7: 'Introduce significant creative changes. The link to the original image should be conceptual rather than literal.',
    8: 'Take the core concepts from the original image and re-imagine them in a substantially different way.',
    9: 'Use the original image as a starting point for a highly imaginative and creative new picture, with very few direct similarities.',
    10: 'Use maximum creative fantasy. The final image should be a completely new artistic interpretation, only loosely inspired by the themes of the original photo.',
};

// --- New constants for Photo Generation Page Expert Mode ---

export const PHOTO_STYLE_OPTIONS = [
    'Супер фото реализм',
    'Макро съемка',
    'Портрет',
    'Аниме',
    'Картина маслом',
    'Ввести свой промпт',
    'Загрузить свой стиль',
];

export const PHOTO_STYLE_PROMPT_MAP: { [key: string]: string } = {
    'Супер фото реализм': 'hyperrealistic photograph, ultra-detailed, 8k, professional photography, sharp focus, high quality',
    'Макро съемка': 'macro photography, extreme close-up, detailed, sharp focus on the subject with a blurred background (bokeh)',
    'Портрет': 'studio portrait, professional portrait photography, soft lighting, sharp focus on the eyes',
    'Аниме': 'anime style, vibrant colors, clean lines, cel shading, detailed background, trending on pixiv',
    'Картина маслом': 'oil painting, textured brush strokes, rich colors, classic art style, masterpiece',
};

export const EDITING_STYLE_PROMPT_MAP: { [key: string]: string } = {
    'Фото реализм': 'Make the image look like a hyperrealistic photograph, ultra-detailed, 8k, professional photography, sharp focus.',
    'Аниме': 'Transform the image into an anime style, with vibrant colors, clean lines, and cel shading.',
    'Киберпанк': 'Give the image a cyberpunk aesthetic, with neon lighting, futuristic elements, and a gritty, high-tech feel.',
    'Черно-белое': 'Convert the image to a dramatic black and white photograph, with high contrast and deep blacks.',
    'Картина маслом': 'Transform the image to look like a classic oil painting, with visible textured brush strokes and rich colors.',
    'Акварель': 'Transform the image into a watercolor painting, with soft edges and transparent colors.',
    'Рисунок карандашом': 'Convert the image into a detailed pencil sketch, with fine lines and shading.',
    'Стимпанк': 'Give the image a steampunk aesthetic, with gears, cogs, brass, and Victorian-era technology.',
    'Фэнтези-арт': 'Transform the image into a fantasy art style, with magical elements, epic landscapes, and vibrant colors.',
    'Поп-арт': 'Convert the image into a pop art style, with bold outlines, bright, blocky colors, and a comic book feel.',
};

export const CAMERA_APERTURE_RANGE = { min: 1.4, max: 22, step: 0.1 };
export const CAMERA_FOCAL_LENGTH_RANGE = { min: 14, max: 200, step: 1 };

export const CAMERA_SHUTTER_SPEED_OPTIONS = [
    '1/8000s', '1/4000s', '1/2000s', '1/1000s', '1/500s', '1/250s', '1/125s', '1/60s', '1/30s', '1/15s', '1/8s', '1/4s', '1/2s', '1s', '2s'
];

export const CAMERA_ISO_OPTIONS = [
    '100', '200', '400', '800', '1600', '3200', '6400'
];

export const LIGHTING_STYLE_OPTIONS = [
    'Кинематографическое',
    'Студийное (3-точечное)',
    'Золотой час (закат)',
    'Драматическое (Рембрандт)',
    'Мягкий рассеянный свет',
    'Неоновое освещение',
    'Ввести свой промпт'
];

export const LIGHTING_STYLE_PROMPT_MAP: { [key: string]: string } = {
    'Кинематографическое': 'cinematic lighting, dramatic shadows, high contrast, moody atmosphere',
    'Студийное (3-точечное)': 'professional studio 3-point lighting setup, clean, well-lit subject',
    'Золотой час (закат)': 'golden hour lighting, warm, soft, long shadows, sunset',
    'Драматическое (Рембрандт)': 'Rembrandt lighting, strong side light, triangle of light on the cheek, dramatic and moody',
    'Мягкий рассеянный свет': 'soft diffused lighting, overcast day, minimal shadows, flattering light',
    'Неоновое освещение': 'neon lighting, vibrant pink and blue lights, cyberpunk aesthetic, reflective surfaces',
};

export const FILM_GRAIN_OPTIONS = [
    'Нет',
    'Легкая зернистость',
    'Средняя зернистость',
    'Сильная зернистость (как на старой пленке)',
];

export const FILM_GRAIN_PROMPT_MAP: { [key: string]: string } = {
    'Легкая зернистость': 'subtle film grain',
    'Средняя зернистость': 'medium film grain',
    'Сильная зернистость (как на старой пленке)': 'heavy film grain, vintage film look',
};

export const BLUR_OPTIONS = [
    'Нет',
    'Легкое размытие фона (Боке)',
    'Размытие в движении',
    'Эффект Tilt-Shift',
];

export const BLUR_PROMPT_MAP: { [key: string]: string } = {
    'Легкое размытие фона (Боке)': 'soft background blur, beautiful bokeh',
    'Размытие в движении': 'motion blur, dynamic movement',
    'Эффект Tilt-Shift': 'tilt-shift effect, miniature faking',
};

export const VIGNETTE_OPTIONS = [
    'Нет',
    'Легкое затемнение краев',
    'Сильное затемнение краев',
];

export const VIGNETTE_PROMPT_MAP: { [key: string]: string } = {
    'Легкое затемнение краев': 'light vignette effect',
    'Сильное затемнение краев': 'strong, dramatic vignette effect',
};


// --- New constants for Face Selection Page ---

export const FACE_SELECTION_MODELS = [
    { id: 'gemini-2.5-flash-image', name: 'Nano Banana (Быстро)' },
    { id: 'imagen-4.0-generate-001', name: 'Imagen 4 (Качество)' },
];

export const FACE_SELECTION_SHOT_TYPE_OPTIONS = [
    FaceSelectionShotType.CloseUp,
    FaceSelectionShotType.ChestUp,
    FaceSelectionShotType.WaistUp,
    FaceSelectionShotType.KneeUp,
    FaceSelectionShotType.FullBody,
];

export const FACE_SELECTION_SHOT_TYPE_PROMPT_MAP: { [key in FaceSelectionShotType]: string } = {
    [FaceSelectionShotType.CloseUp]: 'A centered, head-on (en face) extreme close-up studio portrait, tightly cropped from the top of the head to the bottom of the chin. Focus on showing only the head and neck, without shoulders, clothing, or other body parts in the frame.',
    [FaceSelectionShotType.ChestUp]: 'A head and shoulders studio portrait photo, showing the person from the chest up.',
    [FaceSelectionShotType.WaistUp]: 'A medium shot studio portrait photo of the person from the waist up.',
    [FaceSelectionShotType.KneeUp]: 'A medium-long shot studio portrait photo of the person from the knees up.',
    [FaceSelectionShotType.FullBody]: 'A full-body shot studio portrait photo of the person, showing them standing from head to toe, barefoot.',
};

export type FaceSelectionAspectRatio = '1:1' | '16:9' | '9:16';

export const FACE_SELECTION_ASPECT_RATIOS: { id: FaceSelectionAspectRatio; name: string }[] = [
    { id: '1:1', name: 'Квадрат (1:1)' },
    { id: '16:9', name: 'Горизонтальное (16:9)' },
    { id: '9:16', name: 'Вертикальное (9:16)' },
];

export const FACE_SELECTION_OPTIONS = {
    gender: [
        'Мужчина',
        'Женщина'
    ],
    age_range: [
        'Случайный выбор',
        'Подросток (16-19)',
        'Молодой взрослый (20-29)',
        'Взрослый (30-39)',
        'Средний возраст (40-55)',
        'Пожилой (60+)'
    ],
    ethnicity: [
        'Случайный выбор',
        'Европеоидный (Северная Европа / Скандинавский)',
        'Европеоидный (Южная Европа / Средиземноморский)',
        'Европеоидный (Восточная Европа / Славянский)',
        'Азиатский (Восточная Азия - Китай, Корея, Япония)',
        'Азиатский (Юго-Восточная Азия - Вьетнам, Таиланд)',
        'Южно-Азиатский (Индия, Пакистан)',
        'Ближневосточный (Арабский, Персидский)',
        'Африканский / Афроамериканский',
        'Латиноамериканский',
        'Смешанная этничность'
    ],
    skin_tone: [
        'Случайный выбор',
        'Очень светлая (Фарфоровая)',
        'Светлая (Европейская)',
        'Светлая с веснушками',
        'Оливковая / Средиземноморская',
        'Светло-коричневая',
        'Коричневая (Азиатская / Латиноамериканская)',
        'Темно-коричневая (Южно-Азиатская)',
        'Очень темная (Африканская)'
    ],
    face_shape: [
        'Случайный выбор',
        'Овальное',
        'Круглое',
        'Квадратное (сильная челюсть)',
        'Прямоугольное (вытянутое)',
        'Треугольное (в форме сердца, узкий подбородок)',
        'Ромбовидное',
        'Грушевидное',
        'V-образное (заостренный подбородок)',
        'С высокими скулами',
        'Мягкое / "Детское" лицо'
    ],
    nose_shape: [
        'Случайный выбор',
        'Прямой',
        '"Греческий" (прямая линия со лбом)',
        '"Римский" (с горбинкой)',
        'Курносый (кончик вздернут вверх)',
        'Орлиный (загнутый вниз)',
        'Широкий (нубийский)',
        'Узкий',
        '"Картошкой" (широкий, округлый кончик)',
        'Азиатский (с низкой переносицей)'
    ],
    eyes_shape: [
        'Случайный выбор',
        'Миндалевидные',
        'Круглые',
        'Глубоко посаженные',
        '"Кошачьи" (внешние уголки приподняты)',
        'С опущенными уголками',
        'С нависшим веком (hooded eyes)',
        'Близко посаженные',
        'Широко посаженные',
        'Азиатский разрез (с эпикантусом)'
    ],
    eye_color: [
        'Случайный выбор',
        'Карий',
        'Темно-карий (почти черный)',
        'Светло-карий (янтарный)',
        'Голубой',
        'Серый',
        'Зеленый',
        'Ореховый (зелено-карий)',
        'Серо-голубой'
    ],
    lips_shape: [
        'Случайный выбор',
        'Полные',
        'Тонкие',
        '"Бантиком" (с четкой "аркой Купидона")',
        'Широкие',
        'Узкие (маленький рот)',
        'С опущенными уголками',
        'Мягкие (без четкого контура)'
    ],
    hair_color: [
        'Случайный выбор',
        'Черный',
        'Темно-каштановый',
        'Каштановый',
        'Светло-каштановый',
        'Блонд (пепельный)',
        'Блонд (золотистый)',
        'Блонд (платиновый)',
        'Рыжий (медный)',
        'Седой'
    ],
    hair_length: [
        'Случайный выбор',
        'Бритая голова',
        'Очень короткая "ежик"',
        'Короткая стрижка (до ушей)',
        'До плеч',
        'До лопаток',
        'Длинные (ниже лопаток)',
        'Лысина (M-образная)'
    ],
    hair_texture: [
        'Случайный выбор',
        'Прямые',
        'Волнистые',
        'Кудрявые (крупные локоны)',
        'Кудрявые (мелкие кудри)',
        'Афро-текстура',
        'Дреды'
    ],
    facial_hair: [
        'Случайный выбор',
        'Чисто выбрит',
        'Легкая щетина (3 дня)',
        'Короткая борода (Ухоженная)',
        'Длинная борода',
        'Усы',
        'Эспаньолка'
    ],
    expression: [
        'Случайный выбор',
        'Нейтральное (спокойное)',
        'Легкая улыбка (дружелюбное)',
        'Широкая улыбка (счастливое)',
        'Серьезное',
        'Задумчивое',
        'Уверенное (с ухмылкой)'
    ],
};

type FeatureMap = {
    [key: string]: {
        skin_tone?: string[];
        eyes_shape?: string[];
        eye_color?: string[];
        nose_shape?: string[];
        hair_color?: string[];
        hair_texture?: string[];
    };
};

export const ETHNIC_FEATURE_MAP: FeatureMap = {
    'Европеоидный (Северная Европа / Скандинавский)': {
        skin_tone: ['Очень светлая (Фарфоровая)', 'Светлая (Европейская)', 'Светлая с веснушками'],
        eyes_shape: ['Миндалевидные', 'Круглые', 'Глубоко посаженные', 'С опущенными уголками', 'С нависшим веком (hooded eyes)'],
        eye_color: ['Голубой', 'Серый', 'Зеленый', 'Ореховый (зелено-карий)', 'Серо-голубой', 'Светло-карий (янтарный)'],
        hair_color: ['Блонд (пепельный)', 'Блонд (золотистый)', 'Блонд (платиновый)', 'Светло-каштановый', 'Рыжий (медный)'],
        hair_texture: ['Прямые', 'Волнистые'],
    },
    'Европеоидный (Южная Европа / Средиземноморский)': {
        skin_tone: ['Светлая (Европейская)', 'Оливковая / Средиземноморская', 'Светло-коричневая'],
        eyes_shape: ['Миндалевидные', 'Круглые', 'Глубоко посаженные'],
        eye_color: ['Карий', 'Темно-карий (почти черный)', 'Ореховый (зелено-карий)', 'Зеленый'],
        hair_color: ['Темно-каштановый', 'Каштановый', 'Черный'],
        hair_texture: ['Прямые', 'Волнистые', 'Кудрявые (крупные локоны)'],
    },
    'Европеоидный (Восточная Европа / Славянский)': {
        skin_tone: ['Очень светлая (Фарфоровая)', 'Светлая (Европейская)'],
        eyes_shape: ['Миндалевидные', 'Круглые', 'Глубоко посаженные', 'С опущенными уголками'],
        eye_color: ['Голубой', 'Серый', 'Зеленый', 'Светло-карий (янтарный)', 'Ореховый (зелено-карий)'],
        hair_color: ['Светло-каштановый', 'Каштановый', 'Блонд (пепельный)', 'Блонд (золотистый)'],
        hair_texture: ['Прямые', 'Волнистые'],
    },
    'Азиатский (Восточная Азия - Китай, Корея, Япония)': {
        skin_tone: ['Очень светлая (Фарфоровая)', 'Светлая (Европейская)', 'Оливковая / Средиземноморская'],
        eyes_shape: ['Миндалевидные', 'С нависшим веком (hooded eyes)', 'Азиатский разрез (с эпикантусом)'],
        eye_color: ['Карий', 'Темно-карий (почти черный)'],
        nose_shape: ['Прямой', 'Узкий', 'Азиатский (с низкой переносицей)'],
        hair_color: ['Черный', 'Темно-каштановый'],
        hair_texture: ['Прямые'],
    },
    'Азиатский (Юго-Восточная Азия - Вьетнам, Таиланд)': {
        skin_tone: ['Оливковая / Средиземноморская', 'Светло-коричневая', 'Коричневая (Азиатская / Латиноамериканская)'],
        eyes_shape: ['Миндалевидные', 'Азиатский разрез (с эпикантусом)', 'Круглые'],
        eye_color: ['Карий', 'Темно-карий (почти черный)'],
        nose_shape: ['"Картошкой" (широкий, округлый кончик)', 'Азиатский (с низкой переносицей)', 'Широкий (нубийский)'],
        hair_color: ['Черный', 'Темно-каштановый'],
        hair_texture: ['Прямые', 'Волнистые'],
    },
    'Южно-Азиатский (Индия, Пакистан)': {
        skin_tone: ['Оливковая / Средиземноморская', 'Светло-коричневая', 'Коричневая (Азиатская / Латиноамериканская)', 'Темно-коричневая (Южно-Азиатская)'],
        eyes_shape: ['Миндалевидные', 'Круглые', 'Глубоко посаженные'],
        eye_color: ['Карий', 'Темно-карий (почти черный)', 'Светло-карий (янтарный)'],
        hair_color: ['Черный', 'Темно-каштановый'],
        hair_texture: ['Прямые', 'Волнистые', 'Кудрявые (крупные локоны)'],
    },
    'Ближневосточный (Арабский, Персидский)': {
        skin_tone: ['Оливковая / Средиземноморская', 'Светло-коричневая', 'Светлая (Европейская)'],
        eyes_shape: ['Миндалевидные', 'Глубоко посаженные'],
        eye_color: ['Карий', 'Темно-карий (почти черный)', 'Ореховый (зелено-карий)', 'Зеленый'],
        hair_color: ['Черный', 'Темно-каштановый', 'Каштановый'],
        hair_texture: ['Волнистые', 'Кудрявые (крупные локоны)', 'Прямые'],
    },
    'Африканский / Афроамериканский': {
        skin_tone: ['Светло-коричневая', 'Коричневая (Азиатская / Латиноамериканская)', 'Темно-коричневая (Южно-Азиатская)', 'Очень темная (Африканская)'],
        eyes_shape: ['Миндалевидные', 'Круглые'],
        eye_color: ['Карий', 'Темно-карий (почти черный)'],
        nose_shape: ['Широкий (нубийский)', '"Картошкой" (широкий, округлый кончик)'],
        hair_color: ['Черный', 'Темно-каштановый'],
        hair_texture: ['Кудрявые (мелкие кудри)', 'Афро-текстура', 'Дреды'],
    },
    'Латиноамериканский': {
        skin_tone: ['Оливковая / Средиземноморская', 'Светло-коричневая', 'Коричневая (Азиатская / Латиноамериканская)'],
        eyes_shape: ['Миндалевидные', 'Круглые', 'Карие'],
        eye_color: ['Карий', 'Темно-карий (почти черный)', 'Ореховый (зелено-карий)', 'Светло-карий (янтарный)'],
        hair_color: ['Черный', 'Темно-каштановый', 'Каштановый'],
        hair_texture: ['Прямые', 'Волнистые', 'Кудрявые (крупные локоны)'],
    },
};
