const express = require('express');
const router = express.Router();

// Import routes
const authRouter = require("./auth");
const categoryRouter = require("./category");
const cartRouter = require("./addToCart");
const checkoutRouter = require("./checkout");
const blogRouter = require("./BlogRoute");
const adminRouter = require("./admin");

// Use routes
router.use("/auth", authRouter);
router.use("/admin", adminRouter); 
router.use("/cat", categoryRouter);
router.use("/cart", cartRouter);
router.use("/checkout", checkoutRouter);
router.use("/blog", blogRouter);

module.exports = router;