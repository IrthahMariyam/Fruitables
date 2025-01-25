const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const session = require("express-session");

//const { name } = require('ejs')

const loadHomepage = async (req, res) => {
  try {
    const limit = 9;
    let cartitem
    const category = await Category.find({ isListed: true });
    //const categoryIds=categories.map((category)=>category._id.toString())
    const products = await Product.find({
      isListed: true,
    //   stock: { $gt: 0 },
    })
      .sort({ createdOn: -1 })
      .populate("category");
    
     // console.log(category)
     // console.log(products)
     const user = req.session.user;

     if (user) {
      const userData = await User.findOne({ _id: user._id });
      res.locals.name = userData.name;
      // console.log(user, "user");
      // console.log(userData, "userData");
      // console.log("session name", req.session.user.name);

      // console.log("session data", req.session.user);
      res.locals.user = userData.name;
      
     // console.log("locals data", res.locals.user);
     cartitem=await Cart.findOne({userId:userData._id})
    
    
    //console.log("cart items==================",cartitem)
      res.render("home", { user: userData,
         name: req.session.user.name,
         products: products,
         category: category,
       cart:cartitem
         });
     } else {
      //  res.locals.name = 'Guest';
      res.render("home", {
        user: null,
        name: false,
        products: products,
        category: category,
        
      });
    }
  } catch (error) {
    res.status(500).send("server error");
    console.log("not found", error.message);
  }
};

const pageNotFound = async (req, res) => {
  try {
    const user = req.session.user;
    console.log(user);
    res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const loadSignup = async (req, res) => {
  try {
    return res.render("signup");
  } catch (error) {
    console.log("SignUp page not loading", error);
    res.status(500).send("server Error");
  }
};

const loadShopping = async (req, res) => {
  try {
    const user = req.session.user;
    let UserData, cartitem;
    console.log(user, "user in shop page in session");
   
    const categories = await Category.find({ isListed: true });
    const categoryIds = categories.map((category) => category._id.toString());
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;
    const products = await Product.find({
      isListed: true,
      category: { $in: categoryIds },
    //   stock: { $gt: 0 },
    })
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit);
    const totalProducts = await Product.countDocuments({
      isListed: true,
      category: { $in: categoryIds },
    //   stock: { $gt: 0 },
    });
    // console.log(totalProducts,"total products")
    const totalPages = Math.ceil(totalProducts / limit);

    const categoryWithIds = categories.map((category) => ({
      _id: category._id,
      name: category.name,
    }));

    if (user) {
      userData = await User.findOne({ _id: user._id });
      cartitem=await Cart.findOne({userId:user._id})
     console.log(userData, "userData in shop fun");
     //const userData=await User.findOne({_id:user.id})
     res.locals.user = userData.name; 
     console.log(userData.name);
     //res.render("shop",{user:userData,username:req.session.user})
     res.render("shop", {
      user: userData,
      products: products,
      category: categoryWithIds,
      totalProducts: totalProducts,
      page: page,
      totalPages: totalPages,
      cart:cartitem
    });
   } else {
     res.locals.user = null;
    userData=null;
    res.render("shop", {
      user: userData,
      products: products,
      category: categoryWithIds,
      totalProducts: totalProducts,
      page: page,
      totalPages: totalPages,
      
    });
  }
    // res.render("shop", {
    //   user: userData,
    //   products: products,
    //   category: categoryWithIds,
    //   totalProducts: totalProducts,
    //   page: page,
    //   totalPages: totalPages,
    //   cart:cartitem.items
    // });
  } catch (error) {
    res.status(500).send("server error");
    console.log("not found", error.message);
  }
};
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP:${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
}
const signup = async (req, res) => {
  try {
    console.log("inside sigup controller")
    const { name, email, phone, password, cpassword } = req.body;
    console.log(name, email, phone, password,cpassword)
    // if (password !== cpassword)
    //   return res.render("signup", { message: "password mismatch" });
    const user = await User.findOne({ email });
    //console.log(user," consoleuser")
    if (user) {
      console.log("User already exists");
      return res.render("signup", {
        message: "User with this email already exists",
      });
    } else {
      const newUser = new User({ name, email, phone, password });
      console.log(newUser); //newUser
      // await newUser.save();
      const otp = generateOTP();
      const emailSent = await sendVerificationEmail(email, otp);
      if (!emailSent) {
        return res.json("email-error");
      } else {
        req.session.userOtp = otp;
        req.session.email=email;
        req.session.userData = { name, email, phone, password };
        res.render("verify-otp",{email:email});
        console.log("Otp Sent", otp);
      }
    }
  } catch (error) {
    console.error("signup error for newUser", error);
    res.redirect("/pageNotFound");
  }
};
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {}
};

