const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Address = require("../../models/addressSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const env = require("dotenv").config();
const session = require("express-session");
const { v4: uuidv4 } = require('uuid');


const getCartPage = async (req, res) => {
       try {
      
       if (!req.session.user) {
        return res.redirect('/login'); 
       }
       const userId = req.session.user._id;
        
       const carts = await Cart.findOne({ userId }).populate('items.productId');
           //console.log(cart,"cart")
            
       if (!carts) { 
       
        
        return res.render('cart',  {carts: [], totalPrice: 0,cart:carts }); 
       }
       let totalamount= carts.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(0) ;
       let total=Math.round(totalamount)
       //console.log(total)
       //console.log(totalamount)
        res.render('cart', {
        user: req.session.user,
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
    console.log("product",req.body)
    const userId = req.session.user; 
    console.log(req.session.user,"id")
    let cartitemcount=0;
    if(!userId)
    return res.status(404).json({error:"Please Login to add a product"})
    const product = await Product.findById(productId);
    console.log("product",product)
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock === 0) {
      return res.status(400).json({ error: 'This product is out of stock' });
    }

    let cart = await Cart.findOne({userId: userId._id });
  console.log("cart====",cart)
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
            price: product.price,
            totalPrice: product.price,
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
        existingProduct.totalPrice = existingProduct.quantity * existingProduct.price;
      //   await cart.save();
      //  cart = await Cart.findOne({ userId :userId._id})
      //   cartitemcount=cart.items.length
      //   res.status(200).json({ message: 'Product already added in cart!', cart,cartitemcount:cartitemcount });
      }
       else {
       

        cart.items.push({
          productId,
          quantity: 1,
          price: product.price,
          totalPrice: product.price,
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
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found in inventory' });
      }
  //product.stock+=quantity;
      const removedItem = cart.items[itemIndex];
     // product.stock += removedItem.quantity;
  
      cart.items.splice(itemIndex, 1);
  
      await cart.save();
      await product.save();
      cart = await Cart.findOne({ userId:req.session.user._id })
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

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found in inventory" });
    }

    item.quantity = parsedQuantity;
    item.totalPrice = parsedQuantity * product.price;

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





  
  const getCheckoutPage=async(req,res)=>{
    try {
      
   const userId = req.session.user._id; 
   //console.log(req.session,"user session")
   //console.log(userId)
   const carts = await Cart.findOne({ userId }).populate("items.productId");
  const address=await Address.find({userId})
  
  //console.log(address)
   if (!carts) {
     return res.render("checkout", { 
       captureEvents: { items: [], total: 0 }, 
       user: req.user ,
       address:address,
     });
   }

   let total = 0;
   carts.items.forEach(item => {
     total += item.totalPrice;
   });

   
   res.render("checkout", {
     carts,
     total,
     address:address,
     cart:carts.items,
   });
 } catch (error) {
   console.error("Error loading checkout page:", error);
   res.status(500).send("An error occurred while loading the checkout page.");
 }
};

const placeOrder = async (req, res) => {
  try {
    const { address, paymentMethod, discount = 0 } = req.body;

    if (!address) {
      return res.status(400).json({ error: "Address is required." });
    }
    if (!paymentMethod) {
      return res.status(400).json({ error: "Payment method is required." });
    }

    const userId = req.session.user._id;
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    console.log("=============================")
    console.log(cart,"===================================")
     if (!cart || !cart.items.length) {
      return res.status(400).json({ error: "No items in the cart to place an order." });
     }

       let totalPrice = 0;
       const productItems = [];
       let product;
       for (const cartItem of cart.items) {
       product = cartItem.productId;

       if (!product) {
        console.error(`Product with ID ${cartItem.productId} not found.`);
        return res.status(404).json({ error: `Product with ID ${cartItem.productId} not found.` });
      }

      const availableStock = product.stock - cartItem.quantity;
      if (availableStock < 0) {
        return res
          .status(400)
          .json({ error: `Insufficient stock for product ${product.productName}.` });
      }

      totalPrice += cartItem.quantity * product.price;

      productItems.push({
        productId: product._id,
        productName:product.productName,
        productImage:product.productImage[0],
        quantity: cartItem.quantity,
        price: product.price,
      });
      console.log(productItems,"productitems in placeorder.")
    }

    // Apply discount if any
    const finalAmount = totalPrice - discount;


    const orderid=uuidv4()
    // Create the order
    const order = new Order({
      orderId:orderid,
      orderedItems: productItems,
      address,
      totalPrice,
      finalAmount,
      userId,
      status: "Processing",
      paymentMethod,
    });
    await order.save();
    console.log("orderrrrrrrrrrrrrrr",order)

    // Update product stock
    for (const cartItem of cart.items) {
      await Product.findByIdAndUpdate(
        cartItem.productId,
        { $inc: { stock: -cartItem.quantity } },
        { new: true }
      );
    }

    // Clear the cart for the user
    await Cart.findOneAndDelete({ userId });

    res.status(200).json({
      success: true,
      message: "Order placed successfully.",
      order,
    });
  } catch (err) {
    console.error("Error placing order:", err);
    res.status(500).json({ success: false, error: "Error placing order.", details: err.message });
  }
};



  
  module.exports={
    getCartPage,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    getCheckoutPage,
    placeOrder,
  }