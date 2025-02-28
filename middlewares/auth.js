const User = require("../models/userSchema");
const Address = require("../models/addressSchema");

const userAuth = async (req, res, next) => {
  try {console.log("inside userrauth start");
  
    if (req.session.user) {
      const user = await User.findById(req.session.user);

      if (user && !user.isBlocked) {
        res.locals.user = user.name; // Store username in locals.user
        console.log("User authenticated,locals.user:", res.locals.user);
        console.log("User authenticated:", req.session.user);
        next(); 
      } else {
        res.locals.user = null; 
        next();
       // res.redirect("/login");
       
      }
    } else {
      res.locals.user =null; 
      console.log("inside userrauth start no session");
      console.log(res.locals.user);
     // res.redirect("/login");
     //  res.render("home")
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
