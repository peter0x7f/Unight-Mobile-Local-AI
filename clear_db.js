const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'rowan.db');
const db = new Database(dbPath);

try {
    console.log('Clearing all data from database...');

    // Disable foreign keys to allow deleting in any order
    db.pragma('foreign_keys = OFF');

    const tables = ['message_embeddings', 'messages', 'conversations', 'users'];

    for (const table of tables) {
        try {
            const info = db.prepare(`DELETE FROM ${table}`).run();
            console.log(`Deleted ${info.changes} rows from ${table}`);

            // Reset autoincrement
            try {
                db.prepare(`DELETE FROM sqlite_sequence WHERE name='${table}'`).run();
            } catch (e) {
                // Ignore
            }
        } catch (err) {
            if (err.message.includes('no such table')) {
                console.log(`Skipping ${table} (does not exist)`);
            } else {
                console.error(`Error clearing ${table}:`, err.message);
            }
        }
    }

    db.pragma('foreign_keys = ON');

    // Vacuum to reclaim space
    db.exec('VACUUM');

    console.log('Database cleared successfully.');
} catch (err) {
    console.error('Error clearing database:', err);
}
