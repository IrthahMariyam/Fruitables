const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const User=require('../../models/userSchema')
const {STATUS,MESSAGES}=require('../../config/constants')

const getCartPage = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.redirect('/login');
    }

    const userData = await User.findOne({ _id: user._id });
    let carts = await Cart.findOne({ userId: userData._id }).populate('items.productId');

    if (carts) {
      

      // Filter out unlisted products
      const filteredItems = carts.items.filter(item => item.productId && item.productId.isListed);

      if (filteredItems.length !== carts.items.length) {
        await Cart.findOneAndUpdate(
          { userId: userData._id },
          { $set: { items: filteredItems } },
          { new: true } 
        );

        // Fetch the **updated cart** after modification
        carts = await Cart.findOne({ userId: userData._id }).populate('items.productId');
      }

      
    }

    if (!carts) {
      return res.render('cart', { carts: [], totalPrice: 0, cart: null, user: userData });
    }

    // Ensure carts exists before using reduce
    let totalAmount = carts.items.length
      ? carts.items.reduce((sum, item) => sum + item.totalPrice, 0)
      : 0;
    let total = Math.round(totalAmount);

    res.render('cart', {
      user: userData,
      carts: carts || { items: [] },
      total: total,
      cart: carts,
    });

  } catch (error) {
    console.error("Error loading cart:", error);
    res.status(500).send("Error loading cart");
  }
};


 const addToCart = async (req, res) => {
  try {
    const { productId } = req.body; 
   
    const userId = req.session.user; 
  
    let cartitemcount=0;
    if(!userId)
    return res.status(STATUS.NOT_FOUND).json({error:MESSAGES.LOGIN_REQUIRED_CART})
    const product = await Product.findOne({_id:productId,isListed:true});
   
    if (!product) {
      return res.status(STATUS.BAD_REQUEST).json({ error: MESSAGES.PRODUCT_NOT_FOUND });
    }

    if (product.stock === 0) {
      return res.status(STATUS.BAD_REQUEST).json({ error: MESSAGES.OUT_OF_STOCK });
    }

    let cart = await Cart.findOne({userId: userId._id });
  
    if (!cart) {
      if (product.stock < 1) {
        return res.status(STATUS.BAD_REQUEST).json({ error:MESSAGES.INSUFFICIENT_STOCK });
      }

      cart = new Cart({
       userId: userId._id,
        items: [
          {
            productId,
            quantity: 1,
            price: product.salesPrice,
            totalPrice: product.salesPrice,
            status:"pending",
          },
        ],
      });
      cartitemcount=1
    } else {
      const existingProduct = cart.items.find((item) => item.productId.toString() === productId);

      if (existingProduct) {
        if (existingProduct.quantity >= product.stock) {
          return res
            .status(STATUS.BAD_REQUEST)
            .json({ error: `Only ${product.stock} units are available in stock` });
        }

        if (existingProduct.quantity + 1 > 5) {
          return res.status(STATUS.BAD_REQUEST).json({ error:MESSAGES.CANNOT_ADD_MORE });
        }

        existingProduct.quantity += 1;
        existingProduct.totalPrice = existingProduct.quantity * existingProduct.salesPrice;
      
      }
       else {
       

        cart.items.push({
          productId,
          quantity: 1,
          price: product.salesPrice,
          totalPrice: product.salesPrice,
          status:"pending",
        });
      }}
        await cart.save();
    cart = await Cart.findOne({ userId:userId._id })
    cartitemcount=cart.items.length
    res.status(STATUS.SUCCESS).json({ message: MESSAGES.PRODUCT_ADDED_TO_CART, cart,cartitemcount:cartitemcount });
      
    

    
  } catch (error) {
    
    res.status(STATUS.SERVER_ERROR).json({ error: MESSAGES. ADD_TO_CART_ERROR});
  }
};

  

  

const removeFromCart = async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(STATUS.UNAUTHORIZED).json({ error:MESSAGES.USER_LOGIN  });
      }
  
      const { productId} = req.body;
      let cart = await Cart.findOne({ userId: req.session.user._id });
      if (!cart) {
        return res.status(STATUS.NOT_FOUND).json({ error:MESSAGES.CART_NOT_FOUND  });
      }
  
      const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
      if (itemIndex === -1) {
        return res.status(STATUS.NOT_FOUND).json({ error: messages.PRODUCT_NOT_IN_CART });
      }
  
      
      const product = await Product.find({_id:productId,isListed:true});
      if (!product) {
        return res.status(STATUS.NOT_FOUND).json({ error: MESSAGES. PRODUCT_FOUND_INVENTORY });
      }
 
      const removedItem = cart.items[itemIndex];
    
      cart.items.splice(itemIndex, 1);
  
      await cart.save();
     
     let cartitemcount=cart.items.length
      res.status(STATUS.SUCCESS).json({ message: MESSAGES.REMOVED_CART,cartitemcount:cartitemcount });
    } catch (error) {
      
      res.status(STATUS.SERVER_ERROR).json({ error: MESSAGES.PRODUCT_REMOVAL_FAILED});
    }
  };
  

const updateCartQuantity = async (req, res) => {
  try {
  
    const { productId, quantity } = req.body;

    const parsedQuantity = parseInt(quantity);

    if (!productId || isNaN(parsedQuantity)) {
      return res.status(STATUS.BAD_REQUEST).json({ error:MESSAGES.INVALID_QUANTITY });
    }

    const cart = await Cart.findOne({ userId: req.session.user._id });
    if (!cart) {
      return res.status(STATUS.NOT_FOUND).json({ error: MESSAGES.CART_NOT_FOUND });
    }
    
    const item = cart.items.find((item) => item.productId.toString() === productId);
    if (!item) {
      return res.status(STATUS.NOT_FOUND).json({ error: MESSAGES. PRODUCT_NOT_IN_CART });
    }
    
   
    const product = await Product.findOne({_id:productId,isListed:true});
    if (!product) {
      return res.status(STATUS.NOT_FOUND).json({ error: MESSAGES.PRODUCT_FOUND_INVENTORY});
    }
    
    item.quantity = parsedQuantity;
    item.totalPrice = parsedQuantity * product.salesPrice;

    await cart.save();

    const cartitemcount = cart.items.reduce((total, item) => total + item.quantity, 0);

    res.status(STATUS.SUCCESS).json({
      newTotalPrice: item.totalPrice,quantity:item.quantity,
      cartitemcount,
    });
  } catch (error) {
    
    res.status(STATUS.SERVER_ERROR).json({ error: MESSAGES.CART_UPDATE_FAILED, details: error.message });
  }
};


  
  module.exports={
    getCartPage,
    addToCart,
    updateCartQuantity,
    removeFromCart,
   
    
  }