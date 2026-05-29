const { GoogleGenerativeAI } = require('@google/generative-ai');

// CORS helper
function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const API_KEY = process.env.GEMINI_API_KEY;
    res.json({
        status: 'ok',
        apiConfigured: !!API_KEY
    });
};
