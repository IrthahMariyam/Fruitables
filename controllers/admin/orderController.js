const mongoose = require("mongoose");
const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Wallet = require("../../models/walletSchema");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const listOrders = async (req, res) => {
  try {
    const itemsPerPage = 10;
    const page = parseInt(req.query.page) || 1;

    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / itemsPerPage);
    const orders = await Order.find()
      .populate("orderedItems.productId")
      .populate("userId")
      .sort({ createdOn: -1 })
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);

    res.render("admin-orders", {
      orders,
      currentPage: page,
      totalPages,
      totalOrders,
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).send("Internal Server Error");
  }
};


const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.orderId;

    let order = await Order.findById(orderId);
    if (!order) {
      return res.render('admin-error');
    }

    let userId = order.userId;

  
    if (status === "Delivered") {
      if (order.paymentMethod === "COD") {
        order.paymentStatus = "Paid";
      }
      order.status = "Delivered";
      order.deliveredDateTime = new Date();
      for (const item of order.orderedItems) {
        if (item.status !== "Cancelled") item.status = "Delivered";
      }
      await order.save();
      return res.status(200).json({ success: true, message: "Status updated successfully" });
    }

    
    if (status === "Shipped" && ["WALLET", "RAZORPAY"].includes(order.paymentMethod)) {
      if (order.paymentStatus === "Pending") {
        return res.status(400).send("Only paid orders can be shipped for online payments.");
      }
    }

    
    if (["Returned", "Cancelled"].includes(status) && order.paymentStatus === "Paid") {
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, transactions: [] });
        await wallet.save();
      }

      let refundAmount = order.finalAmount;
      if (status === "Returned") {
        refundAmount -= order.deliveryCharge;
      }

      // Add money to wallet
      wallet.balance += refundAmount;
      wallet.transactions.push({
        amount: refundAmount,
        transactionType: "credit",
        description: `Refund for order (Order ID: ${order._id})`,
        reason: `Order ${status}`,
        date: new Date(),
      });

      await wallet.save();

      order.refundedAmount += refundAmount;
    }

  
    if (["Returned", "Cancelled"].includes(status)) {
      for (const item of order.orderedItems) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
        item.status = status;
      }
    }

    // Update order status and item statuses
    order.status = status;
    for (const item of order.orderedItems) {
      if (item.status !== "Cancelled") item.status = status;
    }

    await order.save();

    return res.status(200).json({ success: true, message: "Status updated successfully" });
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).send("Internal Server Error");
  }
};


const getordedetailspage = async (req, res) => {
  try {
    const { orderid } = req.params;

    const order = await Order.findById(orderid)
      .populate("userId") 
      .populate("orderedItems.productId") 
      .sort({ createdAt: -1 }); 

    res.render("admin-orderdetails", { order });
  } catch (error) {
    res.redirect("/pageerror");
  }
};
const approveReturnRequest = async (req, res) => {
  const { orderId } = req.params;
  const { productId } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.render("admin-error");
    }

    const productItem = order.orderedItems.find(
      (item) => item._id.toString() === productId
    );

    if (!productItem) {
      return res.status(404).json({ success: false, message: "Product not found in the order." });
    }

    if (productItem.status !== "Return Request") {
      return res.status(400).json({
        success: false,
        message: "This product does not have a pending return request.",
      });
    }

    
    let pr = await Product.findOne({ _id: productItem.productId });
    

    if (!pr) {
      return res.status(404).json({ success: false, message: "Product not found in database." });
    }

    

    // Update product status
    productItem.status = "Returned";

    // Update order amounts
    const itemAmount = productItem.price * productItem.quantity;

    // Calculate coupon discount portion for this item
    let coupondis = 0;
    if (order.discount && order.orderedItems.length > 1) {
      coupondis = Math.round(
        (itemAmount / (order.subtotal + itemAmount)) * order.discount
      );
    }

    const refundAmount = itemAmount - coupondis;

    order.discount -= coupondis;
    order.subtotal = Math.max(0, order.subtotal - itemAmount);
    order.finalAmount = Math.max(0, order.finalAmount - refundAmount);

    let wallet = await Wallet.findOne({ userId: order.userId });
    if (!wallet) {
      wallet = new Wallet({ userId: order.userId, balance: 0, transactions: [] });
    }

    wallet.balance += Number(refundAmount);
    wallet.transactions.push({
      amount: Number(refundAmount),
      transactionType: "credit",
      productId: productId || null,
      reason: "Order Return",
      description: `Refund for product ${productItem.productName} (Order ID: ${orderId})`,
      date: new Date(),
    });

    await wallet.save();

    
    pr.stock += productItem.quantity;
    await pr.save();
    

  
    const updatedProduct = await Product.findById(pr._id);
    

    
    if (order.orderedItems.every((item) => item.status === "Cancelled" || item.status === "Returned")) {
      order.status = "Returned";
    } else if (order.status === "Return Request") {
      order.status = "Delivered";
    }

    await order.save();

    return res.redirect(`/admin/getorderdetails/${orderId}`);
  } catch (error) {
    console.error("Error while approving return request:", error);
    return res.status(500).json({ success: false, message: "Failed to process return request." });
  }
};

const declineReturnRequest = async (req, res) => {
  const { orderId } = req.params;
  const { productId, declineReason } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      
      res.render("admin-error");
    }

    const productItem = order.orderedItems.find(
      (item) => item._id.toString() === productId
    );
    if (!productItem) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in the order." });
    }

    if (productItem.status !== "Return Request") {
      return res
        .status(400)
        .json({
          success: false,
          message: "This product does not have a pending return request.",
        });
    }

    productItem.status = "Delivered";
    productItem.returnDeclinedReason =
      declineReason || "Your Return request is declined";

    const allProducts = order.orderedItems;
    if (allProducts.every((item) => item.status === "Delivered")) {
      order.status = "Delivered";
    }
    
    await order.save();

    return res.redirect(`/admin/getorderdetails/${orderId}`);
  } catch (error) {
    console.error("Error while declining return request:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to process return decline." });
  }
};

module.exports = {
  listOrders,
  updateOrderStatus,  
  getordedetailspage, 
  approveReturnRequest,
  declineReturnRequest,
};
