const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.sqlite');

console.log('\n=== DATABASE INSPECTION ===\n');

// Get all table names
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Error fetching tables:', err);
    return db.close();
  }
  
  console.log('Tables:', tables.map(t => t.name).join(', '));
  
  // Count users
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    console.log('\nUsers count:', row.count);
    
    // Show all users
    db.all('SELECT * FROM users', (err, rows) => {
      console.log('\nUsers:');
      rows.forEach(u => {
        console.log(`  - ${u.username} (${u.fullName})`);
      });
      
      // Count expenses
      db.get('SELECT COUNT(*) as count FROM expenses', (err, row) => {
        console.log('\nExpenses count:', row.count);
        
        // Show sample expenses
        db.all('SELECT * FROM expenses LIMIT 5', (err, rows) => {
          console.log('\nExpenses (first 5):');
          rows.forEach(e => {
            console.log(`  - ${e.username}: $${e.amount} (${e.category}) on ${e.date}`);
          });
          
          // Count categories
          db.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
            console.log('\nCategories count:', row.count);
            
            // Count budgets
            db.get('SELECT COUNT(*) as count FROM budgets', (err, row) => {
              console.log('Budgets count:', row.count);
              
              db.close();
              console.log('\n=== END INSPECTION ===\n');
            });
          });
        });
      });
    });
  });
});
