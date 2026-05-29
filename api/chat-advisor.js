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

    const { message, history, financeState } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!message) {
        return res.status(400).json({ error: 'Message is required.' });
    }

    if (!API_KEY) {
        return res.status(500).json({
            error: 'Gemini API Key is not configured. Please add GEMINI_API_KEY to your Vercel environment variables.'
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
};
