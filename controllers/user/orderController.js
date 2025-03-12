
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

   key_id: KeyId, 
  key_secret: SecretKey 

})


    
    const cancelOrder = async (req, res) => {
      try {
       
        const { id } = req.params;
        const { 
          cancelReason, status } = req.body;
          
        const userId = req.session.user?._id;
        
        // Find the order
        const order = await Order.findById(id);

        if (!order) {
          res.redirect("/pageNotFound");
        }
    

    const amount = order.finalAmount;
        // Prevent canceling a shipped order
        if (["Shipping", "Out for Delivery", "Delivered"].includes(order.status)) {
        
          return res.status(400).json({success:false, message: "Cannot cancel a shipped order." });
        }
    
        if (!cancelReason || !status) {
        
          return res.status(400).json({success:false, message: "Invalid request data"});
        }
    
        // Refund to wallet if paid via Razorpay or Wallet
        let walletRefundSuccess = false;
    
        if (order.paymentMethod === "RAZORPAY" || order.paymentMethod === "WALLET") {
         
          let wallet = await Wallet.findOne({ userId:userId });
          if (!wallet) {
            wallet = new Wallet({ userId, balance: 0, transactions: [] });
            await wallet.save();
          }
           
        
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
        
        }
    
        // Restore stock
        for (const item of order.orderedItems) {
          if(item.status!='Cancelled'){
          await Product.findByIdAndUpdate(item.productId, {
            $inc: { stock: item.quantity }, // Increase stock by ordered quantity
          });
        }}
    
        // Update order status
        for (const item of order.orderedItems) {
          if (item.status !== 'Cancelled') {
              item.status = status;
          }
      }
      
          order.markModified("orderedItems");
      
      order.cancelReason = cancelReason;
      order.status = status;
      order.refundedAmount = amount;
      
      
 const updatedOrder=  await order.save();
    
        if (!updatedOrder) {
          return res.status(404).json({ success:false,message: "Order not found" });
        }
    
        //  Send only ONE response
        res.json({success:true,
          message: "Order cancelled successfully",
          order: updatedOrder,
          walletUpdated: walletRefundSuccess,
        });
      } catch (error) {
        
        res.redirect("/pageNotFound");
      }
    };
    const returnOrder=async(req,res)=>{
    
      try {
        const { id } = req.params;
        const { returnReason, status } = req.body;
       
       // Find the order
       const order = await Order.findById(id);
       if (!order) {
        res.redirect("/pageNotFound");
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
          
              const user = req.session.user
               if(!user)
                 res.redirect('/login')
              
                 const userData = await User.findOne({_id: user._id });
                 const cartitem=await Cart.findOne({userId:user._id})
                             
       const carts = await Cart.findOne({userId:user._id}).populate("items.productId");
      const address=await Address.find({userId:user._id})
     
       if (!carts) {
         return res.render("checkout", { 
           captureEvents: { items: [], total: 0 }, 
           user: userData ,
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
         user: userData ,
         address:address,
         cart:cartitem,
         
       });
     } catch (error) {
       
       res.status(500).send("An error occurred while loading the checkout page.");
     }
    };




      
   const placeOrder = async (req, res) => {
   try {
   
     const {orderData}= req.body;
  
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

  
    
    if (!cart || !cart.items.length) {
      return res.status(400).json({success:false, error: "No items in the cart to place an order." });
     }
    
       let totalProductPrice = 0,offer=0;
       let productItems = [];
       let product,cat;
    
       for (const cartItem of cart.items) {
            product = await Product.findById(cartItem.productId).populate('offer');
       if (!product) {
        
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
      
      });
      
    }

      if (user && user.redeemedUser) {
          const coupon = await Coupon.findById(user.redeemedUser);
          if (coupon) {

             
              if (Array.isArray(coupon.usedUsers) && !coupon.usedUsers.includes(userId)) {
                couponDiscount = coupon.discount; 
                coupon.usedUsers.push(userId);
                  await coupon.save();
              }
              user.redeemedUser = null;
              await user.save();
          }
      }
  

  req.session.order=orderData;
if (paymentMethod === 'RAZORPAY') {
  try {
            
      const options = {
          amount: Math.round(orderData.finalAmount * 100), 
          currency: "INR",
          receipt: 'receipt_' + new Date().getTime()
      };
      
      const razorpayOrder = await razorpayInstance.orders.create(options);
      
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
      
      return res.status(500).json({
          success: false,
          error: error.message
      });
  }
}

if (paymentMethod === 'WALLET') {
  let wal = await handleWalletPayment(userId, cart.items, orderData);
  

  if (!wal.success) {
    return res.status(400).json({ success: false, message: wal.error });
  }
  let deliveryCharge=0;
  if(parseInt(orderData.subtotal)<1000)
    {deliveryCharge=50;}
 
  let orderid = "WAL"+new Date().getTime()
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
  
  const orderid="COD"+new Date().getTime()
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
    paymentStatus: 'Pending',
    paymentMethod,
  });
await order.save();
    

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
  res.redirect("/pageNotFound");
}
};

const handleWalletPayment = async (userId, cartItems, orderData) => {
  try {
    
    let wallet = await Wallet.findOne({ userId: userId });
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0, transactions: [] });
      await wallet.save();
    }
    let amount = parseFloat(orderData.finalAmount);
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
    
    res.redirect("/pageNotFound");
   }
};




