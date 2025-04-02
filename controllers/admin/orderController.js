const mongoose = require("mongoose");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const { OrderStatus, MESSAGES ,STATUS} = require("../../config/constants");


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
    
    res.status(STATUS.SERVER_ERROR).send("Internal Server Error");
  }
};

const updateOrderStatus = async (req, res) => {
  try {
   
    const { status } = req.body;
    const orderId = req.params.orderId;

    let orders = await Order.findById(req.params.orderId);
    if (!orders) {
      return res.render('admin-error')
    }
    let userId = orders.userId;

    if (status == OrderStatus.DELIVERED) {
      if (orders.paymentMethod == "COD") {
        orders.paymentStatus = "Paid";
      }
      orders.status = OrderStatus.DELIVERED;
      orders.deliveredDateTime = new Date();
      for (const item of orders.orderedItems) {
        if (item.status !== OrderStatus.CANCELLED) item.status = OrderStatus.DELIVERED;
      }
      await orders.save();
      return res
        .status(STATUS.SUCCESS)
        .json({ success: true, message: MESSAGES.STATUS_UPDATED });
    }
    let order = await Order.findById(orderId);

    if (
      status == "Shipped" &&
      (order.paymentMethod == "WALLET" ||order.paymentMethod == "RAZORPAY")
    ) {
      if (order.paymentStatus == "Pending")
        return res
          .status(STATUS.NOT_FOUND)
          .send(MESSAGES.PAID_ORDERS_SHIP);
    }

    if (
      (status == OrderStatus.RETURNED && order.paymentStatus == "Paid") ||
      (status == OrderStatus.CANCELLED && order.paymentStatus == "Paid")
    ) {
      if (
        order.paymentMethod === "RAZORPAY" ||
        order.paymentMethod === "WALLET" ||
        (order.paymentMethod == "COD" && status == "Returned")
      ) {
        let wallet = await Wallet.findOne({ userId: userId });

        if (!wallet) {
          wallet = new Wallet({ userId, balance: 0, transactions: [] });
          await wallet.save();
        }

        let amount = order.finalAmount;
        if (status == OrderStatus.RETURNED) {
          amount -= order.deliveryCharge;
        }
        // Add money to wallet
        wallet.balance += Number(amount);
        wallet.transactions.push({
          amount: Number(amount),
          transactionType: "credit",
          description: `Money credited for order (Order ID: ${order._id})`,
          productId: null,
          reason: `Order ${status}`,
          date: new Date(),
        });

        await wallet.save();

        order.refundedAmount += amount;
      }
    }
    if (status == OrderStatus.CANCELLED) {
      order.cancelReason = "Cancelled by Admin";
    }
    order.status = status;

    for (const item of order.orderedItems) {
      if (item.status != OrderStatus.CANCELLED) item.status = order.status;
    }

     await order.save();
     if (status === OrderStatus.RETURNED || status === OrderStatus.CANCELLED) {
      for (const item of order.orderedItems) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock += item.quantity;
        }
         await product.save();

        item.status = status;
      }
      await order.save();
    }
     

    return res
      .status(STATUS.SUCCESS)
      .json({ success: true, message: MESSAGES.STATUS_UPDATED });
  } catch (err) {
    
    res.status(STATUS.SERVER_ERROR).send(MESSAGES.INTERNAL_ERROR);
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

const updateStatus = async (req, res) => {
  try {
   
    const { id } = req.params;
    const { orderStatus, productId } = req.body;

    const validStatus = [
      "Pending",
      "Processing",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
      "Return Request",
      "Returned",
    ];

    if (!validStatus.includes(orderStatus)) {
      return res.render("admin/orderdetail", {
        message: MESSAGES.VALID_STATUS_CODE,
        orderId: id,
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      res.redirect("/pageerror");
    }

    const statusFlow = {
      Pending: ["Processing", "Cancelled"],
      Processing: ["Shipped", "Cancelled"],
      Shipped: ["Delivered", "Cancelled"],
     // "Out for Delivery": ["Delivered", "Cancelled"],
      Delivered: ["Return Request"],
      Cancelled: [],
      "Return Request": ["Returned"],
      Returned: [],
    };

    if (productId) {
      const productToUpdate = order.orderedItems.find(
        (item) => item._id.toString() === productId
      );
      if (!productToUpdate) {
        return res.render("admin/orderdetail", {
          message: MESSAGES.PRODUCT_NOT_FOUND,
          orderId: id,
        });
      }

      // Validate if status transition is allowed
      if (!statusFlow[productToUpdate.status].includes(orderStatus)) {
        return res.render("admin/orderdetail", {
          message: `Cannot change status from ${productToUpdate.status} to ${orderStatus}`,
          orderId: id,
        });
      }

      // Update the product status
      productToUpdate.status = orderStatus;
    }

    // Update overall order status based on product statuses
    const allProducts = order.orderedItems;
    if (allProducts.every((item) => item.status === "Delivered")) {
      order.status = "Delivered";
      order.deliveredDateTime = new Date();
    } else if (allProducts.some((item) => item.status === "Out for Delivery")) {
      order.status = "Out for Delivery";
    } else if (allProducts.some((item) => item.status === "Shipped")) {
      order.status = "Shipped";
    } else if (allProducts.some((item) => item.status === "Processing")) {
      order.status = "Processing";
    } else if (allProducts.some((item) => item.status === "Returned")) {
      order.status = "Returned";
    } else if (allProducts.some((item) => item.status === "Cancelled")) {
      order.status = "Cancelled";
    } else {
      order.status = "Pending";
    }

    await order.save();

    return res.render("admin/orderdetail", {
      message: MESSAGES.STATUS_UPDATED,
      orderId: id,
    });
  } catch (error) {
    
    return res.render("admin/orderdetail", {
      message: MESSAGES.FAILED_STATUS,
      orderId: req.params.id,
    });
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
      return res.status(STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.PRODUCT_NOT_FOUND });
    }

    if (productItem.status !== "Return Request") {
      return res.status(STATUS.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.RETURN_REQUEST_PENDING,
      });
    }

    //  Fetch the correct product using `productItem.productId`
    let pr = await Product.findOne({ _id: productItem.productId });
    

    if (!pr) {
      return res.status(STATUS.NOT_FOUND).json({ success: false, message: MESSAGES.PRODUCT_NOT_IN_DB});
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

    //  Update the product stock
    pr.stock += productItem.quantity;
    await pr.save();
    

    // Verify the stock is updated
    const updatedProduct = await Product.findById(pr._id);
    

    //  Update order status
    if (order.orderedItems.every((item) => item.status === "Cancelled" || item.status === "Returned")) {
      order.status = OrderStatus.RETURNED;
    } else if (order.status === OrderStatus.RETURN_REQUEST) {
      order.status = OrderStatus.DELIVERED;
    }

    await order.save();

    return res.redirect(`/admin/getorderdetails/${orderId}`);
  } catch (error) {
    
    return res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.FAILED_REQUEST });
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
        .status(STATUS.NOT_FOUND)
        .json({ success: false, message:MESSAGES.PRODUCT_NOT_FOUND });
    }

    if (productItem.status !== "Return Request") {
      return res
        .status(STATUS.BAD_REQUEST)
        .json({
          success: false,
          message: MESSAGES.RETURN_REQUEST_PENDING,
        });
    }

    productItem.status = "Delivered";
    productItem.returnDeclinedReason =
      declineReason || "Your Return request is declined";

    const allProducts = order.orderedItems;
    if (allProducts.every((item) => item.status === OrderStatus.DELIVERED)) {
      order.status = OrderStatus.DELIVERED;
    }
    // order.refundedAmount=refundAmount;
    await order.save();

    return res.redirect(`/admin/getorderdetails/${orderId}`);
  } catch (error) {
    
    return res
      .status(  STATUS.SERVER_ERROR)
      .json({ success: false, message: MESSAGES.RETURN_DECLINE_FAILED });
  }
};

module.exports = {
  listOrders,
  updateOrderStatus,
   getordedetailspage,
  updateStatus,
  approveReturnRequest,
  declineReturnRequest,
};
