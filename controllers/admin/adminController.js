const mongoose=require('mongoose')
const User=require("../../models/userSchema")
const Category=require("../../models/categorySchema")
const Product=require('../../models/productSchema')

const bcrypt=require('bcrypt')
const fs=require('fs')
const path=require('path')
const sharp=require('sharp')
const multer=require('multer')
const { crypto } = require('crypto')
//const { DiffieHellmanGroup } = require('crypto')



const pageerror = async(req,res)=>{
    res.render("admin-error")
}


const loadLogin=(req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin/dashboard")
    }
    res.render("admin-login",{message:"null"})
}


const login=async (req,res)=>{
    try {
        const {email,password}=req.body;
        // console.log("admin"+ email +  password)
        const admin=await User.findOne({email,isAdmin:true})
        if(admin){
            const passwordMatch=bcrypt.compare(password,admin.password)
            if(passwordMatch){
                req.session.admin=admin;
                return res.redirect('/admin')           
            }
        else{
            return res.redirect("/login")
        }
    }else{
        return res.redirect("/login")
    }

    } catch (error) {
        console.log("login error",error)
        return res.redirect("/pageerror")
        
    }
}

const loadDashboard= async(req,res)=>{
    if(req.session.admin){
        try {
            res.render("dashboard");
        } catch (error) {
            res.redirect("/pageerror")
        }
    }
}

const logout= async(req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log("Error destroying session",err);
                return res.redirect("/pageerror")
            }
            res.redirect("/admin/login")
        })
    } catch (error) {
        console.log("unexpected error during logout",error)
        res.redirect("/pageerror")
    }
}


//USER MANAGEMENT
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
        const id=req.params // Use req.body to get the values
        console.log('Category IDin controller:', id);
        //console.log('Name Field:in controller', name);
        console.log("inside deleteuser")
        const user = await User.findOne({ _id:id});
        if (user) {
          const blockUser = await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
          res.status(200).json({ message: 'Blocked user successfully' });
        } else {
          res.status(404).json({ error: 'User not found' });a
        }
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    };



const userunBlocked=async(req,res)=>{
    try {
        id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/user")
    } catch (error) {
        res.redirect("/pageerror")
    }
}

const userListed=async (req,res)=>{
    try {
        id=req.query.id;
        await User.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect("/admin/user")
    } catch (error) {
        res.redirect("/pageerror")
    }
}

const userunListed=async(req,res)=>{
    try {
        id=req.query.id;
        await User.updateOne({_id:id},{$set:{isListed:false}})
        res.redirect("/admin/user")
    } catch (error) {
        res.redirect("/pageerror")
    }
}


