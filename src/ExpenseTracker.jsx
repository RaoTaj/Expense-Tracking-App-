import React, { useState, useEffect } from 'react';
import { PlusCircle, TrendingDown, Calendar, DollarSign, Tag, Trash2, Edit2, Check, X, LogOut, User, BarChart3, Filter, Download, Bell, TrendingUp, Plus, Palette } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ExpenseTracker() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([
    { name: 'Food', color: 'bg-orange-500', hex: '#f97316', budget: 500, icon: '🍔' },
    { name: 'Transport', color: 'bg-blue-500', hex: '#3b82f6', budget: 200, icon: '🚗' },
    { name: 'Shopping', color: 'bg-pink-500', hex: '#ec4899', budget: 300, icon: '🛍️' },
    { name: 'Bills', color: 'bg-red-500', hex: '#ef4444', budget: 400, icon: '📄' },
    { name: 'Entertainment', color: 'bg-purple-500', hex: '#a855f7', budget: 150, icon: '🎬' },
    { name: 'Other', color: 'bg-gray-500', hex: '#6b7280', budget: 100, icon: '📦' }
  ]);
  const [monthlyBudget, setMonthlyBudget] = useState(1650);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  // Registration fields
  const [regForm, setRegForm] = useState({
    fullName: '',
    username: '',
    password: '',
    cnic: '',
    country: '',
    city: '',
    zipcode: ''
  });

  // Login fields
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New expense fields
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // New category fields
  const [newCategory, setNewCategory] = useState({
    name: '',
    budget: '',
    color: 'bg-indigo-500',
    hex: '#6366f1',
    icon: '💰'
  });

  const colorOptions = [
    { name: 'Indigo', class: 'bg-indigo-500', hex: '#6366f1' },
    { name: 'Green', class: 'bg-green-500', hex: '#22c55e' },
    { name: 'Yellow', class: 'bg-yellow-500', hex: '#eab308' },
    { name: 'Cyan', class: 'bg-cyan-500', hex: '#06b6d4' },
    { name: 'Rose', class: 'bg-rose-500', hex: '#f43f5e' },
    { name: 'Amber', class: 'bg-amber-500', hex: '#f59e0b' },
  ];

  const iconOptions = ['💰', '🏠', '🎓', '💊', '✈️', '🎮', '📱', '⚡', '💳', '🎨'];

  useEffect(() => {
    checkLoggedIn();
  }, []);

  const checkLoggedIn = async () => {
    try {
      const username = localStorage.getItem('current-session');
      if (username) {
        const r = await fetch(`/api/user/${username}`);
        if (r.ok) {
          const j = await r.json();
          setCurrentUser(j.user);
          await loadUserData(username);
        } else {
          localStorage.removeItem('current-session');
        }
      }
    } catch (error) {
      console.log('No active session');
    }
  };

  const loadUserData = async (username) => {
    try {
      const r = await fetch(`/api/user/${username}/data`);
      if (r.ok) {
        const j = await r.json();
        setExpenses(j.expenses || []);
        if (j.categories && j.categories.length) setCategories(j.categories);
        if (j.budget !== null && j.budget !== undefined) setMonthlyBudget(j.budget);
      }
    } catch (error) {
      console.log('Using default data for new user');
    }
  };

  const handleRegister = async () => {
    setError('');
    setSuccess('');

    if (!regForm.fullName || !regForm.username || !regForm.password || !regForm.cnic || 
        !regForm.country || !regForm.city || !regForm.zipcode) {
      setError('All fields are required');
      return;
    }

    if (regForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (regForm.cnic.length !== 13) {
      setError('CNIC must be 13 digits');
      return;
    }

    try {
      const resp = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });
      if (resp.ok) {
        setSuccess('Registration successful! Please login.');
        setRegForm({ fullName: '', username: '', password: '', cnic: '', country: '', city: '', zipcode: '' });
        setTimeout(() => { setShowLogin(true); setSuccess(''); }, 2000);
      } else {
        const j = await resp.json();
        setError(j.error || 'Registration failed.');
      }
    } catch (error) {
      setError('Registration failed. Please try again.');
    }
  };

  const handleLogin = async () => {
    setError('');

    if (!loginForm.username || !loginForm.password) {
      setError('Username and password are required');
      return;
    }

    try {
      const resp = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (resp.ok) {
        const j = await resp.json();
        localStorage.setItem('current-session', loginForm.username);
        setCurrentUser(j.user);
        await loadUserData(loginForm.username);
        setLoginForm({ username: '', password: '' });
      } else {
        const j = await resp.json();
        setError(j.error || 'Login failed');
      }
    } catch (error) {
      setError('User not found');
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('current-session');
    } catch (error) {
      console.log('Logout error');
    }
    setCurrentUser(null);
    setExpenses([]);
    setShowLogin(true);
  };

  const saveExpenses = async (newExpenses) => {
    try {
      if (!currentUser) throw new Error('No user');
      const resp = await fetch('/api/expenses/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username, expenses: newExpenses })
      });
      if (resp.ok) setExpenses(newExpenses);
      else console.error('Failed to save expenses bulk');
    } catch (error) {
      console.error('Failed to save expenses:', error);
    }
  };

  const saveCategories = async (newCategories) => {
    try {
      if (!currentUser) throw new Error('No user');
      const resp = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username, categories: newCategories })
      });
      if (resp.ok) setCategories(newCategories);
      else console.error('Failed to save categories');
    } catch (error) {
      console.error('Failed to save categories:', error);
    }
  };

  const saveBudget = async (budget) => {
    try {
      if (!currentUser) throw new Error('No user');
      const resp = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username, amount: budget })
      });
      if (resp.ok) setMonthlyBudget(budget);
      else console.error('Failed to save budget');
    } catch (error) {
      console.error('Failed to save budget:', error);
    }
  };

  const addExpense = () => {
    if (!newExpense.amount || !newExpense.description) return;
    
    const expense = {
      id: Date.now(),
      ...newExpense,
      amount: parseFloat(newExpense.amount)
    };
    
    saveExpenses([expense, ...expenses]);
    setNewExpense({
      amount: '',
      category: 'Food',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowAddExpense(false);
  };

  const addCategory = () => {
    if (!newCategory.name || !newCategory.budget) return;
    
    const category = {
      ...newCategory,
      budget: parseFloat(newCategory.budget)
    };
    
    saveCategories([...categories, category]);
    setNewCategory({
      name: '',
      budget: '',
      color: 'bg-indigo-500',
      hex: '#6366f1',
      icon: '💰'
    });
    setShowAddCategory(false);
  };

  const deleteExpense = (id) => {
    saveExpenses(expenses.filter(e => e.id !== id));
  };

  const updateBudget = (categoryName, newBudget) => {
    const updated = categories.map(c => 
      c.name === categoryName ? { ...c, budget: parseFloat(newBudget) || 0 } : c
    );
    saveCategories(updated);
    setEditingBudget(null);
  };

  const getFilteredExpenses = () => {
    let filtered = [...expenses];

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(e => e.category === filterCategory);
    }

    // Filter by period
    const now = new Date();
    if (filterPeriod === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(e => new Date(e.date) >= weekAgo);
    } else if (filterPeriod === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(e => new Date(e.date) >= monthAgo);
    } else if (filterPeriod === 'custom' && dateRange.start && dateRange.end) {
      filtered = filtered.filter(e => 
        new Date(e.date) >= new Date(dateRange.start) && 
        new Date(e.date) <= new Date(dateRange.end)
      );
    }

    return filtered;
  };

  const getCategorySpending = (categoryName) => {
    return getFilteredExpenses()
      .filter(e => e.category === categoryName)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getTotalSpending = () => {
    return getFilteredExpenses().reduce((sum, e) => sum + e.amount, 0);
  };

  const getTotalBudget = () => {
    return categories.reduce((sum, c) => sum + c.budget, 0);
  };

  const getMonthlyData = () => {
    const months = {};
    expenses.forEach(e => {
      const month = new Date(e.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      months[month] = (months[month] || 0) + e.amount;
    });
    return Object.entries(months).map(([month, amount]) => ({ month, amount })).slice(-6);
  };

  const getCategoryData = () => {
    return categories.map(cat => ({
      name: cat.name,
      value: getCategorySpending(cat.name),
      color: cat.hex
    })).filter(c => c.value > 0);
  };

  const getTopCategories = () => {
    return categories
      .map(cat => ({ name: cat.name, amount: getCategorySpending(cat.name), icon: cat.icon }))
      .sort((a, b) => b.amount - a.amount);
  };

  const predictNextMonth = () => {
    const monthlyData = getMonthlyData();
    if (monthlyData.length < 2) return getTotalSpending();
    const avg = monthlyData.reduce((sum, m) => sum + m.amount, 0) / monthlyData.length;
    const trend = (monthlyData[monthlyData.length - 1].amount - monthlyData[0].amount) / monthlyData.length;
    return Math.max(0, avg + trend);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Description', 'Category', 'Amount'];
    const rows = getFilteredExpenses().map(e => [e.date, e.description, e.category, e.amount]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Auth screens
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <DollarSign size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800">Expense Tracker</h1>
              <p className="text-gray-500 mt-2">Manage your money wisely</p>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setShowLogin(true); setError(''); setSuccess(''); }}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  showLogin 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => { setShowLogin(false); setError(''); setSuccess(''); }}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                  !showLogin 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                Register
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4">
                {success}
              </div>
            )}

            {showLogin ? (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                />
                <button
                  onClick={handleLogin}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Login
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={regForm.fullName}
                  onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="Username"
                  value={regForm.username}
                  onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                />
                <input
                  type="password"
                  placeholder="Password (min 6 characters)"
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="CNIC (13 digits)"
                  value={regForm.cnic}
                  onChange={(e) => setRegForm({ ...regForm, cnic: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={regForm.country}
                  onChange={(e) => setRegForm({ ...regForm, country: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="City"
                  value={regForm.city}
                  onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="Zipcode"
                  value={regForm.zipcode}
                  onChange={(e) => setRegForm({ ...regForm, zipcode: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                />
                <button
                  onClick={handleRegister}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">{currentUser.fullName}</h1>
            <p className="text-sm opacity-90">@{currentUser.username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/20 hover:bg-white/30 p-3 rounded-xl transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm opacity-90">Monthly Spent</span>
              <span className="text-sm opacity-90">Budget</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-3xl font-bold">Rs {getTotalSpending().toFixed(0)}</span>
              <span className="text-xl">Rs {monthlyBudget}</span>
            </div>
            <div className="mt-3 bg-white/30 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-white h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min((getTotalSpending() / monthlyBudget) * 100, 100)}%` }}
              />
            </div>
            <div className="mt-2 text-sm opacity-90">
              Remaining: Rs {Math.max(0, monthlyBudget - getTotalSpending()).toFixed(0)}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
            activeTab === 'dashboard' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-white text-gray-600'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
            activeTab === 'analytics' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-white text-gray-600'
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
            activeTab === 'categories' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-white text-gray-600'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab('budget')}
          className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
            activeTab === 'budget' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-white text-gray-600'
          }`}
        >
          Budget
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <>
          <div className="px-4 mb-4">
            <button
              onClick={() => setShowAddExpense(!showAddExpense)}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle size={24} />
              Add Expense
            </button>
          </div>

          {showAddExpense && (
            <div className="mx-4 mb-4 bg-white rounded-2xl shadow-lg p-4">
              <input
                type="number"
                placeholder="Amount (Rs)"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                className="w-full mb-3 p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
              />
              <input
                type="text"
                placeholder="Description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                className="w-full mb-3 p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
              />
              <select
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                className="w-full mb-3 p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
              >
                {categories.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.icon} {cat.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                className="w-full mb-3 p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={addExpense}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="px-4 mb-4">
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={18} className="text-gray-600" />
                <span className="font-semibold text-gray-800">Filter Expenses</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="p-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none text-sm"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="p-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              {filterPeriod === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="p-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none text-sm"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="p-2 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none text-sm"
                  />
                </div>
              )}
              <button
                onClick={exportToCSV}
                className="w-full mt-3 bg-green-600 text-white py-2 rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Export to CSV
              </button>
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="px-4 pb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Recent Expenses</h2>
            <div className="space-y-2">
              {getFilteredExpenses().length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-gray-400">
                  <TrendingDown size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No expenses found</p>
                </div>
              ) : (
                getFilteredExpenses().map(expense => {
                  const category = categories.find(c => c.name === expense.category);
                  return (
                    <div key={expense.id} className="bg-white rounded-2xl p-4 shadow-md flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 ${category?.color} rounded-xl flex items-center justify-center text-white text-2xl`}>
                          {category?.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{expense.description}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Tag size={14} />
                            <span>{expense.category}</span>
                            <span>•</span>
                            <Calendar size={14} />
                            <span>{new Date(expense.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-800">Rs {expense.amount}</span>
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="px-4 space-y-4">
          {/* Spending Forecast */}
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-600" />
              Spending Forecast
            </h3>
            <div className="bg-indigo-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-2">Predicted Next Month</p>
              <p className="text-3xl font-bold text-indigo-600">Rs {predictNextMonth().toFixed(0)}</p>
              <p className="text-xs text-gray-500 mt-2">Based on your spending pattern</p>
            </div>
          </div>

          {/* Top Categories */}
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <h3 className="font-bold text-gray-800 mb-3">Top Spending Categories</h3>
            <div className="space-y-2">
              {getTopCategories().slice(0, 5).map((cat, idx) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-800">{cat.name}</p>
                      <p className="text-xs text-gray-500">#{idx + 1} highest</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-800">Rs {cat.amount.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Trend Chart */}
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <h3 className="font-bold text-gray-800 mb-3">Monthly Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={getMonthlyData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Category Pie Chart */}
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <h3 className="font-bold text-gray-800 mb-3">Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={getCategoryData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getCategoryData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="px-4 space-y-4">
          <button
            onClick={() => setShowAddCategory(true)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            <Plus size={24} />
            Add Custom Category
          </button>

          {showAddCategory && (
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <input
                type="text"
                placeholder="Category Name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="w-full mb-3 p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
              />
              <input
                type="number"
                placeholder="Budget (Rs)"
                value={newCategory.budget}
                onChange={(e) => setNewCategory({ ...newCategory, budget: e.target.value })}
                className="w-full mb-3 p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
              />
              
              <p className="text-sm font-semibold text-gray-700 mb-2">Choose Color</p>
              <div className="flex gap-2 mb-3">
                {colorOptions.map(color => (
                  <button
                    key={color.name}
                    onClick={() => setNewCategory({ ...newCategory, color: color.class, hex: color.hex })}
                    className={`w-10 h-10 ${color.class} rounded-xl ${newCategory.color === color.class ? 'ring-4 ring-indigo-300' : ''}`}
                  />
                ))}
              </div>

              <p className="text-sm font-semibold text-gray-700 mb-2">Choose Icon</p>
              <div className="flex gap-2 mb-3">
                {iconOptions.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setNewCategory({ ...newCategory, icon })}
                    className={`w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl ${newCategory.icon === icon ? 'ring-4 ring-indigo-300' : ''}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={addCategory}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddCategory(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {categories.map(cat => {
              const spent = getCategorySpending(cat.name);
              const percentage = (spent / cat.budget) * 100;
              return (
                <div key={cat.name} className="bg-white rounded-2xl p-4 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 ${cat.color} rounded-xl flex items-center justify-center text-xl`}>
                        {cat.icon}
                      </div>
                      <span className="font-semibold text-gray-800">{cat.name}</span>
                    </div>
                    {editingBudget === cat.name ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          defaultValue={cat.budget}
                          className="w-20 p-1 border-2 border-indigo-300 rounded text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateBudget(cat.name, e.target.value);
                            }
                          }}
                          autoFocus
                        />
                        <button
                          onClick={(e) => updateBudget(cat.name, e.target.previousSibling.value)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => setEditingBudget(null)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          Rs {spent.toFixed(0)} / {cat.budget}
                        </span>
                        <button
                          onClick={() => setEditingBudget(cat.name)}
                          className="text-indigo-600 hover:text-indigo-700"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : cat.color
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Budget Tab */}
      {activeTab === 'budget' && (
        <div className="px-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <h3 className="font-bold text-gray-800 mb-3">Monthly Budget Planning</h3>
            <div className="flex items-center gap-3 mb-4">
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => saveBudget(parseFloat(e.target.value) || 0)}
                className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
              />
              <span className="text-gray-600">Rs</span>
            </div>
            <div className="bg-indigo-50 rounded-xl p-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Spent</span>
                <span className="text-sm font-semibold text-gray-800">Rs {getTotalSpending().toFixed(0)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Remaining</span>
                <span className="text-sm font-semibold text-green-600">Rs {Math.max(0, monthlyBudget - getTotalSpending()).toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Progress</span>
                <span className="text-sm font-semibold text-indigo-600">{((getTotalSpending() / monthlyBudget) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Budget Alerts */}
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Bell size={20} className="text-yellow-500" />
              Budget Alerts
            </h3>
            {getTotalSpending() > monthlyBudget * 0.9 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-2">
                <p className="text-red-700 font-semibold">⚠️ Budget Alert!</p>
                <p className="text-sm text-red-600">You've used {((getTotalSpending() / monthlyBudget) * 100).toFixed(0)}% of your monthly budget</p>
              </div>
            )}
            {categories.map(cat => {
              const spent = getCategorySpending(cat.name);
              const percentage = (spent / cat.budget) * 100;
              if (percentage > 90) {
                return (
                  <div key={cat.name} className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-2">
                    <p className="text-yellow-700 font-semibold">{cat.icon} {cat.name}</p>
                    <p className="text-sm text-yellow-600">{percentage.toFixed(0)}% of budget used</p>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}