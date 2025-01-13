const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const session = require("express-session");

//const { name } = require('ejs')

const loadHomepage = async (req, res) => {
  try {
    const limit = 9;
    const category = await Category.find({ isListed: true });
    //const categoryIds=categories.map((category)=>category._id.toString())
    const products = await Product.find({
      isListed: true,
      quantity: { $gt: 0 },
    })
      .sort({ createdOn: -1 })
      .populate("category");
     // console.log(category)
     // console.log(products)
     const user = req.session.user;

     if (user) {
      const userData = await User.findOne({ _id: user._id });
      //res.locals.name = userData.name;
      console.log(user, "user");
      console.log(userData, "userData");
      console.log("session name", req.session.user.name);

      console.log("session data", req.session.user);
      res.locals.user = userData.name;
      console.log("locals data", res.locals.user);
      res.render("home", { user: userData,
         name: req.session.user.name,
         products: products,
         category: category,
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
    let UserData;
    console.log(user, "user in shop page in session");
    if (user) {
       userData = await User.findOne({ _id: user._id });
      console.log(userData, "userData in shop fun");
      //const userData=await User.findOne({_id:user.id})
      res.locals.user = userData.name; 
      console.log(userData.name);
      //res.render("shop",{user:userData,username:req.session.user})
    } else {
      res.locals.user = null;
     userData=null;
      // res.render('shop',{user:'Guest',name:false})
    }
    const categories = await Category.find({ isListed: true });
    const categoryIds = categories.map((category) => category._id.toString());
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;
    const products = await Product.find({
      isListed: true,
      category: { $in: categoryIds },
      quantity: { $gt: 0 },
    })
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit);
    const totalProducts = await Product.countDocuments({
      isListed: true,
      category: { $in: categoryIds },
      quantity: { $gt: 0 },
    });
    // console.log(totalProducts,"total products")
    const totalPages = Math.ceil(totalProducts / limit);

    const categoryWithIds = categories.map((category) => ({
      _id: category._id,
      name: category.name,
    }));
    res.render("shop", {
      user: userData,
      products: products,
      category: categoryWithIds,
      totalProducts: totalProducts,
      page: page,
      totalPages: totalPages,
    });
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
    console.log("inside loginfindUser", findUser);
    console.log("inside loginfindUsersession", req.session.user);
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
    console.log(userId);
    const userData = await User.findById({ _id: userId });
    res.render("profile", { user: userData.name, loggedIn: false });
  } catch (error) {
    console.log("Error for retrieve profile data", error);
    res.redirect("/pageNotFound");
  }
};
const filterProduct = async (req, res) => {
  try {
    const user = req.session.user;
    console.log("inside filter", user);
    const category = req.query.category;
    const findCategory = category
      ? await Category.findOne({ _id: category })
      : null;

    const query = {
      isDeleted: false,
      quantity: { $gt: 0 },
    };

    if (findCategory) {
      query.category = findCategory._id;
    }

    let findProducts = await Product.find(query).lean();
    const categories = await Category.find({ isListed: true });
    const limit = 4;
    const page = parseInt(req.query.page) || 1;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const totalPages = Math.ceil(findProducts.length / limit);
    let currentProduct = findProducts.slice(startIndex, endIndex);

    let userData = null;
    if (user) {
      userData = await User.findOne({ _id: user });
      if (userData) {
        userData = await User.findOne({ _id: user });
        if (userData) {
          const searchEntry = {
            category: findCategory ? findCategoty._id : null,
            searchedOn: new Date(),
          };
          userData.searchHistory.push(searchEntry);
          await userData.save();
        }
      }
    }

    req.session.filterProducts = currentProduct;

    res.render("shop", {
      user: userData,
      products: currentProduct,
      category: categories,
      totalPages,
      page,
      selectedCategory: category || null,
    });
    console.log("out of shop");
  } catch (error) {
    console.error(error);
    res.status(500).render("errorPage"); // Render an error page
  }
};
const productDetails = async (req, res) => {
  try {
    console.log("inside detail page");
    const userId = req.session.user;
    console.log(
      userId,
      "userid in product data starttedd first in product details"
    );
    if (userId) {
      const userData = await User.findById(userId);
      console.log(userData, "userdata in product details");
    } else {
      userData = null;
    }
    const productId = req.query.id;
    const product = await Product.findById(productId).populate("category");

    console.log("products", product);
    console.log("ended lProducts");
    const findCategory = product.category;
    console.log(findCategory, "finded ategory");

    //const totalProducts=await Product.findById(findCategory._id).populate('category')
    const totalProducts = await Product.find({
      category: findCategory._id,
    }).populate("category");
    const totalProcount = await Product.countDocuments({
      category: findCategory._id,
    }).populate("category");
    const totalcategory = await Category.find({});
    console.log("totalcount=", totalProcount);
    console.log("totalProducts", totalProducts);
    const categoryOffer = findCategory?.categoryOffer || 0;
    console.log(categoryOffer, "category");
    const productOffer = product.productOffer || 0;
    console.log(productOffer, "prduc ofer");
    const totalOffer = categoryOffer + productOffer;
    console.log(totalOffer, "finded");

    res.render("product-details", {
      user: userData,
      product: product,
      quantity: product.quantity,
      totalOffer: totalOffer,
      category: findCategory,
      totalProducts: totalProducts,
      totalProcount: totalProcount,
      totalcategory: totalcategory,
    });
  } catch (error) {
    console.error("Error for fetching product details", error.stack);
    res.redirect("/pageNotFound");
    // console.error(error?.response?.data?.message || error?.message || 'Error adding product')
  }
};

const productReview = async (req, res) => {
  const { productId, username, rating, reviewText } = req.body;
  console.log(req.body, "product review");
  console.log(productId, username, rating, reviewText);
  console.log("inside object");
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
       console.log(id,"inside loadprofile params id value")
        const user = req.session.user;
        console.log(user);
        if (user) {
            const userData = await User.findOne({_id: user._id });
            // const useraddress=await Address.findOne({userId:user._id})
            const userAddress = await Address.findOne({userId:user._id }).populate('user._id');
            res.locals.user = userData.name;
            console.log(userData,"userinside loadprofile")
            console.log(userAddress,"useraddressinside loadprofile")
          //  console.log("session name", req.session.user.name);
            console.log("locals data", res.locals.user);
            console.log("session data", req.session.user);
            if(userData){
                res.render("profile",{user:userData,
                             address:userAddress,
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
  filterProduct,
  productDetails,
  productReview,



  loadProfile,
  deleteAccount,

};
