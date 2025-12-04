const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.sqlite');

console.log('\n=== SEEDING TEST DATA ===\n');

// Insert test expenses with variety
const testExpenses = [
  { username: 'sikandar_5777', amount: 150, category: 'Food', description: 'Lunch at restaurant', date: '2025-12-01' },
  { username: 'sikandar_5777', amount: 50, category: 'Transport', description: 'Uber ride', date: '2025-12-01' },
  { username: 'sikandar_5777', amount: 300, category: 'Shopping', description: 'Clothes shopping', date: '2025-12-02' },
  { username: 'sikandar_5777', amount: 200, category: 'Bills', description: 'Electricity bill', date: '2025-12-02' },
  { username: 'sikandar_5777', amount: 75, category: 'Entertainment', description: 'Movie tickets', date: '2025-12-03' },
  { username: 'sikandar_5777', amount: 120, category: 'Food', description: 'Groceries', date: '2025-12-03' },
  { username: 'sikandar_5777', amount: 80, category: 'Transport', description: 'Fuel', date: '2025-12-04' }
];

// Insert test categories
const testCategories = [
  { username: 'sikandar_5777', name: 'Food', color: '#FF6B6B', hex: '#FF6B6B', budget: 500, icon: '🍔' },
  { username: 'sikandar_5777', name: 'Transport', color: '#4ECDC4', hex: '#4ECDC4', budget: 200, icon: '🚗' },
  { username: 'sikandar_5777', name: 'Shopping', color: '#95E1D3', hex: '#95E1D3', budget: 300, icon: '🛍️' },
  { username: 'sikandar_5777', name: 'Bills', color: '#F38181', hex: '#F38181', budget: 400, icon: '📄' },
  { username: 'sikandar_5777', name: 'Entertainment', color: '#AA96DA', hex: '#AA96DA', budget: 150, icon: '🎬' },
  { username: 'sikandar_5777', name: 'Other', color: '#FCBAD3', hex: '#FCBAD3', budget: 100, icon: '📦' }
];

db.serialize(() => {
  // Clear existing data
  db.run('DELETE FROM expenses WHERE username = ?', ['sikandar_5777'], (err) => {
    if (err) console.log('Clear expenses error:', err);
    else console.log('✓ Cleared existing expenses');
  });

  db.run('DELETE FROM categories WHERE username = ?', ['sikandar_5777'], (err) => {
    if (err) console.log('Clear categories error:', err);
    else console.log('✓ Cleared existing categories');
  });

  // Insert expenses
  const expenseStmt = db.prepare('INSERT INTO expenses (username, amount, category, description, date) VALUES (?, ?, ?, ?, ?)');
  for (const e of testExpenses) {
    expenseStmt.run([e.username, e.amount, e.category, e.description, e.date]);
  }
  expenseStmt.finalize((err) => {
    if (err) console.log('Insert expenses error:', err);
    else console.log(`✓ Inserted ${testExpenses.length} test expenses`);
  });

  // Insert categories
  const categoryStmt = db.prepare('INSERT INTO categories (username, name, color, hex, budget, icon) VALUES (?, ?, ?, ?, ?, ?)');
  for (const c of testCategories) {
    categoryStmt.run([c.username, c.name, c.color, c.hex, c.budget, c.icon]);
  }
  categoryStmt.finalize((err) => {
    if (err) console.log('Insert categories error:', err);
    else console.log(`✓ Inserted ${testCategories.length} test categories`);
  });

  // Update budget
  db.run('UPDATE budgets SET amount = ? WHERE username = ?', [2000, 'sikandar_5777'], function (err) {
    if (err) console.log('Update budget error:', err);
    else if (this.changes === 0) {
      db.run('INSERT INTO budgets (username, amount) VALUES (?, ?)', ['sikandar_5777', 2000], (err) => {
        if (err) console.log('Insert budget error:', err);
        else console.log('✓ Budget set to 2000');
        showData();
      });
    } else {
      console.log('✓ Budget updated to 2000');
      showData();
    }
  });
});

function showData() {
  setTimeout(() => {
    console.log('\n=== UPDATED DATA ===\n');
    
    db.all('SELECT * FROM expenses WHERE username = ? ORDER BY date DESC', ['sikandar_5777'], (err, expenses) => {
      console.log(`Expenses (${expenses.length}):`);
      expenses.forEach(e => {
        console.log(`  ${e.date} | ${e.category.padEnd(15)} | $${e.amount.toString().padEnd(5)} | ${e.description}`);
      });
      
      db.all('SELECT * FROM categories WHERE username = ?', ['sikandar_5777'], (err, categories) => {
        console.log(`\nCategories (${categories.length}):`);
        categories.forEach(c => {
          console.log(`  ${c.icon} ${c.name.padEnd(15)} | Budget: $${c.budget}`);
        });
        
        db.get('SELECT amount FROM budgets WHERE username = ?', ['sikandar_5777'], (err, row) => {
          console.log(`\nMonthly Budget: $${row ? row.amount : 'N/A'}`);
          console.log('\n=== END ===\n');
          db.close();
        });
      });
    });
  }, 500);
}
