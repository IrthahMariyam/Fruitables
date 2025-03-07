
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
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
const PDFDocument = require('pdfkit');
const axios = require('axios');


const KeyId=process.env.KEY_ID
const SecretKey= process.env.SECRET_KEY

const razorpayInstance = new Razorpay({
 // key_id:"rzp_test_lcQt1KNawGzBhX",
 // key_secret:"RvHJxgCXgr69KRUUNv6J6WWr"
   key_id: KeyId, 
  key_secret: SecretKey 

})

const history=async (req,res) => 
    {try {console.log('history111=========================================================================')
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
        try {console.log('orderHistory11111=========================================================================')
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
    
    const cancelOrder = async (req, res) => {
      try {console.log('cancelOrder11111=========================================================================')
        const { id } = req.params;
        const { 
          cancellationReason, status } = req.body;
        const userId = req.session.user?._id;
        console.log(userId,"userid")
    console.log("req",req.params)

        // Find the order
        const order = await Order.findById(id);

        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }
    console.log(order,"order=============")
        // Prevent canceling a shipped order
        if (["Shipping", "Out for Delivery", "Delivered"].includes(order.status)) {
          return res.status(400).json({ message: "Cannot cancel a shipped order." });
        }
    
        // Ensure required fields exist
        if (!
          cancellationReason || !status) {
          return res.status(400).json({ message: "Invalid request data" });
        }
    
        // Refund to wallet if paid via Razorpay or Wallet
        let walletRefundSuccess = false;
    
        if (order.paymentMethod === "RAZORPAY" || order.paymentMethod === "WALLET") {
          console.log("inside cancel==wallet")
          let wallet = await Wallet.findOne({ userId:userId });
          if (!wallet) {
            wallet = new Wallet({ userId, balance: 0, transactions: [] });
            await wallet.save();
          }
    
        
          const amount = order.finalAmount;
          console.log("orderid",order._id)
          // Add money to wallet
          wallet.balance += Number(amount);
          wallet.transactions.push({
            amount: Number(amount),
            transactionType: "credit",
            description: `Money credited for order cancellation (Order ID: ${order._id})`,
            productId: null,
            reason: "Order Cancellation",
            date: new Date(),
            
          });
    
          await wallet.save();
          
       walletRefundSuccess = true;
         console.log("success")
        }
    
        // Restore stock
        for (const item of order.orderedItems) {
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.quantity }, // Increase stock by ordered quantity
          });
        }
    
        // Update order status
        const updatedOrder = await Order.findByIdAndUpdate(
          id,
          { cancelReason, status ,refundedAmount:amount},
          { new: true }
        );
    
        if (!updatedOrder) {
          return res.status(404).json({ message: "Order not found" });
        }
    
        //  Send only ONE response
        res.json({
          message: "Order cancelled successfully",
          order: updatedOrder,
          walletUpdated: walletRefundSuccess,
        });
      } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).json({ message: "Server error", error });
      }
    };
    const returnOrder=async(req,res)=>{
    
      try {console.log('returnOrder11111=========================================================================')
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
        try {console.log('getOrderDetails1111=========================================================================')
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
        try {console.log('getCheckoutPage11111=========================================================================')
          
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
    console.log('placeOrder11111=========================================================================')
     const {orderData}= req.body;
   console.log("orderData",orderData)
   let {cartId,address, paymentMethod,subtotal,couponCode,couponDiscount,totalPrice,orderedItems }=orderData

    if (!address) {
      return res.status(400).json({ error: "Address is required." });
    }

    if (!paymentMethod) {
      return res.status(400).json({success:false, error: "Payment method is required." });
    }
if(paymentMethod=="COD" && orderData.finalAmount>1000)
  return res.status(400).json({success:false, error: "Payment above 1000 is not allowed for Cash On Delivery" });
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

   

       let totalProductPrice = 0,offer=0;
       let productItems = [];
       let product,cat;
    
       for (const cartItem of cart.items) {
            product = await Product.findById(cartItem.productId).populate('offer');
       if (!product) {
        console.error(`Product with ID ${cartItem.productId} not found.`);
        return res.status(404).json({ error: `Product with ID ${cartItem.productId} not found.` });
      }
      cat=await Category.findById(product.category)
      if(cat){
        if(product.productOffer>cat.categoryOffer)
        offer=product.productOffer
        else
        offer=cat.categoryOffer
      }
      else
      offer=product.productOffer

      let availableStock = product.stock - cartItem.quantity;
      if (availableStock < 0) {
        return res
          .status(400)
          .json({ error: `Insufficient stock for product ${product.productName}.` });
      }
let productTotal=cartItem.quantity * product.salesPrice;
      totalProductPrice += productTotal

      
productItems.push({
        productId: product._id,
        productName:product.productName,
        productImage:product.productImage[0],
        quantity:cartItem.quantity,
        discountApplied:offer,
        price: product.salesPrice,
        totalPrice:productTotal,
        status:"Processing"
      //  totalPrice:cartItem.totalPrice,
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

  req.session.order=orderData;
if (paymentMethod === 'RAZORPAY') {
  try {
      console.log("RAZORPAY")
      console.log("orderData.totalPrice",orderData.finalAmount)
      
      const options = {
          amount: Math.round(orderData.finalAmount * 100), 
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
let deliveryCharge=0;
if(parseInt(subtotal)<1000)
  {deliveryCharge=50;}

      // Create new order with Razorpay details
      const newOrder = new Order({
          orderId: 'ORD' + new Date().getTime(),
          razorpayOrderId: razorpayOrder.id,  // Store Razorpay order ID

          userId: userId,
          orderedItems: productItems,
          subtotal: subtotal,
          deliveryCharge:deliveryCharge,
          discount: couponDiscount,
      
        
    finalAmount:orderData.finalAmount,
          address: address,
          couponCode:couponCode,
          paymentMethod: paymentMethod,
          status: 'Processing',
          paymentStatus: 'Pending',
          razorpayPaymentStatus: 'Pending'
      });

      const savedOrder = await newOrder.save();
      console.log("Saved order:", savedOrder);

      for (const cartItem of cart.items) {
        await Product.findByIdAndUpdate(
          cartItem.productId,
          { $inc: { stock: -cartItem.quantity } },
          { new: true }
        );
      }
  await Cart.findOneAndDelete({ userId });
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
  let deliveryCharge=0;
  if(parseInt(orderData.subtotal)<1000)
    {deliveryCharge=50;}
 
  let orderid = "WAL"+uuidv4();
  let order = new Order({
    orderId: orderid,
    orderedItems: productItems,
    discount: couponDiscount,
    address: address,
    subtotal:orderData.subtotal,
    finalAmount:orderData.finalAmount,
    deliveryCharge:deliveryCharge,
    userId,
    couponCode:couponCode,
    status: 'Processing',
    paymentStatus: 'Paid',
    paymentMethod:paymentMethod,
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
  const orderid="COD"+uuidv4()
  let deliveryCharge=0;
if(parseInt(orderData.subtotal)<1000)
  {deliveryCharge=50;}

  let order = new Order({
    orderId:orderid,
    orderedItems: productItems,
    address,
    subtotal:orderData.subtotal,
    deliveryCharge:deliveryCharge,
    finalAmount:orderData.finalAmount,
    couponCode:couponCode,
    discount: couponDiscount,
    userId,
    status: 'Processing',
    paymentStatus: 'pending',
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

}


} catch (error) {
    console.log("Error in createOrder:", error);
    res.status(500).json({success:false, error: error.message });
}
};

const handleWalletPayment = async (userId, cartItems, orderData) => {
  try {
    console.log("inside handlde odedata",orderData)
    let wallet = await Wallet.findOne({ userId: userId });
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0, transactions: [] });
      await wallet.save();
    }
    let amount = parseFloat(orderData.finalAmount);
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
    console.log(userId,"pppppppppppppppppppppppppppppppppp")
      let wallet = await Wallet.findOne({ userId: userId._id });
      
      if (!wallet) {
          wallet = new Wallet({
              userId: userId,
              balance: 0,
              transaction: []
          });
      }

      const transactionId = "WAL"+uuidv4();
      wallet.balance += Number(amount);
      wallet.transactions.push({
          amount: amount,
          transactionId: transactionId,
          transactionType: "credit",
          description: `Money credited for order cancellation (Order ID: ${orderId})`,
          productId: productNames,
          reason: "Order Cancellation",
         date: new Date(),
      });

     
      await wallet.save();

      return { success: true, transactionId: transactionId };
  } catch (error) {
      console.error('Wallet refund error:', error);
      throw error;
  }
};

const verifyPayment = async (req, res) => {
  try {console.log('verifyPayment11111=========================================================================')
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
        

      // res.render('paymentFailedPage',{ success: false, message: "Payment verification failed.",redirect:"/failedPayment" });
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

const generateInvoice=async (req,res)=> {
  try {console.log('/generateInvoice1111=========================================================================')
      const orderId = req.params.orderId;

      const order = await Order.findById(orderId)
          .populate({
              path: 'orderedItems.productId',
              select: 'productName price'
          });

      if (!order) {
          return res.status(404).json({
              success: false,
              message: 'Order not found'
          });
      }

      const doc = new PDFDocument({
          margin: 50,
          size: 'A4'
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.orderId}.pdf`);
      doc.pipe(res);

      doc.fontSize(20)
          .text('Fruitables', { align: 'center' })
          .moveDown()
          .fontSize(16)
          .text('INVOICE', { align: 'center' })
          .moveDown();

      doc.fontSize(10)
          .text(`Order ID: ${order.orderId}`, { align: 'right' })
          .text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' })
          .moveDown();

      doc.fontSize(10)
          .text('SHIPPING ADDRESS:', { underline: true })
          .text(order.address?.name)
          .text(order.address?.landmark)
          .text(order.address?.district)
          .text(order.address?.state)
          .text(order.address?.pincode)
          .text(order.address?.phone)
          .moveDown();

      const tableTop = doc.y + 10;
      const tableHeaders = ['Product', 'Qty', 'Price', 'Total','Status'];
      const columnWidths = [240, 60, 60, 80, 80];
      let xPosition = 50;

      doc.fillColor('#f0f0f0')
          .rect(xPosition, tableTop, 520, 20)
          .fill();

      doc.fillColor('#000000');
      tableHeaders.forEach((header, i) => {
          doc.text(header, xPosition, tableTop + 5, {
              width: columnWidths[i],
              align: i === 0 ? 'left' : 'right'
          });
          xPosition += columnWidths[i];
      });

      let y = tableTop + 25;
      if (Array.isArray(order.orderedItems)) {
          order.orderedItems.forEach((item, index) => {
              const price = Number(item.price) || 0;
              const quantity = Number(item.quantity) || 0;
              const total = price * quantity;
const status=item.status;
              if (index % 2 === 1) {
                  doc.fillColor('#f9f9f9')
                      .rect(50, y - 5, 520, 20)
                      .fill();
                  doc.fillColor('#000000');
              }

              xPosition = 50;
                doc.text(item.productName || '', xPosition, y, { width: columnWidths[0] });
                xPosition += columnWidths[0];

                doc.text(quantity || '', xPosition, y, { width: columnWidths[1], align: 'right' });
                xPosition += columnWidths[1];

                doc.text(price.toString(), xPosition, y, { width: columnWidths[2], align: 'right' });
                xPosition += columnWidths[2];

                doc.text(total.toString(), xPosition, y, { width: columnWidths[3], align: 'right' });
                xPosition += columnWidths[3];

                doc.text(status||" ", xPosition, y, { width: columnWidths[4], align: 'right' });

                y += 20;
          });
      }

      doc.moveTo(50, y)
          .lineTo(570, y)
          .stroke();

      y += 20;
      const summaryX = 300;
      const totalPrice = Number(order.subtotal) || 0;
      const discount = Number(order.discount) || 0;
      const shipping = Number(order.deliveryCharge) || 0;
      const finalAmount = Number(order.finalAmount) || 0;
      console.log('Invoice Values:', {
          totalPrice,
          discount,
          shipping,
          finalAmount,
          rawShipping: order.deliveryCharge
      });

doc.text('Subtotal', summaryX, y)
            .text(totalPrice.toString(), summaryX + 100, y, { align: 'right' });

        if (discount > 0) {
            y += 20;
            doc.text('Discount', summaryX, y)
                .text(`${discount.toString()}`, summaryX + 100, y, { align: 'right' });
        }

        y += 20;
        doc.text('Shipping', summaryX, y)
            .text(shipping.toString(), summaryX + 100, y, { align: 'right' });

        y += 20;
        doc.fontSize(12)
            .text('Grand Total', summaryX, y, { bold: true })
            .text(finalAmount.toString(), summaryX + 100, y, { align: 'right', bold: true });

        doc.fontSize(10)
            .text('        Thank you for shopping with Fruitables!', {
                align: 'center',
                y: 700
            });

      doc.end();

  } catch (error) {
      console.error('Error generating invoice:', error);
      res.status(500).json({
          success: false,
          message: 'Failed to generate invoice'
      });
  }
};
/////////////////////=====================================
const cancelProductOrder = async (req, res) => {
  try {console.log('cancelProductOrder1111=========================================================================')
      const { productId, orderId, cancellationReason } = req.body;
      console.log("req.body in order cancellation",req.body)
      const userId = req.session.user?._id;

      if (!productId || !orderId) {
          return res.status(400).json({ success: false, message: "Order ID and Product ID are required." });
      }

      const order = await Order.findById(orderId);

      if (!order) {
          return res.status(404).json({ success: false, message: "Order not found." });
      }

      const itemIndex = req.body.itemIndex;
      console.log("req.body.itemIndex",req.body.itemIndex)
      let productItem;

      if (itemIndex !== undefined) {
          productItem = order.orderedItems[itemIndex];
      } else {
          productItem = order.orderedItems.find(item =>
              item.productId.toString() === productId && item.status !== 'Cancelled'
          );
          console.log("productItem",productItem)
      }

      if (!productItem) {
          return res.status(404).json({ success: false, message: "Product not found in the order or already cancelled." });
      }

      if (productItem.status === 'Cancelled') {
          return res.status(400).json({ success: false, message: "Product is already canceled." });
      }
      const remainingCount = order.orderedItems.filter(item => item.status !== 'Cancelled').length;

      const itemAmount = productItem.price * productItem.quantity;
      console.log("itemAmount", itemAmount);
      
      const remainingItems = order.orderedItems.filter(item => 
          item.status !== 'Cancelled' && 
          !(item.productId.toString() === productItem.productId.toString() && 
            item._id.toString() === productItem._id.toString())
      );
      console.log("remainingItems", remainingItems);
      
      const remainingSubtotal = remainingItems.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0
      );
      console.log("remainingSubtotal", remainingSubtotal);
      
      // Ensure remainingCount is not zero before dividing
      let coupondis = remainingCount > 0 ? Math.round(order.discount / remainingCount) : 0;
      let refundAmount = itemAmount - coupondis;
      
      order.discount = Math.max(order.discount - coupondis, 0); // Prevent negative discount
      order.subtotal = remainingSubtotal;
      
      if (order.subtotal < 1000 && order.subtotal > 0) {
          order.deliveryCharge = 50;
      } else {
          order.deliveryCharge = 0;
      }
      
      if (order.subtotal === 0) {
          order.discount = 0;
          order.finalAmount = 0;
      } else {
          order.finalAmount = Math.max((order.finalAmount || 0) - refundAmount, 0); // Prevent NaN & negative finalAmount
      }
      
      console.log("Updated Order:", {
          subtotal: order.subtotal,
          discount: order.discount,
          finalAmount: order.finalAmount,
          deliveryCharge: order.deliveryCharge
      });
      



      let refundResult = null;
      if (order.paymentMethod !== 'COD' && refundAmount > 0) {
          refundResult = await handleRefund(
              userId,
              refundAmount,
              [productItem._id || 'Canceled Product'],
              orderId
          );
      }

      productItem.status = 'Cancelled';
      productItem.cancelReason = cancellationReason;

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

      let message;
      if (order.paymentMethod === 'COD') {
          message = "Product canceled successfully. No refund processed for Cash on Delivery orders.";
      } else if (refundAmount <= 0) {
          message = "Product canceled successfully. No refund processed as the coupon discount exceeded the item value.";
      } else {
          message = `Product canceled successfully`
      }

      const response = {
          success: true,
          message: message,
          order: {
              id: order._id,
              orderId: order.orderId,
              status: order.status
          }
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
  try {console.log('returnProductOrder1111=========================================================================')
      const { productId, orderId, returnReason } = req.body;
      console.log(req.body,"req.body")
      const userId = req.session.user?._id;

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

      if (productItem.status !== 'Delivered') {
          return res.status(400).json({
              success: false,
              message: "Only delivered products can be returned."
          });
      }
      const deliveryDate = productItem.deliveredDateTime 
      if(!deliveryDate){
          return res.status(400).json({
              success:false,
              message:"Delivery date not found for this product."
          })
      }
// Calculate the time elapsed since delivery in hours
const timeSinceDelivery = (new Date() - new Date(deliveryDate)) / (1000 * 60 * 60);

// Check if the return window has expired (2 hours limit)
if (timeSinceDelivery > 2) {
    return res.status(400).json({
        success: false,
        message: "Return window has expired. Products can only be returned within 2 hours of delivery."
    });
}
      // const daysSinceDelivery = Math.floor((new Date() - new Date(deliveryDate)) / (1000 * 60 * 60 * 24));
      // if (daysSinceDelivery > 7) {
      //     return res.status(400).json({
      //         success: false,
      //         message: "Return window has expired. Products can only be returned within 7 days of delivery."
      //     });
      // }

      
      if (['Return Request', 'Returned'].includes(productItem.status)) {
          return res.status(400).json({
              success: false,
              message: `Product is already in ${productItem.status} status.`
          });
      }


      productItem.status = 'Return Request';
      productItem.returnReason = returnReason;
      productItem.returnRequestDate = new Date();

      const statusCounts = order.orderedItems.reduce((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
      }, {});

      if (statusCounts['Processing'] > 0) {
          order.status = 'Processing';
      } else if (statusCounts['Shipped'] > 0) {
          order.status = 'Shipped';
      } else if (statusCounts['Return Request'] > 0 && statusCounts['Delivered'] > 0) {
          order.status = 'Return Request';
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
//payment failed
const handleFailedPayment = async (req, res) => {
  try {console.log('handleFailedPayment1111=========================================================================')
      const { orderId } = req.params;
      console.log("Received orderId:", orderId);

      const userId = req.session.user?._id;

      if (!orderId) {
          return res.render('payment-failed', {
              orderId: 'N/A',
              totalAmount: 0,
              paymentMethod: 'N/A',
              id: 'N/A',
              error: 'Order ID is required'
          });
      }

      let order = await Order.findOne({
          orderId: orderId,
          userId: userId
      }).populate('orderedItems.productId');

      const orderDetails = req.session.orderDetails;

      let finalAmount = 0;
      let paymentMethod = 'N/A';
      let id = userId;

      if (order) {
          finalAmount = order.finalAmount;
          paymentMethod = order.paymentMethod;
          id = order._id;

          if (order.paymentStatus === 'Paid') {
              
              return res.redirect('/shop');
          } else if (order.status !== 'Failed') {
              order.status = 'Failed';
              await order.save();
          }
      } else if (orderDetails && orderDetails.orderId === orderId) {
          const orderedItems = orderDetails.cartItems.map(item => {
              // const variantId = item.variantId && (
              //     typeof item.variantId === 'object' && item.variantId._id 
              //         ? item.variantId._id 
              //         : (typeof item.variantId === 'string' || item.variantId instanceof mongoose.Types.ObjectId 
              //             ? item.variantId 
              //             : null)
              // );
              
              // if (!variantId) {
              //     console.error('Invalid cart item:', item);
              //     throw new Error(`Variant ID missing or invalid for product ${item.productId?.productName || 'unknown'}`);
              // }

              return {
                  product: item.productId,
             
                  productName: item.productName,
                  quantity: item.quantity,
                  price: item.price,
                  paymentStatus: 'Failed'
              };
          });

          order = new Order({
              orderId: orderDetails.orderId,
              userId: userId,
              orderedItems: orderedItems,
              totalPrice: orderDetails.subtotal,
              discount: orderDetails.discount,
              shipping: orderDetails.shipping,
              tax: orderDetails.tax,
              finalAmount: orderDetails.finalAmount,
              shippingAddress: orderDetails.shippingAddress,
              address: orderDetails.address,
              status: 'failed',
              paymentMethod: 'RAZORPAY',
              paymentStatus: 'failed',
              createOn: orderDetails.createOn || new Date()
          });
          await order.save();

          finalAmount = orderDetails.finalAmount;
          paymentMethod = 'RAZORPAY';
          id = orderDetails.orderId;
      } else {
          return res.render('payment-failed', {
              orderId: orderId,
              totalAmount: 0,
              paymentMethod: 'N/A',
              id: 'N/A',
              error: 'Order not found'
          });
      }

      delete req.session.orderDetails;
      res.render('payment-failed', {
          orderId: orderId,
          totalAmount: finalAmount,
          paymentMethod: paymentMethod,
          id: id,
          error: req.query.error || 'Your payment was not successful. You can try again or choose a different payment method.'
      });

  } catch (error) {
      console.error('Error handling failed payment:', error);
      delete req.session.orderDetails;
      res.render('payment-failed', {
          orderId: req.params.orderId || 'N/A',
          totalAmount: 0,
          paymentMethod: 'N/A',
          id: 'N/A',
          error: 'An unexpected error occurred while processing your payment: ' + error.message
      });
  }
};


const getOrder = async (req, res) => {
  try {console.log('getOrder1111=========================================================================')
      const { orderId } = req.body;
      console.log(orderId,'hjjj');
      
      const order = await Order.findOne({ orderId:orderId, paymentStatus: "Pending" })
      .populate("orderedItems.productId")
            .populate("userId"); 
            console.log('ppp',order);
            

      if (!order) {
          return res.status(404).json({ success: false, message: "Order not found or already paid" });
      }

      for (const item of order.orderedItems) {
        if (item.productId.stock < item.quantity) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient stock for ${item.productName}. Available: ${item.productId.quantity}, Ordered: ${item.quantity}` 
            });
        }
    }

      res.json({
          id: order.razorpayOrderId,
          amount: order.finalAmount * 100,
          user:{
            name:order.userId.name,
            email:order.userId.email,
            contact:order.userId.phone
          }
      });

      
  } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).json({ success: false, message: "Server error" });
  }
};


const loadFailedPaymentPage = async (req,res)=>{
    try {console.log('loadFailedPaymentPage1111=========================================================================')
      res.render('paymentFailedPage')
      
    } catch (error) {
      console.error(error)
      res.redirect('/pageNotFound')
    }
  }

module.exports={

        orderHistory,
                cancelOrder,
               returnOrder,
        history,
        getOrderDetails,
        placeOrder,
        verifyPayment,
        getCheckoutPage,
        generateInvoice,
        cancelProductOrder,
        returnProductOrder,
        handleFailedPayment,
        loadFailedPaymentPage,
        getOrder,

    }
  