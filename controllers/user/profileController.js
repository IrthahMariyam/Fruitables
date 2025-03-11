const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");
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
       
        const user = req.session.user
        if(!user)
          res.redirect('/login')
        
        if (user) {
            const userData = await User.findOne({_id: user._id });
            const cartitem=await Cart.findOne({userId:user._id})
            const orders = await Order.find({ userId: user._id}) // Fetch user's orders
            .sort({ createdOn: -1 })
            .populate('orderedItems.productId') // Populate product details
            const userAddress = await Address.find({userId:user._id }).populate('userId');
            res.locals.user = userData.name;
          
            if(userData){
              const cartitem=await Cart.findOne({userId:userData._id})
                res.render("profile",{user:userData,
                             address:userAddress,
                             orders:orders,
                             cart:cartitem
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
           
             const user = req.session.user;
            
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
     
  
      // Convert userId to ObjectId
      const userObjectId = new ObjectId(userId.trim());
  
      const findUser = await User.findOne({ _id: userObjectId, isAdmin: false });
      const userAddress = await Address.findOne({ userId: userObjectId }).populate('userId');
     
  
      if (findUser) {
        const passwordMatch = await bcrypt.compare(oldPassword, findUser.password);
        
  
        if (!passwordMatch) {
          return res.status(400).json({ error: "Incorrect old password" });
        }
  
        const passwordHash = await securePassword(newPassword);
      
  
        await User.updateOne(
          { _id: userObjectId },
          { $set: { password: passwordHash } }
        );
       
  
        return res.status(200).json({ message: "Password changed successfully!" });
      } else {
       
        return res.status(400).json({ error: 'User not found or blocked' });
      }
  
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  
    const addAddress = async (req, res) => {
        try {
            
            const { Id,name, landmark, district, state, pincode, phone } = req.body;
            //const userId = req.user.id; // Assuming userAuth middleware sets `req.user`
           
            const userData = await User.findOne({_id: Id ,isAdmin:false});
            const cartitem=await Cart.findOne({userId:Id})
                if(userData){
                const newAddress = new Address({
                userId: Id,
                name: name,
                landmark: landmark,
                district: district,
                state: state,
                pincode: pincode,
                phone: phone,
                cart:cartitem
            });
    
          const addres=  await newAddress.save();

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
        try {
            const address = await Address.findById(req.params.id);
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
        // Find the old address by ID
      const oldAddress = await Address.findById(id);
  
      if (!oldAddress) {
        return res.status(404).json({ error: 'Address not found' });
      }
  
    
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
      
        return res.status(200).json({ message: 'Address updated successfully', updatedAddress });
      } else {
       
        return res.status(500).json({ error: 'Failed to update address' });
      }
    } catch (error) {
      console.error("Error updating address:", error);
      return res.status(500).json({ message: 'Error updating address!', error });
    }
  };
  
const deleteAddress = async (req, res) => {
    try {
      const addressid = req.params.addressId;
      const userId = req.session.user?._id;
       if (!userId) {
        return res.redirect('/login'); // Redirect to login if session is missing
      }
  
      const user = await User.findOne({ _id: userId, isAdmin: false });

      if (!user) {
        return res.redirect('/home');
      }
  
      // Delete the address
      const addressDelete = await Address.findByIdAndDelete(addressid);
   
      if (addressDelete) {
        console.log('Address deleted successfully');
      } else {
        console.log('No such address found');
      }
  
      // Fetch the updated address list
      const updatedAddresses = await Address.find({ userId: userId });
  console.log("updatedAddresses",updatedAddresses)
      // Redirect back to the profile page

      return res.status(200).json({ message: 'Address updated successfully', updatedAddresses });

     
    } catch (error) {
      console.error('Error deleting address:', error.message);
      res.status(500).json({ message: 'Error deleting address!' });
    }
  };
 

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
  
  // Ensure the request body contains the required fields
  if (!cancelReason || !status) {
    return res.status(400).json({ message: 'Invalid request data' });
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


const getProfileDetail=async(req,res)=>{
  try{

  const profile = await User.findById(req.params.userId);
 
  res.json(profile);
} catch (error) {
  res.status(500).json({ message: 'Error fetching data!' });
}
}

  const updateProfileDetail=async(req,res)=>{
    try {
    
      const { name, phone } = req.body;
 
      const oldData = await User.findById(req.params.userId);
  
      if (!oldData) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Create the updated 
      const newData = {
        
        name:name,
        
        phone:phone
      };
  
     
      // Update 
      const updated = await User.findByIdAndUpdate(req.params.userId, newData, { new: true });
      const cartitem=await Cart.findOne({userId:req.params.userId})
      if (updated) {
        
   
        return res.status(200).json({ userId:updated._id,name:updated.name,email:updated.email,phone:updated.phone,cart:cartitem });
      } else {
        
        return res.status(500).json({ error: 'Failed to update details' });
      }
    } catch (error) {
      console.error("Error updating :", error);
      return res.status(500).json({ message: 'Error updating !', error });
    }


  }


module.exports={

loadProfile,
getProfileDetail,
updateProfileDetail,
deleteAccount,
changePassword,
addAddress,
getAddress,
updateAddress,
deleteAddress,

 orderHistory,
 cancelOrder,
 history,
//getOrderDetails,

}