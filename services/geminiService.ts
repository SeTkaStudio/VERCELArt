import { GoogleGenAI, Modality } from "@google/genai";
import { ImageFile } from '../types';
import { AspectRatio, FaceSelectionAspectRatio } from '../constants';

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generatePortrait = async (
    imageFile: ImageFile,
    fullPrompt: string,
    backgroundFile: ImageFile | null,
    clothingFile: ImageFile | null,
    apiKey?: string,
): Promise<string> => {
    // FIX: Use process.env.API_KEY as per guidelines and to fix TypeScript error.
    const effectiveApiKey = apiKey || process.env.API_KEY;
    if (!effectiveApiKey) {
        throw new Error("API_KEY is not set in the environment.");
    }
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

    const parts = [];

    parts.push({
        inlineData: {
            data: imageFile.base64,
            mimeType: imageFile.mimeType,
        },
    });

    if (clothingFile) {
        parts.push({
            inlineData: {
                data: clothingFile.base64,
                mimeType: clothingFile.mimeType,
            },
        });
    }

    if (backgroundFile) {
        parts.push({
            inlineData: {
                data: backgroundFile.base64,
                mimeType: backgroundFile.mimeType,
            },
        });
    }

    parts.push({
        text: fullPrompt,
    });

    let attempt = 1;
    while (attempt <= MAX_RETRIES + 1) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: parts,
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            const candidate = response.candidates?.[0];

            if (!candidate || !candidate.content || !candidate.content.parts) {
                console.error("Invalid response structure from Gemini API (generatePortrait):", JSON.stringify(response, null, 2));
                const finishReason = candidate?.finishReason;
                let errorMessage = "Invalid or empty response from Gemini API.";
                if (finishReason) errorMessage += ` Finish reason: ${finishReason}.`;
                if (response.promptFeedback) errorMessage += ` Prompt feedback: ${JSON.stringify(response.promptFeedback)}.`;

                if (finishReason === 'IMAGE_OTHER' || finishReason === 'SAFETY') {
                    throw new Error(`Retriable: ${errorMessage}`);
                }
                throw new Error(errorMessage);
            }

            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            throw new Error("No image data found in the response parts.");

        } catch (error) {
            const errorStr = String(error);
            const isRetriableError = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('Retriable:');

            if (isRetriableError && attempt <= MAX_RETRIES) {
                const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`Retriable error during portrait generation. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${MAX_RETRIES})`);
                await sleep(delay);
                attempt++;
            } else {
                console.error(`Error generating portrait on attempt ${attempt}:`, error);
                throw error;
            }
        }
    }

    throw new Error("Generation failed after exhausting all retries.");
};

export const generateImageWithGemini = async (prompt: string, aspectRatio: AspectRatio, resolution: string, formatFile: ImageFile, styleFile: ImageFile | null, apiKey?: string): Promise<string> => {
    // FIX: Use process.env.API_KEY as per guidelines and to fix TypeScript error.
    const effectiveApiKey = apiKey || process.env.API_KEY;
    if (!effectiveApiKey) throw new Error("API_KEY is not set in the environment.");
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

    let fullPrompt = `The provided image is a black template that defines the required aspect ratio. Your output MUST match this aspect ratio. The user's prompt is: "${prompt}". The image should be 8k, ultra high detail, photorealistic.`;

    // FIX: Explicitly type the `parts` array to allow both image and text parts, preventing a TypeScript error.
    const parts: ({ inlineData: { data: string; mimeType: string; }; } | { text: string; })[] = [
        { inlineData: { data: formatFile.base64, mimeType: formatFile.mimeType } }
    ];

    if (styleFile) {
        parts.push({ inlineData: { data: styleFile.base64, mimeType: styleFile.mimeType } });
        fullPrompt = `Use Image 2 as a style reference. The user's prompt is: "${prompt}". Recreate the content of the prompt in the style of Image 2. Image 1 is a black template that defines the required aspect ratio. Your output MUST match this aspect ratio.`;
    }

    parts.push({ text: fullPrompt });

    let attempt = 1;
    while (attempt <= MAX_RETRIES + 1) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: parts },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const candidate = response.candidates?.[0];
            if (!candidate || !candidate.content || !candidate.content.parts) {
                console.error("Invalid response structure from Gemini API (generateImageWithGemini):", JSON.stringify(response, null, 2));
                const finishReason = candidate?.finishReason;
                let errorMessage = "Invalid or empty response from Gemini API.";
                if (finishReason) errorMessage += ` Finish reason: ${finishReason}.`;
                if (response.promptFeedback) errorMessage += ` Prompt feedback: ${JSON.stringify(response.promptFeedback)}.`;

                if (finishReason === 'IMAGE_OTHER' || finishReason === 'SAFETY') {
                    throw new Error(`Retriable: ${errorMessage}`);
                }
                throw new Error(errorMessage);
            }

            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            throw new Error("No image data found in Gemini API response.");

        } catch (error) {
            const errorStr = String(error);
            const isRetriableError = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('Retriable:');

            if (isRetriableError && attempt <= MAX_RETRIES) {
                const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`Retriable error on Gemini generation. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${MAX_RETRIES})`);
                await sleep(delay);
                attempt++;
            } else {
                console.error(`Error generating image with Gemini on attempt ${attempt}:`, error);
                throw error;
            }
        }
    }
    throw new Error("Gemini generation failed after exhausting all retries.");
};

