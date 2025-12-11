const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

async function hashPassword(password) {
    return await bcrypt.hash(password, 12);
}

async function comparePassword(plain, hashed) {
    return await bcrypt.compare(plain, hashed);
}

function signToken(user) {
    return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    if (!payload) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    req.user = { id: payload.sub, username: payload.username };
    next();
}

module.exports = {
    hashPassword,
    comparePassword,
    signToken,
    requireAuth
};
