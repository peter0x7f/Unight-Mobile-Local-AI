#!/usr/bin/env node

/**
 * Rowan Node API Chat CLI
 * 
 * Interactive chat client that shows all API requests made to the Rowan Node API
 */

const readline = require('readline');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8000';
let authToken = null;
let currentConversationId = null;
let currentModel = 'llama3.2-latest';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'rowan> '
});

// Color codes for terminal
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logRequest(method, url, body = null) {
    log(`\n→ ${method} ${url}`, 'cyan');
    if (body) {
        log(`  Body: ${JSON.stringify(body, null, 2)}`, 'dim');
    }
}

function logResponse(status, data) {
    log(`← ${status}`, status >= 200 && status < 300 ? 'green' : 'red');
    log(`  ${JSON.stringify(data, null, 2)}`, 'dim');
}

async function makeRequest(method, endpoint, body = null) {
    const url = `${API_BASE}${endpoint}`;
    logRequest(method, url, body);

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        logResponse(response.status, data);
        return { ok: response.ok, data };
    } catch (error) {
        log(`Error: ${error.message}`, 'red');
        return { ok: false, error: error.message };
    }
}


async function login(username, password) {
    const result = await makeRequest('POST', '/auth/login', { username, password });
    if (result.ok) {
        authToken = result.data.token;
        log(`\n✓ Logged in as ${username}`, 'green');
    }
    return result;
}

async function createConversation(title = null) {
    const result = await makeRequest('POST', '/api/conversations', { title });
    if (result.ok) {
        currentConversationId = result.data.id;
        log(`\n✓ Created conversation: ${currentConversationId}`, 'green');
    }
    return result;
}

async function listConversations() {
    return await makeRequest('GET', '/api/conversations');
}

async function listAvailableModels() {
    return await makeRequest('GET', '/api/models/available');
}

async function listInstalledModels() {
    return await makeRequest('GET', '/api/models/installed');
}

async function downloadModel(modelName) {
    return await makeRequest('POST', '/api/models/download', { name: modelName });
}

async function chat(message) {
    if (!currentConversationId) {
        log('No active conversation. Creating one...', 'yellow');
        await createConversation('CLI Chat');
    }

    const result = await makeRequest('POST', '/api/chat', {
        conversation_id: currentConversationId,
        message,
        model: currentModel
    });

    if (result.ok) {
        log(`\n${colors.bright}${colors.magenta}Rowan:${colors.reset} ${result.data.reply}\n`, 'reset');
    }

    return result;
}

function showHelp() {
    console.log(`
${colors.bright}Rowan Node API Chat CLI${colors.reset}

Commands:
  /login <username> <password>     - Login as existing user
  /new [title]                     - Create new conversation
  /conversations                   - List your conversations
  /switch <conversation_id>        - Switch to a conversation
  /models                          - List available models
  /installed                       - List installed models
  /download <model_name>           - Download an Ollama model
  /use <model_name>                - Set current model (default: llama3.2-latest)
  /help                            - Show this help
  /exit                            - Exit the CLI

${colors.green}Just type a message to chat!${colors.reset}

${colors.dim}Current:${colors.reset}
  - API: ${API_BASE}
  - Auth: ${authToken ? 'Logged in' : 'Not logged in'}
  - Conversation: ${currentConversationId || 'None'}
  - Model: ${currentModel}
`);
}

async function processCommand(input) {
    const parts = input.trim().split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    switch (cmd) {
        case '/login':
            if (args.length < 2) {
                log('Usage: /login <username> <password>', 'yellow');
                return;
            }
            await login(args[0], args[1]);
            break;

        case '/new':
            await createConversation(args.join(' ') || null);
            break;

        case '/conversations':
            await listConversations();
            break;

        case '/switch':
            if (args.length === 0) {
                log('Usage: /switch <conversation_id>', 'yellow');
                return;
            }
            currentConversationId = args[0];
            log(`✓ Switched to conversation: ${currentConversationId} `, 'green');
            break;

        case '/models':
            await listAvailableModels();
            break;

        case '/installed':
            await listInstalledModels();
            break;

        case '/download':
            if (args.length === 0) {
                log('Usage: /download <model_name>', 'yellow');
                return;
            }
            await downloadModel(args[0]);
            break;

        case '/use':
            if (args.length === 0) {
                log('Usage: /use <model_name>', 'yellow');
                return;
            }
            currentModel = args[0];
            log(`✓ Now using model: ${currentModel}`, 'green');
            break;

        case '/help':
            showHelp();
            break;

        case '/exit':
            log('Goodbye!', 'cyan');
            process.exit(0);
            break;

        default:
            if (input.startsWith('/')) {
                log(`Unknown command: ${cmd}.Type / help for available commands.`, 'red');
            } else {
                // Regular chat message
                if (!authToken) {
                    log('Please login first with /login (use "npm run setup" to create user)', 'yellow');
                    return;
                }
                await chat(input);
            }
    }
}

console.log(colors.bright + colors.blue + `
╔═══════════════════════════════════╗
║   Rowan Node API Chat CLI v1.0    ║
╚═══════════════════════════════════╝
    ` + colors.reset);

log(`Connected to: ${API_BASE} `, 'dim');
log(`Type / help for commands\n`, 'dim');

rl.prompt();

rl.on('line', async (line) => {
    const input = line.trim();

    if (input) {
        await processCommand(input);
    }

    rl.prompt();
}).on('close', () => {
    log('\nGoodbye!', 'cyan');
    process.exit(0);
});