export const generateImagesWithImagen = async (prompt: string, aspectRatio: AspectRatio, numberOfImages: number, resolution: string, apiKey?: string): Promise<string[]> => {
    // FIX: Use process.env.API_KEY as per guidelines and to fix TypeScript error.
    const effectiveApiKey = apiKey || process.env.API_KEY;
    if (!effectiveApiKey) throw new Error("API_KEY is not set in the environment.");
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

    const fullPrompt = `${prompt}. 8k, ultra high detail, photorealistic, aim for a high resolution around ${resolution} pixels.`

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: fullPrompt,
        config: {
            numberOfImages: numberOfImages,
            outputMimeType: 'image/png',
            aspectRatio: aspectRatio,
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        // FIX: Properties 'promptFeedback' and 'safetyRatings' do not exist on type 'GenerateImagesResponse'.
        const errorMessage = "No images were generated by Imagen API.";
        console.error("Imagen generation failed:", JSON.stringify(response, null, 2));
        throw new Error(errorMessage);
    }

    return response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
};

export const generateImageVariation = async (
    baseImage: ImageFile,
    prompt: string,
    resolution: string,
    aspectRatio: AspectRatio | FaceSelectionAspectRatio,
    styleFile: ImageFile | null,
    apiKey?: string
): Promise<string> => {
    const effectiveApiKey = apiKey || process.env.API_KEY;
    if (!effectiveApiKey) throw new Error("API_KEY is not set in the environment.");
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

    const parts: ({ inlineData: { data: string; mimeType: string; }; } | { text: string; })[] = [
        { inlineData: { data: baseImage.base64, mimeType: baseImage.mimeType } }
    ];

    if (styleFile) {
        parts.push({ inlineData: { data: styleFile.base64, mimeType: styleFile.mimeType } });
    }

    parts.push({ text: prompt });

    let attempt = 1;
    while (attempt <= MAX_RETRIES + 1) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: parts },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const candidate = response.candidates?.[0];
            if (!candidate || !candidate.content || !candidate.content.parts) {
                console.error("Invalid response structure from Gemini API (generateImageVariation):", JSON.stringify(response, null, 2));
                const finishReason = candidate?.finishReason;
                let errorMessage = "Invalid or empty response from Gemini API on variation.";
                if (finishReason) errorMessage += ` Finish reason: ${finishReason}.`;

                if (finishReason === 'IMAGE_OTHER' || finishReason === 'SAFETY') {
                    throw new Error(`Retriable: ${errorMessage}`);
                }
                throw new Error(errorMessage);
            }

            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            throw new Error("No image data found in Gemini API response for variation.");

        } catch (error) {
            const errorStr = String(error);
            const isRetriableError = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('Retriable:');

            if (isRetriableError && attempt <= MAX_RETRIES) {
                const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`Retriable error on variation generation. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${MAX_RETRIES})`);
                await sleep(delay);
                attempt++;
            } else {
                console.error(`Error generating image variation on attempt ${attempt}:`, error);
                throw error;
            }
        }
    }
    throw new Error("Variation generation failed after exhausting all retries.");
};


