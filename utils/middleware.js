var jwt = require('jsonwebtoken')

async function auth(req, res, next) {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
        next();
    } catch {
        console.log('invalid token received')
        res.sendStatus(403);
    }
}

module.exports = {
    auth: auth
}