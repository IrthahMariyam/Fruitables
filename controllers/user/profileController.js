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
    try {console.log('/login,userController.loadLogin=========================================================================')
       const id=req.params.userId;
       console.log(id,"inside loadprofile params id value")
        const user = req.session.user
        if(!user)
          res.redirect('/login')
        console.log(user);
        if (user) {
            const userData = await User.findOne({_id: user._id });
            const cartitem=await Cart.findOne({userId:user._id})
            const orders = await Order.find({ userId: user._id}) // Fetch user's orders
            .sort({ createdOn: -1 })
            .populate('orderedItems.productId') // Populate product details
            
            console.log("Orders fetched:", orders);
            const userAddress = await Address.find({userId:user._id }).populate('userId');
            res.locals.user = userData.name;
          
          
           
          //  console.log(userData,"userinside loadprofile")
          //   console.log(userAddress,"useraddressinside loadprofile")
          //  console.log("session name", req.session.user.name);
          //  console.log("locals data", res.locals.user);
          //   console.log("session data", req.session.user);

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
        {console.log('/login,userController.loadLogin=========================================================================')
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
    try {console.log('/login,userController.loadLogin=========================================================================')
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
        try {console.log('/login,userController.loadLogin=========================================================================')
            //console.log("added")
            const { Id,name, landmark, district, state, pincode, phone } = req.body;
            //const userId = req.user.id; // Assuming userAuth middleware sets `req.user`
            console.log("req body",req.body);
            const userData = await User.findOne({_id: Id ,isAdmin:false});
            const cartitem=await Cart.findOne({userId:Id})
            console.log(userData,"inside addddress")
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
        try {console.log('/login,userController.loadLogin=========================================================================')
          console.log("inside getaddress")
         
            const address = await Address.findById(req.params.id);
            console.log(address)
            res.json(address);
          } catch (error) {
            res.status(500).json({ message: 'Error fetching address!' });
          }
         }

const updateAddress = async (req, res) => {
    try {console.log('/login,userController.loadLogin=========================================================================')
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
    try {console.log('deleteAddress=========================================================================')
      const addressid = req.params.addressId;
      const userId = req.session.user?._id;
  //console.log(addressid,"addressidddddd")
  //console.log(userId,"userid")
  //console.log(req.params,"params request")
      if (!userId) {
        return res.redirect('/login'); // Redirect to login if session is missing
      }
  
      const user = await User.findOne({ _id: userId, isAdmin: false });
 // console.log("userrr",user)
      if (!user) {
        return res.redirect('/home');
      }
  
      // Delete the address
      const addressDelete = await Address.findByIdAndDelete(addressid);
    // console.log("addreddDelete",addressDelete)
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

     // res.render('profile',{user:user,address:updatedAddresses});
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
  try{console.log('getProfileDetail=========================================================================')
  console.log("inside getDetail")

  console.log(req.params)
  const profile = await User.findById(req.params.userId);
  console.log(profile)
  res.json(profile);
} catch (error) {
  res.status(500).json({ message: 'Error fetching data!' });
}
}

  const updateProfileDetail=async(req,res)=>{
    try {console.log('updateProfileDetail=========================================================================')
    
      const { name, phone } = req.body;
 
      const oldData = await User.findById(req.params.userId);
  
      if (!oldData) {
        return res.status(404).json({ error: 'User not found' });
      }
  
     // console.log("Old Data:", oldData);
  
      // Create the updated 
      const newData = {
        
        name:name,
        
        phone:phone
      };
  
     
      // Update 
      const updated = await User.findByIdAndUpdate(req.params.userId, newData, { new: true });
      const cartitem=await Cart.findOne({userId:req.params.userId})
      if (updated) {
        console.log("successfully updated:", updated);
   
        return res.status(200).json({ userId:updated._id,name:updated.name,email:updated.email,phone:updated.phone,cart:cartitem });
      } else {
        console.log("Failed to update details");
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