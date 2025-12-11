#!/usr/bin/env node
/**
 * Rowan Node - Combined Start Script
 * 1. User setup (if needed)
 * 2. Start server
 * 3. Start tunnel + QR
 */

require('dotenv').config();
const { spawn } = require('child_process');
const setupUser = require('./setup-user');

const TUNNEL_MODE = process.env.TUNNEL_MODE || 'quick';

async function startRowan() {
    console.log('\n╔════════════════════════════════════╗');
    console.log('║      Rowan Node - Starting...      ║');
    console.log('╚════════════════════════════════════╝\n');

    // Step 1: User Setup
    console.log('[1/3] Checking user configuration...\n');
    await setupUser();

    // Step 2: Start Server
    console.log('[2/3] Starting Rowan API server...\n');
    const server = spawn('node', ['server.js'], {
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let serverReady = false;

    server.stdout.on('data', (data) => {
        const text = data.toString();
        console.log(text.trim());

        // Wait for server to be ready
        if (text.includes('Rowan Node API running')) {
            serverReady = true;
            startTunnel();
        }
    });

    server.stderr.on('data', (data) => {
        console.error(data.toString());
    });

    server.on('close', (code) => {
        console.log(`\nServer stopped (exit code: ${code})`);
        process.exit(code);
    });

    // Step 3: Start Tunnel (after server is ready)
    let tunnelProcess = null;

    function startTunnel() {
        if (tunnelProcess) return; // Already started

        console.log('\n[3/3] Starting Cloudflare tunnel...\n');

        if (TUNNEL_MODE === 'named') {
            // Named tunnel - just show QR
            tunnelProcess = spawn('node', ['qr-named.js'], {
                stdio: 'inherit'
            });
        } else {
            // Quick tunnel - start and capture URL
            tunnelProcess = spawn('node', ['tunnel-and-qr.js'], {
                stdio: 'inherit'
            });
        }

        tunnelProcess.on('close', (code) => {
            console.log(`\nTunnel stopped (exit code: ${code})`);
        });
    }

    // Handle termination
    process.on('SIGINT', () => {
        console.log('\n\nShutting down Rowan Node...');
        if (tunnelProcess) tunnelProcess.kill();
        server.kill();
        process.exit(0);
    });

    // If server doesn't start in 10 seconds, start tunnel anyway
    setTimeout(() => {
        if (!serverReady) {
            console.log('\n[WARNING] Server not ready yet, starting tunnel anyway...\n');
            startTunnel();
        }
    }, 10000);
}

// Run
startRowan().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
