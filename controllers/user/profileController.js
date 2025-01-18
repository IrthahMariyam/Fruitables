const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const session = require("express-session");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;




const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {}
};

const loadProfile=async (req, res) => {
    try {
       const id=req.params.userId;
       console.log(id,"inside loadprofile params id value")
        const user = req.session.user
        console.log(user);
        if (user) {
            const userData = await User.findOne({_id: user._id });
            const orders = await Order.find({ userId: user._id}) // Fetch user's orders
            .sort({ createdOn: -1 })
            .populate('orderedItems.product') // Populate product details
            .populate('addressId');
            console.log("Orders fetched:", orders);
            const userAddress = await Address.find({userId:user._id }).populate('userId');
            res.locals.user = userData.name;


          //  console.log(userData,"userinside loadprofile")
          //   console.log(userAddress,"useraddressinside loadprofile")
          //  console.log("session name", req.session.user.name);
          //  console.log("locals data", res.locals.user);
          //   console.log("session data", req.session.user);

            if(userData){
                res.render("profile",{user:userData,
                             address:userAddress,
                             orders:orders
            })
            }else{
                res.status(500).send("USER BLOCKED BY ADMIN");
            }
            
        }
        else{
            res.render('login',{message:"Please login to continue"})
        }
    } catch (error) {
        res.render("page-404",{message:"server error"});
        console.log("not found", error.message);
    }
}


const deleteAccount=async(req,res)=>{
    try 
        {
            const id=req.params;
            console.log(id,"inside deleteProfile params id value")
             const user = req.session.user;
             console.log(user);
             if (user) {
                 const userData = await User.findOne({_id: user._id });
                 if (userData) {
                    const blockUser = await User.updateOne({ _id:user._id }, { $set: { isBlocked: true } });
                    res.status(200).json({ message: 'Deleted successfully' });
                  } else {
                    res.status(404).json({ error: 'User not found' });a
                  }
             }else{
                res.render("/login",{message:"Something went wrong.Please login again"})
             }
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
        console.log("not found", error.message);
    }
}

