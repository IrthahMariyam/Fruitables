const mongoose = require("mongoose");
const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");

// error page
const pageerror = async (req, res) => {
  res.render("admin-error");
};


const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  res.render("admin-login", { message: "null" });
  
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findOne({ email, isAdmin: true });
    if (admin) {
      const passwordMatch = await bcrypt.compare(password, admin.password);
      if (passwordMatch) {
        req.session.admin = admin;
        return res.redirect("/admin");
      } else {
        return res.render("admin-login",{message:"password mismatch"});
      }
    } else {
      return res.render("admin-login",{message:"Email id incorrect"});
    }
  } catch (error) {
    
    return res.redirect("/pageerror");
  }
};

const loadDashboard = async (req, res) => {
  if (req.session.admin) {
    try {
      res.render("dashboard");
    } catch (error) {
      res.redirect("/pageerror");
    }
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.redirect("/pageerror");
      }
      res.redirect("/admin/login");
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

//EXPORTING
module.exports = {
  loadLogin,
  login,
  loadDashboard,
  logout,
  pageerror,
};
