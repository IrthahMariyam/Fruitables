const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const User=require("../../models/userSchema")
const Coupon=require("../../models/couponSchema")
const Wallet=require('../../models/walletSchema')
const Address=require("../../models/addressSchema")
const env=require('dotenv').config()
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');


const KeyId=process.env.KEY_ID
const SecretKey= process.env.SECRET_KEY

const razorpayInstance = new Razorpay({
 // key_id:"rzp_test_lcQt1KNawGzBhX",
 // key_secret:"RvHJxgCXgr69KRUUNv6J6WWr"
   key_id: KeyId, 
  key_secret: SecretKey 

})

const history=async (req,res) => 
    {try {
      const userId = req.session.user._id; // Get the logged-in user's ID
      const cartitem=await Cart.findOne({userId:userId})
      const orders = await Order.find({ userId })
        .populate('orderedItems.productId')
        .sort({ createdOn: -1 });
    
      res.json(orders); // Return orders as JSON
    } catch (err) {
      console.error('Error fetching order history:', err);
      res.status(500).json({ error: 'Failed to fetch order history' });
    }}
    
      const orderHistory=async(req,res)=>{
        try {
          //console.log("inside history+++++++++", req.session.user._id)
          const orders = await Order.find({ userId:req.session.user._id })
              .populate("orderedItems.productId")
              .sort({ createdOn: -1 });
              const cartitem=await Cart.findOne({userId:req.session.user._id})
              res.render("orders/history", { orders ,cart:cartitem});
      } catch (err) {
          console.error("Error fetching orders:", err);
          res.status(500).send("Internal Server Error");
      }
      }
    
    
    
      const cancelOrder=async(req,res)=>{
    
    try {
      const { id } = req.params;
      const { cancelReason, status } = req.body;
      
     // const cartitem = await Cart.findOne({userId:id})
     // Find the order
     const order = await Order.findById(id);
     if (!order) {
       return res.status(404).json({ message: "Order not found" });
     }
     if (["Shipping", "Out for Delivery", "Delivered"].includes(order.status)) {
      return res.status(400).json({ message: "Cannot cancel a shipped order." });
    }
      // Ensure the request body contains the required fields
      if (!cancelReason || !status) {
        return res.status(400).json({ message: 'Invalid request data' });
      }
      for (const item of order.orderedItems) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity }, // Increase stock by ordered quantity
        });
      }
    
      const updatedOrder = await Order.findByIdAndUpdate(id, {
        cancelReason,
        status,
      }, { new: true });
    
      if (!updatedOrder) {
        return res.status(404).json({ message: 'Order not found' });
      }
    
      res.json({ message: 'Order cancelled successfully', order: updatedOrder });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ message: 'Server error', error });
    }
    };

    const returnOrder=async(req,res)=>{
    
      try {
        const { id } = req.params;
        const { returnReason, status } = req.body;
        console.log(id,"orderid")
        console.log(returnReason, status,"retunreason and status")
        console.log("params",req.params)
        console.log("req.body",req.body)
       // const cartitem = await Cart.findOne({userId:id})
       // Find the order
       const order = await Order.findById(id);
       if (!order) {
         return res.status(404).json({ success:false,message: "Order not found" });
       }
       if (order.status!='Delivered') {
        return res.status(400).json({success:false, message: "Only delivered order can be returned." });
      }
        // Ensure the request body contains the required fields
        if (!returnReason || !status) {
          return res.status(400).json({ success:false,message: 'Invalid request data' });
        }
        // for (const item of order.orderedItems) {
        //   await Product.findByIdAndUpdate(item.productId, {
        //     $inc: { stock: item.quantity }, // Increase stock by ordered quantity
        //   });
        // }
      
        const updatedOrder = await Order.findByIdAndUpdate(id, {
          returnReason,
          status,
        }, { new: true });
      
        if (!updatedOrder) {
          return res.status(404).json({ success:false,message: 'Order not found' });
        }
      
        res.json({success:true, message: 'Return Request Send', order: updatedOrder });
      } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success:false,message: 'Server error', error });
      }
      };
    

    const getOrderDetails = async (req, res) => {
        try {
          const orderId = req.params.orderId; // Ensure `orderId` is the correct field name in your route
          if (!orderId) {
            return res.redirect('/page-404'); // Handle missing orderId
          }
          
          // Fetch the order and populate references
          const order = await Order.findById(orderId)
            .populate('orderedItems.productId')
            .sort({ createdOn: -1 });
            const cartitem=await Cart.findOne({userId:req.session.user._id})
          if (order) {
            console.log(order); // Debugging: Check the full order object
            res.render('orderDetails', { order,cart:cartitem});
          } else {
            res.redirect('/page-404'); // Handle order not found
          }
        } catch (error) {
          console.error("Error fetching order details:", error);
          return res.status(500).json({ message: 'Error updating!', error });
        }
      };


      const getCheckoutPage=async(req,res)=>{
        try {
          
       const userId = req.session.user._id; 
       //console.log(req.session,"user session")
       //console.log(userId)
       const carts = await Cart.findOne({ userId }).populate("items.productId");
      const address=await Address.find({userId})
      
      //console.log(address)
       if (!carts) {
         return res.render("checkout", { 
           captureEvents: { items: [], total: 0 }, 
           user: req.user ,
           address:address,
         });
       }
    
       let total = 0;
       carts.items.forEach(item => {
         total += item.totalPrice;
       });
    
       
       res.render("checkout", {
         carts,
         total,
         address:address,
         cart:carts.items,
       });
     } catch (error) {
       console.error("Error loading checkout page:", error);
       res.status(500).send("An error occurred while loading the checkout page.");
     }
    };




      
   const placeOrder = async (req, res) => {
   try {
  
     const {orderData}= req.body;
   console.log("orderData",orderData)
   let {cartId,address, paymentMethod,subtotal,couponCode,couponDiscount,totalPrice,orderedItems }=orderData

    if (!address) {
      return res.status(400).json({ error: "Address is required." });
    }

    if (!paymentMethod) {
      return res.status(400).json({success:false, error: "Payment method is required." });
    }

    const userId = req.session.user?._id;
   
    if(!userId)
      return res.redirect('/login')
   let user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({
            success: false,
            error: "User not found"
        });
    }
    let wallet = await Wallet.findOne({ user: userId });
  
    let cart = await Cart.findOne({ userId }).populate("items.productId");

   // console.log("=============================")
    //console.log(cart,"===================================")
    
    if (!cart || !cart.items.length) {
      return res.status(400).json({success:false, error: "No items in the cart to place an order." });
     }
    // const subtotal = cart.items.reduce((total, item) => total + (item.product.price * item.quantity), 0);

   

       let totalProductPrice = 0;
       let productItems = [];
       let product;
    
       for (const cartItem of cart.items) {
            product = await Product.findById(cartItem.productId).populate('offer');
       if (!product) {
        console.error(`Product with ID ${cartItem.productId} not found.`);
        return res.status(404).json({ error: `Product with ID ${cartItem.productId} not found.` });
      }

      let availableStock = product.stock - cartItem.quantity;
      if (availableStock < 0) {
        return res
          .status(400)
          .json({ error: `Insufficient stock for product ${product.productName}.` });
      }

      totalProductPrice += cartItem.quantity * product.price;

      
productItems.push({
        productId: product._id,
        productName:product.productName,
        productImage:product.productImage[0],
        quantity:cartItem.quantity,
        price: product.price,
        totalPrice:cartItem.totalPrice,
      });
      console.log(productItems,"productitems in placeorder.")
    }

      if (user && user.redeemedUser) {
          const coupon = await Coupon.findById(user.redeemedUser);
          if (coupon) {

             // if (!coupon.usedUsers.includes(userId)) {
              if (Array.isArray(coupon.usedUsers) && !coupon.usedUsers.includes(userId)) {
                couponDiscount = coupon.discount; 
                coupon.usedUsers.push(userId);
                  await coupon.save();
              }
              user.redeemedUser = null;
              await user.save();
          }
      }
  console.log("coupon details saved")

  
if (paymentMethod === 'RAZORPAY') {
  try {
      console.log("RAZORPAY")
      const options = {
          amount: Math.round(totalPrice * 100), 
          currency: "INR",
          receipt: 'receipt_' + new Date().getTime()
      };
      
      console.log("Rounded Amount:", options.amount);
      const razorpayOrder = await razorpayInstance.orders.create(options);
      console.log("Razorpay order created:", razorpayOrder);
      
      if(!razorpayOrder) {
          return res.status(400).json({
              success: false,
              error: "Failed to create payment order"
          });
      }

      // Create new order with Razorpay details
      const newOrder = new Order({
          orderId: 'ORD' + new Date().getTime(),
          razorpayOrderId: razorpayOrder.id,  // Store Razorpay order ID
          userId: userId,
          orderedItems: productItems,
          subtotal: subtotal,
          discount: couponDiscount,
          totalPrice: totalPrice,
          finalAmount: totalPrice,
          address: address,
          paymentMethod: paymentMethod,
          status: 'Pending',
          paymentStatus: 'pending',
          razorpayPaymentStatus: 'pending'
      });

      const savedOrder = await newOrder.save();
      console.log("Saved order:", savedOrder);

      return res.status(200).json({
          success: true,
          order: razorpayOrder  // Send Razorpay order details back
      });

  } catch (error) {
      console.error("Error creating order:", error);
      return res.status(500).json({
          success: false,
          error: error.message
      });
  }
}








if (paymentMethod === 'WALLET') {
  console.log("inside wallet");
  let wal = await handleWalletPayment(userId, cart.items, orderData);
  console.log("wal= ", wal);

  if (!wal.success) {
    return res.status(400).json({ success: false, message: wal.error });
  }

  let orderid = uuidv4();
  let order = new Order({
    orderId: orderid,
    orderedItems: productItems,
    address: orderData.address,
    subtotal,
    totalPrice,
    userId,
    status: "Processing",
    paymentMethod: orderData.paymentMethod,
  });

  await order.save();
  console.log("order", order);

  for (const cartItem of cart.items) {
    await Product.findByIdAndUpdate(
      cartItem.productId,
      { $inc: { stock: -cartItem.quantity } },
      { new: true }
    );
  }

  await Cart.findOneAndDelete({ userId });

  res.status(200).json({
    success: true,
    message: "Order placed successfully.",
    orderId: orderid,
    order,
  });
}



if (paymentMethod === 'COD') {
  console.log("inside COD")
  const orderid=uuidv4()
  let order = new Order({
    orderId:orderid,
    orderedItems: productItems,
    address,
    totalPrice: subtotal,
    finalAmount:totalPrice,
    discount: couponDiscount,
    userId,
    status: "Processing",
    paymentMethod,
  });

await order.save();
    console.log("order",order)

    // Update product stock
    for (const cartItem of cart.items) {
      await Product.findByIdAndUpdate(
        cartItem.productId,
        { $inc: { stock: -cartItem.quantity } },
        { new: true }
      );
    }

    // Clear the cart for the user
    await Cart.findOneAndDelete({ userId });

   return res.status(200).json({
      success: true,
      message: "Order placed successfully.",
      orderId:orderid,
      order,
    });

}} catch (error) {
    console.log("Error in createOrder:", error);
    res.status(500).json({success:false, error: error.message });
}
};

