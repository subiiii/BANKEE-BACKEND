const express = require('express');
const router = express.Router();
const walletService = require('../services/walletService');

router.post('/:id/fund', walletService.fund);
router.get('/:id/balance', walletService.getBalance);
router.post('/transfer', walletService.transfer);
module.exports = router;