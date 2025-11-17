import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { SelectInput } from './SelectInput';
import { ToggleSwitch } from './ToggleSwitch';
import { FileUpload } from './FileUpload';
import { ImageGallery } from './ImageGallery';
import { ImageModal } from './ImageModal';
import { AddToFavoritesModal } from './AddToFavoritesModal';
import { GeneratedImage, ImageFile, ResolutionOption } from '../types';
import {
  PHOTO_GENERATION_MODELS, MODEL_ASPECT_RATIOS, AspectRatio, IMAGE_VARIATION_BASE_PROMPT,
  VARIATION_STRENGTH_PROMPT_MAP, RESOLUTION_OPTIONS_MAP, PHOTO_STYLE_OPTIONS, PHOTO_STYLE_PROMPT_MAP,
  CAMERA_APERTURE_RANGE, CAMERA_FOCAL_LENGTH_RANGE, CAMERA_SHUTTER_SPEED_OPTIONS, CAMERA_ISO_OPTIONS,
  LIGHTING_STYLE_OPTIONS, LIGHTING_STYLE_PROMPT_MAP, FILM_GRAIN_OPTIONS, FILM_GRAIN_PROMPT_MAP,
  BLUR_OPTIONS, BLUR_PROMPT_MAP, VIGNETTE_OPTIONS, VIGNETTE_PROMPT_MAP
} from '../constants';
import { generateImageWithGemini, generateImagesWithImagen, generateImageVariation } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const mapAspectRatioToResolutionOption = (aspectRatio: AspectRatio): ResolutionOption => {
    switch (aspectRatio) {
        case '1:1': return ResolutionOption.Square;
        case '16:9':
        case '4:3': return ResolutionOption.Landscape;
        case '9:16':
        case '3:4': return ResolutionOption.Portrait;
        default: return ResolutionOption.Square;
    }
};

const getNumericAspectRatio = (ratio: AspectRatio): number => {
  const [w, h] = ratio.split(':').map(Number);
  if (h === 0) return 1;
  return w / h;
};

const processImage = (file: File, targetAspectRatioValue: AspectRatio): Promise<ImageFile> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                const targetAspectRatio = getNumericAspectRatio(targetAspectRatioValue);
                const CANVAS_WIDTH = 1024;
                const CANVAS_HEIGHT = CANVAS_WIDTH / targetAspectRatio;

                canvas.width = CANVAS_WIDTH;
                canvas.height = CANVAS_HEIGHT;
                
                const imgAspectRatio = img.width / img.height;
                let sx = 0, sy = 0, sw = img.width, sh = img.height;

                if (imgAspectRatio > targetAspectRatio) {
                    sw = img.height * targetAspectRatio;
                    sx = (img.width - sw) / 2;
                } else if (imgAspectRatio < targetAspectRatio) {
                    sh = img.width / targetAspectRatio;
                    sy = (img.height - sh) / 2;
                }
                
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

                const dataUrl = canvas.toDataURL(file.type, 0.9);
                const base64String = dataUrl.split(',')[1];
                
                resolve({
                    preview: dataUrl,
                    base64: base64String,
                    mimeType: file.type,
                    originalFile: file,
                });
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
}

const createFormatFile = (aspectRatioValue: AspectRatio): Promise<ImageFile> => {
    return new Promise((resolve) => {
        const targetAspectRatio = getNumericAspectRatio(aspectRatioValue);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const CANVAS_WIDTH = 256; 
        const CANVAS_HEIGHT = Math.round(CANVAS_WIDTH / targetAspectRatio);

        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/png');
        const base64String = dataUrl.split(',')[1];
        
        resolve({
            preview: dataUrl,
            base64: base64String,
            mimeType: 'image/png',
        });
    });
};


interface PhotoGenerationPageProps {
  onNavigateBack: () => void;
  imageBatches: GeneratedImage[][];
  setImageBatches: React.Dispatch<React.SetStateAction<GeneratedImage[][]>>;
}

