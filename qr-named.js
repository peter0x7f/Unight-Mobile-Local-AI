#!/usr/bin/env node
/**
 * QR Code Generator for Named Cloudflare Tunnel
 * Use this when you have a stable domain configured
 */

require('dotenv').config();
const qrcode = require('qrcode-terminal');

// For named tunnel / stable domain mode
const PUBLIC_URL = process.env.PUBLIC_URL || 'https://rowan.yourdomain.com';

console.log('\n╔════════════════════════════════════╗');
console.log('║   Rowan Node - Named Tunnel        ║');
console.log('╚════════════════════════════════════╝\n');

console.log('Public URL (via named Cloudflare Tunnel):');
console.log(`  ${PUBLIC_URL}\n`);

console.log('Scan this QR code with your phone:\n');
qrcode.generate(PUBLIC_URL, { small: true });

console.log('\nNote: Ensure cloudflared service is running:');
console.log('  sudo systemctl status cloudflared\n');
