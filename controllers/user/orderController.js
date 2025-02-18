const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");

const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const session = require("express-session");




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
      

    module.exports={

        orderHistory,
        cancelOrder,
        returnOrder,
        history,
        getOrderDetails,



    }