export const generateFace = async (
    prompt: string,
    model: string,
    aspectRatio: FaceSelectionAspectRatio,
    formatFile: ImageFile,
    apiKey?: string
): Promise<string> => {
    const effectiveApiKey = apiKey || process.env.API_KEY;
    if (!effectiveApiKey) throw new Error("API_KEY is not set in the environment.");
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

    let attempt = 1;
    while (attempt <= MAX_RETRIES + 1) {
        try {
            let src: string;
            if (model === 'imagen-4.0-generate-001') {
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: prompt,
                    config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: aspectRatio },
                });
                if (!response.generatedImages || response.generatedImages.length === 0) throw new Error("No images generated by Imagen.");
                src = `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
            } else {
                const parts: ({ inlineData: { data: string; mimeType: string; }; } | { text: string; })[] = [
                    { inlineData: { data: formatFile.base64, mimeType: formatFile.mimeType } },
                    { text: `The provided image is a black template that defines the required aspect ratio. Your output MUST match this aspect ratio. User prompt: "${prompt}"` }
                ];

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: parts },
                    config: { responseModalities: [Modality.IMAGE] },
                });

                const candidate = response.candidates?.[0];
                if (!candidate || !candidate.content || !candidate.content.parts) {
                    const finishReason = candidate?.finishReason;
                    let errorMessage = "Invalid or empty response from Gemini API on face generation.";
                    if (finishReason) errorMessage += ` Finish reason: ${finishReason}.`;

                    if (finishReason === 'IMAGE_OTHER' || finishReason === 'SAFETY') {
                        throw new Error(`Retriable: ${errorMessage}`);
                    }
                    throw new Error(errorMessage);
                }
                const imagePart = candidate.content.parts.find(p => p.inlineData);
                if (!imagePart || !imagePart.inlineData) throw new Error("No image data in Gemini response for face generation.");
                src = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            }
            return src;

        } catch (error) {
            const errorStr = String(error);
            const isRetriableError = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('Retriable:');

            if (isRetriableError && attempt <= MAX_RETRIES) {
                const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`Retriable error on face generation. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${MAX_RETRIES})`);
                await sleep(delay);
                attempt++;
            } else {
                console.error(`Error generating face on attempt ${attempt}:`, error);
                throw error;
            }
        }
    }
    throw new Error("Face generation failed after exhausting all retries.");
};

export const editImageWithGemini = async (
    baseImage: ImageFile,
    prompt: string,
    styleImage: ImageFile | null,
    apiKey?: string
): Promise<string> => {
    const effectiveApiKey = apiKey || process.env.API_KEY;
    if (!effectiveApiKey) throw new Error("API_KEY is not set in the environment.");
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

    const parts: ({ inlineData: { data: string; mimeType: string; }; } | { text: string; })[] = [
        { inlineData: { data: baseImage.base64, mimeType: baseImage.mimeType } }
    ];

    if (styleImage) {
        parts.push({ inlineData: { data: styleImage.base64, mimeType: styleImage.mimeType } });
    }

    parts.push({ text: prompt });

    let attempt = 1;
    while (attempt <= MAX_RETRIES + 1) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: parts },
                config: { responseModalities: [Modality.IMAGE] },
            });

            const candidate = response.candidates?.[0];
            if (!candidate || !candidate.content || !candidate.content.parts) {
                console.error("Invalid response structure from Gemini API (editImageWithGemini):", JSON.stringify(response, null, 2));
                const finishReason = candidate?.finishReason;
                let errorMessage = "Invalid or empty response from Gemini API on image edit.";
                if (finishReason) errorMessage += ` Finish reason: ${finishReason}.`;

                if (finishReason === 'IMAGE_OTHER' || finishReason === 'SAFETY') {
                    throw new Error(`Retriable: ${errorMessage}`);
                }
                throw new Error(errorMessage);
            }

            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            throw new Error("No image data found in Gemini API response for image edit.");

        } catch (error) {
            const errorStr = String(error);
            const isRetriableError = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('Retriable:');

            if (isRetriableError && attempt <= MAX_RETRIES) {
                const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`Retriable error on image edit. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${MAX_RETRIES})`);
                await sleep(delay);
                attempt++;
            } else {
                console.error(`Error editing image on attempt ${attempt}:`, error);
                throw error;
            }
        }
    }
    throw new Error("Image edit failed after exhausting all retries.");
};

// =====================================================================
// НОВАЯ ФУНКЦИЯ ДЛЯ OHMYGPT (ЧЕРЕЗ БЕЗОПАСНЫЙ ПРОКСИ VERCEL)
// =====================================================================

/**
 * Функция для безопасной генерации изображения через наш OhMyGPT прокси.
 * Вызывает /api/generate-image, где безопасно хранится ключ OhMyGPT.
 *
 * @param prompt - Текстовое описание для генерации.
 * @param model - Имя модели OhMyGPT (например, 'dall-e', 'flux-1.1-pro').
 * @returns - Promise, который разрешается в URL сгенерированного изображения (string, формат base64 или URL).
 */
export async function generateImageWithOhMyGPT(prompt: string, model: string = 'dall-e'): Promise<string> {
    if (!prompt) {
        throw new Error("Prompt is required.");
    }

    const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: prompt,
            model: model
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        // Ошибка, возвращенная вашим бэкендом
        const errorMessage = data.message || 'Ошибка генерации изображения через OhMyGPT.';
        console.error("OhMyGPT generation failed:", data);
        throw new Error(errorMessage);
    }

    // Ожидаем, что прокси вернет данные в формате, аналогичном OpenAI
    const imageUrl = data.data && data.data[0] ? data.data[0].url : null;
    
    if (!imageUrl) {
        throw new Error("API вернул некорректный URL/base64 изображения.");
    }
    
    return imageUrl;
}
