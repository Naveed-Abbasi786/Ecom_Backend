const Cart = require("../../models/Cart");
const Product = require("../../models/Product");

// Add a product to the user's cart
const addToCart = async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const productPrice = product.discountedPrice || product.price;
    const itemTotalPrice = productPrice * quantity;
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }
    const existingCartItem = cart.items.find(item => item.product.toString() === productId);
    if (existingCartItem) {
      existingCartItem.quantity += quantity;
      existingCartItem.totalPrice += itemTotalPrice;
    } else {
      cart.items.push({
        product: productId,
        quantity: quantity,
        totalPrice: itemTotalPrice,
      });
    }
    await cart.save();
    res.status(200).json({ message: "Product added to cart", cart });
  } catch (error) {
    res.status(500).json({ message: "Error adding to cart", error });
  }
};

// Get the user's cart with product details
const getCart = async (req, res) => {
  try {
    const { userId } = req.body;

    const cart = await Cart.findOne({ user: userId }).populate({
      path: 'items.product',
      model: 'Product',
      select: 'name price discountedPrice imageUrls', 
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Calculate total cart price
    const cartTotal = cart.items.reduce((total, item) => {
      return total + item.totalPrice;
    }, 0);

    res.status(200).json({
      cart,
      cartTotal,
      message: "Cart fetched successfully",
      success: true
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error fetching cart", 
      error: error.message,
      success: false 
    });
  }
};


// Remove a product from the user's cart
const removeFromCart = async (req, res) => {
  try {
    const { userId, productId } = req.body;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart" });
    }
    cart.items.splice(itemIndex, 1);
    await cart.save();
    res.status(200).json({ message: "Product removed from cart", cart });
  } catch (error) {
    res.status(500).json({ message: "Error removing product from cart", error });
  }
};
// Update cart item quantity
const updateCart = async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;
    console.log(userId, productId, quantity);

    // Validate quantity
    if (quantity < 1) {
      return res.status(400).json({ 
        success: false,
        message: "Quantity must be at least 1" 
      });
    }

    // Find cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ 
        success: false,
        message: "Cart not found" 
      });
    }

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found" 
      });
    }

    // Find item in cart
    const cartItem = cart.items.find(item => item.product.toString() === productId);
    if (!cartItem) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found in cart" 
      });
    }

    // Calculate new total price
    const productPrice = product.discountedPrice || product.price;
    const newTotalPrice = productPrice * quantity;

    // Update quantity and total price
    cartItem.quantity = quantity;
    cartItem.totalPrice = newTotalPrice;

    // Save cart
    await cart.save();

    // Get updated cart with populated product details
    const updatedCart = await Cart.findOne({ user: userId }).populate({
      path: 'items.product',
      model: 'Product',
      select: 'name price discountedPrice imageUrls'
    });

    res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      cart: updatedCart
    });

  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ 
      success: false,
      message: "Error updating cart",
      error: error.message 
    });
  }
};

module.exports = {
  addToCart,
  removeFromCart,
  getCart,
  updateCart
};