const handleWalletPayment = async (userId, cartItems, orderData) => {
  try {
    console.log("inside handlde odedata",orderData)
    const wallet = await Wallet.findOne({ userId: userId });
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0, transactions: [] });
      await wallet.save();
    }
    let amount = parseFloat(orderData.totalPrice);
    console.log("Wallet Balance:", wallet?.balance);
        console.log("Order Total Price:", amount);


    if (!wallet || wallet.balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

      wallet.transactions.push({
        amount: amount,
        transactionType: 'debit',
        description: 'Order payment',
       
        reason: 'Shopping',
        
      });

    
wallet.balance=parseFloat(wallet.balance)-parseFloat(amount);
   
    
  
    await wallet.save();
    
    
    return { success: true };
  } catch (error) {
    console.log("Internal Server Error:", error);
    return { success: false, error: error.message };
  }
};




const handleRefund = async (userId, amount, productNames, orderId) => {
  try {
      let wallet = await Wallet.findOne({ user: userId });
      
      if (!wallet) {
          wallet = new Wallet({
              user: userId,
              balance: 0,
              transaction: []
          });
      }

      const transactionId = uuidv4();
      wallet.transactions.push({
          amount: amount,
          transactionId: transactionId,
          productName: productNames,
          type: 'credit',
          createdAt: new Date()
      });

      wallet.balance += amount;
      await wallet.save();

      return { success: true, transactionId: transactionId };
  } catch (error) {
      console.error('Wallet refund error:', error);
      throw error;
  }
};
//


