import jwt from 'jsonwebtoken';
const jwtsecret = process.env.REACT_APP_JWT_SECRET;

const jwtAuthMiddleware = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) return res.status(401).json({ error: 'Token Not Found' });

    const token = authorization.split(' ')[1];

    // This stops the "jwt malformed" error when Frontend sends "null" as a string
    if (!token || token === "null" || token === "undefined") {
        return res.status(401).json({ error: 'Invalid Token Format' });
    }

    try {
        // Use the ENV variable here
        const decoded = jwt.verify(token, process.env.REACT_APP_JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error("JWT Verification Error:", err.message);
        return res.status(401).json({ error: 'Invalid token' });
    }
}

const generateToken = (userData) => {
    // Use the same ENV variable here!
    // '8h' = 8 hours. '1d' = 1 day. Use strings for clarity.
    return jwt.sign(userData, process.env.REACT_APP_JWT_SECRET, { expiresIn: '7d' });
}

export { jwtAuthMiddleware, generateToken };