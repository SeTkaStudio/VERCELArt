// pages/api/generate-image.js

import fetch from 'node-fetch'; 

// --- ГЛОБАЛЬНЫЙ КЛЮЧ ИЗ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ VERCEL ---
const OHMYGPT_API_KEY = process.env.OHMYGPT_API_KEY; 
const BASE_URL = 'https://apic1.ohmycdn.com/v1/images/generations'; 

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // 1. Проверка наличия глобального ключа
    if (!OHMYGPT_API_KEY) {
        return res.status(500).json({ message: 'Серверный ключ OhMyGPT не настроен. Обратитесь к администратору.' });
    }
    
    // Получаем запрос от вашего фронтенда (prompt и model)
    const { prompt, model } = req.body; 

    if (!prompt || !model) {
        return res.status(400).json({ message: 'Missing prompt or model in request body.' });
    }

    try {
        const response = await fetch(BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 2. Используем ОБЩИЙ секретный ключ
                'Authorization': `Bearer ${OHMYGPT_API_KEY}`,
            },
            body: JSON.stringify({
                model: model, 
                prompt: prompt,
                n: 1, 
                size: "1024x1024", 
                response_format: "url" 
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            // Обработка ошибок от API OhMyGPT
            console.error("OhMyGPT API Error:", data.error);
            const errorMessage = data.error?.message || `Ошибка от OhMyGPT: ${response.statusText}`;
            return res.status(response.status).json({ 
                message: errorMessage 
            });
        }

        // Возвращаем результат (URL изображения) обратно на фронтенд
        res.status(200).json(data);

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера при генерации изображения.' });
    }
}
