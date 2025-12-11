#!/usr/bin/env node
/**
 * Rowan Node - Cloudflare Quick Tunnel + QR
 *
 * - Uses TryCloudflare / Quick Tunnels (no domain, no account)
 * - Runs: cloudflared tunnel --url http://localhost:8000
 * - Auto-detects https://*.trycloudflare.com from stdout OR stderr
 * - Prints the URL + QR code
 */

require('dotenv').config();
const { spawn } = require('child_process');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Local Rowan API endpoint (backend must already be running here)
const LOCAL_API_URL = process.env.LOCAL_API_URL || 'http://localhost:8000';

// Match something like: https://random-subdomain.trycloudflare.com
const TUNNEL_URL_REGEX = /(https:\/\/[a-zA-Z0-9.-]+\.trycloudflare\.com)/;

// Warn if a config.yaml exists (Quick Tunnels limitation from Cloudflare docs)
const cloudflaredDir = path.join(os.homedir(), '.cloudflared');
const configYamlPath = path.join(cloudflaredDir, 'config.yaml');
if (fs.existsSync(configYamlPath)) {
    console.warn('\n[WARNING] ~/.cloudflared/config.yaml exists.');
    console.warn('Quick Tunnels (TryCloudflare) are not supported while this file is present.');
    console.warn('Per Cloudflare docs, rename or remove config.yaml to use Quick Tunnels.\n');
}

console.log('\n╔════════════════════════════════════╗');
console.log('║   Rowan Node - Quick Tunnel        ║');
console.log('╚════════════════════════════════════╝\n');

console.log(`Starting Cloudflare Quick Tunnel to ${LOCAL_API_URL}...\n`);

// Check for local cloudflared.exe
const localCloudflared = path.join(__dirname, 'cloudflared.exe');
const cloudflaredCmd = fs.existsSync(localCloudflared) ? localCloudflared : 'cloudflared';

if (cloudflaredCmd !== 'cloudflared') {
    console.log(`[INFO] Using local cloudflared binary: ${cloudflaredCmd}`);
}

const cloudflared = spawn(cloudflaredCmd, ['tunnel', '--url', LOCAL_API_URL], {
    stdio: ['ignore', 'pipe', 'pipe']
});

let publicUrlCaptured = false;

function checkForUrl(text) {
    if (publicUrlCaptured) return;

    const match = text.match(TUNNEL_URL_REGEX);
    if (match && match[1]) {
        const publicUrl = match[1];
        publicUrlCaptured = true;

        console.log('\n[Rowan] Public URL detected:');
        console.log(`  ${publicUrl}\n`);

        console.log('Scan this QR code with your phone:\n');
        qrcode.generate(publicUrl, { small: true });

        console.log('\nLeave this process running to keep the tunnel alive.');
        console.log('Press Ctrl+C to shut down the tunnel.\n');
    }
}

cloudflared.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(text); // show raw cloudflared logs
    checkForUrl(text);
});

cloudflared.stderr.on('data', (data) => {
    const text = data.toString();
    process.stderr.write(text); // surface any errors
    checkForUrl(text);
});

cloudflared.on('close', (code) => {
    console.log(`\ncloudflared process exited with code ${code}`);
});

cloudflared.on('error', (err) => {
    console.error('\nFailed to start cloudflared process:', err.message);
    if (err.code === 'ENOENT') {
        console.error('Make sure cloudflared is installed or in the current directory.');
    }
});

// Handle termination signals
process.on('SIGINT', () => {
    console.log('\nShutting down tunnel...');
    cloudflared.kill();
    process.exit(0);
});
