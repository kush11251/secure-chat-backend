const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const { listChats, getOrCreateDirect, createGroup, updateGroup, addMembers, removeMember, pinChat, unpinChat } = require('../controllers/chatController');

router.get('/', verifyToken, listChats);
router.post('/direct', verifyToken, getOrCreateDirect);
router.post('/group', verifyToken, createGroup);
router.patch('/:chatId', verifyToken, updateGroup);
router.post('/:chatId/members', verifyToken, addMembers);
router.delete('/:chatId/members/:memberId', verifyToken, removeMember);
router.post('/:chatId/pin', verifyToken, pinChat);
router.post('/:chatId/unpin', verifyToken, unpinChat);

module.exports = router;
