require("dotenv").config();
const qrcode = require("qrcode-terminal");

const PUBLIC_URL = process.env.PUBLIC_URL;

if (!PUBLIC_URL) {
    console.error("PUBLIC_URL is not set in .env");
    process.exit(1);
}

console.log("Public Rowan URL (via Cloudflare Tunnel):");
console.log(PUBLIC_URL, "\n");

qrcode.generate(PUBLIC_URL, { small: true });
