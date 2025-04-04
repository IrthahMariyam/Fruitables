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
    
    const userId = req.params.id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.isBlocked = true;
        await user.save();

        res.status(200).json({ 
            success: true, 
            message: 'User blocked successfully',
            user: { _id: user._id, isBlocked: user.isBlocked }
        });
   } catch (error) {
    
    res.redirect("/pageerror");
 };
}


const userunBlocked=async(req,res)=>{
 try {
    const userId = req.params.id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.isBlocked = false;
        await user.save();

        res.status(200).json({ 
            success: true, 
            message: 'User unblocked successfully',
            user: { _id: user._id, isBlocked: user.isBlocked }
        });
}
 catch (error) {
    return res.status(500).json({ success: false, message: 'User not found' });
   
}


}


module.exports={
    findUsers,
    userBlocked,
    userunBlocked,
   
}