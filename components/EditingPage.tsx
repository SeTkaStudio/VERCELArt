import React, { useState, useRef, MouseEvent } from 'react';
import { GeneratedImage, ImageFile, ResolutionOption } from '../types';
import { ToggleSwitch } from './ToggleSwitch';
import { SelectInput } from './SelectInput';
import { FileUpload } from './FileUpload';
import { ImageGallery } from './ImageGallery';
import { FavoritesPickerModal } from './FavoritesPickerModal';
import { AddToFavoritesModal } from './AddToFavoritesModal';
import { ImageModal } from './ImageModal';
import { useAuth } from '../contexts/AuthContext';
import { EDITING_STYLE_PROMPT_MAP } from '../constants';
import { editImageWithGemini } from '../services/geminiService';


const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-brand-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const ZoomInIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>;
const ZoomOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

const STYLE_OPTIONS = [
  'Фото реализм', 'Аниме', 'Киберпанк', 'Черно-белое', 'Картина маслом',
  'Акварель', 'Рисунок карандашом', 'Стимпанк', 'Фэнтези-арт', 'Поп-арт',
  'Свой стиль', 'Загрузить стиль'
];

interface EditingPageProps {
  onNavigateBack: () => void;
  images: GeneratedImage[];
  setImages: React.Dispatch<React.SetStateAction<GeneratedImage[]>>;
}

