const express = require('express');
const router = express.Router();
const {
    createCheckout,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    getOrdersByEmail,
    cancelOrder
} = require('../controllers/website/checkoutController');

router.post('/cancel', cancelOrder);

router.post('/create', createCheckout);

// router.get('/orders', getAllOrders);

router.post('/order', getOrderById);

// router.post('/update-status', updateOrderStatus);

router.post('/user-orders', getOrdersByEmail);

module.exports = router;