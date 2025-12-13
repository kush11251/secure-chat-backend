const router = require('express').Router();
const { register, login, refresh, logout } = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', verifyToken, logout);

module.exports = router;
