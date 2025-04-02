const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");




const searchProducts = async (req, res) => {

    try {
      
      const id=req.session.user;
      
      const { query,sort } = req.query;
    
     
      const categories = await Category.find({ isListed: true });
     
      const categoryIds = categories.map((category) => category._id.toString());
     
      const page = parseInt(req.query.page) || 1;
     
      const limit = 9;
      const skip = (page - 1) * limit;
     
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
   
  }
      const products = await Product.find({
        isDeleted: false,
        isListed:true,
        productName: { $regex: query, $options: 'i' }
      }).lean()     
      
        .sort(sortOption)
        .skip(skip)
        .limit(limit);
       
      const totalProducts = await Product.countDocuments({
        isListed: true,
        isDeleted:false,
        category: { $in: categoryIds },
        productName: { $regex: query, $options: 'i' },

      });
      
      const totalPages = Math.ceil(totalProducts / limit);
  
      const categoryWithIds = categories.map((category) => ({
        _id: category._id,
        name: category.name,
      }));
          
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
      
      res.status(500).send('Internal Server Error');
    }
  };

const productDetails = async (req, res) => {
  try {
     const userId = req.session.user;
    const productId = req.query.id;
    const product = await Product.findById(productId).populate("category");
    const findCategory = product.category;
    const totalProducts = await Product.find({
      category: findCategory._id,
    }).populate("category");
    const totalProcount = await Product.countDocuments({
      category: findCategory._id,
    }).populate("category");
    const totalcategory = await Category.find({});
   
    const categoryOffer = findCategory?.categoryOffer || 0;
   
    const productOffer = product.productOffer || 0;
  
    const totalOffer = categoryOffer + productOffer;
    
    if (userId) {
      const userData = await User.findById(userId);
     let  cartitem=await Cart.findOne({userId:userId})
     
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
       
      });
    }
   
  } catch (error) {
    
    res.redirect("/pageNotFound");
   
  }
};


const filterCategory=async(req,res)=>{
  try {
    const userId = req.session.user ? req.session.user._id : null;
    const category = req.query.category;
   
    const findCategory = category ? await Category.findOne({ _id: category }) : null;

    const query = {
      isDeleted: false,
    
      
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
    

    
    res.status(500).render("page-404", { error: "An error occurred while filtering products." });
  
  }
};


const productReview = async (req, res) => {
  const { productId, username, rating, reviewText } = req.body;


  try {
    // Fetch the product to check if it exists
    const productreview = await Product.findById(productId);
    
    if (!productreview) {
      return res.status(404).send("Product not found");
    }
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
      { new: true } 
    );

    if (updatedProduct) {
      
      return res.redirect(`/productDetails?id=${productId}`);
    } else {
      return res.status(500).send("Failed to update product with review");
    }
  } catch (error) {
    
    res.status(500).send("Failed to submit review");
  }
};


const loadShopping = async (req, res) => {
  
  try {
 
   const user = req.session.user;
   let userData,cartitem;
   if(user)
    { 
    
     userData = await User.findOne({ _id: user });
     
    cartitem=await Cart.findOne({userId:user._id})
   }
   const categories = await Category.find({ isListed: true ,isDeleted:false}).lean();
   const categoriesIds = categories.map(category => category._id.toString());
 
   const search = req.query.query || ""; 
   const selectedCategory = req.query.category || ""; 
   const sort = req.query.sort || "default"; 
   
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = parseInt(req.query.limit) || 9;
   const skip = (page - 1) * limit;
  
   let baseQuery = {
   isDeleted: false,
      isListed:true,
   };
 
 
 if (search) {
   baseQuery.productName = { $regex: search, $options: "i" };
 }
 
 if (selectedCategory) {
   baseQuery.category = selectedCategory;
 } else {
   baseQuery.category = { $in: categoriesIds }; 
 }
 
 let products;
 let sortOptions = {};
 if (sort === "priceHighToLow") {
     sortOptions = { salesPrice: -1,productOffer: -1  };
 } else if (sort === "priceLowToHigh") {
     baseQuery.salesPrice = { $gte: 0 };
     sortOptions = { salesPrice: 1 };
 } else if (sort === "nameAtoZ") {
     sortOptions = { productName: 1 };
 } else if (sort === "nameZtoA") {
     sortOptions = { productName: -1 };
 } else {
     sortOptions = {}; 
 }
 if(sort!='default')
  products = await Product.find(baseQuery).sort(sortOptions).skip(skip).limit(limit).lean();
 
 else
   products = await Product.find(baseQuery)
  .sort({ productOffer: -1 })
  .skip(skip)
  .limit(limit)
  .lean();
 
 const totalProducts = await Product.countDocuments(baseQuery);
 const totalPages = Math.ceil(totalProducts / limit);
 
 if(user){
   res.locals.user = userData.name; 
  res.render("shop", {
  user: userData,
  products,
  category:categories,
  totalPages,
  currentPage: page,
  search,
  selectedCategory,
  currentSort: sort,
  cart:cartitem,
  });
 }else
 {
     userData=null;
     res.locals.user = null;
     res.render("shop", {
     user: userData,
     products,
     category:categories,
     totalPages,
     currentPage: page,
     search,
     selectedCategory,
     currentSort: sort,
       
    });
 }
 } catch (error) {
  
  res.redirect("/pageNotFound");
    }
 };
 

module.exports={


  productDetails,
  productReview,
  searchProducts,
  loadShopping,
 filterCategory,
  

}