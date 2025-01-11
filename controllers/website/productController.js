const Product = require("../../models/Product");
const Subcategory = require("../../models/Subcategory");
const Category = require("../../models/Category");
const mongoose = require("mongoose");

// Add a product to a specific subcategory
const addProduct = async (req, res) => {
  try {
    // Check if the user is an admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required to add a product",
      });
    }

    const {
      categoryId,
      subCategoryId,
      name,
      heading,
      description,
      price,
      discount,
      quantity,
      isPublic = true,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !heading ||
      !description ||
      !price ||
      !categoryId ||
      !subCategoryId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: name, heading, description, price, categoryId, and subCategoryId are required",
      });
    }

    // Validate category ID format
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    // Validate subcategory ID format
    if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID format",
      });
    }

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if subcategory exists and belongs to the specified category
    const subcategory = await Subcategory.findOne({
      _id: subCategoryId,
      category: categoryId,
    });

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message:
          "Subcategory not found or does not belong to the specified category",
      });
    }

    // Handle product images
    const imageUrls = req.files
      ? req.files.map((file) => `/uploads/products/${file.filename}`)
      : [];

    // Validate quantity
    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quantity. Must be 0 or greater.",
      });
    }
    if (discount !== undefined && (discount < 0 || discount > 99)) {
      return res.status(400).json({
        success: false,
        message: "Discount must be between 0 and 99",
      });
    }
    // Calculate discounted price
    const discountedPrice = discount ? price - price * (discount / 100) : price;

    // Create new product
    const product = new Product({
      name,
      heading,
      description,
      price,
      discount: discount || 0,
      discountedPrice,
      imageUrls,
      category: categoryId,
      subCategory: subCategoryId,
      quantity: quantity || 0,
      isPublic,
      status: isPublic ? "active" : "inactive",
    });

    await product.save();

    // Fetch the saved product with populated fields
    const savedProduct = await Product.findById(product._id)
      .populate("category")
      .populate({
        path: "subCategory",
        populate: { path: "category" },
      });

    res.status(201).json({
      success: true,
      message: `Product successfully created and is ${
        isPublic ? "public" : "private"
      }`,
      product: savedProduct,
    });
  } catch (error) {
    console.error("Error in addProduct:", error);
    res.status(500).json({
      success: false,
      message: "Error adding product",
      error: error.message,
    });
  }
};

// Update the products
const updateProduct = async (req, res) => {
  // checkAdmin(req, res);
  try {
    const { productId } = req.params;
    const { name, heading, description, price, discount, subCategoryId } =
      req.body;
    let imageUrls;

    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map((file) => `/uploads/products/${file.filename}`);
    }

    const discountedPrice = discount ? price - price * (discount / 100) : price;

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name,
        heading,
        description,
        price,
        discount,
        discountedPrice,
        subCategory: subCategoryId,
        ...(imageUrls && { imageUrls }),
      },
      { new: true }
    )
      .populate("subCategory")
      .populate({
        path: "subCategory",
        populate: { path: "category", model: "Category" },
      });

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res
      .status(200)
      .json({
        message: "Product updated successfully",
        product: updatedProduct,
      });
  } catch (error) {
    res.status(500).json({ message: "Error updating product", error });
  }
};

// Soft delete a single product
const softDeleteProduct = async (req, res) => {
  // checkAdmin(req, res);
  try {
    const { productId } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid product ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.isDeleted = true;
    product.deletedAt = new Date();
    product.status = "inactive";
    await product.save();

    res.status(200).json({
      message: "Product successfully deleted",
      productId: product._id,
    });
  } catch (error) {
    console.error("Error soft deleting product:", error);
    res.status(500).json({ message: "Error deleting product", error });
  }
};

