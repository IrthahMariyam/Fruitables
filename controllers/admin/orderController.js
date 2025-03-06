const mongoose=require('mongoose')
const User=require("../../models/userSchema")
const Category=require("../../models/categorySchema")
const Product=require('../../models/productSchema')
const Order = require('../../models/orderSchema')
const Address=require('../../models/addressSchema')
const Wallet=require('../../models/walletSchema')
const bcrypt=require('bcrypt')
const fs=require('fs')
const path=require('path')



const listOrders = async (req, res) => {
    try {
       const itemsPerPage = 10;
       const page = parseInt(req.query.page) || 1; 
   
       const totalOrders = await Order.countDocuments(); 
       const totalPages = Math.ceil(totalOrders / itemsPerPage);
       const orders = await Order.find()
           .populate('orderedItems.productId')
           .populate('userId')
           .sort({createdOn: -1 })
           .skip((page - 1) * itemsPerPage) 
           .limit(itemsPerPage);

       res.render('admin-orders', { orders, currentPage: page, totalPages,totalOrders, });
       
   } catch (err) {
       console.error('Error fetching orders:', err);
       res.status(500).send('Internal Server Error');
   }
 
}


const updateOrderStatus = async (req, res) => {
   try {
             console.log("updateOrderStatus==============================")
       const {status} = req.body
console.log(req.body)
console.log("status",status)

       const order = await Order.findById(req.params.orderId);
       if (!order) {
           return res.status(404).send('Order not found');
       }
     
     let userId=order.userId;
     console.log("userId",userId)
     console.log("paymentMethod=",order.paymentMethod)
     if(status=='Delivered'){
      
      order.status='Delivered';
     order.deliveredDateTime=new Date();
     for (const item of order.orderedItems)
      {
        if(item.status!=='Cancelled')
          item.status='Delivered';
      }
  await order.save();
  return res.status(200).json({ success: true, message: 'Status updated successfully' });
    }
     if(status=='Shipped' && (paymentMethod== "WALLET"||"RAZORPAY")){
      
      if(order.paymentStatus=="Paid")
        return res.status(404).send('Only Paid order can be shipped for online payment');
     }
     
 
     if((status=="Returned" && order.paymentStatus=="Paid")||(status=="Cancelled" && order.paymentStatus=="Paid")){
     
      if (order.paymentMethod === "RAZORPAY" || order.paymentMethod === "WALLET"|| (order.paymentMethod === "COD" && order.status=='Returned')) {
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
         description: `Money credited for order (Order ID: ${order._id})`,
         productId:productId ,
         reason:`Order ${status}`,
         date: new Date(),
         
       });
       
 
       await wallet.save();
  //  walletRefundSuccess = true;
      console.log("success")
      order.refundedAmount+=amount;
     }
    }
if(status=="Cancelled")
{
  order.cancelReason="Cancelled by Admin"}
       order.status = status

   for (const item of order.orderedItems) 
          {
            if(item.status!="Cancelled")
              item.status=order.status
          }
      
     const s=  await order.save();
     if(status=="Returned"|| "Cancelled"){
     for (const item of order.orderedItems) {
        const product = await Product.findById(item.productId);
        if (product) {
            product.stock += item.quantity;}
          let p=  await product.save();
          if(p)
            console.log("product updated")
        else
        console.log("not updated")
      item.status=status;
}
await order.save()
}
    
if(s)console.log("saved")
   return res.status(200).json({ success: true, message: 'Status updated successfully' });
       
   } catch (err) {
       console.error('Error updating order status:', err);
       res.status(500).send('Internal Server Error');
   }
};

const cancelOrder = async (req, res) => {
   try {
    console.log("insde cancelOder==================================")
       const orderId = req.params.id;
       const order = await Order.findById(orderId);
       if (!order) {
           return res.status(404).send('Order not found');
       }

       if (order.status !== 'Pending'|| order.status !== 'Processing') {
           return res.status(400).send('Only pending or processing orders can be canceled');
       }

     //  let walletRefundSuccess = false;
       let userId=order.userId;
       console.log("userId",userId)
    console.log("paymentMethod=",order.paymentMethod)
       if (order.paymentMethod === "RAZORPAY" || order.paymentMethod === "WALLET"|| (order.paymentMethod === "COD" && order.status=='Returned')) {
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
           description: `Money credited in your wallet with Order ID: ${order._id})`,
           productId: null,
           reason: `Order ${status}`,
           date: new Date(),
           
         });
   
         await wallet.save();
         order.refundedAmount=amount;
         
    //  walletRefundSuccess = true;
        console.log("success")
       }
   
      // Restock inventory
       for (const item of order.orderedItems) {
           const product = await Product.findById(item.productId);
           if (product) {
               product.stock += item.quantity;
               await product.save();
           }
       }
       for (const item of order.orderedItems) 
                 item.status=order.status
               order.status = 'Cancelled';
       order.cancelReason="Cancelled by Admin"
       await order.save();

       res.redirect('/admin/orders');
   } catch (err) {
       console.error('Error canceling order:', err);
       res.status(500).send('Internal Server Error');
   }
};


