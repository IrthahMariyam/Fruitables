const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
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
       const id=req.params;
       console.log(id,"inside loadprofile params id value")
        const user = req.session.user;
        console.log(user);
        if (user) {
            const userData = await User.findOne({_id: user._id });
            // const useraddress=await Address.findOne({userId:user._id})
            const userAddress = await Address.findOne({userId:user._id }).populate('user._id');
            res.locals.user = userData.name;
            console.log(userData,"userinside loadprofile")
            console.log(userAddress,"useraddressinside loadprofile")
          //  console.log("session name", req.session.user.name);
            console.log("locals data", res.locals.user);
            console.log("session data", req.session.user);
            if(userData){
                res.render("profile",{user:userData,
                             address:userAddress,
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

// const changePassword=async(req,res)=>{
//     try {
//         const { id } = req.params;
//         const {userId,oldPassword,newPassword }=req.body;
//         console.log("inside change Password",userId,oldPassword,newPassword);
        
//         const findUser = await User.findOne({ _id: userId, isAdmin: false });
//         const userAddress = await Address.findOne({userId:userId }).populate('userId');
//     if(findUser){
//          const passwordMatch = await bcrypt.compare(oldPassword, findUser.password);
//             if (!passwordMatch) {
//               return res.render("profile", { message: "Incorrect old password",
//                                                      user:findUser,
//                                                      address:userAddress
//                });
//             }else{
//                 const passwordHash = await securePassword(newPassword);
//                 await User.updateOne(
//                     { _id: userId },
//                     { $set: { password: passwordHash } }
//                   );
//                   console.log("succes");
//                   return res.render("profile", { message: "Incorrect old password",
//                     user:findUser,
//                     address:userAddress
//                })
//             }            

        

//     }else{
//         console.log("userblocked")
//     }
        
//     } catch (error) {
//         res.status(500).json({ error: 'Internal server error' });
//         console.log("not found", error.message);
//     }
// }
// const changePassword = async (req, res) => {
//     try {console.log("inside change password")
//       const { userId, oldPassword, newPassword } = req.body;

//       console.log("inside change Password", userId, oldPassword, newPassword);
      
//       const findUser = await User.findOne({ _id: userId, isAdmin: false });
//       const userAddress = await Address.findOne({ userId: userId }).populate('userId');
//       console.log("User found:", findUser);
  
//       if (findUser) {
//         const passwordMatch = await bcrypt.compare(oldPassword, findUser.password);
//         console.log("Password match:", passwordMatch);
  
//         if (!passwordMatch) {
//           return res.status(400).json({ error: "Incorrect old password" });
//         }
  
//         const passwordHash = await securePassword(newPassword);
//         console.log("New password hash:", passwordHash);
  
//         await User.updateOne(
//           { _id: userId },
//           { $set: { password: passwordHash } }
//         );
//         console.log("Password updated successfully");
  
//         return res.status(200).json({ message: "Password changed successfully!" });
//       } else {
//         console.log("User not found or blocked");
//         return res.status(400).json({ error: 'User not found or blocked' });
//       }
  
//     } catch (error) {
//       console.error("Change password error:", error);
//       res.status(500).json({ error: 'Internal server error' });
//     }
//   };
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
  
  const addAddress=async(req,res)=>{

    try {
        const address = new Address(req.body);
        await address.save();
        res.json({ message: 'Address added successfully!' });
      } catch (error) {
        res.status(500).json({ message: 'Error adding address!' });
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
const updateAddress=async(req,res)=>{

    try {
        await Address.findByIdAndUpdate(req.params.id, req.body);
        res.json({ message: 'Address updated successfully!' });
      } catch (error) {
        res.status(500).json({ message: 'Error updating address!' });
      }
    }

const deleteAddress=async(req,res)=>{

    try {
        await Address.findByIdAndDelete(req.params.id);
        res.json({ message: 'Address deleted successfully!' });
      } catch (error) {
        res.status(500).json({ message: 'Error deleting address!' });
      }
    }


module.exports={

loadProfile,
deleteAccount,
changePassword,
addAddress,
getAddress,
updateAddress,
deleteAddress

}