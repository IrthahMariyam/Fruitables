const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const session = require("express-session");



const searchProducts = async (req, res) => {
 
    try {console.log("insise searchproducts===============")
      
      const id=req.session.user;
      // console.log(id,"===============================")
      // console.log(req.session.user)
      const { query,sort } = req.query;
    

      // console.log(query,"query=======================")
      // console.log(req.query,"--------------------------------")
  //  let {sort}=req.sort;
     console.log(sort,"sort=======================")
     
      const categories = await Category.find({ isListed: true });
      //console.log("categories=======",categories)
      const categoryIds = categories.map((category) => category._id.toString());
     // console.log("categoryIds=========",categoryIds)
      const page = parseInt(req.query.page) || 1;
      //console.log("page=================",page)
      const limit = 9;
      const skip = (page - 1) * limit;
      console.log("skip====================",skip)
      let sortOption = {};
      if(sort)
  {
  
    switch(sort) {
      case 'popularity':
        sortOption = { popularity: -1 };
        break;
      case 'priceAsc':
        sortOption = { salesPrice: 1 };
        break;
      case 'priceDesc':
        sortOption = { salesPrice: -1 };
        break;
     
      case 'averageRatings':
        sortOption = { averageRating: -1 };
        break;
      case 'featured':
        sortOption = { isFeatured: "true" };
        break;
      case 'newArrivals':
        sortOption = { createdOn: -1 };
        break;
      case 'aToZ':
        sortOption = { productName: 1 };
        break;
      case 'zToA':
        sortOption = { productName: -1 };
        break;
      default:
        sortOption = { createdOn: -1 };

    }
    console.log("sortoption=========",sortOption)
  }
      const products = await Product.find({
        isDeleted: false,
        isListed:true,
        productName: { $regex: query, $options: 'i' } // Case-insensitive regex search
      }).lean()     
      
        .sort(sortOption)
        .skip(skip)
        .limit(limit);
        console.log("products===================",products)
      const totalProducts = await Product.countDocuments({
        isListed: true,
        isDeleted:false,
        category: { $in: categoryIds },
        productName: { $regex: query, $options: 'i' },
      //   stock: { $gt: 0 },
      });
       console.log(totalProducts,"total products")
      const totalPages = Math.ceil(totalProducts / limit);
  
      const categoryWithIds = categories.map((category) => ({
        _id: category._id,
        name: category.name,
      }));
     

console.log("totalpages============",totalPages)
console.log("categoryWithIds=====",categoryWithIds)
  
      // If no query provided, return all products
      
      if (!query) {
        const product = await Product.find({ isDeleted: false ,isListedd:true,}).lean();
        return res.render("shop", {
        
          products: products,
          category: categoryWithIds,
          totalProducts: totalProducts,
          currentPage: page,
          totalPages: totalPages,
          query,
        });
  
      }
      const user = req.session.user;
      console.log(user);
      if (user) {
          const userData = await User.findOne({_id:id });
          const cartitem=await Cart.findOne({userId:userData._id})
          res.locals.user = userData.name;
      res.render('shop', {
        user:userData,
        products:products , 
        category: categoryWithIds,
        totalProducts: totalProducts,
          currentPage: page,
          totalPages: totalPages,
          query,
        cart:cartitem  });
    }else{
      res.locals.user = null;
      userData=null;
      res.render('shop', { 
        user: userData,

        products:products , 
        category: categoryWithIds,
        totalProducts: totalProducts,
          currentPage: page,
          totalPages: totalPages, 
        query, });
    } 
  }
    catch (error) {
      console.error('Error in searchProducts:', error);
      res.status(500).send('Internal Server Error');
    }
  };
  
