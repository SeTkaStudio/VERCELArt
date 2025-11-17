// pages/api/generate-image.js

import fetch from 'node-fetch'; 

// --- Константы API ---
const BASE_URL = 'https://apic1.ohmycdn.com/v1/images/generations'; 
const API_KEY = process.env.OHMYGPT_API_KEY; 

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { prompt, model = "dall-e" } = req.body; 

  if (!prompt) {
    return res.status(400).json({ message: 'Missing prompt' });
  }

  if (!API_KEY) {
    return res.status(500).json({ message: 'API Key not configured on the server.' });
  }

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
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
        console.error("OhMyGPT API Error:", data.error);
        return res.status(response.status).json({ 
            message: data.error?.message || 'Failed to generate image from API' 
        });
    }

    res.status(200).json(data);

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
