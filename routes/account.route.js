const express = require('express');
const router = express.Router();
const accountService = require('../services/accountService');

router.post('/:id/deposit', accountService.deposit);
router.post('/:id/withdraw', accountService.withdraw);
router.get('/:id/balance', accountService.get_balance);
router.post('/transfer', accountService.transfer);
module.exports = router;