const cancelProductOrder = async (req, res) => {
  try {
      const { productId, orderId, cancellationReason  } = req.body;
      const userId = req.session.user;

      if (!productId || !orderId) {
          return res.status(400).json({ success: false, message: "Order ID and Product ID are required." });
      }

  
      const order = await Order.findById(orderId);

      if (!order) {
          return res.status(404).json({ success: false, message: "Order not found." });
      }

      const productItem = order.orderedItems.find(item => item.product.toString() === productId);

      if (!productItem) {
          return res.status(404).json({ success: false, message: "Product not found in the order." });
      }

      if (productItem.status === 'Cancelled') {
          return res.status(400).json({ success: false, message: "Product is already canceled." });
      }

      const refundAmount = productItem.price * productItem.quantity;

       const product = await Product.findById(productId);
       if (!product) {
           return res.status(404).json({ success: false, message: "Product not found." });
       }
       let refundResult = null;
     if(order.paymentMethod !== 'COD'){
       refundResult = await handleRefund(
          userId,
          refundAmount,
          [product.name],
          orderId
      );
     }
      
      productItem.status = 'Cancelled';
      productItem.cancellationReason = cancellationReason;

     
      const selectedSize = `size${productItem.size}`; 
      if (product.size && product.size[selectedSize] !== undefined) {
          product.size[selectedSize] += productItem.quantity; 
          product.quantity += productItem.quantity;
          await product.save();
      }

      const allProducts = order.orderedItems;
      if (allProducts.every(item => item.status === "Delivered")) {
          order.status = "Delivered";
      } else if (allProducts.some(item => item.status === "Shipped")) {
          order.status = "Shipped";
      } else if (allProducts.some(item => item.status === "Processing")) {
          order.status = "Processing";
      } else if (allProducts.every(item => item.status === "Cancelled")) {
          order.status = "Cancelled";
      } else if (allProducts.some(item => item.status === "Returned")) {
          order.status = "Returned";
      } else {
          order.status = "Pending";
      }

      await order.save();

      const response = {
          success: true,
          message: order.paymentMethod === 'COD' 
              ? "Product canceled successfully. No refund processed for Cash on Delivery orders."
              : "Product canceled successfully and refund processed to wallet.",
          order
      };

      if (refundResult) {
          response.refundTransactionId = refundResult.transactionId;
      }
      return res.status(200).json(response);


  } catch (error) {
      console.error("Error while canceling the product:", error);
      return res.status(500).json({ success: false, message: "An error occurred while canceling the product." });
  }
};