const filterCategory=async(req,res)=>{
    try {
      const userId = req.session.user ? req.session.user._id : null;
      const category = req.query.category;
     
      const findCategory = category ? await Category.findOne({ _id: category }) : null;
  
      const query = {
        isDeleted: false,
      
        // stock: { $gt: 0 },
      };
  
      if (findCategory) {
        query.category = findCategory._id;
      }
  
      const findProducts = await Product.find(query).lean();
  
      const limit = 4;
      const page = parseInt(req.query.page) || 1;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const totalPages = Math.ceil(findProducts.length / limit);
      const currentProduct = findProducts.slice(startIndex, endIndex);
      const categories = await Category.find({ isListed: true });
      let userData = null;
      if (userId) {
        userData = await User.findById(userId);
        const cartitem=await Cart.findOne({userId:userId})
        // if (userData && findCategory) {
        //   const searchEntry = {
        //     category: findCategory._id,
        //     searchedOn: new Date(),
        //   };
  
        //   userData.searchHistory.push(searchEntry);
        //   await userData.save();
        // }
            
        res.locals.user = userData.name;
      res.render("shop", {
         user: userData,
        products: currentProduct,
        category: categories,
        totalPages,
        currentPage: page,
        search:"",
        currentSort:"",
        selectedCategory: category || null,
        cart:cartitem
      });
    }
    else{
      res.locals.user = null;
    res.render("shop", {
      user: userData,
     products: currentProduct,
     category: categories,
     totalPages,
     currentPage: page,
     search:"",
     currentSort:"",
     selectedCategory: category || null,
   
   });
  }
    } catch (error) {
      console.error("Error in filterProduct:", error);
  
      
      res.status(500).render("page-404", { error: "An error occurred while filtering products." });
    
    }
  };
  



  const filterProduct = async (req, res) => {


    try {
      const userId = req.session.user ? req.session.user._id : null;
      const category = req.query.category;
     const sort=req.query.sort
    // const search=req.query.search
     console.log("====================",sort)
    // console.log("==================",search)
      const findCategory = category ? await Category.findOne({ _id: category }) : null;
  
      let query = {
        isDeleted: false,
      // stock: { $gt: 0 },
      
       
      };
     
      //=====================================================
      let sortOption = {};
      if(sort)
  {
  
    switch(sort) {
      case 'popularity':
        sortOption = { popularity: -1 };
        break;
      case 'priceAsc':
        sortOption = { salesPrice: 1 };
        break;
      case 'priceDesc':
        sortOption = { salesPrice: -1 };
        break;
     
      case 'averageRatings':
        sortOption = { averageRating: -1 };
        break;
      case 'featured':
        sortOption = { isFeatured: "true" };
        break;
      case 'newArrivals':
        sortOption = { createdOn: -1 };
        break;
      case 'aToZ':
        sortOption = { productName: 1 };
        break;
      case 'zToA':
        sortOption = { productName: -1 };
        break;
      default:
        sortOption = { createdOn: -1 };

    }
    console.log("sortoption=========",sortOption)
  }
    //======================================================
      if (findCategory) {
        query.category = findCategory._id;
      }
  
    
  
      const limit = 4;
      const page = parseInt(req.query.page) || 1;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      // const findProducts = await Product.find(query).lean();
      const findProducts = await Product.find(query).sort(sortOption)
      .skip(startIndex)
      .limit(limit)
      .lean();
      const totalPages = Math.ceil(findProducts.length / limit);
      const currentProduct = findProducts.slice(startIndex, endIndex);
      const categories = await Category.find({ isListed: true });
    
      let userData = null;
      if (userId) {
        userData = await User.findById(userId);
        const cartitem=await Cart.findOne({userId:userId})
     
      res.render("shop", {
         user: userData,
        products: currentProduct,
        category: categories,
        totalPages,
        currentPage:page,
        selectedCategory: category || null,
        cart:cartitem,
        query:""
      });
    }
    else{
    res.render("shop", {
      user: userData,
     products: currentProduct,
     category: categories,
     totalPages,
     currentPage:page,
     query:"",
     selectedCategory: category || null,
   
   });
  }
    } catch (error) {
      console.error("Error in filterProduct:", error);
  
      
      res.status(500).render("page-404", { error: "An error occurred while filtering products." });
    
    }
  };
  
  
const productDetails = async (req, res) => {
  try {
  //  console.log("inside detail page");
    const userId = req.session.user;
    // console.log(  userId,  "userid in product data started first in product details");
   
    const productId = req.query.id;
    const product = await Product.findById(productId).populate("category");

    // console.log("products", product);
    // console.log("ended lProducts");
    const findCategory = product.category;
    // console.log(findCategory, "finded ategory");

    //const totalProducts=await Product.findById(findCategory._id).populate('category')
    const totalProducts = await Product.find({
      category: findCategory._id,
    }).populate("category");
    const totalProcount = await Product.countDocuments({
      category: findCategory._id,
    }).populate("category");
    const totalcategory = await Category.find({});
    // console.log("totalcount=", totalProcount);
    // console.log("totalProducts", totalProducts);
    const categoryOffer = findCategory?.categoryOffer || 0;
    // console.log(categoryOffer, "category");
    const productOffer = product.productOffer || 0;
    // console.log(productOffer, "prduc ofer");
    const totalOffer = categoryOffer + productOffer;
    // console.log(totalOffer, "finded");
    if (userId) {
      const userData = await User.findById(userId);
     let  cartitem=await Cart.findOne({userId:userId})
      //console.log(userData, "userdata in product details");
      res.render("product-details", {
        user: userData,
        product: product,
        stock: product.stock,
        totalOffer: totalOffer,
        category: findCategory,
        totalProducts: totalProducts,
        totalProcount: totalProcount,
        totalcategory: totalcategory,
        cart:cartitem,
      });
    } else {
      userData = null;
      res.render("product-details", {
        user: userData,
        product: product,
        stock: product.stock,
        totalOffer: totalOffer,
        category: findCategory,
        totalProducts: totalProducts,
        totalProcount: totalProcount,
        totalcategory: totalcategory,
        // cart:cartitem.items,
      });
    }
   
  } catch (error) {
    console.error("Error for fetching product details", error.stack);
    res.redirect("/pageNotFound");
    // console.error(error?.response?.data?.message || error?.message || 'Error adding product')
  }
};
const productReview = async (req, res) => {
  const { productId, username, rating, reviewText } = req.body;
  console.log(req.body, "product review");

  try {
    // Fetch the product to check if it exists
    const productreview = await Product.findById(productId);
    
    if (!productreview) {
      return res.status(404).send("Product not found");
    }

    console.log(productreview, "==============");

    // Update the product with the new review
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        $push: {
          review: {
            username: username,
            rating: rating,
            text: reviewText,
            date: new Date().toLocaleString(),
          },
        },
      },
      { new: true } // Ensures you get the updated document
    );

    if (updatedProduct) {
      console.log("Review saved successfully");
      return res.redirect(`/productDetails?id=${productId}`);
    } else {
      return res.status(500).send("Failed to update product with review");
    }
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).send("Failed to submit review");
  }
};


module.exports={

  filterProduct,
  productDetails,
  productReview,
  searchProducts,
  filterCategory,
  

}