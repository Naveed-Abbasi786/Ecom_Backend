const Checkout = require("../../models/Checkout");
const Product = require("../../models/Product");
const Cart = require("../../models/Cart");
const sendEmail = require("../../send email/mailService");

// Helper function to send order confirmation email
const sendOrderConfirmationEmail = async (orderDetails) => {
  const productsList = orderDetails.products
    .map((item) => `- ${item.productId.name} (Quantity: ${item.quantity})`)
    .join("\n");

  const htmlContent = `
        <div class="bg-dark-green text-white p-6 rounded-lg shadow-lg">
          <h2 class="text-2xl font-bold mb-4">Order Confirmation</h2>
          <p class="mb-2">Dear <span class="font-semibold">${orderDetails.name}</span>,</p>
          <p class="mb-6">Thank you for your order! Here are your order details:</p>

          <div class="bg-green-700 p-4 rounded-lg mb-6">
            <p><strong>Order ID:</strong> ${orderDetails._id}</p>
            <p><strong>Total Amount:</strong> Rs.${orderDetails.totalAmount}</p>
            <p><strong>Payment Method:</strong> ${orderDetails.paymentMethod}</p>
          </div>

          <h3 class="text-xl font-semibold mb-2">Products:</h3>
          <ul class="list-disc list-inside mb-6 space-y-2">
            ${orderDetails.products
              .map(
                (item) =>
                  `<li>${item.productId.name} <span class="text-sm text-gray-300">(Quantity: ${item.quantity})</span></li>`
              )
              .join("")}
          </ul>

          <h3 class="text-xl font-semibold mb-2">Shipping Address:</h3>
          <div class="bg-green-700 p-4 rounded-lg mb-6">
            <p>${orderDetails.billingAddress}</p>
            <p>${orderDetails.city}, ${orderDetails.state}</p>
            <p>${orderDetails.zipCode}</p>
          </div>

          <p class="mb-6">We will process your order soon.</p>

          <p class="text-center">Best regards,<br><span class="font-semibold">Your Muqeet Naveed Team </span></p>
        </div>
    `;

  const textContent = `
        Dear ${orderDetails.name},

        Thank you for your order! Here are your order details:

        Order ID: ${orderDetails._id}
        Total Amount: Rs.${orderDetails.totalAmount}
        Payment Method: ${orderDetails.paymentMethod}

        Products:
        ${productsList}

        Shipping Address:
        ${orderDetails.billingAddress}
        ${orderDetails.city}, ${orderDetails.state}
        ${orderDetails.zipCode}

        We will process your order soon.

        Best regards,
        Your Muqeet Naveed
    `;

  await sendEmail(
    orderDetails.email,
    "Order Confirmation",
    htmlContent,
    textContent
  );
};

// Create new checkout/order
const createCheckout = async (req, res) => {
  try {
    const {
      userId,
      name,
      email,
      contactNumber,
      billingAddress,
      city,
      state,
      zipCode,
      paymentMethod,
      products,
      totalAmount,
    } = req.body;

    console.log(name, email, contactNumber, billingAddress, products);
    // Validate required fields
    if (
      !userId ||
      !name ||
      !email ||
      !contactNumber ||
      !billingAddress ||
      !products ||
      !totalAmount
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields including userId are required",
      });
    }

    // Validate products stock and update quantities
    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.productId} not found`,
        });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product: ${product.name}`,
        });
      }

      // Decrease product quantity
      product.quantity -= item.quantity;
      await product.save();
    }

    const checkout = new Checkout({
      name,
      email,
      contactNumber,
      billingAddress,
      city,
      state,
      zipCode,
      paymentMethod,
      products,
      totalAmount,
    });

    const savedCheckout = await checkout.save();

    // Populate product details for email
    const populatedCheckout = await Checkout.findById(
      savedCheckout._id
    ).populate("products.productId");
    console.log(populatedCheckout);
    // Send confirmation email
    await sendOrderConfirmationEmail(populatedCheckout);

    // **Clear the user's cart after successful checkout**
    await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } }
    );

    res.status(201).json({
      success: true,
      message: "Order placed successfully and confirmation email sent",
      data: populatedCheckout,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating order",
      error: error.message,
    });
  }
};

// Get all orders (admin)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Checkout.find()
      .populate("products.productId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message,
    });
  }
};

// Get single order
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Checkout.findById(orderId).populate(
      "products.productId"
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching order",
      error: error.message,
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, orderStatus } = req.body;

    // Validate inputs
    if (!orderId || !orderStatus) {
      return res.status(400).json({
        success: false,
        message: "Order ID and status are required",
      });
    }

    // Validate order status
    if (
      !["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].includes(
        orderStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    // Find and validate order
    const order = await Checkout.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Handle cancellation and stock restoration
    if (orderStatus === "Cancelled" && order.orderStatus !== "Cancelled") {
      for (const item of order.products) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.quantity += item.quantity;
          await product.save();
        }
      }
    }

    // Update order status
    order.orderStatus = orderStatus;
    await order.save();

    // Prepare email content
    const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Order Status Update</h2>
                <p>Dear ${order.name},</p>
                <p>Your order status has been updated to: <strong>${orderStatus}</strong></p>
                
                <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                    <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order._id}</p>
                    <p style="margin: 5px 0;"><strong>Total Amount:</strong> Rs.${order.totalAmount}</p>
                    <p style="margin: 5px 0;"><strong>Current Status:</strong> ${orderStatus}</p>
                </div>

                <p>If you have any questions about your order, please don't hesitate to contact us.</p>
                
                <p>Thank you for shopping with us!</p>
                
                <p>Best regards,<br>Your Muqeet Naveed Team</p>
            </div>
        `;

    const textContent = `
            Dear ${order.name},

            Your order status has been updated to: ${orderStatus}

            Order Details:
            - Order ID: ${order._id}
            - Total Amount: Rs.${order.totalAmount}
            - Current Status: ${orderStatus}

            If you have any questions about your order, please don't hesitate to contact us.

            Thank you for shopping with us!

            Best regards,
            Your Muqeet Team
        `;

    // Send status update email
    await sendEmail(
      order.email,
      `Order Status Update - ${orderStatus}`,
      htmlContent,
      textContent
    );

    // Get updated order with populated products
    const updatedOrder = await Checkout.findById(orderId).populate(
      "products.productId"
    );

    // Send success response
    res.status(200).json({
      success: true,
      message: "Order status updated successfully and notification email sent",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error in updateOrderStatus:", error);
    res.status(500).json({
      success: false,
      message: "Error updating order status",
      error: error.message,
    });
  }
};
// Get orders by email
const getOrdersByEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const orders = await Checkout.find({ email })
      .populate("products.productId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message,
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
      const { orderId } = req.body;

      const order = await Checkout.findById(orderId);
      if (!order) {
          return res.status(404).json({ message: "Order not found" });
      }

      order.orderStatus = 'Cancelled';
      await order.save();

      res.status(200).json({
          success: true,
          message: "Order cancelled successfully",
          order
      });
  } catch (error) {
      res.status(500).json({
          success: false,
          message: "Error cancelling order",
          error: error.message
      });
  }
};

module.exports = {
  createCheckout,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getOrdersByEmail,
  cancelOrder
};
