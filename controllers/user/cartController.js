const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const env = require("dotenv").config();
const session = require("express-session");


const getCartPage = async (req, res) => {
    try {
      // Check if the session exists
      if (!req.session.user) {
        return res.redirect('/login'); // Redirect to login page if not logged in
      }
  
      const userId = req.session.user._id;
  
      // Retrieve the cart for the logged-in user
      const cart = await Cart.findOne({ userId }).populate('items.productId');
 
      // Render the cart page with cart data
      res.render('cart', {
        user: req.session.user,
        cart: cart || { items: [] }, // If no cart, send an empty cart
      });
    } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).send('An error occurred while loading the cart page.');
    }
  };
 



const addToCart = async (req, res) => {
    try {
      const {productId } = req.body;
      const userId=req.session.user._id;

  
      // Find the product details
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
  
      // Calculate the initial total price for the product
      const productPrice = product.price;
      const totalPrice = productPrice * 1; // Quantity is initially 1
  
      // Find the user's cart or create a new one
      let cart = await Cart.findOne({ userId });
  
      if (!cart) {
        // Create a new cart if none exists
        cart = new Cart({
          userId,
          items: [
            {
              productId,
              quantity: 1,
              price: productPrice,
              totalPrice,
            },
          ],
        });
      } else {
        // Check if the product already exists in the cart
        const existingProduct = cart.items.find((item) => item.productId.toString() === productId);
  
        if (existingProduct) {
          // Update quantity and total price if the product exists
          existingProduct.quantity += 1;
          existingProduct.totalPrice = existingProduct.quantity * existingProduct.price;
        } else {
          // Add a new product to the cart
          cart.items.push({
            productId,
            quantity: 1,
            price: productPrice,
            totalPrice,
          });
        }
      }
  
      // Save the cart
      await cart.save();
  
      res.status(200).json({ message: 'Product added to cart successfully!', cart });
    } catch (error) {
      console.error('Error adding product to cart:', error);
      res.status(500).json({ error: 'Failed to add product to cart' });
    }
  };
  

//   const updateCartQuantity = async (req, res) => {
//     try {
//       const { userId } = req.session.user;
//       const { productId, quantity } = req.body;
  
//       const cart = await Cart.findOne({ userId });
//       const item = cart.items.find((item) => item.productId.toString() === productId);
  
//       if (item) {
//         item.quantity = quantity;
//         item.totalPrice = item.quantity * item.price;
//         await cart.save();
//         res.status(200).json({ message: 'Cart updated successfully' });
//       } else {
//         res.status(404).json({ error: 'Product not found in cart' });
//       }
//     } catch (error) {
//       console.error('Error updating cart:', error);
//       res.status(500).json({ error: 'Failed to update cart' });
//     }
//   };

//   const removeFromCart = async (req, res) => {
//     try {
//       const { userId } = req.session.user;
//       const { productId } = req.body;
//   console.log(req.body,"emove from cart================================")
//       const cart = await Cart.findOne({ userId });
//       cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
//       await cart.save();
  
//       res.status(200).json({ message: 'Product removed from cart' });
//     } catch (error) {
//       console.error('Error removing product from cart:', error);
//       res.status(500).json({ error: 'Failed to remove product from cart' });
//     }
//   };
const removeFromCart = async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: 'User not logged in' });
      }
  
      const { productId } = req.body;
      if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
      }
  
      const cart = await Cart.findOne({ userId: user._id });
      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }
  
      const initialItemsCount = cart.items.length;
      cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
  
      if (cart.items.length === initialItemsCount) {
        return res.status(404).json({ error: 'Product not found in cart' });
      }
  
      await cart.save();
      res.status(200).json({ message: 'Product removed from cart' });
    } catch (error) {
      console.error('Error removing product from cart:', error);
      res.status(500).json({ error: 'Failed to remove product from cart' });
    }
  };
  

  const updateCartQuantity = async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ error: 'User not logged in' });
      }
  
      const { productId, quantity } = req.body;
      if (!productId || !quantity) {
        return res.status(400).json({ error: 'Product ID and quantity are required' });
      }
  
      const cart = await Cart.findOne({ userId: user._id });
      if (!cart) {
        return res.status(404).json({ error: 'Cart not found' });
      }
  
      const item = cart.items.find((item) => item.productId.toString() === productId);
      if (!item) {
        return res.status(404).json({ error: 'Product not found in cart' });
      }
  
      item.quantity = quantity;
      item.totalPrice = item.quantity * item.price;
  
      await cart.save();
      res.status(200).json({ message: 'Cart updated successfully' });
    } catch (error) {
      console.error('Error updating cart:', error);
      res.status(500).json({ error: 'Failed to update cart' });
    }
  };
  
  
  module.exports={
    getCartPage,
    addToCart,
    updateCartQuantity,
    removeFromCart,
  }