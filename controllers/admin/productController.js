const mongoose=require('mongoose')
const User=require("../../models/userSchema")
const Category=require("../../models/categorySchema")
const Product=require('../../models/productSchema')
const Order = require('../../models/orderSchema')
const Address=require('../../models/addressSchema')
const bcrypt=require('bcrypt')
const fs=require('fs')
const path=require('path')
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: 'dwwxgavec',
    api_key: '225589615717872',
    api_secret: 'EfQ8UN96MyWveu1sa2JjQesZsUg'
});


const cloudName = "dwwxgavec";  
const uploadPreset = "my_images"; 
const listInventory = async (req, res) => {
    try {
        const search = req.query.searchStock || "";

        const itemsPerPage = 10;
        const page = parseInt(req.query.page) || 1; 
        
        const totalProducts = await Product.countDocuments({isDeleted: false,
        productName: { $regex: new RegExp(search, 'i') }}); 
        const totalPages = Math.floor(totalProducts / itemsPerPage);

        const products = await Product.find({isDeleted: false,
            productName: { $regex: new RegExp(search, 'i') } })
        .sort({ createdOn: -1 })
        .skip((page - 1) * itemsPerPage) 
        .limit(itemsPerPage);
        res.render('admin-inventory', { products,currentPage: page, totalPages });
    } catch (err) {
        console.error('Error fetching inventory:', err);
        res.status(500).send('Internal Server Error');
    }
};

const updateStock = async (req, res) => {
    try {
        const { productId, stock } = req.body;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        product.stock = stock;
        await product.save();

        res.redirect('/admin/inventory');
    } catch (err) {
        console.error('Error updating stock:', err);
        res.status(500).send('Internal Server Error');
    }
};




const productInfo = async (req, res) => {
    try {
      const search = req.query.searchProduct || "";
      const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
  
      const productData = await Product.find({
        isDeleted: false,
        productName: { $regex: new RegExp(search, 'i') } 
     
      })
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit)
      .populate('category');
  
      const totalProduct = await Product.countDocuments({
        isDeleted: false,
        productName: { $regex: new RegExp(search, 'i') }  
      });
  
      const totalPages = Math.floor(totalProduct / limit);
  
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
      

        const products = req.body;
        

        if(!products.productName){
            return res.status(400).json({ message: "Product name not recived. Try with another name." });

        }

        // const productExists = await Product.findOne({ productName: products.productName });
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
            price: products.price,
            salesPrice: products.salesPrice,
            createdOn: new Date(),
            stock: products.stock,
            color: products.color,
            productImage: req.body.images, // Store image paths
            status:products.Available,
            item:products.item,
        });

       

        // Save to Database
        await newProduct.save();
      

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
       
    
        // Fetch product by ID
        const product = await Product.findOne({"_id":`${id}`})
        const category = await Category.find({});  // Fetch all categories for dropdown
        
        if (!product) {
            res.redirect("/pageerror");
        }

        // Render the edit page with product and category details
        res.render("edit-product", {
            product: product,
            category: category
        });
       
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
       
        const cat = await Category.findById(updatedData.category);

   
            const update = {
            productName: updatedData.productName,
            description: updatedData.description,
            price: updatedData.price,
            salesPrice: updatedData.salesPrice,
            stock: updatedData.stock,
            color: updatedData.color,
            status: updatedData.Available,
            category: cat._id,
            item:updatedData.item,
            };

        // If new images are uploaded, update the image field
        if (updatedData.images && updatedData.images.length > 0) {
            update.productImage = updatedData.images;  // Update image paths
         }

        // Update the product in the database
        
        const updatedProduct = await Product.findByIdAndUpdate(productId, update, { new: true });
        
        if (!updatedProduct) {
            res.redirect("/pageerror");
        }

       
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

const cat = await Product.findOne({_id: id});
if (cat) {
  const category = await Product.updateOne({ _id: id }, { $set: { isDeleted: true } });
  res.status(200).json({ message: 'Product soft deleted successfully' });
} else {
    res.redirect("/pageerror");
}
}catch (error) {
    res.redirect("/pageerror");}
}



  const deleteSingleImage = async (req, res) => {
    try {
        
        const { imageNameToServer, productIdToServer } = req.body;
       
        const segments = imageNameToServer.split('/');
        const fileNameWithVersion = segments.pop(); 
        const publicId = fileNameWithVersion.split('.')[0]; 

        
        const product = await Product.findByIdAndUpdate(
            productIdToServer,
            { $pull: { productImage: imageNameToServer } }
        );
       
        const imagePath = path.join("public", imageNameToServer);
        
       
    
     let saved=   await product.save();

      if(saved)
      res.status(200).json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.redirect("/pageerror");
    }
}

module.exports={
    listInventory,
    updateStock,
    productInfo,
    getProductAddPage,
    addProducts,
    productListed,
    productunListed,
    getEditProduct,
    postEditProduct,
    deleteProduct,
    deleteSingleImage,
}