const express = require('express');
const router = express.Router();
const { addToCart, removeFromCart, getCart, updateCart } = require('../controllers/website/cartController');

// Routers 
router.post('/add', addToCart);
router.post('/remove', removeFromCart);
router.post('/getcart', getCart);
router.post('/updatecart', updateCart);

module.exports = router;
