const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');

// 1. Sistem Değişkenleri (Vercel veya .env dosyasından okunacak)
const TRENDYOL_SELLER_ID = process.env.TRENDYOL_SELLER_ID;
const TRENDYOL_API_KEY = process.env.TRENDYOL_API_KEY;
const TRENDYOL_API_SECRET = process.env.TRENDYOL_API_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Trendyol API'sinden veri çeken fonksiyon
async function getTrendyolData() {
    const auth = Buffer.from(`${TRENDYOL_API_KEY}:${TRENDYOL_API_SECRET}`).toString('base64');
    
    try {
        // Son siparişleri ve finansal detayları çekiyoruz
        const response = await axios.get(`https://api.trendyol.com/sapigw/suppliers/${TRENDYOL_SELLER_ID}/orders`, {
            headers: { 'Authorization': `Basic ${auth}`, 'User-Agent': `${TRENDYOL_SELLER_ID} - Dev` }
        });
        return response.data.content; // Sipariş listesi
    } catch (error) {
        console.error("Trendyol API hatası:", error.message);
        return null;
    }
}

// Ana Otomasyon Fonksiyonu
async function handler(req, res) {
    // 1. Trendyol'dan canlı verileri çek
    const siparisler = await getTrendyolData();
    
    if (!siparisler) {
        return res.status(500).json({ error: "Trendyol verileri alınamadı." });
    }

    // 2. Gemini'a verilecek talimat (System Instruction gibi)
    const prompt = `
    Sen e-ticaret satıcıları için geliştirilmiş finansal bir analiz zekasısın. 
    Aşağıda sana JSON formatında Trendyol'dan gelen anlık sipariş verilerini veriyorum. 
    Bu verileri incele; komisyon, kargo maliyetleri ve ürün fiyatlarını analiz ederek net kâr/zarar durumunu çıkar.
    Zarar eden veya kârı çok düşük olan ürünleri listele ve satıcıya fiyatlama stratejisi öner.

    Trendyol Verileri:
    ${JSON.stringify(siparisler)}
    `;

    try {
        // 3. AI Studio (Gemini 1.5 Pro) Analizi Başlatıyor
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-pro',
            contents: prompt,
        });

        // 4. Sonucu ekrana yazdır veya arayüze gönder
        res.status(200).send(`<h1>Finansal Analiz Raporunuz</h1><p>${response.text}</p>`);
    } catch (aiError) {
        res.status(500).json({ error: "Gemini Analiz Hatası: " + aiError.message });
    }
}

module.exports = handler;