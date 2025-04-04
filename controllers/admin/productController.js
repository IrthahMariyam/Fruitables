const mongoose=require('mongoose')
const Category=require("../../models/categorySchema")
const Product=require('../../models/productSchema')
const {STATUS,MESSAGES}=('../../config/constants')

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
        
        res.status(STATUS.SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
    }
};

const updateStock = async (req, res) => {
    try {
        const { productId, stock } = req.body;

        if (!productId || stock === undefined) {
            return res.status(400).json({ success: false, message: 'Product ID and stock value are required' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        product.stock = parseInt(stock, 10); 
        await product.save();

        res.status(200).json({ 
            success: true, 
            message: 'Stock updated successfully',
            stock: product.stock 
        });
    } catch (err) {
        
        res.status(STATUS.SERVER_ERROR).send(MESSAGES.SERVER_ERROR);
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
            return res.status(STATUS.BAD_REQUEST).json({ message: MESSAGES.PRODUCT_RECIEVED });

        }

       
        const productExists = await Product.findOne({
            productName: { 
              $regex: `^${products.productName}$`,
              $options: "i" 
            }
          });
          
        if (productExists) {
            return res.status(STATUS.BAD_REQUEST).json({ message: MESSAGES.PRODUCT_EXISTS });
       
        }

       
        if (req.images && req.images.length === 0) {
            return res.status(STATUS.BAD_REQUEST).json({ message:MESSAGES.NO_IMAGES});

        } 

        
        const categoryId = await Category.findOne({ name: products.category });
        if (!categoryId) {
            return res.status(STATUS.BAD_REQUEST).json({ message:MESSAGES.INVALID_CATEGORY });
        }
      
       
        const newProduct = new Product({
            productName: products.productName,
            description: products.description,
            category: categoryId._id,
            price: products.price,
            salesPrice: products.salesPrice,
            createdOn: new Date(),
            stock: products.stock,
            color: products.color,
            productImage: req.body.images,
            status:products.Available,
            item:products.item,
        });

       

       
        await newProduct.save();
      

        
        return res.status(STATUS.SUCCESS).json({ message: MESSAGES.PRODUCT_ADDED});

    } catch (error) {
        
        return res.status(STATUS.SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR });
    }
};

const productListed=async(req,res)=>{
   
        try {
           
            const productId = req.params.id;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        product.isListed = true;
        await product.save();
        res.status(200).json({ success: true, message: 'Product listed successfully' });
        } catch (error) {
            res.redirect("/pageerror")
        }
    
}
const productunListed=async(req,res)=>{
   
    try {
       
        const productId = req.params.id;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        product.isListed = false;
        await product.save();
        res.status(200).json({ success: true, message: 'Product unlisted successfully' });
    } catch (error) {
        res.redirect("/pageerror")
    }

}


const getEditProduct = async (req, res) => {
    try {
        const id = req.params.id;
       
    
        
        const product = await Product.findOne({"_id":`${id}`})
        const category = await Category.find({}); 
        
        if (!product) {
            res.redirect("/pageerror");
        }

        
        res.render("edit-product", {
            product: product,
            category: category
        });
       
    } catch (error) {
       
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

      
        if (updatedData.images && updatedData.images.length > 0) {
            update.productImage = updatedData.images;  
         }

        
        
        const updatedProduct = await Product.findByIdAndUpdate(productId, update, { new: true });
        
        if (!updatedProduct) {
            res.redirect("/pageerror");
        }

       
        res.redirect("/admin/products"); 
     } catch (error) {
        
        res.status(STATUS.SERVER_ERROR).json({ message: MESSAGES.SERVER_ERROR });
     }
};

const deleteProduct=async(req,res)=>{


try{

const productId = req.params.id;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        product.isDeleted = true;
        await product.save();
        res.status(200).json({ success: true, message: 'Product deleted successfully' });
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
      res.status(STATUS.SUCCESS).json({ success: true, message: MESSAGES.IMAGE_DELETE });
    } catch (error) {
        
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