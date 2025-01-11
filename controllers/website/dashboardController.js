const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Checkout');
const Category = require('../../models/Category');

const dashboardController = {
    getStatus: async (req, res) => {
        try {
            const stats = {
                users: await User.countDocuments({ role: 'user' }),
                products: await Product.countDocuments(),
                orders: await Order.countDocuments(),
                revenue: await Order.aggregate([
                    { $group: { _id: null, total: { $sum: "$totalAmount" } } }
                ]),
                recentOrders: await Order.find()
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate('products.productId'),
                topProducts: await Product.find()
                    .sort({ soldCount: -1 })
                    .limit(5)
            };

            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error fetching dashboard stats",
                error: error.message
            });
        }
    }
};

module.exports = dashboardController;