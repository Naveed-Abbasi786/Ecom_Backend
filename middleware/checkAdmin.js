// Middleware to check if the user is an admin
const checkAdmin = (req, res, next) => {
    if (req.admin.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: "Admin access required"
        });
    }
    next();
};

module.exports = checkAdmin;