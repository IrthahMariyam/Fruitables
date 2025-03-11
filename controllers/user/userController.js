const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Wallet=require('../../models/walletSchema')
const Referrel=require('../../models/referralSchema')
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const session = require("express-session");
const crypto = require("crypto");



const loadHomepage = async (req, res) => {
  try {
    const limit = 9;
    let cartitem
    const category = await Category.find({ isListed: true,isDeleted:false });
     const products = await Product.find({
      isListed: true,
      isDeleted:false ,
       })
      .sort({ productOffer: -1 })
    .populate("category");
     const user = req.session.user;

     const productReviews = await getProductReviewsForHomepage();
     

     if (user) {
      const userData = await User.findOne({ _id: user._id });
      res.locals.name = userData.name;
      res.locals.user = userData.name;
      cartitem=await Cart.findOne({userId:userData._id})
      res.render("home", { user: userData,
         name: req.session.user.name,
         products: products,
         category: category,
         cart:cartitem, productReviews,
         });
     } else {
        res.render("home", {
        user: null,
        name: false,
        products: products,
        category: category,
         productReviews,
      
      });
    }
   
    
  } catch (error) {
    res.status(500).send("server error");
    console.log("not found", error.message);
  }
};


// Function to get reviews from all products for the homepage
const getProductReviewsForHomepage = async () => {
  try {
    // Find all listed products that have at least one review
    const productsWithReviews = await Product.find({
      isListed: true,
      isDeleted: false,
      'review.0': { $exists: true } // Only products with at least one review
    }).select('productName productImage review')
    
    // Format the review data for homepage display
    const formattedReviews = [];
    
    productsWithReviews.forEach(product => {
      product.review.forEach(review => {
        formattedReviews.push({
          productId: product._id,
          productName: product.productName,
          productImage: product.productImage[0], 
          username: review.username,
          text: review.text,
          rating: review.rating,
          date: review.date
        });
      });
    });
    
    // Sort by newest reviews first
    formattedReviews.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Optionally limit the number of reviews returned
    const latestReviews = formattedReviews.slice(0, 10); // Return 10 most recent reviews
    
    return latestReviews;
  } catch (error) {
    console.error("Error fetching product reviews:", error);
    return [];
  }
};

