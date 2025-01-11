const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/website/categooryControler");
const productController = require("../controllers/website/productController");
const upload = require("../middleware/upload");

// Category routes
// Add image upload middleware to the category creation route
// router.post('/category', upload.single('categoryImage'), categoryController.createCategory);
// router.delete('/category', categoryController.deleteCategory);
router.get("/categories", categoryController.getCategories);

// Subcategory routes
// router.post('/category/subcategory', categoryController.addSubCategory);
// router.delete('/category/subcategory', categoryController.deleteSubcategory);
router.post("/category/subcategories", categoryController.getSubcategories);

// Product routes with image upload
// Create product - multiple product images
// router.post('/product', upload.fields([{ name: 'files', maxCount: 10 } ]), productController.addProduct);
router.get("/products", productController.getProducts);
router.post("/products/category", productController.getProductsByCategory);
router.post( "/products/subcategory", productController.getProductsBySubcategory);


// Update product - multiple product images
// router.put('/product/:productId', upload.fields([{ name: 'files', maxCount: 10 }]), productController.updateProduct);

// router.post('/product/soft-delete', productController.softDeleteProduct);
// router.post('/product/restore', productController.restoreProduct);
// router.post('/product/toggle-visibility', productController.toggleProductVisibility);
router.get("/products/filter-products", productController.filterProducts);
router.get("/products/:productId", productController.getProductById);
router.post("/product/like", productController.likeProduct);
router.post("/product/unlike", productController.removeLikeProduct);
router.post("/product/liked", productController.getLikedProducts);

module.exports = router;