const returnProductOrder = async (req, res) => {
  try {
      const { productId, orderId, returnReason } = req.body;
      const userId = req.session.user;

      if (!productId || !orderId || !returnReason) {
          return res.status(400).json({ 
              success: false, 
              message: "Order ID, Product ID, and return reason are required." 
          });
      }

      const order = await Order.findById(orderId);

      if (!order) {
          return res.status(404).json({ 
              success: false, 
              message: "Order not found." 
          });
      }

      const productItem = order.orderedItems.find(item => 
          item.productId.toString() === productId
      );

      if (!productItem) {
          return res.status(404).json({ 
              success: false, 
              message: "Product not found in the order." 
          });
      }

      // Check if product is eligible for return
      if (productItem.status !== 'Delivered') {
          return res.status(400).json({ 
              success: false, 
              message: "Only delivered products can be returned." 
          });
      }

      if (productItem.status === 'Return Request') {
          return res.status(400).json({ 
              success: false, 
              message: "Return request already submitted for this product." 
          });
      }

      if (productItem.status === 'Returned') {
          return res.status(400).json({ 
              success: false, 
              message: "Product is already returned." 
          });
      }
      if (['Return Request', 'Returned'].includes(productItem.status)) {
          return res.status(400).json({ 
              success: false, 
              message: `Product is already in ${productItem.status} status.` 
          });
      }


      // Update product item status to Return Request
      productItem.status = 'Return Request';
      productItem.returnReason = returnReason;
      productItem.returnRequestDate = new Date();

      const statusCounts = order.orderedItems.reduce((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
      }, {});

      // Update order status based on all products
      if (statusCounts['Processing'] > 0) {
          order.status = 'Processing';
      } else if (statusCounts['Shipped'] > 0) {
          order.status = 'Shipped';
      } else if (statusCounts['Return Request'] > 0 && statusCounts['Delivered'] > 0) {
          order.status = 'Partially Returned';
      } else if (statusCounts['Return Request'] === order.orderedItems.length) {
          order.status = 'Return Request';
      } else if (statusCounts['Returned'] === order.orderedItems.length) {
          order.status = 'Returned';
      } else if (statusCounts['Delivered'] === order.orderedItems.length) {
          order.status = 'Delivered';
      }

      await order.save();

      return res.status(200).json({ 
          success: true, 
          message: "Return request submitted successfully. Please wait for admin approval.", 
          order 
      });
  } catch (error) {
      console.error("Error while submitting return request:", error);
      return res.status(500).json({ 
          success: false, 
          message: "An error occurred while submitting the return request." 
      });
  }
};

