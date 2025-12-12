#!/usr/bin/env node
/**
 * Local User Setup for Rowan Node
 * Creates the initial user account locally (no API endpoint needed)
 */

const readline = require('readline');
const db = require('./db');
const auth = require('./auth');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setupUser() {
    console.log('\n╔════════════════════════════════════╗');
    console.log('║   Rowan Node - User Setup          ║');
    console.log('╚════════════════════════════════════╝\n');

    // Initialize DB
    db.init();

    // Check if user already exists
    const existingUsers = db.getAllUsers();
    if (existingUsers && existingUsers.length > 0) {
        console.log('✓ User account already configured.');
        console.log(`  Username: ${existingUsers[0].username}\n`);

        const recreate = await question('Create a new user? (y/N): ');
        if (recreate.toLowerCase() !== 'y') {
            console.log('Using existing account.\n');
            rl.close();
            return existingUsers[0];
        }
    }

    // Prompt for credentials
    const username = await question('Enter username: ');
    if (!username || username.trim().length === 0) {
        console.error('Error: Username cannot be empty');
        process.exit(1);
    }

    const password = await question('Enter password (min 6 chars, A-Z, a-z, 0-9, special): ');
    
    // Password Policy: Min 6 chars, 1 upper, 1 lower, 1 number, 1 special
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;

    if (!strongPasswordRegex.test(password)) {
        console.error('\nError: Password does not meet security requirements:');
        console.error(' - At least 6 characters');
        console.error(' - At least one uppercase letter');
        console.error(' - At least one lowercase letter');
        console.error(' - At least one number');
        console.error(' - At least one special character');
        process.exit(1);
    }

    const passwordConfirm = await question('Confirm password: ');
    if (password !== passwordConfirm) {
        console.error('Error: Passwords do not match');
        process.exit(1);
    }

    try {
        // Hash password
        const passwordHash = await auth.hashPassword(password);

        // Create user
        const user = db.createUser(username.trim(), passwordHash);

        console.log('\n✓ User account created successfully!');
        console.log(`  Username: ${user.username}`);
        console.log(`  User ID: ${user.id}\n`);

        rl.close();
        return user;
    } catch (error) {
        console.error('Error creating user:', error.message);
        process.exit(1);
    }
}

// Export for use in other scripts
if (require.main === module) {
    setupUser().then(() => {
        process.exit(0);
    });
}

module.exports = setupUser;