const changePassword = async (req, res) => {
    try {
      const { userId, oldPassword, newPassword } = req.body;
      console.log("inside change Password", userId, oldPassword, newPassword);
  
      // Convert userId to ObjectId
      const userObjectId = new ObjectId(userId.trim());
  
      const findUser = await User.findOne({ _id: userObjectId, isAdmin: false });
      const userAddress = await Address.findOne({ userId: userObjectId }).populate('userId');
      console.log("User found:", findUser);
  
      if (findUser) {
        const passwordMatch = await bcrypt.compare(oldPassword, findUser.password);
        console.log("Password match:", passwordMatch);
  
        if (!passwordMatch) {
          return res.status(400).json({ error: "Incorrect old password" });
        }
  
        const passwordHash = await securePassword(newPassword);
        console.log("New password hash:", passwordHash);
  
        await User.updateOne(
          { _id: userObjectId },
          { $set: { password: passwordHash } }
        );
        console.log("Password updated successfully");
  
        return res.status(200).json({ message: "Password changed successfully!" });
      } else {
        console.log("User not found or blocked");
        return res.status(400).json({ error: 'User not found or blocked' });
      }
  
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  
    const addAddress = async (req, res) => {
        try {
            //console.log("added")
            const { Id,name, landmark, district, state, pincode, phone } = req.body;
            //const userId = req.user.id; // Assuming userAuth middleware sets `req.user`
            console.log("req body",req.body);
            const userData = await User.findOne({_id: Id ,isAdmin:false});
            console.log(userData,"inside addddress")
            if(userData){
                const newAddress = new Address({
                userId: Id,
                name: name,
                landmark: landmark,
                district: district,
                state: state,
                pincode: pincode,
                phone: phone
            });
    
          const addres=  await newAddress.save();
          if(addres)console.log("successfully added")
            else
        console.log("nothing added")
            res.status(200).json({ message: 'Address added successfully' });
        }else{
            res.status(500).json({ error: 'User Blocked by Admin' });
        }
        } catch (error) {
            console.error('Add Address Error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    };
    
    const getAddress=async(req,res)=>{
        try {console.log("inside getaddress")
         
            const address = await Address.findById(req.params.id);
            console.log(address)
            res.json(address);
          } catch (error) {
            res.status(500).json({ message: 'Error fetching address!' });
          }
         }

const updateAddress = async (req, res) => {
    try {
      // Extract ID from params and fields from body
      const { id } = req.params;
      const { name, landmark, district, state, pincode, phone } = req.body;
  
      console.log("Request Body:", req.body);
      console.log("Address ID:", id);
  
      // Find the old address by ID
      const oldAddress = await Address.findById(id);
  
      if (!oldAddress) {
        return res.status(404).json({ error: 'Address not found' });
      }
  
      console.log("Old Address:", oldAddress);
  
      // Create the updated address object
      const newAddress = {
        userId: oldAddress.userId,
        name,
        landmark,
        district,
        state,
        pincode,
        phone,
      };
  
      // Check if the user is valid and not an admin
      const userData = await User.findOne({ _id: oldAddress.userId, isAdmin: false });
  
      if (!userData) {
        return res.status(403).json({ error: 'User blocked by admin' });
      }
  
      // Update the address
      const updatedAddress = await Address.findByIdAndUpdate(id, newAddress, { new: true });
  
      if (updatedAddress) {
        console.log("Address successfully updated:", updatedAddress);
        return res.status(200).json({ message: 'Address updated successfully', updatedAddress });
      } else {
        console.log("Failed to update address");
        return res.status(500).json({ error: 'Failed to update address' });
      }
    } catch (error) {
      console.error("Error updating address:", error);
      return res.status(500).json({ message: 'Error updating address!', error });
    }
  };
  
const deleteAddress = async (req, res) => {
    try {
      const addressId = req.params.id;
      const userId = req.session.user?._id;
  
      if (!userId) {
        return res.redirect('/login'); // Redirect to login if session is missing
      }
  
      const user = await User.findOne({ _id: userId, isAdmin: false });
  
      if (!user) {
        return res.render('home', { message: 'User blocked' });
      }
  
      // Delete the address
      const addressDelete = await Address.findByIdAndDelete(addressId);
  
      if (addressDelete) {
        console.log('Address deleted successfully');
      } else {
        console.log('No such address found');
      }
  
      // Fetch the updated address list
      const updatedAddresses = await Address.find({ userId: userId });
  
      // Redirect back to the profile page
      res.render('profile',{user:user,address:updatedAddresses});
    } catch (error) {
      console.error('Error deleting address:', error.message);
      res.status(500).json({ message: 'Error deleting address!' });
    }
  };
  
// const history=async (req,res) => {
//   try {
//     // Fetch the logged-in user's orders
//     const orders = await Order.find({ userId: req.session._id })
//         .populate("orderedItems.product")
//         .populate("address")
//         .sort({ createdOn: -1 });

//     // Render the template and pass the orders
//     res.render("orders/history", { orders });
// } catch (err) {
//     console.error("Error fetching orders:", err);
//     res.status(500).send("Internal Server Error");
// }
// }
const history=async (req,res) => 
{try {
  const userId = req.session.user._id; // Get the logged-in user's ID
  const orders = await Order.find({ userId })
    .populate('orderedItems.product')
    .populate('addressId')
    .sort({ createdOn: -1 });

  res.json(orders); // Return orders as JSON
} catch (err) {
  console.error('Error fetching order history:', err);
  res.status(500).json({ error: 'Failed to fetch order history' });
}}

  const orderHistory=async(req,res)=>{
    try {
      console.log("inside history+++++++++", req.session.user._id)
      const orders = await Order.find({ userId:req.session.user._id })
          .populate("orderedItems.product")
          .populate("addressId")
          .sort({ createdOn: -1 });

          res.render("orders/history", { orders });
  } catch (err) {
      console.error("Error fetching orders:", err);
      res.status(500).send("Internal Server Error");
  }
  }



  const cancelOrder=async(req,res)=>{
//     try { console.log("inside history+++++++++", req.params.id)
//       const order = await Order.findById(req.params.id).populate("orderedItems.product");
// console.log(order,"11111111111111111111")
//       if (!order || order.user.toString() !== req.user._id.toString() || order.status !== "Processing") {
//           return res.status(400).send("Cannot cancel this order.");
//       }

//       // Update stock
//       for (const item of order.orderedItems) {
//           const product = await Product.findById(item.product._id);
//           if (product) {
//               product.stock += item.quantity;
//               await product.save();
//           }
//       }

//       // Update order status
//       order.status = "Cancelled";
//       await order.save();

//       res.redirect("/orders/history");
//   } catch (err) {
//       console.error("Error canceling order:", err);
//       res.status(500).send("Internal Server Error");
//   }

  try {
    const orderId = req.params.id; // Ensure you are getting the order ID
    const userId=req.session.user._id
    if (!orderId) {
      return res.status(400).send('Order ID is required');
    }

    // Fetch the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send('Order not found');
    }

    // Check if the order can be canceled
    if (order.status !== 'Processing') {
      return res.status(400).send('Only processing orders can be canceled');
    }

    // Update stock for each ordered item
    for (const item of order.orderedItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity; // Restock the canceled items
        await product.save();
      }
    }

    // Update order status
    order.status = 'Cancelled';
    await order.save();

    res.redirect('/userProfile/userId/#orders-history'); // Adjust based on your tab structure
  } catch (err) {
    console.error('Error canceling order:', err);
    res.status(500).send('Internal Server Error');
  }
};


  

module.exports={

loadProfile,
deleteAccount,
changePassword,
addAddress,
getAddress,
updateAddress,
deleteAddress,
orderHistory,
cancelOrder,
history,

}