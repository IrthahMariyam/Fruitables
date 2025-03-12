const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const User=require('../../models/userSchema')
const { v4: uuidv4 } = require('uuid');


const getCartPage = async (req, res) => {
       try {
      const user=req.session.user;
       if (!user) {
        return res.redirect('/login'); 
       }
       const userData = await User.findOne({_id: user._id });
     
      const carts = await Cart.findOne({ userId: userData._id }).populate('items.productId');

      if (carts) {
          // Filter out unlisted products
          const filteredItems = carts.items.filter(item => item.productId && item.productId.isListed);
      
          // Update the cart with only the listed products
          await Cart.updateOne(
              { userId: userData._id },
              { $set: { items: filteredItems } }
          );
      
        
      }
      
       if (!carts) { 
       
        
        return res.render('cart',  {carts: [], totalPrice: 0,cart:carts,user:userData }); 
       }
       let totalamount= carts.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(0) ;
       let total=Math.round(totalamount)
      
        res.render('cart', {
        user: userData,
        carts: carts || { items: [] },
        total:total,
        cart:carts
       });
    
    }catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).send('An error occurred while loading the cart page.');
    }
  };


  

 const addToCart = async (req, res) => {
  try {
    const { productId } = req.body; 
   
    const userId = req.session.user; 
  
    let cartitemcount=0;
    if(!userId)
    return res.status(404).json({error:"Please Login to add a product"})
    const product = await Product.findOne({_id:productId,isListed:true});
   
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock === 0) {
      return res.status(400).json({ error: 'This product is out of stock' });
    }

    let cart = await Cart.findOne({userId: userId._id });
  
    if (!cart) {
      if (product.stock < 1) {
        return res.status(400).json({ error: 'Insufficient stock to add to cart' });
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
            .status(400)
            .json({ error: `Only ${product.stock} units are available in stock` });
        }

        if (existingProduct.quantity + 1 > 5) {
          return res.status(400).json({ error: 'You cannot add more than 5 units of this product' });
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
    res.status(200).json({ message: 'Product added to cart successfully!', cart,cartitemcount:cartitemcount });
      
    

    
  } catch (error) {
    console.error('Error adding product to cart:', error);
    res.status(500).json({ error: 'Failed to add product to cart.Please login again ' });
  }
};

  

  

const removeFromCart = async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: 'User not logged in' });
      }
  
      const { productId} = req.body;
      let cart = await Cart.findOne({ userId: req.session.user._id });
      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }
  
      const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
      if (itemIndex === -1) {
        return res.status(404).json({ error: 'Product not found in cart' });
      }
  
      
      const product = await Product.find({_id:productId,isListed:true});
      if (!product) {
        return res.status(404).json({ error: 'Product not found in inventory' });
      }
 
      const removedItem = cart.items[itemIndex];
    
      cart.items.splice(itemIndex, 1);
  
      await cart.save();
     
     let cartitemcount=cart.items.length
      res.status(200).json({ message: 'Product removed from cart',cartitemcount:cartitemcount });
    } catch (error) {
      console.error('Error removing product from cart:', error);
      res.status(500).json({ error: 'Failed to remove product from cart' });
    }
  };
  

const updateCartQuantity = async (req, res) => {
  try {
  
    const { productId, quantity } = req.body;

    const parsedQuantity = parseInt(quantity);

    if (!productId || isNaN(parsedQuantity)) {
      return res.status(400).json({ error: "Product ID and valid quantity are required" });
    }

    const cart = await Cart.findOne({ userId: req.session.user._id });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }
    
    const item = cart.items.find((item) => item.productId.toString() === productId);
    if (!item) {
      return res.status(404).json({ error: "Product not found in cart" });
    }
    
   
    const product = await Product.findOne({_id:productId,isListed:true});
    if (!product) {
      return res.status(404).json({ error: "Product not found in inventory" });
    }
    
    item.quantity = parsedQuantity;
    item.totalPrice = parsedQuantity * product.salesPrice;

    await cart.save();

    const cartitemcount = cart.items.reduce((total, item) => total + item.quantity, 0);

    res.status(200).json({
      newTotalPrice: item.totalPrice,quantity:item.quantity,
      cartitemcount,
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ error: "Failed to update cart", details: error.message });
  }
};


  
  module.exports={
    getCartPage,
    addToCart,
    updateCartQuantity,
    removeFromCart,
   
    
  }