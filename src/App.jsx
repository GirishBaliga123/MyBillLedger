import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'mybillledger-transactions';
const USER_KEY = 'mybillledger-user';
const CATEGORY_KEY = 'mybillledger-categories';
const RECURRING_KEY = 'mybillledger-recurring';

const categoryColors = {
  Housing: '#7c3aed',
  Food: '#f59e0b',
  Bills: '#ef4444',
  Entertainment: '#ec4899',
  Income: '#10b981',
  Transportation: '#3b82f6',
  Other: '#64748b',
};

const baseCategories = ['Food', 'Housing', 'Bills', 'Entertainment', 'Transportation', 'Other'];

const seedTransactions = [
  { id: 1, title: 'Rent', category: 'Housing', amount: 1200, type: 'expense', date: '2026-09-01' },
  { id: 2, title: 'Groceries', category: 'Food', amount: 180, type: 'expense', date: '2026-09-02' },
  { id: 3, title: 'Salary', category: 'Income', amount: 4200, type: 'income', date: '2026-09-03' },
  { id: 4, title: 'Electricity Bill', category: 'Bills', amount: 95, type: 'expense', date: '2026-09-04' },
  { id: 5, title: 'Movie Night', category: 'Entertainment', amount: 48, type: 'expense', date: '2026-09-05' },
  { id: 6, title: 'Mobile Recharge', category: 'Bills', amount: 35, type: 'expense', date: '2026-09-06' },
];

const defaultForm = {
  title: '',
  category: 'Food',
  amount: '',
  type: 'expense',
  date: new Date().toISOString().slice(0, 10),
};

const defaultAuthForm = {
  name: '',
  email: '',
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const defaultUserState = {
  isAuth: false,
  name: '',
  email: '',
  provider: 'guest',
  monthlyBudget: 25000,
};

const defaultRecurringForm = {
  title: '',
  category: 'Bills',
  amount: '',
  frequency: 'monthly',
  nextDate: new Date().toISOString().slice(0, 10),
};

const readStorage = (key, fallback, type = 'any') => {
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return fallback;

    const parsed = JSON.parse(item);

    if (type === 'array' && !Array.isArray(parsed)) {
      return fallback;
    }

    if (type === 'object' && (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))) {
      return fallback;
    }

    return parsed;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage write issues in private browsing or restricted situations
  }
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const isValidInrAmount = (value) => {
  const sanitized = String(value ?? '').trim();

  if (!sanitized || !/^\d+(\.\d{1,2})?$/.test(sanitized)) {
    return false;
  }

  const numericValue = Number(sanitized);
  return Number.isFinite(numericValue) && numericValue > 0;
};

