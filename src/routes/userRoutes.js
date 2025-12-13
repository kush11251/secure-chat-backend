const router = require('express').Router();
const verifyToken = require('../middleware/verifyToken');
const { me, searchByUID, addContactByUID, listContacts, updateNotificationsToken, activeContacts, updateProfile, removeContactByUID } = require('../controllers/userController');

router.get('/me', verifyToken, me);
router.patch('/me', verifyToken, updateProfile);
router.get('/search', verifyToken, searchByUID);
router.post('/contacts', verifyToken, addContactByUID);
router.get('/contacts', verifyToken, listContacts);
router.delete('/contacts/:uid', verifyToken, removeContactByUID);
router.post('/notifications-token', verifyToken, updateNotificationsToken);
router.get('/active-contacts', verifyToken, activeContacts);

module.exports = router;