export const EditingPage: React.FC<EditingPageProps> = ({ onNavigateBack, images, setImages }) => {
  const { currentUser, decrementCredits, isFavorite, removeFavorite } = useAuth();
  const [baseImage, setBaseImage] = useState<ImageFile | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [imageToFavorite, setImageToFavorite] = useState<string | null>(null);

  const [isSettingsEnabled, setIsSettingsEnabled] = useState(false);
  const [isStyleEnabled, setIsStyleEnabled] = useState(false);
  
  const [selectedStyle, setSelectedStyle] = useState(STYLE_OPTIONS[0]);
  const [customStylePrompt, setCustomStylePrompt] = useState('');
  const [styleImage, setStyleImage] = useState<ImageFile | null>(null);

  const [grain, setGrain] = useState(0);
  const [blur, setBlur] = useState(0);
  const [contrast, setContrast] = useState(100);
  const [brightness, setBrightness] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [sharpness, setSharpness] = useState(0);
  const [vignette, setVignette] = useState(0);
  
  // State for zoom and pan
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const generationCost = currentUser?.paymentMethod === 'apiKey' ? 0 : 1;

  const resetTransformations = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      resetTransformations();
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const base64String = dataUrl.split(',')[1];
        setBaseImage({
          preview: dataUrl,
          base64: base64String,
          mimeType: file.type,
          originalFile: file,
        });
      };
      reader.readAsDataURL(file);
    }
    if(event.target) event.target.value = '';
  };

  const handleFavoriteSelect = (image: GeneratedImage) => {
    if (!image.src) return;
    resetTransformations();
    const base64String = image.src.split(',')[1];
    const mimeType = image.src.match(/data:(.*);/)?.[1] || 'image/png';
    setBaseImage({
      preview: image.src,
      base64: base64String,
      mimeType: mimeType,
    });
    setIsPickerOpen(false);
  };

  const handleDeleteBaseImage = () => {
    setBaseImage(null);
    resetTransformations();
  };

  const handleGenerate = async () => {
    if (!baseImage || !currentUser) return;

    if (currentUser.paymentMethod === 'credits' && currentUser.credits < generationCost) {
        setError(`Недостаточно кредитов. Требуется: ${generationCost}, у вас: ${currentUser.credits}`);
        return;
    }
    if (currentUser.paymentMethod === 'apiKey' && !currentUser.apiKey) {
        setError('Выбран способ оплаты "свой API ключ", но ключ не указан в профиле.');
        return;
    }
    
    setIsLoading(true);
    setError('');

    if (currentUser.paymentMethod === 'credits') {
        const creditsDecremented = await decrementCredits(generationCost);
        if (!creditsDecremented) {
            setError('Не удалось списать кредиты. Попробуйте снова.');
            setIsLoading(false);
            return;
        }
    }

    const promptParts: string[] = [];
    if (isSettingsEnabled) {
        if (grain > 0) promptParts.push(`add ${grain}% film grain`);
        if (blur > 0) promptParts.push(`apply ${blur}% blur`);
        if (contrast !== 100) promptParts.push(`set contrast to ${contrast}%`);
        if (brightness !== 0) promptParts.push(`adjust brightness by ${brightness}%`);
        if (saturation !== 100) promptParts.push(`set saturation to ${saturation}%`);
        if (sharpness > 0) promptParts.push(`increase sharpness by ${sharpness}%`);
        if (vignette > 0) promptParts.push(`add a ${vignette}% vignette`);
    }

    const styleFileToUse = (isStyleEnabled && selectedStyle === 'Загрузить стиль') ? styleImage : null;
    if (isStyleEnabled) {
        if (selectedStyle === 'Свой стиль' && customStylePrompt) {
            promptParts.push(`apply this style: ${customStylePrompt}`);
        } else if (selectedStyle !== 'Загрузить стиль' && EDITING_STYLE_PROMPT_MAP[selectedStyle]) {
            promptParts.push(EDITING_STYLE_PROMPT_MAP[selectedStyle]);
        }
    }

    const fullPrompt = promptParts.length > 0
        ? `Edit the provided image. ${promptParts.join(', ')}.`
        : 'Slightly enhance the provided image, improving quality without changing the content.';

    try {
        const apiKey = currentUser.paymentMethod === 'apiKey' ? currentUser.apiKey : undefined;
        const resultSrc = await editImageWithGemini(baseImage, fullPrompt, styleFileToUse, apiKey);

        const newImage: GeneratedImage = {
            id: `edit_${Date.now()}`,
            src: resultSrc,
            prompt: fullPrompt,
            status: 'success',
            resolution: ResolutionOption.Square,
            backgroundPrompt: '',
        };
        setImages(prev => [newImage, ...prev]);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Произошла неизвестная ошибка';
        console.error("Generation failed:", e);
        setError(`Ошибка генерации: ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.2));
  
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current || !baseImage) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !imageContainerRef.current || !baseImage) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };
  
  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };
  
  const handleDownload = (src: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `edited_image_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
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

  const isSubmitDisabled = !baseImage || isLoading || (currentUser?.paymentMethod === 'credits' && (currentUser?.credits ?? 0) < generationCost) || (currentUser?.paymentMethod === 'apiKey' && !currentUser?.apiKey);

  return (
    <div className="min-h-screen bg-brand-primary text-brand-text-primary flex flex-col">
      <header className="flex-shrink-0 p-4 bg-brand-secondary/50 backdrop-blur-sm border-b border-brand-secondary flex items-center gap-4">
        <button onClick={onNavigateBack} title="Назад в меню" className="text-brand-text-secondary hover:text-brand-accent transition-colors">
          <BackIcon />
        </button>
        <h1 className="text-xl font-bold">Редактор</h1>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div 
            ref={imageContainerRef}
            className={`relative w-full h-96 bg-brand-secondary/30 rounded-lg flex items-center justify-center border-2 border-dashed overflow-hidden ${baseImage ? 'border-transparent' : 'border-brand-secondary'}`}
            style={{ cursor: baseImage ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
          >
            {baseImage ? (
              <img 
                src={baseImage.preview} 
                alt="Для редактирования" 
                className="max-w-full max-h-full"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  pointerEvents: 'none',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <div className="text-center">
                <UploadIcon />
                <p className="mt-2 text-brand-text-secondary">Загрузите или выберите изображение для редактирования</p>
                <div className="mt-4 flex gap-4">
                  <button onClick={() => fileInputRef.current?.click()} className="py-2 px-4 font-semibold text-brand-primary bg-brand-accent rounded-lg hover:bg-amber-400">Загрузить</button>
                  <button onClick={() => setIsPickerOpen(true)} className="py-2 px-4 font-semibold text-brand-text-primary bg-brand-secondary rounded-lg hover:bg-slate-600">Выбрать из избранного</button>
                  <input ref={fileInputRef} type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg" />
                </div>
              </div>
            )}
          </div>
          
          {baseImage && (
            <div className="flex items-center justify-center gap-4 p-2 bg-brand-secondary/50 rounded-lg">
                <button onClick={handleZoomIn} title="Увеличить" className="p-2 text-brand-text-secondary hover:text-brand-accent"><ZoomInIcon /></button>
                <button onClick={handleZoomOut} title="Уменьшить" className="p-2 text-brand-text-secondary hover:text-brand-accent"><ZoomOutIcon /></button>
                <button onClick={handleDeleteBaseImage} title="Удалить" className="p-2 text-brand-text-secondary hover:text-red-500"><DeleteIcon /></button>
            </div>
          )}

          <div className="flex justify-center flex-col items-center">
            <button
              onClick={handleGenerate}
              disabled={isSubmitDisabled}
              className="w-full max-w-sm py-3 font-bold text-brand-primary bg-brand-accent rounded-lg hover:bg-amber-400 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Генерация...' : `Сгенерировать ${currentUser?.username === 'Admin' ? '' : (currentUser?.paymentMethod === 'apiKey' ? '(свой API ключ)' : `(${generationCost} кредит)`) }`}
            </button>
            {error && <p className="text-sm text-center text-red-500 mt-2">{error}</p>}
          </div>

          <hr className="border-brand-secondary/50" />
          
          <div className="space-y-6">
            <div className="p-4 bg-brand-secondary/30 rounded-lg">
                <ToggleSwitch label="Настройки" enabled={isSettingsEnabled} onChange={setIsSettingsEnabled} />
                {isSettingsEnabled && (
                    <div className="space-y-4 pt-4 mt-4 border-t border-brand-secondary">
                        <div>
                            <label className="block text-sm font-medium text-brand-text-secondary mb-1">Зернистость: {grain}</label>
                            <input type="range" min="0" max="100" value={grain} onChange={e => setGrain(Number(e.target.value))} className="w-full h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-text-secondary mb-1">Размытие: {blur}</label>
                            <input type="range" min="0" max="100" value={blur} onChange={e => setBlur(Number(e.target.value))} className="w-full h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-text-secondary mb-1">Контраст: {contrast}%</label>
                            <input type="range" min="0" max="200" value={contrast} onChange={e => setContrast(Number(e.target.value))} className="w-full h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-text-secondary mb-1">Яркость: {brightness}</label>
                            <input type="range" min="-100" max="100" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-full h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-text-secondary mb-1">Насыщенность: {saturation}%</label>
                            <input type="range" min="0" max="200" value={saturation} onChange={e => setSaturation(Number(e.target.value))} className="w-full h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-text-secondary mb-1">Резкость: {sharpness}</label>
                            <input type="range" min="0" max="100" value={sharpness} onChange={e => setSharpness(Number(e.target.value))} className="w-full h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-text-secondary mb-1">Виньетка: {vignette}</label>
                            <input type="range" min="0" max="100" value={vignette} onChange={e => setVignette(Number(e.target.value))} className="w-full h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent"/>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="p-4 bg-brand-secondary/30 rounded-lg">
                <ToggleSwitch label="Стиль" enabled={isStyleEnabled} onChange={setIsStyleEnabled} />
                {isStyleEnabled && (
                     <div className="space-y-4 pt-4 mt-4 border-t border-brand-secondary">
                        <SelectInput label="Выберите стиль" options={STYLE_OPTIONS} value={selectedStyle} onChange={setSelectedStyle} />
                        {selectedStyle === 'Свой стиль' && (
                             <textarea value={customStylePrompt} onChange={e => setCustomStylePrompt(e.target.value)} placeholder="Опишите желаемый стиль..." rows={3} className="block w-full text-sm bg-brand-primary border-slate-600 rounded-md text-brand-text-primary p-2"/>
                        )}
                        {selectedStyle === 'Загрузить стиль' && (
                            <FileUpload id="style-image-upload" label="Загрузите пример стиля" description="Изображение-референс для стиля" selectedFile={styleImage} onFileSelect={setStyleImage} targetResolution={ResolutionOption.Square} />
                        )}
                    </div>
                )}
            </div>
          </div>
        </div>

        {images.length > 0 && (
          <div className="pt-8 border-t border-brand-secondary/50">
             <ImageGallery 
                title="Результаты"
                imageBatches={[images]}
                onDownload={handleDownload}
                onRegenerate={() => {}}
                onDelete={handleDelete}
                onDownloadAll={() => {}}
                onImageClick={setSelectedImage}
                isFavorite={isFavorite}
                onAddToFavorites={(src) => setImageToFavorite(src)}
                onRemoveFromFavorites={removeFavorite}
             />
          </div>
        )}
      </main>

      {isPickerOpen && <FavoritesPickerModal onClose={() => setIsPickerOpen(false)} onImageSelect={handleFavoriteSelect} />}
      {selectedImage && <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} onDownload={handleDownload} onRegenerate={() => {}} onDelete={handleDelete} showRegenerate={false} isFavorite={selectedImage.src ? isFavorite(selectedImage.src) : false} onAddToFavorites={(src) => setImageToFavorite(src)} onRemoveFromFavorites={removeFavorite} isInteractive={true} />}
      {imageToFavorite && <AddToFavoritesModal imageSrc={imageToFavorite} onClose={() => setImageToFavorite(null)} />}
    </div>
  );
};