const getordedetailspage = async (req, res) => {
    try {
      const { orderid } = req.params; // Correctly destructuring orderid from req.params
      console.log(req.params);
      
      const order = await Order.findById(orderid)
        .populate('userId') // Populates user details like name and email
        .populate('orderedItems.productId') // Populates product details in ordered items
        .sort({ createdAt: -1 }); // Removed .sort() as it is invalid on findById()
  
      console.log(order, "admin====================");
  
  
      
     res.render('admin-orderdetails', { order });
    } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
    }
  };
  
 ////////////////////////////////////////////////////////
 const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, productId } = req.body;
console.log("updateStatus=================================")
console.log(req.body)
console.log(req.params)
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
      return res.render("admin/orderdetail", { message: "Not a valid status code", orderId: id });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(200).json({ message: "Order not found" });
    }

    const statusFlow = {
      Pending: ["Processing", "Cancelled"],
      Processing: ["Shipped", "Cancelled"],
      Shipped: ["Out for Delivery", "Cancelled"],
      "Out for Delivery": ["Delivered", "Cancelled"],
      Delivered: ["Return Request"],
      Cancelled: [],
      "Return Request": ["Returned"],
      Returned: [],
    };

    if (productId) {
      const productToUpdate = order.orderedItems.find((item) => item._id.toString() === productId);
      if (!productToUpdate) {
        return res.render("admin/orderdetail", { message: "Product not found in the order", orderId: id });
      }

      // Validate if status transition is allowed
      if (!statusFlow[productToUpdate.status].includes(orderStatus)) {
        return res.render("admin/orderdetail", { 
          message: `Cannot change status from ${productToUpdate.status} to ${orderStatus}`, 
          orderId: id
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

    return res.render("admin/orderdetail", { message: "Status updated successfully", orderId: id });

  } catch (error) {
    console.error("Error updating status:", error);
    return res.render("admin/orderdetail", { message: "Failed to update status", orderId: req.params.id });
  }
};
const approveReturnRequest = async (req, res) => {
  const { orderId } = req.params;
  const { productId } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const productItem = order.orderedItems.find((item) => item._id.toString() === productId);
    if (!productItem) {
      return res.status(404).json({ success: false, message: "Product not found in the order." });
    }

    if (productItem.status !== "Return Request") {
      return res.status(400).json({ success: false, message: "This product does not have a pending return request." });
    }



    const remainingCount= order.orderedItems.filter(item => 
      item.status !== 'Cancelled')
  const itemAmount = productItem.price * productItem.quantity;
console.log("itemAmount",itemAmount)
  const remainingItems = order.orderedItems.filter(item => 
      item.status !== 'Cancelled' && 
      !(item.productId.toString() === productItem.productId.toString() && 
        item._id.toString() === productItem._id.toString())
  );
console.log("remainingItems",remainingItems)
  const remainingSubtotal = remainingItems.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0);
console.log("remainingSubtotal",remainingSubtotal)
  let coupondis=Math.round(order.discount/remainingCount);
let   refundAmount=itemAmount-coupondis;
order.discount-=coupondis;
order.subtotal=remainingSubtotal;
if(order.subtotal<1000 && order.subtotal!=0)
order.deliveryCharge=50;
if(subtotal==0){
order.deliveryCharge=0
order.discount=0;
order.finalAmount=0
}
order.finalAmount-=refundAmount;


  
    
      const wallet = await Wallet.findOne({ userId: order.userId });
    if (!wallet) {
      wallet = new Wallet({ userId: order.userId, balance: 0, transactions: [] });
    }

    wallet.balance += refundAmount;
    wallet.transactions.push({
      amount: refundAmount,
      transactionType: "credit",
      productId: productId,
      reason: "Order Return",
      description: `Refund for product ${productItem.productName} (Order ID: ${orderId})`,
      date: new Date(),
    });

    await wallet.save();



    
    productItem.status = "Returned";

    const allProducts = order.orderedItems;
    if (allProducts.every((item) => item.status === "Returned")) {
      order.status = "Returned";
    }

    await order.save();

    return res.redirect(`/admin/orderdetail/${orderId}`);
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
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const productItem = order.orderedItems.find((item) => item._id.toString() === productId);
    if (!productItem) {
      return res.status(404).json({ success: false, message: "Product not found in the order." });
    }

    if (productItem.status !== "Return Request") {
      return res.status(400).json({ success: false, message: "This product does not have a pending return request." });
    }

    productItem.status = "Delivered";
    productItem.returnDeclinedReason = declineReason || "Your Return request is declined";

    const allProducts = order.orderedItems;
    if (allProducts.every((item) => item.status === "Delivered")) {
      order.status = "Delivered";
    }

    await order.save();

    return res.redirect(`/admin/orderdetail/${orderId}`);
  } catch (error) {
    console.error("Error while declining return request:", error);
    return res.status(500).json({ success: false, message: "Failed to process return decline." });
  }
};





  module.exports={


    listOrders,
    updateOrderStatus,
    cancelOrder,
    getordedetailspage,
    updateStatus,
    approveReturnRequest,
    declineReturnRequest
}
