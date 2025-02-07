const mongoose=require('mongoose')
const User=require("../../models/userSchema")
const Category=require("../../models/categorySchema")
const Product=require('../../models/productSchema')
const Order = require('../../models/orderSchema')
const Address=require('../../models/addressSchema')
const bcrypt=require('bcrypt')
const fs=require('fs')
const path=require('path')

const categoryInfo=async(req,res)=>{
    try {
         let  search=req.query.searchCategory||""
       const page=parseInt(req.query.page)||1
       const limit=4;
       const skip=(page-1)*limit;
       const categoryData=await Category.find({isDeleted: false, 
        $or:[
            {name:{$regex:".*"+search+".*",$options: 'i'}},
            
        ],
       })
       .sort({createdAt:-1})
       .skip(skip)
       .limit(limit)
       const totalCategory=await Category.countDocuments({
        isDeleted:false,
        $or:[
            {name:{$regex:".*"+search+".*",$options: 'i'}},
            ],
       });
       const totalPages=Math.ceil(totalCategory/limit)
       res.render("admin-category",{
        cat:categoryData,
        currentPage:page,
        totalPages:totalPages,
        totalCategory:totalCategory
       }) 
    } catch (error) {
        console.error(error);
        res.redirect("/pageerror");
    }

}
   


 const addCategory=async(req,res)=>{
    try {console.log(req.body)
            const {name,description}=req.body;
            console.log(`${name}` + `${description}`)
            const existCategory=await Category.findOne({
                name:{
                    $regex:`^${name}$`,$options:'i'
                }})
        if(existCategory){
            return res.status(400).json({error:"Category already exists"})
        }
        const newCategory=new Category({
            name,
            description,
        })
        await newCategory.save();
        return res.json({message:"Category added successfully"})
        
    } catch (error) {
        return res.status(500).json({error:"Internal Server Error"})
        
    }
}

const categoryListed=async (req,res)=>{
    try {
        id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect("/admin/category")
    } catch (error) {
        res.redirect("/pageerror")
    }
}

const categoryunListed=async(req,res)=>{
    try {
        id=req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:false}})
        res.redirect("/admin/category")
    } catch (error) {
        res.redirect("/pageerror")
    }
}


const editCategory = async (req, res) => {
    try {
        const id = req.params.id || req.body.id;
        const { name, description } = req.body;

        const cat = await Category.findOne({ _id: id });
        if (!cat) {
            return res.status(400).json({ error: "Category not found" });
        }

        const updateCategory = await Category.findByIdAndUpdate(id, {
            name: name,
            description: description
        }, { new: true });

        if (updateCategory) {
            res.status(200).json({ message: "Category updated successfully" });
          
        } else {
            res.status(404).json({ error: "Category not updated" });
        }
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};


const deleteCategory = async (req, res) => {
    try {
      const { name } = req.body;
      const id=req.params.id // Use req.body to get the values
      console.log('Category IDin controller:', id);
      console.log('Name Field:in controller', name);
      console.log("inside deletecat")
      const cat = await Category.findOne({ name: name });
      if (cat) {
        const category = await Category.updateOne({ _id: id }, { $set: { isDeleted: true } });
        res.status(200).json({ message: 'Category soft deleted successfully' });
      } else {
        res.status(404).json({ error: 'Category not found' });a
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  


 module.exports={
    categoryInfo,
    addCategory,
    categoryListed,
    categoryunListed,
    editCategory,
    deleteCategory,

 }