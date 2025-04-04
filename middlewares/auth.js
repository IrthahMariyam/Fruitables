const User = require("../models/userSchema");


const userAuth = async (req, res, next) => {
  try {
  
    if (req.session.user) {
      const user = await User.findById(req.session.user._id);

      if (user && !user.isBlocked) {
        res.locals.user = user.name; 
         next(); 
      } else {
        res.locals.user = null; 
        req.session.user=null
       res.render("signup",{message:"user blocked by admin"})
       
      
       
      }
    } else {
      res.locals.user =null; 
      next();
    }
  } catch (error) {
    console.log("Error in user auth middleware:", error);
    res.status(500).send("Internal server error");
  }
};



const adminAuth = async (req, res, next) => {
  try {
    if (!req.session.admin) {
        return res.redirect("/admin/login");
    }

    const admin = await User.findOne({
      isAdmin: true,
      _id: req.session.admin._id,
    });

    if (!admin) {
       return res.redirect("/admin/login");
    }

    next();
  } catch (error) {
    res.redirect("/admin/login");
  }
};

module.exports = {
  userAuth,
  adminAuth,
};