const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log("entered otp :" + otp);
    if (otp.toString() == req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);
      const saveUserData = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: passwordHash,
      });
      await saveUserData.save();
      req.session.user = saveUserData;
      req.session.name = saveUserData.name;
      res.json({
        success: true,
        redirectUrl: "/"
      });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid OTP,please try again" });
    }
  } catch (error) {
    console.error("Error Verifyimg OTP", error);
    res.status(500).json({ success: false, message: "An error occured" });
  }
};

const resendOtp = async (req, res) => {
  try {
    console.log("inside resend");
    console.log(req.session.email);
    console.log(req.body.email)
    const email = req.session.email;
    console.log("email " + email);
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }
    const otp = generateOTP();
    req.session.userOtp = otp;
    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("Resend OTP", otp);
      res
        .status(200)
        .json({ success: true, message: "OTP Resend Successfully" });
    } else {
      res
        .status(500)
        .json({
          success: false,
          message: "Failed to resend OTP.Please try again",
        });
    }
  } catch (error) {
    console.error("Error resending OTP", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error,Please try again",
      });
  }
};

const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) return res.render("login");
    else res.redirect("/");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const userlogin = async (req, res) => {
  try {
    console.log("User inside login");
    const { email, password } = req.body;
    console.log(req.body);
    const findUser = await User.findOne({ email: email, isAdmin: false });
    if (!findUser) {
      return res.render("login", { message: "User not found" });
    }
    if (!findUser.password) {
      return res.render("login", {
        message:
          "No password set. Please login with Google or reset your password.",
      });
    }
    if (findUser.isBlocked) {
      return res.render("login", { message: "User bolcked by admin" });
    }
    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res.render("login", { message: "Incorrect password" });
    }

    //req.session.user={_id:findUser.id,name:findUser.name}
    //   req.locals.user=findUser.name;
    console.log("inside userLogin", req.session.user);

    req.session.user = findUser;
    //console.log("inside loginfindUser", findUser);
    //console.log("inside loginfindUsersession", req.session.user);
    res.redirect("/");
  } catch (error) {
    console.error("login error", error);
    res.render("login", { message: "login failed.plase try again later" });
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Session destruction error", err.message);
        return res.redirect("/pageNotFound");
      }
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("logout error", error);
    res.redirect("/pageNotFound");
  }
};