const handleRefund = async (userId, amount, productNames, orderId) => {
  try {
    
      let wallet = await Wallet.findOne({ userId: userId._id });
      
      if (!wallet) {
          wallet = new Wallet({
              userId: userId,
              balance: 0,
              transaction: []
          });
      }

      const transactionId = "WAL"+new Date().getTime()
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
    res.redirect("/pageNotFound");
      throw error;
  }
};

const verifyPayment = async (req, res) => {
  try {
      const { paymentData, cartId } = req.body;
            // Find Order using razorpayOrderId
      const order = await Order.findOne({ 
          razorpayOrderId: paymentData.razorpay_order_id 
      });

      if (!order) {
          
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
  try {
      const orderId = req.params.orderId;

      const order = await Order.findById(orderId)
          .populate({
              path: 'orderedItems.productId',
              select: 'productName price'
          });

      if (!order) {
        res.redirect("/pageNotFound");
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
   

doc.text('Subtotal', summaryX, y)
            .text(totalPrice.toString(), summaryX + 100, y,{align:'right'});

        if (discount > 0) {
            y += 20;
            doc.text('Discount', summaryX, y)
                .text(`${discount.toString()}`, summaryX + 100, y,{align:'right'});
        }

        y += 20;
        doc.text('Shipping', summaryX, y)
            .text(shipping.toString(), summaryX + 100, y,{align:'right'});

        y += 20;
        doc.fontSize(12)
            .text('Grand Total', summaryX, y, { bold: true })
            .text(finalAmount.toString(), summaryX + 100, y, { align:'right', bold: true });

        doc.fontSize(10)
            .text('        Thank you for shopping with Fruitables!', {
                align: 'center',
                y: 700
            });

      doc.end();

  } catch (error) {
      
      res.status(500).json({
          success: false,
          message: 'Failed to generate invoice'
      });
  }
};

const cancelProductOrder = async (req, res) => {
  try {
      const { productId, orderId, cancellationReason } = req.body;
    
      const userId = req.session.user?._id;

      if (!productId || !orderId) {
          return res.status(400).json({ success: false, message: "Order ID and Product ID are required." });
      }

      const order = await Order.findById(orderId);

      if (!order) {
          return res.status(404).json({ success: false, message: "Order not found." });
      }

      
      let productItem = order.orderedItems.find(item =>
              item.productId.toString() === productId && item.status !== 'Cancelled'
          );
         
      

      if (!productItem) {
          return res.status(404).json({ success: false, message: "Product not found in the order or already cancelled." });
      }

      if (productItem.status === 'Cancelled') {
          return res.status(400).json({ success: false, message: "Product is already canceled." });
      }
      const remainingCount = order.orderedItems.filter(item => item.status !== 'Cancelled').length;

      const itemAmount = productItem.price * productItem.quantity;
    
      
      const remainingItems = order.orderedItems.filter(item => 
          item.status !== 'Cancelled' && 
          !(item.productId.toString() === productItem.productId.toString() && 
            item._id.toString() === productItem._id.toString())
      );
      
      
      const remainingSubtotal = remainingItems.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0
      );
      
      
      // Ensure remainingCount is not zero before dividing
      let coupondis = remainingCount > 0 ? Math.round(order.discount / remainingCount) : 0;
      let refundAmount = itemAmount - coupondis;
      
      order.discount = Math.max(order.discount - coupondis, 0); // Prevent negative discount
      order.subtotal = remainingSubtotal;
      order.refundedAmount +=refundAmount;
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
      await order.save()
     
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
await Product.findByIdAndUpdate(productId,{
  $inc:{stock:productItem.quantity}
})
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
  try {
      const { productId, orderId, returnReason } = req.body;
      
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
      const deliveryDate = order.deliveredDateTime 
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
  try {
      const { orderId } = req.params;
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
          return res.render('paymentFailed', {
              orderId: orderId,
              totalAmount: 0,
              paymentMethod: 'N/A',
              id: 'N/A',
              error: 'Order not found'
          });
      }

      delete req.session.orderDetails;
      res.render('paymentFailed', {
          orderId: orderId,
          totalAmount: finalAmount,
          paymentMethod: paymentMethod,
          id: id,
          error: req.query.error || 'Your payment was not successful. You can try again or choose a different payment method.'
      });

  } catch (error) {
      console.error('Error handling failed payment:', error);
      delete req.session.orderDetails;
      res.render('paymentFailed', {
          orderId: req.params.orderId || 'N/A',
          totalAmount: 0,
          paymentMethod: 'N/A',
          id: 'N/A',
          error: 'An unexpected error occurred while processing your payment: ' + error.message
      });
  }
};


const getOrder = async (req, res) => {
  try {
      const { orderId } = req.body;
         
      const order = await Order.findOne({ orderId:orderId, paymentStatus: "Pending" })
      .populate("orderedItems.productId")
            .populate("userId"); 
                     

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
 
    try {
      //const {id}=req.body;
      res.render('paymentFailed')
      
    } catch (error) {
      
      res.redirect('/pageNotFound')
    }
  }

module.exports={

        
        cancelOrder,
        returnOrder,
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
  