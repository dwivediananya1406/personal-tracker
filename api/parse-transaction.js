const { GoogleGenerativeAI } = require('@google/generative-ai');

// CORS helper
function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { text, currentDate } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!text) {
        return res.status(400).json({ error: 'Text prompt is required.' });
    }

    if (!API_KEY) {
        return res.status(500).json({
            error: 'Gemini API Key is not configured. Please add GEMINI_API_KEY to your Vercel environment variables.'
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const dateRef = currentDate || new Date().toISOString().split('T')[0];

        const prompt = `You are a financial parsing assistant. Extract transaction details from the text and return ONLY a valid JSON object — no extra text or markdown.
Use the current date as reference: ${dateRef}.

Return this EXACT JSON structure:
{
  "transactionType": "income" | "expense" | "lent" | "borrowed",
  "amount": number,
  "date": "YYYY-MM-DD",
  "category": "Food & Drink" | "Grocery" | "Transport" | "Bills & Rent" | "Shopping" | "Entertainment" | "Health" | "Academic & Study" | "Other" | "Debt Repayment" (only for expenses, null otherwise),
  "location": "string",
  "remark": "string",
  "sourceType": "cash" | "bank",
  "name": "string or null"
}

Text to parse: "${text}"`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json'
            }
        });

        const responseText = result.response.text();
        const parsedJson = JSON.parse(responseText);

        res.json(parsedJson);

    } catch (error) {
        console.error('Error parsing transaction:', error.message);
        res.status(500).json({ error: 'Failed to parse transaction: ' + error.message });
    }
};