const getforgotPasswordPage = async (req, res) => {
  try {
    res.render("forgot-password");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const forgotpasswordEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const findUser = User.findOne({ email: email });
    if (findUser) {
      const otp = generateOTP();
      const sendEmail = await sendVerificationEmail(email, otp);
      if (sendEmail) {
        req.session.userOtp = otp;
        req.session.email = email;
        res.render("forgot-verify-otp");
        console.log("otp = ", otp);
      } else {
        res.json({
          success: false,
          message: "failed to send otp,please try again",
        });
      }
    } else {
      res.render("forgot-password", {
        message: "User with this email does not exists",
      });
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const forgotverifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log("entered otp :" + otp);
    if (otp.toString() == req.session.userOtp) {
      res.json({ success: true, redirectUrl: "/reset-password" });
    } else res.json({ success: false, message: "OTP mismatch" });
  } catch (error) {
    console.error("Error Verifyimg OTP", error);
    res
      .status(500)
      .json({ success: false, message: "An error occured.please try again" });
  }
};

const getResetPasswordPage = async (req, res) => {
  try {
    res.render("reset-password");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};
const getverifyOTPpage = async (req, res) => {
  try {
    res.render("forgot-verify-otp");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};
const postNewPassword = async (req, res) => {
  try {
    //console.log('haiiiiiii')
    const { newPass1, newPass2 } = req.body;
    const email = req.session.email;
    if (newPass1 == newPass2) {
      const passwordHash = await securePassword(newPass1);
      await User.updateOne(
        { email: email },
        { $set: { password: passwordHash } }
      );
      console.log("succes");
      res.redirect("/login");
    } else res.render("reset-password", { message: "Password mismatch" });
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};
const getProfilePage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    //console.log(userId);
    const userData = await User.findById({ _id: userId });
    const cartitem=await Cart.findOne({userId:userId})
    res.render("profile", { user: userData.name,cart:cartitem});
  } catch (error) {
    console.log("Error for retrieve profile data", error);
    res.redirect("/page-404");
  }
};

const filterProduct = async (req, res) => {


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
            
      
      res.render("shop", {
         user: userData,
        products: currentProduct,
        category: categories,
        totalPages,
        page,
        selectedCategory: category || null,
        cart:cartitem
      });
    }
    else{
    res.render("shop", {
      user: userData,
     products: currentProduct,
     category: categories,
     totalPages,
     page,
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
    // res.render("product-details", {
    //   user: userData,
    //   product: product,
    //   stock: product.stock,
    //   totalOffer: totalOffer,
    //   category: findCategory,
    //   totalProducts: totalProducts,
    //   totalProcount: totalProcount,
    //   totalcategory: totalcategory,
    //   cart:cartitem.items,
    // });
  } catch (error) {
    console.error("Error for fetching product details", error.stack);
    res.redirect("/pageNotFound");
    // console.error(error?.response?.data?.message || error?.message || 'Error adding product')
  }
};

const productReview = async (req, res) => {
  const { productId, username, rating, reviewText } = req.body;
//   console.log(req.body, "product review");
//   console.log(productId, username, rating, reviewText);
//   console.log("inside object");
  try {
    // Find product and push new review to its array
    await Product.findByIdAndUpdate(productId, {
      $push: {
        review: {
          username,
          rating,
          text: reviewText,
          date: new Date().toLocaleString(),
        },
      },
    });

    // Redirect back to product page
    res.redirect(`/productDetails?id=${productId}`);
  } catch (error) {
    res.status(500).send("Failed to submit review");
  }
};









///profile
const loadProfile=async (req, res) => {
    try {
       const id=req.params;
       //console.log(id,"inside loadprofile params id value")
        const user = req.session.user;
       // console.log(user);
        if (user) {
            const userData = await User.findOne({_id: user._id });
            const cartitem=await Cart.findOne({userId:userData._id})
            // const useraddress=await Address.findOne({userId:user._id})
            const userAddress = await Address.findOne({userId:user._id }).populate('user._id');
            res.locals.user = userData.name;
           // console.log(userData,"userinside loadprofile")
            //console.log(userAddress,"useraddressinside loadprofile")
          //  console.log("session name", req.session.user.name);
            console.log("locals data", res.locals.user);
            console.log("session data", req.session.user);
            if(userData){
                res.render("profile",{user:userData,
                             address:userAddress,
                             cart:cartitem
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
                 const cartitem=await Cart.findOne({userId:userData._id})
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


const getFilteredProducts = async (req, res) => {
    try {
        const { keyword, sortBy, minPrice, maxPrice, inStock } = req.query;
    
        const filters = {};
    
        if (keyword) {
          filters.name = { $regex: keyword, $options: 'i' };
        }
        if (minPrice != null || maxPrice != null) {
          filters.price = {};
          if (minPrice != null) filters.price.$gte = Number(minPrice);
          if (maxPrice != null) filters.price.$lte = Number(maxPrice);
        }
        if (inStock !== undefined) {
          filters.stock = { $gt: 0 };
        }
    
        let sortOption = {};
        switch (sortBy) {
          case 'popularity':
            sortOption = { popularity: -1 };
            break;
          case 'priceAsc':
            sortOption = { price: 1 };
            break;
          case 'priceDesc':
            sortOption = { price: -1 };
            break;
          case 'averageRatings':
            sortOption = { averageRating: -1 };
            break;
          case 'featured':
            sortOption = { featured: 1 };
            break;
          case 'newArrivals':
            sortOption = { createdAt: -1 };
            break;
          case 'aToZ':
            sortOption = { name: 1 };
            break;
          case 'zToA':
            sortOption = { name: -1 };
            break;
          default:
            sortOption = { createdAt: -1 };
        }
    
        const products = await Product.find(filters).sort(sortOption);
        res.json(products);
      } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    
  };
const searchProducts = async (req, res) => {

    try {
      const id=req.session.user._id;
      //console.log(id,"===============================")
      const { query } = req.query;
      const categories = await Category.find({ isListed: true });
      const categoryIds = categories.map((category) => category._id.toString());
      const page = parseInt(req.query.page) || 1;
      const limit = 9;
      const skip = (page - 1) * limit;
      const products = await Product.find({
        isDeleted: false,
        productName: { $regex: query, $options: 'i' } // Case-insensitive regex search
      }).lean()     
      
        .sort({ createdOn: -1 })
        .skip(skip)
        .limit(limit);
      const totalProducts = await Product.countDocuments({
        isListed: true,
        category: { $in: categoryIds },
      //   stock: { $gt: 0 },
      });
      // console.log(totalProducts,"total products")
      const totalPages = Math.ceil(totalProducts / limit);
  
      const categoryWithIds = categories.map((category) => ({
        _id: category._id,
        name: category.name,
      }));
     


  
      // If no query provided, return all products
      
      if (!query) {
        const product = await Product.find({ isDeleted: false }).lean();
        return res.render("shop", {
        
          products: product,
          category: categoryWithIds,
          totalProducts: totalProducts,
          page: page,
          totalPages: totalPages,
        });
  
      }
      const user = req.session.user;
      console.log(user);
      if (user) {
          const userData = await User.findOne({_id:id });
          const cartitem=await Cart.findOne({userId:userData._id})
        
      res.render('shop', { products:products , 
        category: categoryWithIds,
        totalProducts: totalProducts,
          page: page,
          totalPages: totalPages,
        cart:cartitem  });
    }else{
      res.render('shop', { products:products , 
        category: categoryWithIds,
        totalProducts: totalProducts,
          page: page,
          totalPages: totalPages,  });
    } 
  }
    catch (error) {
      console.error('Error in searchProducts:', error);
      res.status(500).send('Internal Server Error');
    }
  };
  


  
  const searchAndSortProducts = async (req, res) => {
    try {
      const { keyword, sortBy, page = 1 } = req.query;
  const category=await await Category.find({});
      // Base query for products
      const query = { isDeleted: false };
      //const categories = await Category.find({});
  
      // If a keyword is provided, perform a case-insensitive search
      if (keyword) {
        query.productName = { $regex: new RegExp(keyword, "i") };
      }
  
      // Sorting logic
      let sort = {};
      switch (sortBy) {
        case "priceAsc":
          sort.price = 1; // Sort by price low to high
          break;
        case "priceDesc":
          sort.price = -1; // Sort by price high to low
          break;
        case "instock":
          query.stock = { $gt: 0 }; // Filter for products in stock
          break;
        case "newArrivals":
          sort.createdOn = -1; // Newest products first
          break;
        case "featured":
          sort.isFeatured = -1; // Featured products
          break;
        case "popularity":
          sort.popularity = -1; // Most popular products
          break;
        case "averageRatings":
          sort.averageRating = -1; // Highest-rated products
          break;
        case "aToZ":
          sort.productName = 1; // Alphabetical order (A to Z)
          break;
        case "zToA":
          sort.productName = -1; // Reverse alphabetical order (Z to A)
          break;
        default:
          sort = {}; // Default sorting (no specific order)
      }
  
      // Pagination setup
      const limit = 9;
      const skip = (page - 1) * limit;
  
      // Fetch filtered and sorted products with pagination
      const products = await Product.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
  
      // Count total products for pagination
      const totalProducts = await Product.countDocuments(query);
      const totalPages = Math.ceil(totalProducts / limit);
      const id = req.session.user;
      console.log(req.session.user,"===============================")
      if(id){
        const userData = await User.findOne({_id:id._id });
        const cartitem=await Cart.findOne({userId:req.session.user._id})
        res.status(200).render("shop", {
          products,
          sortBy: sortBy || "default", // Pass default if no sortBy is provided
          keyword: keyword || "", // Pass empty string if no keyword is provided
          totalProducts,
          category:category,
          page: parseInt(page),
          totalPages,
          cart:cartitem,
        });
      }else
      {
        res.status(200).render("shop", {
          products,
          sortBy: sortBy || "default", // Pass default if no sortBy is provided
          keyword: keyword || "", // Pass empty string if no keyword is provided
          totalProducts,
          category:category,
          page: parseInt(page),
          totalPages,
        });
      }
     
    } catch (error) {
      console.error("Error in searchAndSortProducts:", error);
      res.status(500).json({ error: "Failed to fetch products." });
    }
  
  };
  

  


module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  loadShopping,
  signup,
  verifyOTP,
  resendOtp,
  loadLogin,
  userlogin,
  logout,
  getforgotPasswordPage,
  forgotpasswordEmail,
  forgotverifyOTP,
  getResetPasswordPage,
  getverifyOTPpage,
  postNewPassword,
  getProfilePage,
  filterProduct,
  productDetails,
  productReview,
  getFilteredProducts,
  searchProducts,
  searchAndSortProducts,


  loadProfile,
  deleteAccount,

};
