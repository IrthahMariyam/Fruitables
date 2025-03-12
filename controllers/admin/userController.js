const mongoose=require('mongoose')
const User=require("../../models/userSchema")
const Category=require("../../models/categorySchema")
const Product=require('../../models/productSchema')
const Order = require('../../models/orderSchema')
const Address=require('../../models/addressSchema')
const bcrypt=require('bcrypt')
const fs=require('fs')
const path=require('path')


const findUsers=async(req,res)=>{
    
    try {
     
      let  search=req.query.searchUser||""
     
   
        let page=req.query.page|| 1
     
     const limit=3
     const userData=await User.find({
         isAdmin:false,
         $or:[
             {name:{$regex:".*"+search+".*",$options: 'i'}},
             {email:{$regex:".*"+search+".*",$options: 'i'}}
         ],
     })
     .limit(limit*1)
     .skip((page-1)*limit)
     .exec();

     const count =await User.countDocuments({
         isAdmin:false,
         $or:[
             {name:{$regex:".*"+search+".*",$options: 'i'}},
             {email:{$regex:".*"+search+".*",$options: 'i'}}
         ],
     })
     res.render("admin-user", {
         users: userData,
         totalPages: Math.ceil(count / limit),
         currentPage: page
     });
 } catch (error) {
     console.error(error);
     res.redirect("/pageerror");
 }
 
}


const userBlocked=async (req,res)=>{

 try {
    const { name } = req.body;
     const {id}=req.params // Use req.body to get the values
   
     const user = await User.findById(id);
    
     if (user) {
       
       const blockUser = await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
     
       res.status(200).json({ success:true,message: 'Blocked user successfully' });
     } else {
        res.redirect("/pageerror");
     }
   } catch (error) {
    console.log(error)
    res.redirect("/pageerror");
 };
}


const userunBlocked=async(req,res)=>{
 try {
     id=req.query.id;
     await User.updateOne({_id:id},{$set:{isBlocked:false}})
     res.redirect("/admin/user")
 } catch (error) {
    console.log(error)
    res.redirect("/pageerror");
}
}
const userListed=async (req,res)=>{
 try {
     id=req.query.id;
     await User.updateOne({_id:id},{$set:{isListed:true}})
     res.redirect("/admin/user")
 } catch (error) {
    console.log(error)
    res.redirect("/pageerror");
 }
}

const userunListed=async(req,res)=>{
 try {
     id=req.query.id;
     await User.updateOne({_id:id},{$set:{isListed:false}})
     res.redirect("/admin/user")
 } catch (error) {
    console.log(error)
    res.redirect("/pageerror");
 }
}




module.exports={
    findUsers,
    userBlocked,
    userunBlocked,
    userListed,
    userunListed,
}