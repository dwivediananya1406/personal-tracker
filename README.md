# Sleek Personal Finance Dashboard 💰🤖

**Live Demo (Static):** [https://dwivediananya1406.github.io/personal-finanace-tracker/](https://dwivediananya1406.github.io/personal-finanace-tracker/)

## Project Overview

A clean, modern, and **privacy-focused** web application designed to help users track their income, expenses, and manage debts efficiently. Built with **Vanilla JavaScript, HTML, and Tailwind CSS**, and now supercharged with **AI-powered features** via a secure Node.js backend.

**All financial data is stored directly in your browser's Local Storage** — no external databases are used. The AI server acts as a secure pass-through proxy to the Gemini API and **never stores or logs your data**.

---

## Features ✨

| Category | Feature Description |
| :--- | :--- |
| **Balance Tracking** | Separate tracking for **Cash Balance** and **Bank Balance**, automatically calculating a real-time **Net Worth**. |
| **Transaction Recording** | Dedicated forms for adding Income and Expenses, allowing users to specify the medium (**Cash** or **Bank/UPI**) for accurate balance deduction/addition. |
| **Custom Categories** | Supports detailed expense categorization: **Grocery, Food & Drink, Academic & Study, Transport, Bills & Rent, Shopping, Entertainment, Health**, and **Other**. |
| **Debt Management** | Track both money **Lent** (Receivables) and money **Borrowed** (Payables). Includes dedicated modals for marking repayment and adjusting balances. |
| **Data Visualization** | A dynamic **Pie Chart (via Chart.js)** instantly breaks down spending by category, providing visual insights. |
| **History & Deletion** | Comprehensive lists for all income and expense history, with the ability to **delete any record** and automatically reverse the balance change. |
| **⚡ Quick Add with AI** | Type a natural language sentence like *"Spent 300 on lunch at Burger King via cash"* and the AI automatically parses and records the transaction! |
| **🤖 FinAI Advisor Chat** | An interactive AI-powered financial advisor that analyzes your real transaction data, spending patterns, and debt positions to give personalized advice. |
| **User Experience** | Non-intrusive snackbar notifications provide real-time feedback on successful transactions. |

---

## Architecture 🏗️

```
┌──────────────────────┐        ┌───────────────────────┐        ┌──────────────────┐
│   Frontend (Browser) │  HTTP  │  Node.js/Express      │  HTTPS │  Google Gemini   │
│                      │ ◄────► │  Server (localhost)    │ ◄────► │  API             │
│  - index.html        │        │                       │        │                  │
│  - finance.js        │        │  - API key in .env    │        │  gemini-2.5-flash│
│  - LocalStorage      │        │  - No data stored     │        │                  │
└──────────────────────┘        └───────────────────────┘        └──────────────────┘
         ▲
         │ All financial data
         ▼ stays in LocalStorage
```

- **Frontend:** Static HTML/CSS/JS served from GitHub Pages (or opened locally).
- **Backend:** A lightweight Express.js proxy server that securely holds the Gemini API key and forwards AI requests. It **never** stores or logs any user data.
- **AI Provider:** Google Gemini 2.5 Flash via the `@google/generative-ai` SDK.

> **Note:** The AI features (Quick Add & FinAI Advisor) only work when the Node.js server is running locally. The static GitHub Pages demo provides all non-AI features without a server.

---

## Technologies Used 🛠️

* **HTML5:** Structure and Semantics.
* **Vanilla JavaScript (ES6+):** Core application logic, DOM manipulation, and data handling.
* **Tailwind CSS (CDN):** Modern, utility-first styling for a clean, responsive UI.
* **Chart.js:** Used for the interactive expense breakdown chart.
* **Phosphor Icons (CDN):** Used for simple, clean iconography.
* **Local Storage:** The persistent storage mechanism for all financial data.
* **Node.js + Express:** Backend server for secure AI API proxying.
* **Google Gemini API:** Powers the Quick Add parser and FinAI Advisor chat.

---

## Setup and Usage 🚀

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- A free [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/dwivediananya1406/personal-finanace-tracker.git
   cd personal-finanace-tracker
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure your API Key:**
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and paste your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the Server:**
   ```bash
   npm start
   ```
   The server will start on `http://localhost:3000`.

5. **Open the Dashboard:**
   Open `index.html` in your browser. The AI features will automatically connect to your local server.

### Getting Started

* Use the **Initial Setup** form to set your starting Cash and Bank Balances.
* Use the **Add Income** and **Add Expense** forms to record transactions.
* Try **Quick Add with AI** — type something like *"Earned 5000 salary via bank"* or *"Lent 500 cash to Rahul for food"*.
* Click the **✨ sparkle button** (bottom-right) to open the **FinAI Advisor** and ask questions about your finances.

---

## Project Structure 📁

```
personal-finanace-tracker/
├── index.html        # Main dashboard UI
├── finance.js        # Application logic + AI integration
├── style.css         # Custom styles
├── server.js         # Node.js AI proxy server (Gemini)
├── package.json      # Node.js dependencies
├── .env              # 🔒 Your secret API key (gitignored)
├── .env.example      # Template for API key setup
├── .gitignore        # Protects .env and node_modules
└── README.md         # This file
```

---

## Developer Credit

Developed with ❤️ by Ananya Dwivedi.

**Developer Contact:** [dwivediananya1406@gmail.com](mailto:dwivediananya1406@gmail.com)
