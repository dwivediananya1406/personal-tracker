const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./database');

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files (index.html, style.css, finance.js, admin.html)
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Simple health check route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        apiConfigured: !!API_KEY
    });
});

/**
 * Endpoint to record visit pings
 */
app.post('/api/analytics/ping', (req, res) => {
    const { visitorId } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    db.recordVisit(visitorId, ip, userAgent);
    res.json({ success: true });
});

/**
 * Endpoint to verify admin credentials
 */
app.post('/api/admin/verify', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Incorrect admin password.' });
    }
});

/**
 * Endpoint to retrieve analytics stats (requires admin auth header)
 */
app.get('/api/admin/stats', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Unauthorized access.' });
    }
    const stats = db.getStats();
    res.json(stats);
});

/**
 * Endpoint to clear logs (requires admin auth header)
 */
app.post('/api/admin/clear', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Unauthorized access.' });
    }
    const success = db.clearLogs();
    res.json({ success });
});

/**
 * Endpoint to parse a natural language transaction
 */
app.post('/api/parse-transaction', async (req, res) => {
    const { text, currentDate } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text prompt is required.' });
    }

    if (!API_KEY) {
        return res.status(500).json({
            error: 'Gemini API Key is not configured on the server. Please add your GEMINI_API_KEY to the .env file and restart the server.'
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
});

/**
 * Endpoint for the AI chat advisor
 */
app.post('/api/chat-advisor', async (req, res) => {
    const { message, history, financeState } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required.' });
    }

    if (!API_KEY) {
        return res.status(500).json({
            error: 'Gemini API Key is not configured on the server. Please add your GEMINI_API_KEY to the .env file and restart the server.'
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);

        const state = financeState || { cashBalance: 0, bankBalance: 0, incomes: [], expenses: [], lent: [], borrowed: [] };
        const totalBalance = state.cashBalance + state.bankBalance;
        const totalExpense = state.expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        const totalIncome = state.incomes.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
        const totalLent = state.lent.filter(d => d.status === 'outstanding').reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
        const totalBorrowed = state.borrowed.filter(d => d.status === 'outstanding').reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);

        const expensesByCategory = state.expenses.reduce((acc, exp) => {
            acc[exp.category] = (acc[exp.category] || 0) + parseFloat(exp.amount || 0);
            return acc;
        }, {});

        const categoryBreakdown = Object.entries(expensesByCategory)
            .map(([cat, amt]) => `- ${cat}: ₹${amt.toFixed(2)}`)
            .join('\n') || 'No category breakdown available.';

        const recentExpenses = state.expenses
            .slice(0, 8)
            .map(e => `- ${e.date}: ₹${e.amount} for "${e.remark}" at ${e.location} (${e.category}) via ${e.sourceType}`)
            .join('\n') || 'No recent expenses recorded.';

        const lentSummary = state.lent.filter(d => d.status === 'outstanding')
            .map(d => `- ${d.name} owes you ₹${d.amount} for "${d.remark}"`)
            .join('\n') || 'No outstanding money owed to you.';

        const borrowedSummary = state.borrowed.filter(d => d.status === 'outstanding')
            .map(d => `- You owe ${d.name} ₹${d.amount} for "${d.remark}"`)
            .join('\n') || 'No outstanding debts.';

        const systemPrompt = `You are "FinAI", a supportive and knowledgeable personal financial advisor for Indian users.
Give brief, clear, action-oriented advice using bullet points and bold text where appropriate.
Always use ₹ for amounts. Only discuss personal finances. Never make up numbers.

USER'S FINANCIAL SNAPSHOT:
- Net Worth: ₹${totalBalance.toFixed(2)}
- Cash: ₹${state.cashBalance.toFixed(2)} | Bank/UPI: ₹${state.bankBalance.toFixed(2)}
- Total Income Recorded: ₹${totalIncome.toFixed(2)}
- Total Expenses: ₹${totalExpense.toFixed(2)}
- Outstanding Receivables (owed to you): ₹${totalLent.toFixed(2)}
- Outstanding Payables (you owe): ₹${totalBorrowed.toFixed(2)}

EXPENSE BREAKDOWN BY CATEGORY:
${categoryBreakdown}

RECENT EXPENSES:
${recentExpenses}

RECEIVABLES (LENT):
${lentSummary}

PAYABLES (BORROWED):
${borrowedSummary}`;

        const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-flash'
        });

        // Inject the system prompt into the history to bypass systemInstruction routing issues
        let formattedHistory = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: 'Understood. I am FinAI and I am ready to help you analyze your finances.' }] }
        ];

        if (history && history.length > 0) {
            formattedHistory = formattedHistory.concat(history.map(chat => ({
                role: chat.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: chat.text }]
            })));
        }

        const chatSession = model.startChat({
            history: formattedHistory
        });

        const result = await chatSession.sendMessage(message);
        const responseText = result.response.text();

        res.json({ text: responseText });

    } catch (error) {
        console.error('Error in chat advisor:', error.message);
        res.status(500).json({ error: 'Failed to process chat: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`🚀 Personal Finance AI Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🤖 AI Provider: Google Gemini Flash Latest`);
    console.log(`===================================================`);
});
