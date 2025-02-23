const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const session = require("express-session");



const loadHomepage = async (req, res) => {
  try {
    const limit = 9;
    let cartitem
    const category = await Category.find({ isListed: true,isDeleted:false });
    //const categoryIds=categories.map((category)=>category._id.toString())
    const products = await Product.find({
      isListed: true,
      isDeleted:false ,
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

const success = async (req, res) => {
  try {
    const {id}=req.query;
    const user = req.session.user;
    console.log(user);
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
  console.log("inside shop")
  const user = req.session.user;
 let userData,cartitem;
  if(user)
   { 
    console.log("user",user)
    userData = await User.findOne({ _id: user });
    console.log(user, "user in shop page in session");
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
 // stock: { $gt: 0 },
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
 .sort(sortOption)
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
 //gt, // Pass price range to the view
 //lt,
});
}else
{userData=null;
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
    
   // gt, // Pass price range to the view
   // lt,
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
