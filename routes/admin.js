const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const upload = require('../middleware/upload');

// Import Admin Controllers
const dashboardController = require('../controllers/website/dashboardController');
const userController = require('../controllers/website/authController');
const productController = require('../controllers/website/productController');
const orderController = require('../controllers/website/checkoutController');
const categoryController = require('../controllers/website/categooryControler');
const blogController = require('../controllers/Blog/blogController');
const tagController = require('../controllers/admin/tags')



// Apply auth and admin middleware to all Routes
router.use(authMiddleware, adminMiddleware);


// Dashboard Routes
router.get('/dashboard', dashboardController.getStatus);

// User Management Routes
router.get('/users/details', userController.getUserDetails);
router.get('/users', userController.getAllUsers);
router.post('/user/toggle-status', userController.toggleUserStatus);
router.post('/user/change-role', userController.changeUserRole);

// Product Management Routes
router.post('/product', upload.array('files', 10), productController.addProduct);
router.put('/product/id', upload.array('files', 10), productController.updateProduct);
router.post('/product/id', productController.softDeleteProduct);
router.post('/product/toggle-status', productController.toggleProductVisibility);
router.post('/product/restore', productController.restoreProduct);
router.get('/products', productController.getProducts);

// Order Management Routes
router.get('/orders', orderController.getAllOrders);
router.get('/order/id', orderController.getOrderById);
router.put('/order/status', orderController.updateOrderStatus);

// Category Management Routes
router.post('/category', upload.single('categoryImage'), categoryController.createCategory);
router.put('/category/id', categoryController.updateCategory);
router.post('/category/id', categoryController.deleteCategory);
router.get('/categories', categoryController.getCategories);

// Subcategory Management Routes
router.post('/subcategory', categoryController.addSubCategory);
router.put('/subcategory/id', categoryController.updateSubcategory);
router.post('/subcategory/id', categoryController.deleteSubcategory);
router.get('/subcategories' , categoryController.getAllSubCategories);
router.get('/subcategories', categoryController.getSubcategories);

// Blog Management Routes
router.post('/blog', upload.array('images', 5), blogController.createBlog);
router.put('/blog/id', upload.array('images', 5), blogController.updateBlog);
router.get('/blogs', blogController.getBlogs);
router.post('/blog/id', blogController.deleteBlog);
router.put('/blog/toggle-status/id', blogController.toggleBlogStatus);

// Tag Routers 
router.post('/tag', tagController.addTag)
router.post('/delete-tag', tagController.deleteTag)
router.get('/tags', tagController.getTags)

// Export router
module.exports = router;