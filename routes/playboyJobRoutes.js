const express = require('express');
const { registerJobApplication, submitUTR } = require('../controllers/playboyJobController');

const router = express.Router();

router.post('/register', registerJobApplication);
router.post('/submit-utr', submitUTR);

module.exports = router;
