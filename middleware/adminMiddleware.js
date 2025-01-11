const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        // Check if user exists and is active
        const user = await User.findById(req.user._id);
        if (!user || !user.isActive) {
            return res.status(403).json({
                success: false,
                message: "User account is inactive or not found"
            });
        }

        // Check admin role
        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Admin access required"
            });
        }

        // Add admin user details to request
        req.admin = user;
        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({
            success: false,
            message: "Error checking admin rights",
            error: error.message
        });
    }
};

module.exports = adminMiddleware;