const mongoose=require('mongoose')
const User=require("../../models/userSchema")
const Category=require("../../models/categorySchema")
const Product=require('../../models/productSchema')
const Order = require('../../models/orderSchema')
const Address=require('../../models/addressSchema')
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
           .sort({ createdOn: -1 })
           .sort({ createdOn: -1 })
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
             
       const statusObj = req.body

// Extract the value
const statusString = String(statusObj.status); // Explicitly convert to a string

//console.log(statusString); // Output: 'Delivered'

       const order = await Order.findById(req.params.orderId);
       if (!order) {
           return res.status(404).send('Order not found');
       }
if(statusString=="Cancelled")
{order.cancelReason="Cancelled by Admin"}
       order.status = statusString

     const s=  await order.save();
if(s)console.log("saved")
   return res.status(200).json({ success: true, message: 'Status updated successfully' });
       
   } catch (err) {
       console.error('Error updating order status:', err);
       res.status(500).send('Internal Server Error');
   }
};

const cancelOrder = async (req, res) => {
   try {
       const orderId = req.params.id;
       const order = await Order.findById(orderId);
       if (!order) {
           return res.status(404).send('Order not found');
       }

       if (order.status !== 'Pending') {
           return res.status(400).send('Only pending orders can be canceled');
       }

       // Restock inventory
       for (const item of order.orderedItems) {
           const product = await Product.findById(item.product);
           if (product) {
               product.stock += item.quantity;
               await product.save();
           }
       }

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
  
  

  module.exports={


    listOrders,
    updateOrderStatus,
    cancelOrder,
    getordedetailspage,
}