//CATEGORY MANAGEMENT
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
  


 
//PRODUCT MANAGEMENT
const productInfo = async (req, res) => {
    try {
      const search = req.query.searchProduct || "";
      const page = parseInt(req.query.page) || 1;
      const limit = 15||parseInt(req.query.page);
      const skip = (page - 1) * limit;
  
      // Perform a case-insensitive search using $regex and $options: 'i'
      const productData = await Product.find({
        isDeleted: false,
        productName: { $regex: new RegExp(search, 'i') } 
      // $or:[{ productName: { $regex: new RegExp(search, 'i') }}] // Case-insensitive search
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('category');
  
      const totalProduct = await Product.countDocuments({
        isDeleted: false,
        productName: { $regex: new RegExp(search, 'i') }  // Case-insensitive search
      });
  
      const totalPages = Math.ceil(totalProduct / limit);
  
      // Render the results
      res.render("admin-products", {
        products: productData,
        currentPage: page,
        totalPages: totalPages,
        totalProduct: totalProduct,
      });
    } catch (error) {
      console.error(error);
      res.redirect("/pageerror");
    }
  };
  
  

const getProductAddPage = async (req,res)=>{
try {
    const category=await Category.find({isListed:true,isDeleted:false})
    res.render("product-add",{
        cat:category
    })
} catch (error) {
    res.redirect("/pageerror")
}
}
const addProducts = async (req, res) => {
    try {
        //console.log("addProducts route",req.body);

        const products = req.body;
       // console.log('Received product:', products);

        if(!products.productName){
            return res.status(400).json({ message: "Product name not recived. Try with another name." });

        }

        // Check if the product already exists
        //const productExists = await Product.findOne({ productName: products.productName });
        const productExists = await Product.findOne({
            productName: { 
              $regex: `^${products.productName}$`,  // Exact match for productName
              $options: "i"  // Case-sensitive search
            }
          });
          
        if (productExists) {
            return res.status(400).json({ message: "Product already exists. Try with another name." });
       
        }

        // Ensure req.files is an array (it should be when using uploads.array())
        if (req.images && req.images.length === 0) {
            return res.status(400).json({ message: "No images uploaded." });

        } 

        // Validate Category
        const categoryId = await Category.findOne({ name: products.category });
        if (!categoryId) {
            return res.status(400).json({ message: "Invalid category name" });
        }
      
        // Create New Product
        const newProduct = new Product({
            productName: products.productName,
            description: products.description,
            category: categoryId._id,
            price: products.regularPrice,
            salesPrice: products.salePrice,
            createdOn: new Date(),
            stock: products.stock,
            color: products.color,
            productImage: req.body.images, // Store image paths
            status:products.Available,
            item:products.item,
        });

        console.log(newProduct,'new produ')

        // Save to Database
        await newProduct.save();
        console.log('Product saved successfully:', products.productName);

        // Success redirect or response
        return res.status(200).json({ message: "Product added successfully!" });

    } catch (error) {
        console.error("Error saving product:", error);
        return res.status(500).json({ message: "Internal server error. Please try again later." });
    }
};

const productListed=async(req,res)=>{
   
        try {
            id=req.query.id;
            await Product.updateOne({_id:id},{$set:{isListed:true}})
            res.redirect("/admin/products")
        } catch (error) {
            res.redirect("/pageerror")
        }
    
}
const productunListed=async(req,res)=>{
   
    try {
        id=req.query.id;
        await Product.updateOne({_id:id},{$set:{isListed:false}})
        res.redirect("/admin/products")
    } catch (error) {
        res.redirect("/pageerror")
    }

}

// Render Edit Product Page
const getEditProduct = async (req, res) => {
    try {
        const id = req.params.id;
        console.log("Editing product with Name:", id);
    
        // Fetch product by ID
        const product = await Product.findOne({"_id":`${id}`})
        const category = await Category.find({});  // Fetch all categories for dropdown
        
        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }

        // Render the edit page with product and category details
        res.render("edit-product", {
            product: product,
            category: category
        });
        //console.log(category)
       // console.log(product)
        //console.log(product.productImage)
    } catch (error) {
        console.error("Error fetching product for edit:", error);
        res.redirect("/pageerror");
    }
};

// Handle Product Update
const postEditProduct = async (req, res) => {
 
    try {
        const productId = req.params.id;
        const updatedData = req.body;
        console.log(req.body)
        console.log("Updating product with ID:", productId);
        console.log("Received data:", updatedData);

        // Validate Category
        const category = await Category.findById(updatedData.category);
        if (!category) {
            return res.status(400).json({ message: "Invalid category." });
        }

        // Prepare update object
        const update = {
            productName: updatedData.productName,
            description: updatedData.description,
            price: updatedData.regularPrice,
            salesPrice: updatedData.salePrice,
            stock: updatedData.stock,
            color: updatedData.color,
            status: updatedData.Available,
            category: category._id,
            item:updatedData.item,
        };

        // If new images are uploaded, update the image field
        if (updatedData.images && updatedData.images.length > 0) {
            update.productImage = updatedData.images;  // Update image paths
        }

        // Update the product in the database
        const updatedProduct = await Product.findByIdAndUpdate(productId, update, { new: true });
        
        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found." });
        }

        console.log("Product updated successfully:", updatedProduct);
        res.redirect("/admin/products");  // Redirect to product list after update
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

const deleteProduct=async(req,res)=>{


try{
const { name } = req.body;
const id=req.params.id // Use req.body to get the values
console.log('Product IDin controller:', id);
console.log('Name Field:in controller', name);
console.log("inside deletecat")
const cat = await Product.findOne({_id: id});
if (cat) {
  const category = await Product.updateOne({ _id: id }, { $set: { isDeleted: true } });
  res.status(200).json({ message: 'Product soft deleted successfully' });
} else {
  res.status(404).json({ error: 'Product not found' });a
}
}catch (error) {
res.status(500).json({ error: 'Internal server error' });
}
}
//ORDER MANAGEMENT

//EXPORTING
module.exports={
    loadLogin,
    login,
    loadDashboard,
    logout,
    pageerror,
    findUsers,
    userBlocked,
    userunBlocked,
    userListed,
    userunListed,
    categoryInfo,
    addCategory,
    categoryListed,
    categoryunListed,
    editCategory,
    deleteCategory,
    productInfo,
    getProductAddPage,
    addProducts,
    productListed,
    productunListed,
     getEditProduct,
    postEditProduct,
    deleteProduct,
}