const pageNotFound = async (req, res) => {
  try {
    const user = req.session.user;
    res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};



const success = async (req, res) => {
  try {
    const {id}=req.query;
    const user = req.session.user;
    res.render("success",{orderId:id});
  } catch (error) {
    res.redirect("/success");
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
   const page = parseInt(req.query.page) || 1; 
  const limit = 9; 
  const skip = (page - 1) * limit;
  const gt = parseFloat(req.query.gt) || 0; 
  const lt = parseFloat(req.query.lt) || Infinity; 

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
if (req.query.gt || req.query.lt) {
  baseQuery.salesPrice = { $gt: gt, $lt: lt };
}

 let sortOption = {};
 switch (sort) {
     case "priceHighToLow":
         sortOption = { salesPrice: -1 };
         break;
     case "priceLowToHigh":
         sortOption = { salesPrice: 1 };
         break;
     case "nameAtoZ":
         sortOption = { productName: 1 };
         break;
     case "nameZtoA":
         sortOption = { productName: -1 };
         break;
     default:
         sortOption = { createdOn: -1 }; 
 }

 let products = await Product.find(baseQuery)
 .sort({ productOffer: -1 }||sortOption)
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
 console.error("Error loading the shop page:", error);
 res.redirect("/pageNotFound");
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
    
    const { name, email, phone, password, cpassword,referralCode } = req.body;
    const user = await User.findOne({ email });
     if (user) {
       
      return res.render("signup", {
      success: false,
      message: "User with this email already exists",
       })
     } else {
      const newUser = new User({ name, email, phone, password ,referralCode});
      const otp = generateOTP();
      const emailSent = await sendVerificationEmail(email, otp);
      if (!emailSent) {
        return res.json("email-error");
      } else {
        req.session.userOtp = otp;
        req.session.email=email;
        req.session.referralCode=referralCode
        req.session.userData = { name, email, phone, password ,referralCode};
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
const generateReferralCode = () => {
  const randomString = crypto.randomBytes(3).toString("hex").toUpperCase(); // Generates a 6-character string

   return `FR${randomString}`; 
};


  const verifyOTP = async (req, res) => {
   try {
    const { otp } = req.body;
    
    if (otp.toString() !== req.session.userOtp) {
      return res.status(400).json({ success: false, message: "Invalid OTP, please try again" });
    }

    const user = req.session.userData;
    const passwordHash = await securePassword(user.password);

    const saveUserData = new User({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: passwordHash,
      referralCode: generateReferralCode(),
    });

    await saveUserData.save();
    req.session.user = saveUserData;
    req.session.email = saveUserData.email;
    req.session.name = saveUserData.name;
    
    if (req.session.referralCode) {
      const referrer = await User.findOne({ referralCode: req.session.referralCode });

      if (referrer) {
        
        let referrerWallet = await Wallet.findOne({ userId: referrer._id });
        if (!referrerWallet) {
          referrerWallet = new Wallet({
            userId: referrer._id,
            balance: 100,
            transactions: [{ amount: 100, transactionType: "credit", reason: "Referral Reward", description: "Referral Bonus", timestamp: new Date() }],
          });
        } else {
          referrerWallet.balance += 100;
          referrerWallet.transactions.push({ amount: 100, transactionType: "credit", reason: "Referral Reward", description: "Referral Bonus", timestamp: new Date() });
        }
        await referrerWallet.save();
        referrer.totalAmount = (referrer.totalAmount || 0) + 100;
        await referrer.save();
                
        let userWallet = await Wallet.findOne({ userId: saveUserData._id });
        if (!userWallet) {
          userWallet = new Wallet({
            userId: saveUserData._id,
            balance: 50,
            transactions: [{ amount: 50, transactionType: "credit", reason: "Referral Bonus", description: "Referral Amount", timestamp: new Date() }],
          });
        } else {
          userWallet.balance += 50;
          userWallet.transactions.push({ amount: 50, transactionType: "credit", reason: "Referral Bonus", description: "Referral Amount", timestamp: new Date() });
        }
        await userWallet.save();
        
    
        const referralUser = new Referrel({
          user:saveUserData._id, 
          referredUser: referrer._id,
          referralCode: saveUserData.referralCode,
          totalAmount: 50
        });
        saveUserData.referredBy=referrer._id;
        await saveUserData.save();
        await referralUser.save();
      }
    }

    res.json({ success: true, redirectUrl: "/" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};


const resendOtp = async (req, res) => {
  try {
  
    const email = req.session.email;
    
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }
    const otp = generateOTP();
    req.session.userOtp = otp;
    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      
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
  
    const { email, password } = req.body;
   
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

    req.session.user = findUser;
    
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
    
    const { newPass1, newPass2 } = req.body;
    const email = req.session.email;
    if (newPass1 == newPass2) {
      const passwordHash = await securePassword(newPass1);
      await User.updateOne(
        { email: email },
        { $set: { password: passwordHash } }
      );
      
      res.redirect("/login");
    } else res.render("reset-password", { message: "Password mismatch" });
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};
const getProfilePage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    
    const userData = await User.findById({ _id: userId });
    const cartitem=await Cart.findOne({userId:userId})
    res.render("profile", { user: userData.name,cart:cartitem});
  } catch (error) {
    console.log("Error for retrieve profile data", error);
    res.redirect("/page-404");
  }
};

///profile
const loadProfile=async (req, res) => {
    try {
       const id=req.params;
       
        const user = req.session.user;
       
        if (user) {
            const userData = await User.findOne({_id: user._id });
            const cartitem=await Cart.findOne({userId:userData._id})
            const userAddress = await Address.findOne({userId:user._id }).populate('user._id');
            res.locals.user = userData.name;
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
           
             const user = req.session.user;
             
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
  success,
  loadProfile,
  deleteAccount,

};
