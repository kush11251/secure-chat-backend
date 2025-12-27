const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const { sendMessage, getMessages, addReaction, removeReaction, markRead, markDelivered, markDeliveredBulk } = require('../controllers/messageController');
const { uploadMiddleware, uploadAndSend, storeMediaMessage } = require('../controllers/mediaController');

router.get('/:chatId', verifyToken, getMessages);
router.post('/', verifyToken, sendMessage);
router.post('/:messageId/reactions', verifyToken, addReaction);
router.delete('/:messageId/reactions', verifyToken, removeReaction);
router.post('/:chatId/read', verifyToken, markRead);
router.post('/:messageId/delivered', verifyToken, markDelivered);
router.post('/delivered', verifyToken, markDeliveredBulk);

router.post('/media/upload', verifyToken, uploadMiddleware, uploadAndSend);
router.post('/media', verifyToken, storeMediaMessage);

module.exports = router;
