import React, { useState, useCallback, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { SelectInput } from './components/SelectInput';
import { ImageGallery } from './components/ImageGallery';
import { ImageModal } from './components/ImageModal';
import { ToggleSwitch } from './components/ToggleSwitch';
import { AddToFavoritesModal } from './components/AddToFavoritesModal';
import { ImageFile, OutputMode, GeneratedImage, ResolutionOption, ShotType, ClothingOption, AdapterBackgroundOption } from './types';
import { RESOLUTION_OPTIONS, VARIATION_PROMPTS, BASE_PROMPT, RESOLUTION_PROMPT_MAP, SHOT_TYPE_OPTIONS, SHOT_TYPE_PROMPT_MAP, CLOTHING_OPTIONS, CLOTHING_PROMPT_MAP, ADAPTER_BACKGROUND_OPTIONS, ADAPTER_BACKGROUND_PROMPT_MAP } from './constants';
// --- ИЗМЕНЕНИЕ 1: Добавление новой функции для OhMyGPT ---
import { generatePortrait, generateImageWithOhMyGPT } from './services/geminiService';
import { useAuth } from './contexts/AuthContext';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

interface AppProps {
    onNavigateHome: () => void;
    images: GeneratedImage[];
    setImages: React.Dispatch<React.SetStateAction<GeneratedImage[]>>;
}

const App: React.FC<AppProps> = ({ onNavigateHome, images, setImages }) => {
    const [imageFile, setImageFile] = useState<ImageFile | null>(null);
    const [resolution, setResolution] = useState<ResolutionOption>(ResolutionOption.Square);
    const [outputMode, setOutputMode] = useState<OutputMode>(OutputMode.Angles);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
    const [shotType, setShotType] = useState<ShotType>(ShotType.CloseUp);
    const [adapterBackgroundOption, setAdapterBackgroundOption] = useState<AdapterBackgroundOption>(AdapterBackgroundOption.StudioGray);
    const [customBackgroundPrompt, setCustomBackgroundPrompt] = useState('');
    const [backgroundFile, setBackgroundFile] = useState<ImageFile | null>(null);
    const [clothingOption, setClothingOption] = useState<ClothingOption>(ClothingOption.Classic);
    const [customClothingPrompt, setCustomClothingPrompt] = useState('');
    const [clothingFile, setClothingFile] = useState<ImageFile | null>(null);
    const isGenerationCancelled = useRef(false);

    const { currentUser, decrementCredits, removeFavorite, isFavorite } = useAuth();
    const [creditError, setCreditError] = useState('');
    const [imageToFavorite, setImageToFavorite] = useState<string | null>(null);

    const generationCost = currentUser?.paymentMethod === 'apiKey' ? 0 : VARIATION_PROMPTS[outputMode].length;

    const buildPrompt = useCallback((variationText: string) => {
        let backgroundPromptPart = '';
        if (adapterBackgroundOption === AdapterBackgroundOption.Custom) {
            backgroundPromptPart = customBackgroundPrompt;
        } else if (adapterBackgroundOption !== AdapterBackgroundOption.Upload) {
            backgroundPromptPart = ADAPTER_BACKGROUND_PROMPT_MAP[adapterBackgroundOption] || '';
        }

        let clothingPromptPart = '';
        if (clothingOption === ClothingOption.Custom) {
            clothingPromptPart = `The person is wearing: ${customClothingPrompt}.`;
        } else if (clothingOption !== ClothingOption.Upload) {
            clothingPromptPart = CLOTHING_PROMPT_MAP[clothingOption] || '';
        }

        return [
            BASE_PROMPT,
            SHOT_TYPE_PROMPT_MAP[shotType],
            clothingPromptPart,
            backgroundPromptPart,
            RESOLUTION_PROMPT_MAP[resolution],
            `The new image should represent this specific variation: "${variationText}"`,
        ].filter(Boolean).join(' ');
    }, [shotType, resolution, adapterBackgroundOption, customBackgroundPrompt, clothingOption, customClothingPrompt]);


    const handleSubmit = useCallback(async () => {
        if (!imageFile || !currentUser) return;
        if (currentUser.paymentMethod === 'credits' && currentUser.credits < generationCost) {
            setCreditError(`Недостаточно кредитов. Требуется: ${generationCost}, у вас: ${currentUser.credits}`);
            return;
        }
        if (currentUser.paymentMethod === 'apiKey' && !currentUser.apiKey) {
            setCreditError('Выбран способ оплаты "свой API ключ", но ключ не указан в профиле.');
            return;
        }

        if (currentUser.paymentMethod === 'credits') {
            const creditsDecremented = await decrementCredits(generationCost);
            if (!creditsDecremented) {
                setCreditError('Не удалось списать кредиты. Попробуйте снова.');
                return;
            }
        }

        setCreditError('');
        isGenerationCancelled.current = false;
        setIsLoading(true);

        const variations = VARIATION_PROMPTS[outputMode];
        const newImages: GeneratedImage[] = variations.map(v => ({
            id: v.id,
            src: null,
            prompt: buildPrompt(v.text),
            status: 'pending',
            resolution: resolution,
            backgroundPrompt: ''
        }));
        setImages(newImages);

        const apiKey = currentUser.paymentMethod === 'apiKey' ? currentUser.apiKey : undefined;

        // --- ИЗМЕНЕНИЕ 2: Логика выбора API внутри цикла ---
        for (const variation of variations) {
            if (isGenerationCancelled.current) break;
            try {
                const fullPrompt = buildPrompt(variation.text);
                let resultSrc: string;

                if (currentUser.paymentMethod === 'apiKey') {
                    // Используем OhMyGPT через безопасный прокси
                    // Используем модель 'dall-e' как модель по умолчанию. 
                    // Примечание: OhMyGPT прокси не поддерживает дополнительные файлы (backgroundFile, clothingFile) в этой функции.
                    resultSrc = await generateImageWithOhMyGPT(fullPrompt, 'dall-e');
                } else {
                    // Используем Google Gemini/Imagen (старая логика)
                    resultSrc = await generatePortrait(imageFile, fullPrompt, backgroundFile, clothingFile, apiKey);
                }
                
                if (isGenerationCancelled.current) break;
                setImages(prev => prev.map(img => img.id === variation.id ? { ...img, src: resultSrc, status: 'success' } : img));
            } catch (error) {
                console.error(`Failed to generate variation ${variation.id}:`, error);
                setImages(prev => prev.map(img => img.id === variation.id ? { ...img, status: 'error' } : img));
            }
            if (variations.length > 1) await sleep(2500);
        }
        // --------------------------------------------------------

        setIsLoading(false);
    }, [imageFile, resolution, outputMode, buildPrompt, backgroundFile, clothingFile, currentUser, decrementCredits, generationCost, setImages]);

    const handleStopGeneration = () => {
        isGenerationCancelled.current = true;
        setIsLoading(false);
        setImages(prev => prev.map(img => img.status === 'pending' ? { ...img, status: 'error' } : img));
    };

    const handleRegenerate = useCallback(async (imageId: string) => {
        const imageToRegen = images.find(img => img.id === imageId);
        if (!imageToRegen || !imageFile || !currentUser) return;

        if (currentUser.paymentMethod === 'credits' && currentUser.credits < 1) {
            alert("Недостаточно кредитов для перегенерации.");
            return;
        }
        if (currentUser.paymentMethod === 'apiKey' && !currentUser.apiKey) {
            alert('Выбран способ оплаты "свой API ключ", но ключ не указан в профиле.');
            return;
        }

        if (currentUser.paymentMethod === 'credits') {
            const creditsDecremented = await decrementCredits(1);
            if (!creditsDecremented) {
                alert("Не удалось списать кредиты. Попробуйте снова.");
                return;
            }
        }

        setImages(prev => prev.map(img => img.id === imageId ? { ...img, status: 'pending' } : img));
        const apiKey = currentUser.paymentMethod === 'apiKey' ? currentUser.apiKey : undefined;

        // --- ИЗМЕНЕНИЕ 3: Логика выбора API для перегенерации ---
        try {
            let resultSrc: string;
            
            if (currentUser.paymentMethod === 'apiKey') {
                // Используем OhMyGPT через безопасный прокси
                resultSrc = await generateImageWithOhMyGPT(imageToRegen.prompt, 'dall-e');
            } else {
                // Используем Google Gemini/Imagen (старая логика)
                resultSrc = await generatePortrait(imageFile, imageToRegen.prompt, backgroundFile, clothingFile, apiKey);
            }

            setImages(prev => prev.map(img => img.id === imageId ? { ...img, src: resultSrc, status: 'success' } : img));
        } catch (error) {
            console.error(`Failed to regenerate image ${imageId}:`, error);
            setImages(prev => prev.map(img => img.id === imageId ? { ...img, status: 'error' } : img));
        }
        // ------------------------------------------------------------
    }, [images, imageFile, backgroundFile, clothingFile, currentUser, decrementCredits, setImages]);

    const handleDelete = (imageId: string) => {
        const imageToDelete = images.find(img => img.id === imageId);
        if (imageToDelete?.src && isFavorite(imageToDelete.src)) {
            removeFavorite(imageToDelete.src);
        }
        setImages(prev => prev.filter(img => img.id !== imageId));
        if (selectedImage?.id === imageId) {
            setSelectedImage(null);
        }
    };

    const handleDownload = (src: string) => {
        const link = document.createElement('a');
        link.href = src;
        link.download = `portrait_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = () => {
        images.forEach((image, index) => {
            if (image.src && image.status === 'success') {
                setTimeout(() => handleDownload(image.src!), index * 300);
            }
        });
    };

    const isSubmitDisabled = !imageFile || isLoading || (currentUser?.paymentMethod === 'credits' && (currentUser?.credits ?? 0) < generationCost) || (currentUser?.paymentMethod === 'apiKey' && !currentUser?.apiKey);

    return (
        <div className="min-h-screen bg-brand-primary flex flex-col md:flex-row">
            <header className="md:hidden p-4 bg-brand-secondary/50 backdrop-blur-sm border-b border-brand-secondary flex items-center gap-4">
                <button onClick={onNavigateHome} title="Вернуться в меню" className="text-brand-text-secondary hover:text-brand-accent transition-colors">
                    <HomeIcon />
                </button>
                <h1 className="text-xl font-bold text-brand-text-primary">Портретный адаптер</h1>
            </header>

            <aside className="w-full md:w-96 bg-brand-secondary/30 p-4 md:p-6 flex-shrink-0 space-y-6 md:h-screen md:overflow-y-auto">
                <div className="hidden md:flex items-center gap-4">
                    <button onClick={onNavigateHome} title="Вернуться в меню" className="text-brand-text-secondary hover:text-brand-accent transition-colors">
                        <HomeIcon />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-brand-text-primary">Портретный адаптер</h1>
                        <p className="text-sm text-brand-text-secondary">Создайте 3D-адаптацию лица</p>
                    </div>
                </div>

                <FileUpload
                    id="main-photo-upload"
                    label="1. Загрузите основное фото"
                    description="Изображение должно быть четким, анфас, без очков и лишних предметов."
                    selectedFile={imageFile}
                    onFileSelect={setImageFile}
                    targetResolution={resolution}
                />

                <div className="space-y-4 pt-4 border-t border-brand-secondary">
                    <h2 className="text-lg font-semibold text-brand-text-primary">2. Настройки генерации</h2>
                    <ToggleSwitch
                        label="Режим вывода"
                        enabled={outputMode === OutputMode.Angles}
                        onChange={(enabled) => setOutputMode(enabled ? OutputMode.Angles : OutputMode.Expressions)}
                        description={outputMode}
                    />
                    <SelectInput
                        label="План"
                        options={SHOT_TYPE_OPTIONS}
                        value={shotType}
                        onChange={setShotType}
                    />
                    <SelectInput
                        label="Формат"
                        options={RESOLUTION_OPTIONS}
                        value={resolution}
                        onChange={setResolution}
                    />
                </div>

                <div className="space-y-4 pt-4 border-t border-brand-secondary">
                    <h2 className="text-lg font-semibold text-brand-text-primary">3. Кастомизация (Опционально)</h2>
                    <SelectInput
                        label="Фон"
                        options={ADAPTER_BACKGROUND_OPTIONS}
                        value={adapterBackgroundOption}
                        onChange={(val) => {
                            setAdapterBackgroundOption(val);
                            if (val !== AdapterBackgroundOption.Upload) setBackgroundFile(null);
                            if (val !== AdapterBackgroundOption.Custom) setCustomBackgroundPrompt('');
                        }}
                    />
                    {adapterBackgroundOption === AdapterBackgroundOption.Custom && (
                        <textarea value={customBackgroundPrompt} onChange={e => setCustomBackgroundPrompt(e.target.value)} placeholder="Опишите фон, например: 'на пляже во время заката'" rows={2} className="block w-full text-sm bg-brand-secondary border-gray-600 rounded-md text-brand-text-primary p-2"/>
                    )}
                    {adapterBackgroundOption === AdapterBackgroundOption.Upload && (
                        <FileUpload id="bg-upload" label="Загрузите свой фон" description="Фон для генерации" selectedFile={backgroundFile} onFileSelect={setBackgroundFile} targetResolution={resolution} />
                    )}

                    <SelectInput
                        label="Одежда"
                        options={CLOTHING_OPTIONS}
                        value={clothingOption}
                        onChange={(val) => {
                            setClothingOption(val);
                            if (val !== ClothingOption.Upload && val !== ClothingOption.Custom) {
                                setClothingFile(null);
                                setCustomClothingPrompt('');
                            }
                        }}
                    />
                    {clothingOption === ClothingOption.Custom && (
                        <textarea value={customClothingPrompt} onChange={e => setCustomClothingPrompt(e.target.value)} placeholder="Например: 'красная рубашка в клетку'" rows={2} className="block w-full text-sm bg-brand-secondary border-gray-600 rounded-md text-brand-text-primary p-2"/>
                    )}
                    {clothingOption === ClothingOption.Upload && (
                        <FileUpload id="clothing-upload" label="Загрузите пример одежды" description="Фотография одежды" selectedFile={clothingFile} onFileSelect={setClothingFile} targetResolution={resolution} />
                    )}
                </div>

                <div className="pt-4 sticky bottom-0 bg-brand-secondary/30 md:bg-transparent pb-4 md:pb-0">
                    {isLoading ? (
                        <button onClick={handleStopGeneration} className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-md hover:bg-red-500 transition-colors flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 5a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V6a1 1 0 00-1-1H5z" clipRule="evenodd" /></svg>
                            Стоп
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={isSubmitDisabled} className="w-full bg-brand-accent text-brand-primary font-bold py-3 px-4 rounded-md hover:bg-amber-400 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                            {currentUser?.username === 'Admin'
                                ? 'Сгенерировать'
                                : currentUser?.paymentMethod === 'apiKey'
                                    ? 'Сгенерировать (свой API ключ)'
                                    : `Сгенерировать (${generationCost} ${generationCost === 1 ? 'кредит' : 'кредитов'})`
                            }
                        </button>
                    )}
                    {creditError && <p className="text-sm text-center text-red-500 mt-2">{creditError}</p>}
                    {currentUser?.paymentMethod === 'credits' && (currentUser?.credits ?? 0) < generationCost && !isLoading && !creditError && <p className="text-sm text-center text-yellow-400 mt-2">Недостаточно кредитов для этой генерации.</p>}
                </div>
            </aside>

            <main className="flex-1 bg-brand-primary">
                <ImageGallery
                    title={outputMode}
                    imageBatches={[images]}
                    onDownload={handleDownload}
                    onRegenerate={handleRegenerate}
                    onDelete={handleDelete}
                    onDownloadAll={handleDownloadAll}
                    onImageClick={setSelectedImage}
                    isFavorite={isFavorite}
                    onAddToFavorites={(src) => setImageToFavorite(src)}
                    onRemoveFromFavorites={removeFavorite}
                />
            </main>

            {selectedImage && (
                <ImageModal
                    image={selectedImage}
                    onClose={() => setSelectedImage(null)}
                    onDownload={handleDownload}
                    onRegenerate={handleRegenerate}
                    onDelete={handleDelete}
                    isFavorite={selectedImage.src ? isFavorite(selectedImage.src) : false}
                    onAddToFavorites={(src) => setImageToFavorite(src)}
                    onRemoveFromFavorites={removeFavorite}
                />
            )}
            {imageToFavorite && <AddToFavoritesModal imageSrc={imageToFavorite} onClose={() => setImageToFavorite(null)} />}
        </div>
    );
};

export default App;