// Toggle product visibility (public/private)
const toggleProductVisibility = async (req, res) => {
  // checkAdmin(req, res);
  try {
    const { productId, isPublic } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid product ID" });
    }

    if (typeof isPublic !== "boolean") {
      return res
        .status(400)
        .json({ message: "Please provide a valid visibility state" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.isPublic = isPublic;
    await product.save();

    res.status(200).json({
      message: `Product is now ${isPublic ? "public" : "private"}`,
      productId: product._id,
      isPublic: product.isPublic,
    });
  } catch (error) {
    console.error("Error toggling product visibility:", error);
    res
      .status(500)
      .json({ message: "Error updating product visibility", error });
  }
};

// Restore soft-deleted products
// Restore a single soft-deleted product
const restoreProduct = async (req, res) => {
  // checkAdmin(req, res);
  try {
    const { productId } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid product ID" });
    }

    const product = await Product.findOne({
      _id: productId,
      isDeleted: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Deleted product not found" });
    }

    product.isDeleted = false;
    product.deletedAt = null;
    product.status = "active";
    await product.save();

    res.status(200).json({
      message: "Product restored successfully",
      productId: product._id,
    });
  } catch (error) {
    console.error("Error restoring product:", error);
    res.status(500).json({ message: "Error restoring product", error });
  }
};

const getProducts = async (req, res) => {
  try {
    const { categoryId, subCategoryId, status, minPrice, maxPrice } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {
      isDeleted: false,
    };

    if (categoryId) filter.category = categoryId;
    if (subCategoryId) filter.subCategory = subCategoryId;
    if (status !== undefined) filter.status = status === "true";
    if (minPrice)
      filter.price = { ...filter.price, $gte: parseFloat(minPrice) };
    if (maxPrice)
      filter.price = { ...filter.price, $lte: parseFloat(maxPrice) };

    // Use find with an empty query to get ALL products
    const products = await Product.find(filter)
      .populate("subCategory")
      .populate({
        path: "subCategory",
        populate: { path: "category", model: "Category" },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalCount = await Product.countDocuments();
    // const FetchedProducts = Product.length
    res.status(200).json({
      success: true,
      count: totalCount,
      products,
      // limitProducts : FetchedProducts
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
};

const filterProducts = async (req, res) => {
  const { name, page = 1, limit = 10, outOfStock } = req.query;

  try {
    // Convert page and limit to integers and validate
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid page number. Page number must be a positive integer.",
      });
    }

    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit. Limit must be a positive integer.",
      });
    }

    const filter = {};

    if (typeof name === "string" && name.trim() !== "") {
      filter.name = { $regex: name.trim(), $options: "i" };
    }
    if (outOfStock === "true") {
      filter.quantity = { $lte: 1 };
    }

    const totalCount = await Product.countDocuments(filter);

    if (totalCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found matching the given criteria.",
      });
    }

    const products = await Product.find(filter)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .populate("category")
      .populate("subCategory");

    const totalPages = Math.ceil(totalCount / limitNumber);

    res.status(200).json({
      success: true,
      currentPage: pageNumber,
      totalPages,
      totalProducts: totalCount,
      products,
    });
  } catch (error) {
    console.error("Error filtering products:", error);
    res.status(500).json({
      success: false,
      message: "Error filtering products.",
      error: error.message,
    });
  }
};

const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.body;
    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const products = await Product.find({
      category: categoryId,
      isDeleted: false,
    })
      .populate("category", "name")
      .populate("subCategory", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      categoryName: category.name,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Error in getProductsByCategory:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching products by category",
      error: error.message,
    });
  }
};

const getProductsBySubcategory = async (req, res) => {
  try {
    const { subCategoryId } = req.body;

    if (!subCategoryId || !mongoose.Types.ObjectId.isValid(subCategoryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subcategory ID format",
        receivedId: subCategoryId,
      });
    }

    const subcategory = await Subcategory.findById(subCategoryId).populate(
      "category"
    );
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
        subCategoryId: subCategoryId,
      });
    }

    const products = await Product.find({
      subCategory: subCategoryId,
      isDeleted: false,
    })
      .populate({
        path: "subCategory",
        select: "name category",
        populate: {
          path: "category",
          select: "name",
        },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      categoryName: subcategory.category.name,
      subcategoryName: subcategory.name,
      count: products.length,
      products: products || [],
    });
  } catch (error) {
    console.error("Error in getProductsBySubcategory:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching products by subcategory",
      error: error.message,
    });
  }
};

// Like a product
const likeProduct = async (req, res) => {
  try {
    const { userId, productId } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!product.likedBy.includes(userId)) {
      product.likedBy.push(userId);
    } else {
      product.likedBy = product.likedBy.filter(
        (id) => id.toString() !== userId
      );
    }

    await product.save();
    res
      .status(200)
      .json({
        message: "Product like status updated",
        likedBy: product.likedBy,
      });
  } catch (error) {
    res.status(500).json({ message: "Error liking product", error });
  }
};

const removeLikeProduct = async (req, res) => {
  const { userId, productId } = req.body;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.likedBy.includes(userId)) {
      product.likedBy = product.likedBy.filter(
        (id) => id.toString() !== userId
      );
    }
    await product.save();
    res.status(200).json({ message: "Product removed from liked" });
  } catch (error) {
    console.error("Error removing from liked:", error);
    res.status(500).json({ message: "Error removing from liked", error });
  }
};

// Get all products liked by a specific user
const getLikedProducts = async (req, res) => {
  try {
    const { userId } = req.body;

    const likedProducts = await Product.find({ likedBy: userId })
      .populate("subCategory")
      .populate({
        path: "subCategory",
        populate: { path: "category", model: "Category" },
      });

    res.status(200).json(likedProducts);
  } catch (error) {
    console.error("Error fetching liked products:", error);
    res.status(500).json({ message: "Error fetching liked products", error });
  }
};

// Get a product by its ID with category and subcategory details
const getProductById = async (req, res) => {
  try {
    const { productId } = req.params; // Get productId from route parameters

    const product = await Product.findById(productId)
      .populate("subCategory")
      .populate({
        path: "subCategory",
        populate: { path: "category", model: "Category" },
      });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    res.status(500).json({ message: "Error fetching product by ID", error });
  }
};

module.exports = {
  addProduct,
  getProducts,
  likeProduct,
  getLikedProducts,
  updateProduct,
  getProductById,
  softDeleteProduct,
  restoreProduct,
  toggleProductVisibility,
  getProductsByCategory,
  getProductsBySubcategory,
  filterProducts,
  removeLikeProduct,
};
