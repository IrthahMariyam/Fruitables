const mongoose = require("mongoose");
const Category = require("../../models/categorySchema");
const { STATUS,MESSAGES } = require("../../config/constants");


   const categoryInfo = async (req, res) => {
   try {
    let search = req.query.searchCategory || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

       const [categoryData, totalCategory] = await Promise.all([
       Category.find({
         isDeleted: false, name: { $regex: ".*" + search + ".*", $options: "i" } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
       Category.countDocuments({ isDeleted: false, name: { $regex: ".*" + search + ".*", $options: "i" } }),
       ]);


     const totalPages = Math.ceil(totalCategory / limit);
     res.render("admin-category", {
      cat: categoryData,
      currentPage: page,
      totalPages: totalPages,
      totalCategory: totalCategory,
    });
  } catch (error) {
    
    res.redirect("/pageerror");
  }
};

const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const existCategory = await Category.findOne({
      name: {
        $regex: `^${name}$`,
        $options: "i",
      },
    });
    
    if (existCategory) {
      return res.status(STATUS.BAD_REQUEST).json({ error: MESSAGES.CATEGORY_EXISTS });
    }
    const newCategory = new Category({
      name,
      description,
    });
    await newCategory.save();
    return res.json({ message: MESSAGES.CATEGORY_ADDED });
  } catch (error) {
    return res.status(STATUS.SERVER_ERROR).json({ error: MESSAGES.INTERNAL_ERROR });
  }
};

const categoryListed = async (req, res) => {
  try {
    const categoryId = req.query.id;
    const category = await Category.findById(categoryId);
    
    if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
    }

    category.isListed = true;
    await category.save();

    res.status(200).json({ 
        success: true, 
        message: 'Category listed successfully',
        category: {
            _id: category._id,
            isListed: category.isListed
        }
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const categoryunListed = async (req, res) => {
  try {const categoryId = req.query.id;
    const category = await Category.findById(categoryId);
    
    if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
    }

    category.isListed = false;
    await category.save();

    res.status(200).json({ 
        success: true, 
        message: 'Category unlisted successfully',
        category: {
            _id: category._id,
            isListed: category.isListed
        }
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const editCategory = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    const { name, description } = req.body;

    const cat = await Category.findOne({ _id: id });
    if (!cat) {
      res.redirect("/pageerror");
    }

    const updateCategory = await Category.findByIdAndUpdate(
      id,
      {
        name: name,
        description: description,
      },
      { new: true }
    );

    if (updateCategory) {
      res.status(STATUS.SUCCESS).json({ message: MESSAGES.CATEGORY_ADDED });
    } else {
      res.status(STATUS.NOT_FOUND).json({ error:MESSAGES.CATEGORY_NOT_UPDATED });
    }
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const id = req.params.id; 

    const cat = await Category.findOne({ name: name });
    if (cat) {
      const category = await Category.updateOne(
        { _id: id },
        { $set: { isDeleted: true } }
      );
      res.status(STATUS.SUCCESS).json({ message: MESSAGES.CATEGORY_DELETED });
    } else {
      res.redirect("/pageerror");
    }
  } catch (error) {
    res.redirect("/pageerror");
  }
};

module.exports = {
  categoryInfo,
  addCategory,
  categoryListed,
  categoryunListed,
  editCategory,
  deleteCategory,
};