function App() {
  const [transactions, setTransactions] = useState(() => {
    const stored = readStorage(STORAGE_KEY, seedTransactions, 'array');
    return Array.isArray(stored) && stored.length > 0 ? stored : seedTransactions;
  });
  const [user, setUser] = useState(() => readStorage(USER_KEY, defaultUserState, 'object'));
  const [currentView, setCurrentView] = useState('dashboard');
  const [categories, setCategories] = useState(() => {
    const stored = readStorage(CATEGORY_KEY, baseCategories, 'array');
    return Array.isArray(stored) && stored.length > 0 ? stored : baseCategories;
  });
  const [recurringBills, setRecurringBills] = useState(() => readStorage(RECURRING_KEY, [], 'array'));
  const [form, setForm] = useState(defaultForm);
  const [authForm, setAuthForm] = useState(defaultAuthForm);
  const [budgetInput, setBudgetInput] = useState(user.monthlyBudget || 25000);
  const [recurringForm, setRecurringForm] = useState(defaultRecurringForm);
  const [googleReady, setGoogleReady] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingTransactionId, setEditingTransactionId] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [transactionFilters, setTransactionFilters] = useState({
    search: '',
    type: 'all',
    category: 'all',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    writeStorage(STORAGE_KEY, transactions);
  }, [transactions]);

  useEffect(() => {
    writeStorage(USER_KEY, user);
  }, [user]);

  useEffect(() => {
    setBudgetInput(user.monthlyBudget || 25000);
  }, [user.monthlyBudget]);

  useEffect(() => {
    writeStorage(CATEGORY_KEY, categories);
  }, [categories]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) {
      setGoogleReady(false);
      return;
    }

    const handleCredentialResponse = (response) => {
      try {
        const payload = JSON.parse(
          atob(response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
        );

        setUser((previous) => ({
          ...defaultUserState,
          isAuth: true,
          name: payload.name || payload.given_name || 'Google User',
          email: payload.email || `${payload.given_name || 'google'}@gmail.com`,
          provider: 'google',
          monthlyBudget: previous.monthlyBudget || 25000,
        }));
        setCurrentView('dashboard');
        setMessage({ type: 'success', text: 'Signed in with Google successfully.' });
      } catch {
        setMessage({ type: 'error', text: 'Google sign-in could not be processed.' });
      }
    };

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    const googleButton = document.getElementById('google-signin-button');
    if (googleButton) {
      window.google.accounts.id.renderButton(googleButton, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'continue_with',
        shape: 'pill',
      });
    }

    setGoogleReady(true);
  }, []);

  useEffect(() => {
    writeStorage(RECURRING_KEY, recurringBills);
  }, [recurringBills]);

  const summary = useMemo(() => {
    const totalIncome = transactions
      .filter((item) => item.type === 'income')
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const totalExpense = transactions
      .filter((item) => item.type === 'expense')
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const balance = totalIncome - totalExpense;

    const monthlyCategoryTotals = transactions.reduce((acc, item) => {
      if (item.type === 'expense') {
        acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
      }
      return acc;
    }, {});

    const monthlyBudget = Number(user.monthlyBudget) > 0 ? Number(user.monthlyBudget) : Math.max(totalIncome * 0.7, 0);
    const budgetWarning = totalExpense > monthlyBudget;
    const budgetUsed = monthlyBudget > 0 ? (totalExpense / monthlyBudget) * 100 : 0;

    return {
      totalIncome,
      totalExpense,
      balance,
      monthlyCategoryTotals,
      monthlyBudget,
      budgetWarning,
      budgetUsed,
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return [...transactions]
      .filter((item) => {
        const matchesSearch = item.title.toLowerCase().includes(transactionFilters.search.toLowerCase());
        const matchesType = transactionFilters.type === 'all' || item.type === transactionFilters.type;
        const matchesCategory =
          transactionFilters.category === 'all' || item.category === transactionFilters.category;
        const itemDate = new Date(item.date);
        const matchesStartDate =
          !transactionFilters.startDate || itemDate >= new Date(`${transactionFilters.startDate}T00:00:00`);
        const matchesEndDate =
          !transactionFilters.endDate || itemDate <= new Date(`${transactionFilters.endDate}T23:59:59`);

        return matchesSearch && matchesType && matchesCategory && matchesStartDate && matchesEndDate;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, transactionFilters]);

  const recentTransactions = filteredTransactions.slice(0, 8);

  const categoryEntries = Object.entries(summary.monthlyCategoryTotals).sort((a, b) => b[1] - a[1]);
  const topCategories = categoryEntries.slice(0, 3);
  const reportChartData = useMemo(() => {
    return categoryEntries.map(([category, total]) => ({
      category,
      total,
      color: categoryColors[category] || '#64748b',
    }));
  }, [categoryEntries]);

  const monthlyOverview = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthTransactions = transactions.filter((item) => {
      const date = new Date(item.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const totalThisMonth = monthTransactions.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpenseThisMonth = monthTransactions
      .filter((item) => item.type === 'expense')
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      totalThisMonth,
      totalExpenseThisMonth,
      transactionCount: monthTransactions.length,
    };
  }, [transactions]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const trend = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString('en-US', { month: 'short' }),
        income: 0,
        expense: 0,
      };
    });

    transactions.forEach((item) => {
      const itemDate = new Date(item.date);
      const itemKey = `${itemDate.getFullYear()}-${itemDate.getMonth()}`;
      const matchingEntry = trend.find((entry) => entry.key === itemKey);

      if (!matchingEntry) {
        return;
      }

      if (item.type === 'income') {
        matchingEntry.income += Number(item.amount);
      } else {
        matchingEntry.expense += Number(item.amount);
      }
    });

    return trend;
  }, [transactions]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === 'amount') {
      const sanitized = value.replace(/[^\d.]/g, '');
      setForm((prev) => ({ ...prev, [name]: sanitized }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    setErrors((prev) => ({ ...prev, [name]: '' }));
    setMessage({ type: '', text: '' });
  };

  const handleTransactionFilterChange = (event) => {
    const { name, value } = event.target;
    setTransactionFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();

    if (!trimmed) {
      setMessage({ type: 'error', text: 'Category name cannot be empty.' });
      return;
    }

    const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    if (categories.some((category) => category.toLowerCase() === normalized.toLowerCase())) {
      setMessage({ type: 'error', text: 'This category already exists.' });
      return;
    }

    setCategories((prev) => [...prev, normalized]);
    setForm((prev) => ({ ...prev, category: normalized }));
    setNewCategory('');
    setMessage({ type: 'success', text: 'Category added successfully.' });
  };

  const handleDeleteCategory = (categoryName) => {
    if (baseCategories.includes(categoryName)) {
      setMessage({ type: 'error', text: 'Default categories cannot be removed.' });
      return;
    }

    setCategories((prev) => prev.filter((category) => category !== categoryName));
    setTransactions((prev) =>
      prev.map((item) => (item.category === categoryName ? { ...item, category: 'Other' } : item)),
    );

    if (form.category === categoryName) {
      setForm((prev) => ({ ...prev, category: 'Other' }));
    }

    setTransactionFilters((prev) =>
      prev.category === categoryName ? { ...prev, category: 'all' } : prev,
    );
    setMessage({ type: 'success', text: 'Category removed and existing items were updated.' });
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.title.trim()) nextErrors.title = 'Title is required';
    if (!isValidInrAmount(form.amount)) {
      nextErrors.amount = 'Amount must be a valid INR value greater than zero';
    }
    if (!form.date) nextErrors.date = 'Date is required';
    if (!form.category) nextErrors.category = 'Please select a category';

    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setMessage({ type: 'error', text: 'Please complete the required fields correctly.' });
      return;
    }

    const transactionData = {
      id: editingTransactionId ?? Date.now(),
      title: form.title.trim(),
      category: form.category,
      amount: Number(form.amount),
      type: form.type,
      date: form.date,
    };

    if (editingTransactionId) {
      setTransactions((prev) =>
        prev.map((item) => (item.id === editingTransactionId ? transactionData : item)),
      );
      setMessage({ type: 'success', text: 'Transaction updated successfully.' });
    } else {
      setTransactions((prev) => [transactionData, ...prev]);
      setMessage({ type: 'success', text: 'Transaction saved successfully.' });
    }

    setEditingTransactionId(null);
    setForm({ ...defaultForm, category: form.category });
    setErrors({});
  };

  const handleEdit = (transaction) => {
    setEditingTransactionId(transaction.id);
    setForm({
      title: transaction.title,
      category: transaction.category,
      amount: String(transaction.amount),
      type: transaction.type,
      date: transaction.date,
    });
    setCurrentView('dashboard');
    setMessage({ type: '', text: '' });
  };

  const handleCancelEdit = () => {
    setEditingTransactionId(null);
    setForm({ ...defaultForm, category: 'Food' });
    setErrors({});
    setMessage({ type: 'success', text: 'Edit cancelled.' });
  };

  const handleDelete = (id) => {
    setTransactions((prev) => prev.filter((item) => item.id !== id));
    if (editingTransactionId === id) {
      handleCancelEdit();
    }
    setMessage({ type: 'success', text: 'Transaction deleted successfully.' });
  };

  const handleExportPdf = () => {
    const rowsToExport = filteredTransactions.length > 0 ? filteredTransactions : transactions;
    const printWindow = window.open('', '_blank', 'width=900,height=700');

    if (!printWindow) {
      setMessage({ type: 'error', text: 'Please allow pop-ups to print your PDF report.' });
      return;
    }

    const rowsMarkup = rowsToExport
      .map(
        (item) => `
          <tr>
            <td>${item.title}</td>
            <td>${item.category}</td>
            <td>${item.type}</td>
            <td>${new Date(item.date).toLocaleDateString()}</td>
            <td>${item.type === 'income' ? '+' : '-'}${formatCurrency(item.amount)}</td>
          </tr>
        `,
      )
      .join('');

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>MyBillLedger Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin-bottom: 8px; }
            .meta { color: #475569; margin-bottom: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; }
            th { background: #f8fafc; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
            .summary div { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
            .summary span { display: block; color: #64748b; font-size: 12px; }
            .summary strong { font-size: 18px; }
          </style>
        </head>
        <body>
          <h1>MyBillLedger Report</h1>
          <div class="meta">Generated on ${new Date().toLocaleDateString()}</div>

          <div class="summary">
            <div>
              <span>Income</span>
              <strong>${formatCurrency(summary.totalIncome)}</strong>
            </div>
            <div>
              <span>Expenses</span>
              <strong>${formatCurrency(summary.totalExpense)}</strong>
            </div>
            <div>
              <span>Balance</span>
              <strong>${formatCurrency(summary.balance)}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Type</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsMarkup || '<tr><td colspan="5">No data available.</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();

    setMessage({ type: 'success', text: 'PDF print dialog opened successfully.' });
  };

  const handleGuestLogin = () => {
    setUser({
      isAuth: true,
      name: 'Guest User',
      email: 'guest@mybillledger.local',
      provider: 'guest',
      monthlyBudget: 25000,
    });
    setCurrentView('dashboard');
    setMessage({ type: 'success', text: 'Signed in as guest.' });
  };

  const handleGoogleLogin = (event) => {
    event.preventDefault();

    const email = authForm.email.trim();
    const name = authForm.name.trim() || (email ? email.split('@')[0] : 'Gmail User');

    if (!email && !authForm.name.trim()) {
      setMessage({ type: 'error', text: 'Enter your Gmail address or display name to continue.' });
      return;
    }

    const normalizedEmail = email || `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`;

    setUser({
      isAuth: true,
      name,
      email: normalizedEmail,
      provider: 'google',
      monthlyBudget: user.monthlyBudget || 25000,
    });
    setCurrentView('dashboard');
    setAuthForm(defaultAuthForm);
    setMessage({ type: 'success', text: 'Google sign-in selected in local demo mode.' });
  };

  const handleLogout = () => {
    setUser({ ...defaultUserState, monthlyBudget: user.monthlyBudget || 25000 });
    setCurrentView('dashboard');
    setMessage({ type: 'success', text: 'Logged out successfully.' });
  };

  const handleBudgetSave = (event) => {
    event.preventDefault();
    const nextBudget = Number(budgetInput) || 0;

    if (nextBudget <= 0) {
      setMessage({ type: 'error', text: 'Monthly budget must be greater than zero.' });
      return;
    }

    setUser((prev) => ({ ...prev, monthlyBudget: nextBudget }));
    setMessage({ type: 'success', text: 'Monthly budget updated successfully.' });
  };

  const handleRecurringChange = (event) => {
    const { name, value } = event.target;
    setRecurringForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRecurringSubmit = (event) => {
    event.preventDefault();

    if (!recurringForm.title.trim() || !recurringForm.amount || Number(recurringForm.amount) <= 0) {
      setMessage({ type: 'error', text: 'Recurring bill name and amount are required.' });
      return;
    }

    const nextRecurringBill = {
      id: Date.now(),
      title: recurringForm.title.trim(),
      category: recurringForm.category,
      amount: Number(recurringForm.amount),
      frequency: recurringForm.frequency,
      nextDate: recurringForm.nextDate,
    };

    setRecurringBills((prev) => [nextRecurringBill, ...prev]);
    setRecurringForm(defaultRecurringForm);
    setMessage({ type: 'success', text: 'Recurring bill added successfully.' });
  };

  const handleRecurringDelete = (id) => {
    setRecurringBills((prev) => prev.filter((item) => item.id !== id));
    setMessage({ type: 'success', text: 'Recurring bill removed successfully.' });
  };

  if (!user.isAuth) {
    return (
      <div className="auth-screen">
        <div className="auth-layout">
          <div className="auth-card">
            <div className="brand-block">
              <div className="brand-mark">₹</div>
              <div>
                <p className="eyebrow">Expense Tracker</p>
                <h1>MyBillLedger</h1>
              </div>
            </div>

            <div className="welcome-badge">
              <span className="pulse-dot" />
              Smart spending made simple
            </div>

            <h2>Take control of every rupee you earn.</h2>
            <p className="auth-subtitle">
              Track bills, groceries, rent, income, and monthly trends in one simple place designed for everyday life.
            </p>

            <form className="auth-actions" onSubmit={handleGoogleLogin}>
              <div className="auth-inputs">
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Display name"
                />
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="you@gmail.com"
                />
              </div>

              <button className="primary-btn full-width" type="submit">
                Continue with Google
              </button>
            </form>

            {GOOGLE_CLIENT_ID && (
              <div className="google-auth-wrap">
                <div className="auth-divider"><span>or</span></div>
                <div id="google-signin-button" className="google-signin-button" />
                {!googleReady && <p className="google-ready-message">Loading Google sign-in…</p>}
              </div>
            )}

            <button className="secondary-btn full-width guest-btn" onClick={handleGuestLogin} type="button">
              Continue as Guest
            </button>

            <div className="auth-benefits">
              <span>Dashboard</span>
              <span>Monthly Reports</span>
              <span>Smart Budgeting</span>
            </div>
          </div>

          <div className="preview-panel">
            <div className="preview-header">
              <span className="live-pill">Live overview</span>
              <span className="preview-date">September 2026</span>
            </div>

            <div className="preview-stats">
              <div className="mini-stat income-mini">
                <span>Income</span>
                <strong>₹42,000</strong>
              </div>
              <div className="mini-stat expense-mini">
                <span>Expenses</span>
                <strong>₹18,760</strong>
              </div>
            </div>

            <div className="preview-chart">
              <div className="chart-bars">
                <span style={{ height: '36%' }} />
                <span style={{ height: '58%' }} />
                <span style={{ height: '42%' }} />
                <span style={{ height: '76%' }} />
                <span style={{ height: '90%' }} />
                <span style={{ height: '68%' }} />
                <span style={{ height: '82%' }} />
              </div>
            </div>

            <div className="preview-list">
              <div className="preview-item">
                <div>
                  <span className="preview-dot purple" />
                  Housing
                </div>
                <strong>₹12,000</strong>
              </div>
              <div className="preview-item">
                <div>
                  <span className="preview-dot orange" />
                  Food
                </div>
                <strong>₹3,480</strong>
              </div>
              <div className="preview-item">
                <div>
                  <span className="preview-dot blue" />
                  Bills
                </div>
                <strong>₹2,130</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">₹</div>
          <div>
            <h1>MyBillLedger</h1>
            <small>{user.name}</small>
          </div>
        </div>

        <nav className="nav">
          {['dashboard', 'transactions', 'monthly', 'reports', 'settings'].map((view) => (
            <button
              key={view}
              type="button"
              className={`nav-item ${currentView === view ? 'active' : ''}`}
              onClick={() => setCurrentView(view)}
            >
              {view === 'dashboard' && 'Dashboard'}
              {view === 'transactions' && 'Transactions'}
              {view === 'monthly' && 'Monthly'}
              {view === 'reports' && 'Reports'}
              {view === 'settings' && 'Settings'}
            </button>
          ))}
        </nav>

        <button className="logout-btn" type="button" onClick={handleLogout}>
          Log out
        </button>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Overview</p>
            <h2>
              {currentView === 'dashboard' && 'Expense Dashboard'}
              {currentView === 'transactions' && 'Transactions'}
              {currentView === 'monthly' && 'Monthly Spend'}
              {currentView === 'reports' && 'Reports'}
              {currentView === 'settings' && 'Settings'}
            </h2>
          </div>

          <div className="topbar-actions">
            <button className="secondary-btn" type="button" onClick={handleExportPdf}>
              Export PDF
            </button>
            <button className="primary-btn" type="button" onClick={() => setCurrentView('transactions')}>
              + Add transaction
            </button>
          </div>
        </header>

        {message.text && <div className={`status-message ${message.type}`}>{message.text}</div>}

        {currentView === 'dashboard' && (
          <>
            <section className="summary-grid">
              <div className="summary-card income">
                <span>Total Income</span>
                <strong>{formatCurrency(summary.totalIncome)}</strong>
              </div>
              <div className="summary-card expense">
                <span>Total Expenses</span>
                <strong>{formatCurrency(summary.totalExpense)}</strong>
              </div>
              <div className="summary-card balance">
                <span>Balance</span>
                <strong>{formatCurrency(summary.balance)}</strong>
              </div>
              <div className="summary-card budget">
                <span>Monthly Budget</span>
                <strong>{formatCurrency(summary.monthlyBudget)}</strong>
              </div>
            </section>

            <section className="content-grid">
              <div className="panel form-panel">
                <div className="panel-header">
                  <h3>Add Transaction</h3>
                </div>

                <form onSubmit={handleSubmit} className="transaction-form">
                  <div className="field-group">
                    <label>Title</label>
                    <input
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="Rent, Groceries, Salary..."
                    />
                    {errors.title && <small className="error-text">{errors.title}</small>}
                  </div>

                  <div className="field-row">
                    <div className="field-group">
                      <label>Category</label>
                      <select name="category" value={form.category} onChange={handleChange}>
                        {categories.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      {errors.category && <small className="error-text">{errors.category}</small>}
                    </div>

                    <div className="field-group">
                      <label>Type</label>
                      <select name="type" value={form.type} onChange={handleChange}>
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field-group">
                      <label>Amount (INR)</label>
                      <input
                        type="number"
                        name="amount"
                        value={form.amount}
                        onChange={handleChange}
                        placeholder="₹ 5000"
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                      />
                      {errors.amount && <small className="error-text">{errors.amount}</small>}
                    </div>

                    <div className="field-group">
                      <label>Date</label>
                      <input type="date" name="date" value={form.date} onChange={handleChange} />
                      {errors.date && <small className="error-text">{errors.date}</small>}
                    </div>
                  </div>

                  <button type="submit" className="primary-btn full-width">
                    {editingTransactionId ? 'Update transaction' : 'Save transaction'}
                  </button>

                  {editingTransactionId && (
                    <button type="button" className="secondary-btn full-width" onClick={handleCancelEdit}>
                      Cancel edit
                    </button>
                  )}
                </form>

                <div className="category-manager">
                  <label>Manage categories</label>
                  <div className="category-manager-row">
                    <input
                      value={newCategory}
                      onChange={(event) => setNewCategory(event.target.value)}
                      placeholder="Add new category"
                    />
                    <button type="button" className="primary-btn small-btn" onClick={handleAddCategory}>
                      Add
                    </button>
                  </div>

                  <div className="category-chips">
                    {categories.map((category) => (
                      <span
                        key={category}
                        className={`category-chip ${form.category === category ? 'selected' : ''}`}
                      >
                        {category}
                        {!baseCategories.includes(category) && (
                          <button
                            type="button"
                            className="chip-remove"
                            onClick={() => handleDeleteCategory(category)}
                            aria-label={`Remove ${category}`}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <h3>Category Summary</h3>
                </div>

                <div className="budget-meter">
                  <div className="budget-meta">
                    <span>Budget used</span>
                    <strong>{Math.min(Math.round(summary.budgetUsed), 100)}%</strong>
                  </div>
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${summary.budgetWarning ? 'warning' : ''}`}
                      style={{ width: `${Math.min(summary.budgetUsed, 100)}%` }}
                    />
                  </div>
                  <small>
                    {formatCurrency(summary.totalExpense)} of {formatCurrency(summary.monthlyBudget)} spent
                  </small>
                </div>

                <div className="top-category-block">
                  <h4>Top categories</h4>
                  <div className="category-list">
                    {topCategories.length > 0 ? (
                      topCategories.map(([category, total]) => (
                        <div className="category-item" key={category}>
                          <div className="category-label">
                            <span
                              className="dot"
                              style={{ background: categoryColors[category] || '#64748b' }}
                            />
                            {category}
                          </div>
                          <strong>{formatCurrency(total)}</strong>
                        </div>
                      ))
                    ) : (
                      <p className="empty-state">No expenses yet.</p>
                    )}
                  </div>
                </div>

                <div className="category-list">
                  {categoryEntries.length > 0 ? (
                    categoryEntries.map(([category, total]) => (
                      <div className="category-item" key={category}>
                        <div className="category-label">
                          <span
                            className="dot"
                            style={{ background: categoryColors[category] || '#64748b' }}
                          />
                          {category}
                        </div>
                        <strong>{formatCurrency(total)}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">No expenses yet.</p>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {currentView === 'transactions' && (
          <section className="panel table-panel">
            <div className="panel-header table-header">
              <div>
                <h3>Recent Transactions</h3>
                <span className="table-count">{filteredTransactions.length} records found</span>
              </div>
              <div className="transaction-summary-inline">
                <span>Income: <strong>{formatCurrency(summary.totalIncome)}</strong></span>
                <span>Spend: <strong>{formatCurrency(summary.totalExpense)}</strong></span>
              </div>
            </div>

            <div className="filter-bar">
              <input
                type="text"
                name="search"
                value={transactionFilters.search}
                onChange={handleTransactionFilterChange}
                placeholder="Search title..."
              />

              <select name="type" value={transactionFilters.type} onChange={handleTransactionFilterChange}>
                <option value="all">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>

              <select
                name="category"
                value={transactionFilters.category}
                onChange={handleTransactionFilterChange}
              >
                <option value="all">All categories</option>
                {categories.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <div className="date-filter-group">
                <input
                  type="date"
                  name="startDate"
                  value={transactionFilters.startDate}
                  onChange={handleTransactionFilterChange}
                />
                <input
                  type="date"
                  name="endDate"
                  value={transactionFilters.endDate}
                  onChange={handleTransactionFilterChange}
                />
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((item) => (
                      <tr key={item.id}>
                        <td>{item.title}</td>
                        <td>{item.category}</td>
                        <td>
                          <span className={`badge ${item.type}`}>{item.type}</span>
                        </td>
                        <td>{new Date(item.date).toLocaleDateString()}</td>
                        <td className={item.type === 'income' ? 'income-text' : 'expense-text'}>
                          {item.type === 'income' ? '+' : '-'}
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="table-actions">
                          <button className="secondary-btn action-btn" type="button" onClick={() => handleEdit(item)}>
                            Edit
                          </button>
                          <button className="delete-btn" type="button" onClick={() => handleDelete(item.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-state-cell">
                        No matching transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {currentView === 'monthly' && (
          <>
            <section className="stats-grid monthly-highlights">
              <div className="panel mini-panel highlight-income">
                <h3>Income</h3>
                <p className="stat-value">{formatCurrency(summary.totalIncome)}</p>
                <span>All recorded income</span>
              </div>
              <div className="panel mini-panel highlight-expense">
                <h3>Spent</h3>
                <p className="stat-value">{formatCurrency(monthlyOverview.totalExpenseThisMonth)}</p>
                <span>Current month</span>
              </div>
              <div className="panel mini-panel highlight-budget">
                <h3>Budget</h3>
                <p className="stat-value">{summary.budgetWarning ? 'Alert' : 'On Track'}</p>
                <span>{summary.budgetWarning ? 'Over target' : 'Within target'}</span>
              </div>
              <div className="panel mini-panel highlight-count">
                <h3>Entries</h3>
                <p className="stat-value">{monthlyOverview.transactionCount}</p>
                <span>Transactions this month</span>
              </div>
            </section>

            <section className="panel trend-panel">
              <div className="panel-header">
                <h3>6-Month Trend</h3>
              </div>

              <div className="trend-chart">
                {monthlyTrend.map((month) => {
                  const maxValue = Math.max(...monthlyTrend.map((entry) => Math.max(entry.income, entry.expense)), 1);
                  const incomeHeight = (month.income / maxValue) * 100;
                  const expenseHeight = (month.expense / maxValue) * 100;

                  return (
                    <div key={`${month.label}-${month.income}-${month.expense}`} className="trend-column">
                      <div className="trend-bars">
                        <span className="trend-bar income-bar" style={{ height: `${incomeHeight}%` }} />
                        <span className="trend-bar expense-bar" style={{ height: `${expenseHeight}%` }} />
                      </div>
                      <small>{month.label}</small>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {currentView === 'reports' && (
          <section className="report-panel panel">
            <div className="panel-header">
              <h3>Monthly Summary</h3>
            </div>

            <div className="report-grid">
              <div className="report-metric">
                <p className="report-label">Income</p>
                <h4>{formatCurrency(summary.totalIncome)}</h4>
              </div>
              <div className="report-metric">
                <p className="report-label">Expenses</p>
                <h4>{formatCurrency(summary.totalExpense)}</h4>
              </div>
              <div className="report-metric">
                <p className="report-label">Remaining</p>
                <h4>{formatCurrency(summary.balance)}</h4>
              </div>
            </div>

            <div className="report-chart-wrap">
              {reportChartData.length > 0 ? (
                <div className="report-chart">
                  {reportChartData.map(({ category, total, color }) => {
                    const maxValue = Math.max(...reportChartData.map((item) => item.total), 1);
                    const height = (total / maxValue) * 100;

                    return (
                      <div key={category} className="report-bar-group">
                        <div className="report-bar-column">
                          <span className="report-bar-value">{formatCurrency(total)}</span>
                          <div className="report-bar" style={{ height: `${height}%`, background: color }} />
                        </div>
                        <small>{category}</small>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-state">No expense data yet.</p>
              )}
            </div>

            <div className="report-list">
              {categoryEntries.map(([category, total]) => (
                <div key={category} className="report-item">
                  <span>{category}</span>
                  <strong>{formatCurrency(total)}</strong>
                </div>
              ))}
            </div>
          </section>
        )}

        {currentView === 'settings' && (
          <section className="panel recurring-panel">
            <div className="panel-header">
              <h3>Recurring Bills</h3>
            </div>

            <form onSubmit={handleRecurringSubmit} className="recurring-form">
              <div className="field-row">
                <div className="field-group">
                  <label>Bill name</label>
                  <input
                    name="title"
                    value={recurringForm.title}
                    onChange={handleRecurringChange}
                    placeholder="Internet, Rent, Gym..."
                  />
                </div>

                <div className="field-group">
                  <label>Category</label>
                  <select name="category" value={recurringForm.category} onChange={handleRecurringChange}>
                    {categories.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field-row">
                <div className="field-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    name="amount"
                    value={recurringForm.amount}
                    onChange={handleRecurringChange}
                    placeholder="0"
                  />
                </div>

                <div className="field-group">
                  <label>Frequency</label>
                  <select name="frequency" value={recurringForm.frequency} onChange={handleRecurringChange}>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label>Next due date</label>
                <input type="date" name="nextDate" value={recurringForm.nextDate} onChange={handleRecurringChange} />
              </div>

              <button type="submit" className="primary-btn full-width">Add recurring bill</button>
            </form>

            <div className="recurring-list">
              {recurringBills.length > 0 ? (
                recurringBills.map((bill) => (
                  <div key={bill.id} className="recurring-item">
                    <div>
                      <strong>{bill.title}</strong>
                      <small>
                        {bill.frequency} • {bill.category}
                      </small>
                    </div>
                    <div className="recurring-meta">
                      <span>{formatCurrency(bill.amount)}</span>
                      <button type="button" className="delete-btn" onClick={() => handleRecurringDelete(bill.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-state">No recurring bills yet.</p>
              )}
            </div>
          </section>
        )}

        {currentView === 'settings' && (
          <section className="panel settings-panel">
            <div className="panel-header">
              <h3>Profile & Budget</h3>
            </div>

            <div className="settings-card">
              <div className="user-summary">
                <span className="user-tag">{user.provider === 'google' ? 'Google account' : 'Guest mode'}</span>
                <h4>{user.name || 'MyBillLedger User'}</h4>
                <p>{user.email || 'guest@mybillledger.local'}</p>
              </div>

              <form onSubmit={handleBudgetSave} className="settings-form">
                <div className="field-group">
                  <label>Monthly budget target</label>
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(event) => setBudgetInput(event.target.value)}
                    placeholder="25000"
                  />
                </div>

                <div className="settings-actions">
                  <button type="submit" className="primary-btn">Save budget</button>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => setBudgetInput(25000)}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;