export const PhotoGenerationPage: React.FC<PhotoGenerationPageProps> = ({ onNavigateBack, imageBatches, setImageBatches }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState(PHOTO_GENERATION_MODELS[0].id);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [numberOfImages, setNumberOfImages] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  
  const [baseImage, setBaseImage] = useState<ImageFile | null>(null);
  const [variationStrength, setVariationStrength] = useState(5);
  
  const isGenerationCancelled = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { currentUser, decrementCredits, removeFavorite, isFavorite } = useAuth();
  const [creditError, setCreditError] = useState('');
  const [imageToFavorite, setImageToFavorite] = useState<string | null>(null);

  const [isExpertMode, setIsExpertMode] = useState(false);
  const [resolution, setResolution] = useState<string>('');
  const [isStyleEnabled, setIsStyleEnabled] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(PHOTO_STYLE_OPTIONS[0]);
  const [customStylePrompt, setCustomStylePrompt] = useState('');
  const [styleImage, setStyleImage] = useState<ImageFile | null>(null);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [aperture, setAperture] = useState(5.6);
  const [shutterSpeed, setShutterSpeed] = useState('1/125s');
  const [iso, setIso] = useState('100');
  const [focalLength, setFocalLength] = useState(50);
  const [isLightingEnabled, setIsLightingEnabled] = useState(false);
  const [selectedLighting, setSelectedLighting] = useState(LIGHTING_STYLE_OPTIONS[0]);
  const [customLightingPrompt, setCustomLightingPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isPhotoEffectsEnabled, setIsPhotoEffectsEnabled] = useState(false);
  const [filmGrain, setFilmGrain] = useState(FILM_GRAIN_OPTIONS[0]);
  const [blur, setBlur] = useState(BLUR_OPTIONS[0]);
  const [vignette, setVignette] = useState(VIGNETTE_OPTIONS[0]);
  const [isNegativePromptEnabled, setIsNegativePromptEnabled] = useState(false);

  const currentModel = useMemo(() => PHOTO_GENERATION_MODELS.find(m => m.id === selectedModel)!, [selectedModel]);
  const aspectRatioOptions = useMemo(() => MODEL_ASPECT_RATIOS[selectedModel] || [], [selectedModel]);
  
  const resolutionOptionsForAspectRatio = useMemo(() => {
      const availableRatios = MODEL_ASPECT_RATIOS[selectedModel] || [];
      return availableRatios.flatMap(ratioInfo => {
          const resOptions = RESOLUTION_OPTIONS_MAP[ratioInfo.ratio] || [];
          return resOptions.map(res => ({
              label: `${ratioInfo.label} - ${res.label}`,
              value: `${ratioInfo.ratio}|${res.value}`
          }));
      });
  }, [selectedModel]);

  useEffect(() => {
    if (isExpertMode) {
      if (!resolutionOptionsForAspectRatio.some(opt => opt.value.startsWith(aspectRatio + '|'))) {
        const newDefault = resolutionOptionsForAspectRatio[0];
        if (newDefault) {
          const [newRatio, newRes] = newDefault.value.split('|');
          setAspectRatio(newRatio as AspectRatio);
          setResolution(newRes);
        }
      }
    } else {
      if (!aspectRatioOptions.some(opt => opt.ratio === aspectRatio)) {
        const newAspectRatio = aspectRatioOptions[0]?.ratio || '1:1';
        setAspectRatio(newAspectRatio);
      }
    }
  }, [isExpertMode, selectedModel, aspectRatio, resolutionOptionsForAspectRatio, aspectRatioOptions]);

  const generationCost = currentUser?.paymentMethod === 'apiKey' ? 0 : numberOfImages;
  
  useEffect(() => {
    if (numberOfImages > currentModel.maxImages) {
      setNumberOfImages(currentModel.maxImages);
    }
    if (!currentModel.supportsImageInput) {
        setBaseImage(null);
    }
  }, [selectedModel, numberOfImages, currentModel.maxImages, currentModel.supportsImageInput]);

  useEffect(() => {
    const reprocess = async () => {
        if (baseImage?.originalFile) {
            const processedFile = await processImage(baseImage.originalFile, aspectRatio);
            setBaseImage(processedFile);
        }
    };
    reprocess();
  }, [aspectRatio, baseImage?.originalFile]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const processedFile = await processImage(file, aspectRatio);
      setBaseImage(processedFile);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const buildExpertPrompt = useCallback(() => {
    let expertParts: string[] = [];

    if (isStyleEnabled && selectedStyle !== 'Загрузить свой стиль') {
        if (selectedStyle === 'Ввести свой промпт') {
            if (customStylePrompt) expertParts.push(`in the style of ${customStylePrompt}`);
        } else {
            expertParts.push(PHOTO_STYLE_PROMPT_MAP[selectedStyle]);
        }
    }

    if (isCameraEnabled) {
        expertParts.push(`shot on a camera with settings: aperture f/${aperture.toFixed(1)}, shutter speed ${shutterSpeed}, ISO ${iso}, focal length ${focalLength}mm`);
    }

    if (isLightingEnabled) {
        if (selectedLighting === 'Ввести свой промпт') {
            if (customLightingPrompt) expertParts.push(`with ${customLightingPrompt} lighting`);
        } else {
            expertParts.push(LIGHTING_STYLE_PROMPT_MAP[selectedLighting]);
        }
    }
    
    if (isPhotoEffectsEnabled) {
        if (filmGrain !== FILM_GRAIN_OPTIONS[0]) {
            expertParts.push(FILM_GRAIN_PROMPT_MAP[filmGrain]);
        }
        if (blur !== BLUR_OPTIONS[0]) {
            expertParts.push(BLUR_PROMPT_MAP[blur]);
        }
        if (vignette !== VIGNETTE_OPTIONS[0]) {
            expertParts.push(VIGNETTE_PROMPT_MAP[vignette]);
        }
    }

    let finalPrompt = prompt;
    if (expertParts.length > 0) {
        finalPrompt += `. ${expertParts.join(', ')}`;
    }

    if (isNegativePromptEnabled && negativePrompt) {
        finalPrompt += `. Negative prompt: ${negativePrompt.split(',').map(s => s.trim()).join(', ')}`;
    }

    return finalPrompt;
  }, [isStyleEnabled, selectedStyle, customStylePrompt, isCameraEnabled, aperture, shutterSpeed, iso, focalLength, isLightingEnabled, selectedLighting, customLightingPrompt, prompt, negativePrompt, isPhotoEffectsEnabled, filmGrain, blur, vignette, isNegativePromptEnabled]);

  const updateImageInBatch = (id: string, updates: Partial<GeneratedImage>) => {
    setImageBatches(prevBatches => {
        const newBatches = [...prevBatches];
        for (let i = 0; i < newBatches.length; i++) {
            const batch = newBatches[i];
            const imageIndex = batch.findIndex(img => img.id === id);
            if (imageIndex !== -1) {
                const newBatch = [...batch];
                newBatch[imageIndex] = { ...newBatch[imageIndex], ...updates };
                newBatches[i] = newBatch;
                return newBatches;
            }
        }
        return newBatches;
    });
  };

  const runVariationGeneration = async (placeholders: GeneratedImage[], finalPrompt: string) => {
      if (!baseImage) return;

      const textPromptPart = finalPrompt ? `Text prompt: "${finalPrompt}".` : 'Use your creative judgment to interpret the image.';
      const variationPrompt = VARIATION_STRENGTH_PROMPT_MAP[variationStrength];
      const fullPrompt = `${textPromptPart} ${IMAGE_VARIATION_BASE_PROMPT} ${variationPrompt}`;
      const apiKey = currentUser?.paymentMethod === 'apiKey' ? currentUser.apiKey : undefined;
      const finalResolution = isExpertMode ? resolution : (RESOLUTION_OPTIONS_MAP[aspectRatio] || [])[0]?.value || '1024x1024';
      const styleFileToUse = isStyleEnabled && selectedStyle === 'Загрузить свой стиль' ? styleImage : null;

      for (const placeholder of placeholders) {
        if (isGenerationCancelled.current) break;
        try {
            const resultSrc = await generateImageVariation(baseImage, fullPrompt, finalResolution, aspectRatio, styleFileToUse, apiKey);
            if (isGenerationCancelled.current) break;
            updateImageInBatch(placeholder.id, { src: resultSrc, status: 'success' });
        } catch (error) {
            console.error(`Failed to generate image variation for id ${placeholder.id}:`, error);
            updateImageInBatch(placeholder.id, { status: 'error' });
        }
        if (placeholders.length > 1) await sleep(2500);
      }
  };

  const runTextToImageGeneration = async (placeholders: GeneratedImage[], finalPrompt: string, formatFile: ImageFile) => {
    const apiKey = currentUser?.paymentMethod === 'apiKey' ? currentUser.apiKey : undefined;
    const finalResolution = isExpertMode ? resolution : (RESOLUTION_OPTIONS_MAP[aspectRatio] || [])[0]?.value || '1024x1024';
    const styleFileToUse = isExpertMode && isStyleEnabled && selectedStyle === 'Загрузить свой стиль' ? styleImage : null;
    try {
        if (selectedModel === 'imagen-4.0-generate-001') {
            const results = await generateImagesWithImagen(finalPrompt, aspectRatio, numberOfImages, finalResolution, apiKey);
            if (isGenerationCancelled.current) return;
            setImageBatches(prevBatches => {
                const newBatches = [...prevBatches];
                const currentBatch = [...newBatches[0]];
                const updatedBatch = currentBatch.map((img, i) => ({
                     ...img,
                    src: results[i] || null,
                    status: results[i] ? 'success' : 'error',
                }));
                newBatches[0] = updatedBatch;
                return newBatches;
            });
        } else if (selectedModel === 'gemini-2.5-flash-image') {
            for (const placeholder of placeholders) {
                if (isGenerationCancelled.current) break;
                try {
                    const resultSrc = await generateImageWithGemini(finalPrompt, aspectRatio, finalResolution, formatFile, styleFileToUse, apiKey);
                    if (isGenerationCancelled.current) break;
                    updateImageInBatch(placeholder.id, { src: resultSrc, status: 'success' });
                } catch (error) {
                    console.error(`Failed to generate image for id ${placeholder.id}:`, error);
                    updateImageInBatch(placeholder.id, { status: 'error' });
                }
                if (placeholders.length > 1) await sleep(2500);
            }
        }
    } catch (error) {
        console.error("An error occurred during text-to-image generation:", error);
        setImageBatches(prevBatches => {
            const newBatches = [...prevBatches];
            newBatches[0] = newBatches[0].map(img => ({ ...img, status: 'error' }));
            return newBatches;
        });
    }
  };


  const handleSubmit = useCallback(async () => {
    if (!currentUser) return;
    const finalResolution = isExpertMode ? resolution : (RESOLUTION_OPTIONS_MAP[aspectRatio] || [])[0]?.value;
    if ((!prompt && !baseImage) || !finalResolution) {
        alert("Пожалуйста, введите текстовый промпт или загрузите изображение.");
        return;
    }
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

    const finalPrompt = isExpertMode ? buildExpertPrompt() : prompt;

    const placeholders: GeneratedImage[] = Array.from({ length: numberOfImages }).map((_, i) => ({
      id: `gen_${Date.now()}_${i}`,
      src: null,
      prompt: finalPrompt || `Variation of uploaded image (Strength: ${variationStrength})`,
      status: 'pending',
      resolution: mapAspectRatioToResolutionOption(aspectRatio),
      backgroundPrompt: `Model: ${currentModel.name}`,
    }));
    setImageBatches(prevBatches => [placeholders, ...prevBatches]);

    if (baseImage && currentModel.supportsImageInput) {
        await runVariationGeneration(placeholders, finalPrompt);
    } else {
        const formatFile = await createFormatFile(aspectRatio);
        await runTextToImageGeneration(placeholders, finalPrompt, formatFile);
    }
    
    setIsLoading(false);

  }, [prompt, selectedModel, aspectRatio, numberOfImages, baseImage, variationStrength, currentModel, currentUser, decrementCredits, generationCost, isExpertMode, resolution, buildExpertPrompt, setImageBatches]);

  const handleStopGeneration = () => {
    isGenerationCancelled.current = true;
    setIsLoading(false);
    setImageBatches(prevBatches => prevBatches.map((batch, index) => 
        index === 0 
        ? batch.map(img => img.status === 'pending' ? { ...img, status: 'error' } : img) 
        : batch
    ));
  };
  
  const handleRegenerate = useCallback(async (imageId: string) => {
    const allImages = imageBatches.flat();
    const imageToRegen = allImages.find(img => img.id === imageId);
    const finalResolution = isExpertMode ? resolution : (RESOLUTION_OPTIONS_MAP[aspectRatio] || [])[0]?.value;
    if (!imageToRegen || !finalResolution || !currentUser) return;

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
    
    updateImageInBatch(imageId, { status: 'pending' });
    const apiKey = currentUser.paymentMethod === 'apiKey' ? currentUser.apiKey : undefined;
    const finalPrompt = isExpertMode ? buildExpertPrompt() : imageToRegen.prompt;
    const styleFileToUse = isExpertMode && isStyleEnabled && selectedStyle === 'Загрузить свой стиль' ? styleImage : null;

    try {
        let resultSrc: string | null = null;
        if (baseImage && currentModel.supportsImageInput) {
             const textPromptPart = finalPrompt.startsWith('Variation') ? '' : `Text prompt: "${finalPrompt}".`;
             const variationPrompt = VARIATION_STRENGTH_PROMPT_MAP[variationStrength];
             const fullPrompt = `${textPromptPart} ${IMAGE_VARIATION_BASE_PROMPT} ${variationPrompt}`;
             resultSrc = await generateImageVariation(baseImage, fullPrompt, finalResolution, aspectRatio, styleFileToUse, apiKey);
        } else if (selectedModel === 'imagen-4.0-generate-001') {
            const results = await generateImagesWithImagen(finalPrompt, aspectRatio, 1, finalResolution, apiKey);
            resultSrc = results[0];
        } else {
            const formatFile = await createFormatFile(aspectRatio);
            resultSrc = await generateImageWithGemini(finalPrompt, aspectRatio, finalResolution, formatFile, styleFileToUse, apiKey);
        }

        updateImageInBatch(imageId, { src: resultSrc, status: 'success' });
    } catch (error) {
        console.error(`Failed to regenerate image for id ${imageId}:`, error);
        updateImageInBatch(imageId, { status: 'error' });
    }
  }, [imageBatches, selectedModel, aspectRatio, baseImage, variationStrength, currentModel, currentUser, decrementCredits, isExpertMode, resolution, buildExpertPrompt, isStyleEnabled, selectedStyle, styleImage, setImageBatches]);


  const handleDelete = (imageId: string) => {
      const allImages = imageBatches.flat();
      const imageToDelete = allImages.find(img => img.id === imageId);
      if (imageToDelete?.src && isFavorite(imageToDelete.src)) {
        removeFavorite(imageToDelete.src);
      }
      setImageBatches(prevBatches => prevBatches.map(batch => batch.filter(img => img.id !== imageId)).filter(batch => batch.length > 0));
      if (selectedImage?.id === imageId) {
        setSelectedImage(null);
      }
  };
  
  const handleDownload = (src: string, filename?: string) => {
      const link = document.createElement('a');
      link.href = src;
      link.download = filename || `generated_image_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    const allImages = imageBatches.flat();
    allImages.forEach((image, index) => {
        if (image.src && image.status === 'success') {
            setTimeout(() => {
                handleDownload(image.src!, `image_${image.id}_${index + 1}.png`);
            }, index * 300);
        }
    });
  };

  const handleImageClick = (image: GeneratedImage) => {
    if (image.status === 'success' && image.src) {
        setSelectedImage(image);
    }
  };

  const isSubmitDisabled = (!prompt && !baseImage) || isLoading ||
    (currentUser?.paymentMethod === 'credits' && (currentUser?.credits ?? 0) < generationCost) ||
    (currentUser?.paymentMethod === 'apiKey' && !currentUser?.apiKey);


  return (
    <div className="min-h-screen bg-brand-primary flex flex-col md:flex-row">
      <header className="md:hidden p-4 bg-brand-secondary/50 backdrop-blur-sm border-b border-brand-secondary flex items-center gap-4">
          <button onClick={onNavigateBack} title="Назад в меню" className="text-brand-text-secondary hover:text-brand-accent transition-colors">
            <BackIcon />
          </button>
          <h1 className="text-xl font-bold text-brand-text-primary">Генерация фото</h1>
      </header>

      <aside className="w-full md:w-96 bg-brand-secondary/30 p-4 md:p-6 flex-shrink-0 space-y-6 md:h-screen md:overflow-y-auto">
        <div className="hidden md:block">
            <div className="flex items-center gap-4">
               <button onClick={onNavigateBack} title="Назад в меню" className="text-brand-text-secondary hover:text-brand-accent transition-colors">
                <BackIcon />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-brand-text-primary">Генерация Фото</h1>
                <p className="text-sm text-brand-text-secondary">Текст в изображение</p>
              </div>
            </div>
        </div>

        {baseImage && currentModel.supportsImageInput && (
             <div>
                <label htmlFor="variation-strength" className="block text-sm font-medium text-brand-text-secondary mb-1">
                    Сила вариации (фантазия): <span className="font-bold text-brand-accent">{variationStrength}</span>
                </label>
                <input
                    id="variation-strength"
                    type="range"
                    min="1"
                    max="10"
                    value={variationStrength}
                    onChange={(e) => setVariationStrength(Number(e.target.value))}
                    className="w-full h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent"
                />
                 <p className="mt-2 text-xs text-brand-text-secondary">1 = мин. изменения, 10 = макс. фантазии.</p>
            </div>
        )}
        
        <div>
            <label htmlFor="main-prompt" className="block text-sm font-medium text-brand-text-secondary mb-1">
                Ваш промпт
            </label>
            <div className="relative">
                <textarea
                    id="main-prompt"
                    rows={5}
                    className="block w-full text-sm bg-brand-secondary border-gray-600 focus:outline-none focus:ring-brand-accent focus:border-brand-accent rounded-md text-brand-text-primary p-2 pr-12"
                    placeholder={baseImage ? "Например: 'сделай его киберпанком'" : "Например: 'эпичный портрет космонавта'"}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                />
                {currentModel.supportsImageInput && (
                    <>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            title="Прикрепить изображение"
                            className="absolute top-2 right-2 p-2 rounded-full text-brand-text-secondary hover:bg-brand-primary hover:text-brand-accent transition-colors"
                        >
                            <UploadIcon />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="sr-only"
                            onChange={handleFileChange}
                            accept="image/png, image/jpeg"
                        />
                    </>
                )}
            </div>
             {baseImage && (
                <div className="mt-2 relative w-20 h-20 rounded-md overflow-hidden border-2 border-brand-secondary">
                    <img src={baseImage.preview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                        onClick={() => setBaseImage(null)}
                        className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                        title="Удалить изображение"
                    >
                        <CloseIcon />
                    </button>
                </div>
            )}
             {!currentModel.supportsImageInput && (
                <p className="mt-2 text-xs text-brand-text-secondary">
                    Модель {currentModel.name} не поддерживает загрузку изображений.
                </p>
            )}
        </div>

        <ToggleSwitch label="Режим Эксперта" enabled={isExpertMode} onChange={setIsExpertMode} description="Включает расширенные настройки генерации" />

        {isExpertMode ? (
          <div className="space-y-6 pt-4 border-t border-brand-secondary">
            <SelectInput
              label="Формат и Разрешение"
              options={resolutionOptionsForAspectRatio.map(opt => opt.label)}
              value={resolutionOptionsForAspectRatio.find(opt => opt.value === `${aspectRatio}|${resolution}`)?.label || ''}
              onChange={(val) => {
                  const selectedOpt = resolutionOptionsForAspectRatio.find(opt => opt.label === val);
                  if (selectedOpt) {
                    const [newRatio, newRes] = selectedOpt.value.split('|');
                    setAspectRatio(newRatio as AspectRatio);
                    setResolution(newRes);
                  }
              }}
            />

            <div className="space-y-4 p-4 bg-brand-primary/50 rounded-md">
                <ToggleSwitch label="Стиль фото" enabled={isStyleEnabled} onChange={setIsStyleEnabled} />
                {isStyleEnabled && (
                    <div className="space-y-4 pt-2">
                        <SelectInput label="Выберите стиль" options={PHOTO_STYLE_OPTIONS} value={selectedStyle} onChange={setSelectedStyle} />
                        {selectedStyle === 'Ввести свой промпт' && (
                             <textarea value={customStylePrompt} onChange={e => setCustomStylePrompt(e.target.value)} placeholder="Опишите желаемый стиль..." rows={2} className="block w-full text-sm bg-brand-secondary border-gray-600 rounded-md text-brand-text-primary p-2"/>
                        )}
                        {selectedStyle === 'Загрузить свой стиль' && (
                            <FileUpload id="style-image-upload" label="Загрузите пример стиля" description="Изображение-референс для стиля" selectedFile={styleImage} onFileSelect={setStyleImage} targetResolution={mapAspectRatioToResolutionOption(aspectRatio)} />
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-4 p-4 bg-brand-primary/50 rounded-md">
                <ToggleSwitch label="Настройки камеры" enabled={isCameraEnabled} onChange={setIsCameraEnabled} />
                {isCameraEnabled && (
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="block text-sm font-medium text-brand-text-secondary mb-1">Диафрагма: f/{aperture.toFixed(1)}</label>
                            <input type="range" min={CAMERA_APERTURE_RANGE.min} max={CAMERA_APERTURE_RANGE.max} step={CAMERA_APERTURE_RANGE.step} value={aperture} onChange={e => setAperture(Number(e.target.value))} className="w-full h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-brand-text-secondary mb-1">Фокусное расстояние: {focalLength}mm</label>
                            <input type="range" min={CAMERA_FOCAL_LENGTH_RANGE.min} max={CAMERA_FOCAL_LENGTH_RANGE.max} step={CAMERA_FOCAL_LENGTH_RANGE.step} value={focalLength} onChange={e => setFocalLength(Number(e.target.value))} className="w-full h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent"/>
                        </div>
                        <SelectInput label="Выдержка" options={CAMERA_SHUTTER_SPEED_OPTIONS} value={shutterSpeed} onChange={setShutterSpeed} />
                        <SelectInput label="ISO" options={CAMERA_ISO_OPTIONS} value={iso} onChange={setIso} />
                    </div>
                )}
            </div>
            
            <div className="space-y-4 p-4 bg-brand-primary/50 rounded-md">
                <ToggleSwitch label="Освещение" enabled={isLightingEnabled} onChange={setIsLightingEnabled} />
                {isLightingEnabled && (
                    <div className="space-y-4 pt-2">
                        <SelectInput label="Выберите тип освещения" options={LIGHTING_STYLE_OPTIONS} value={selectedLighting} onChange={setSelectedLighting} />
                        {selectedLighting === 'Ввести свой промпт' && (
                             <textarea value={customLightingPrompt} onChange={e => setCustomLightingPrompt(e.target.value)} placeholder="Опишите желаемое освещение..." rows={2} className="block w-full text-sm bg-brand-secondary border-gray-600 rounded-md text-brand-text-primary p-2"/>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-4 p-4 bg-brand-primary/50 rounded-md">
                <ToggleSwitch label="Фотоэффекты" enabled={isPhotoEffectsEnabled} onChange={setIsPhotoEffectsEnabled} />
                {isPhotoEffectsEnabled && (
                    <div className="space-y-4 pt-2">
                        <SelectInput label="Зернистость пленки" options={FILM_GRAIN_OPTIONS} value={filmGrain} onChange={setFilmGrain} />
                        <SelectInput label="Размытие" options={BLUR_OPTIONS} value={blur} onChange={setBlur} />
                        <SelectInput label="Виньетирование (затемнение краев)" options={VIGNETTE_OPTIONS} value={vignette} onChange={setVignette} />
                    </div>
                )}
            </div>
            
            <div className="space-y-4 p-4 bg-brand-primary/50 rounded-md">
                <ToggleSwitch label="Негативный промпт" enabled={isNegativePromptEnabled} onChange={setIsNegativePromptEnabled} description="Укажите, чего НЕ должно быть на изображении." />
                {isNegativePromptEnabled && (
                     <textarea value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} placeholder="Например: blurry, cartoon, ugly, deformed" rows={2} className="block w-full text-sm bg-brand-secondary border-gray-600 rounded-md text-brand-text-primary p-2"/>
                )}
            </div>
          </div>
        ) : (
          <SelectInput
            label="Формат изображения"
            options={aspectRatioOptions.map(opt => opt.label)}
            value={aspectRatioOptions.find(opt => opt.ratio === aspectRatio)?.label || ''}
            onChange={(val) => {
                const selectedOpt = aspectRatioOptions.find(opt => opt.label === val);
                if (selectedOpt) {
                  setAspectRatio(selectedOpt.ratio);
                }
            }}
          />
        )}


        <div>
          <label htmlFor="model-select" className="block text-sm font-medium text-brand-text-secondary">
            Модель генерации
          </label>
          <select
            id="model-select"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-brand-secondary border-gray-600 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm rounded-md text-brand-text-primary"
            value={selectedModel}
            onChange={(e) => {
                const model = PHOTO_GENERATION_MODELS.find(m => m.id === e.target.value);
                if (model && model.enabled) {
                    setSelectedModel(e.target.value)
                }
            }}
          >
            {PHOTO_GENERATION_MODELS.map((model) => (
              <option key={model.id} value={model.id} disabled={!model.enabled}>{model.name}</option>
            ))}
          </select>
        </div>
        <div>
            <label htmlFor="image-count" className="block text-sm font-medium text-brand-text-secondary mb-1">
                Количество изображений: <span className="font-bold text-brand-accent">{numberOfImages}</span>
            </label>
            <input
                id="image-count"
                type="range"
                min="1"
                max={currentModel.maxImages}
                value={numberOfImages}
                onChange={(e) => setNumberOfImages(Number(e.target.value))}
                className="w-full h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent"
            />
             <p className="mt-2 text-xs text-brand-text-secondary">
                {currentModel.name} генерирует до {currentModel.maxImages} изображений.
             </p>
        </div>

        <div className="pt-4 sticky bottom-0 bg-brand-secondary/30 md:bg-transparent pb-4 md:pb-0">
           {isLoading ? (
              <button
                onClick={handleStopGeneration}
                className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-md hover:bg-red-500 transition-colors flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 5a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V6a1 1 0 00-1-1H5z" clipRule="evenodd" />
                </svg>
                Стоп
              </button>
           ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className="w-full bg-brand-accent text-brand-primary font-bold py-3 px-4 rounded-md hover:bg-amber-400 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
              >
                { currentUser?.username === 'Admin'
                  ? 'Сгенерировать'
                  : currentUser?.paymentMethod === 'apiKey' 
                    ? 'Сгенерировать (свой API ключ)'
                    : `Сгенерировать (${generationCost} ${generationCost === 1 ? 'кредит' : (generationCost > 1 && generationCost < 5) ? 'кредита' : 'кредитов'})`
                }
              </button>
           )}
           {creditError && <p className="text-sm text-center text-red-500 mt-2">{creditError}</p>}
           {currentUser?.paymentMethod === 'credits' && (currentUser?.credits ?? 0) < generationCost && !isLoading && !creditError && <p className="text-sm text-center text-yellow-400 mt-2">Недостаточно кредитов для генерации {generationCost} изображений.</p>}
        </div>
      </aside>

      <main className="flex-1 bg-brand-primary overflow-y-auto h-screen">
        <ImageGallery 
          title="Сгенерированные изображения"
          imageBatches={imageBatches}
          onDownload={handleDownload}
          onRegenerate={handleRegenerate}
          onDelete={handleDelete}
          onDownloadAll={handleDownloadAll}
          onImageClick={handleImageClick}
          isFavorite={isFavorite}
          onAddToFavorites={(src) => setImageToFavorite(src)}
          onRemoveFromFavorites={removeFavorite}
          hidePlaceholders
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