const verifyPayment = async (req, res) => {
  try {
      const { paymentData, cartId } = req.body;
      console.log("Verifying payment with data:", paymentData);

      // Find Order using razorpayOrderId
      const order = await Order.findOne({ 
          razorpayOrderId: paymentData.razorpay_order_id 
      });

      if (!order) {
          console.error("Order not found for Razorpay ID:", paymentData.razorpay_order_id);
          return res.status(400).json({ 
              success: false, 
              message: "Order not found!" 
          });
      }

      // Rest of your verification logic...
      const hmac = crypto.createHmac("sha256", process.env.SECRET_KEY);
      hmac.update(paymentData.razorpay_order_id + "|" + paymentData.razorpay_payment_id);
      const generatedSignature = hmac.digest("hex");

      if (generatedSignature === paymentData.razorpay_signature) {
          order.status = "Processing";  // Changed from 'Ordered' to match your enum
          order.paymentStatus = "Paid";
          order.razorpayPaymentStatus = "Paid";
          order.razorpayPaymentId = paymentData.razorpay_payment_id;
          await order.save();


          for (const item of order.orderedItems) {
            const product = await Product.findById(item.productId);
            if (product) {
                product.quantity -= item.quantity;
                await product.save();
            }
        }

          // Delete Cart *AFTER SUCCESSFUL PAYMENT*
          await Cart.findByIdAndDelete(cartId);

          res.json({ success: true, message: "Payment verified and order placed!", orderId: order.orderId });
      } else {
        order.status = "Pending";
        order.paymentStatus = "pending";
        order.razorpayPaymentStatus = "pending";


        await order.save();
        await Cart.findByIdAndDelete(cartId);
        console.log("final ordeId", order.orderId)
          res.json({ 
              success: true, 
              message: "Payment verified and order placed!", 
              orderId: order.orderId 
          });
      }
  } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ 
          success: false, 
          message: "Error verifying payment" 
      });
  }
};
////////////////////////////////////////////////////////////
    module.exports={

        orderHistory,
        cancelOrder,
        returnOrder,
        history,
        getOrderDetails,
        placeOrder,
        verifyPayment,
        getCheckoutPage,
       // createOrder,
        

    }
   