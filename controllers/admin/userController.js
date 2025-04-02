const mongoose=require('mongoose')
const User=require("../../models/userSchema")
const {STATUS,MESSAGES}=require('../../config/constants')



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
     
     res.redirect("/pageerror");
 }
 
}


const userBlocked=async (req,res)=>{

 try {
    const { name } = req.body;
     const {id}=req.params 
   
     const user = await User.findById(id);
    
     if (user) {
       
       const blockUser = await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
     
       res.status(STATUS.SUCCESS).json({ success:true,message: MESSAGES.USER_BLOCKED });
     } else {
        res.redirect("/pageerror");
     }
   } catch (error) {
    
    res.redirect("/pageerror");
 };
}


const userunBlocked=async(req,res)=>{
 try {
     id=req.query.id;
     await User.updateOne({_id:id},{$set:{isBlocked:false}})
     res.redirect("/admin/user")
 } catch (error) {
    
    res.redirect("/pageerror");
}
}
const userListed=async (req,res)=>{
 try {
     id=req.query.id;
     await User.updateOne({_id:id},{$set:{isListed:true}})
     res.redirect("/admin/user")
 } catch (error) {
    
    res.redirect("/pageerror");
 }
}

const userunListed=async(req,res)=>{
 try {
     id=req.query.id;
     await User.updateOne({_id:id},{$set:{isListed:false}})
     res.redirect("/admin/user")
 } catch (error) {
    
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