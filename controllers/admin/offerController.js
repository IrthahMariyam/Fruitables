
const Product= require('../../models/productSchema')
const Offer= require('../../models/offerSchema');
const Category = require('../../models/categorySchema');
const cron = require('node-cron');



const getOfferPage = async (req, res) => {
    try {
       console.log("insidepage")
        const page = parseInt(req.query.page) || 1;
        const limit = 10; 

       
        const totalOffers = await Offer.countDocuments();
        const totalPages = Math.ceil(totalOffers / limit);

      
        const offers = await Offer.find()
        .lean()
         
            .skip((page - 1) * limit)
            .limit(limit);
            
            const populatedOffers = await Promise.all(offers.map(async (offer) => {
                if (offer.applicableType === 'category') {
                    offer.applicableItems = await Category.find({
                        _id: { $in: offer.applicableItems }
                    }).select('name _id');
                } if (offer.applicableType === 'product') {
                    offer.applicableItems = await Product.find({
                        _id: { $in: offer.applicableItems }
                    }).select('productName _id');

                   
                }
                return offer;
            }));

           
        const products = await Product.find();
        const categories = await Category.find();

        
        res.render('admin-offer', { 
            products, 
            categories, 
            offers: populatedOffers, 
            currentPage: page, 
            totalPages 
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
};


// create offers
const createOffer = async (req, res) => {
   
console.log("inside c1")
    try {
        const { offerName, offerDescription, discountAmount, applicableType, selectedItems, startDate, endDate } = req.body;
       
        if (!offerName || !offerDescription || !discountAmount || 
            !applicableType || !selectedItems || !startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Please select at least one ${applicableType}` 
            });
        }

        const existingOffer = await Offer.findOne({ name: offerName.toUpperCase() });
        
        if (existingOffer) {
         
            return res.status(400).json({ success: false, message: 'Offer name already used!' });
        }
       

        // Create a new offer
        const offer = new Offer({
            name: offerName.toUpperCase(),
            description: offerDescription,
            discount: discountAmount,
            applicableType,
            applicableItems: selectedItems,
            startDate,
            endDate
        });
        console.log("inside offfer",offer)
        // Save the offer to the database
        const savedOffer = await offer.save();

       

        //  if (applicableType === 'category') {
        //     const productsInCategory = await Products.find({ 
        //         category: { $in: selectedItems } 
        //     });
            
        //     if (productsInCategory.length > 0) {
        //         await Products.updateMany(
        //             { category: { $in: selectedItems } },
        //             { $addToSet: { productOffer: savedOffer._id } }
        //         );
        //     }
        //  } else  {
        //     await Products.updateMany(
        //         { _id: { $in: selectedItems } },
        //         { $addToSet: { productOffer: savedOffer._id } }
        //     );}
        if (applicableType === 'category') {
            try {
                // Find categories by their IDs
                const categories = await Category.find({ 
                    _id: { $in: selectedItems } 
                });
        
                if (categories.length > 0) {
                    // Update both offer value and add offer ID
                    await Category.updateMany(
                        { _id: { $in: selectedItems } },
                        { 
                            $set: { categoryOffer: discountAmount },
                            $addToSet: { offer: savedOffer._id }
                        }
                    );
                    console.log('Categories updated successfully');
                }
            } catch (error) {
                console.error('Error updating categories:', error);
                throw error;
            }
        } else if (applicableType === 'product') {
            try {
                // Update products
                const result = await Product.updateMany(
                    { _id: { $in: selectedItems } },
                    { 
                        $set: { productOffer: discountAmount },
                        $addToSet: { offer: savedOffer._id }
                    }
                );
                console.log('Products updated successfully:', result);
            } catch (error) {
                console.error('Error updating products:', error);
                throw error;
            }
        }


        await handleOfferChange(savedOffer._id);
      
      
        res.status(201).json({ success: true, message: "Offer created successfully!" });
    } catch (error) {
        console.error('Error creating offer:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
};

// updateOffer
const updateOffer = async (req, res) => {
  
    try {
        console.log("inside updateOffer")
        const { offerId, name, description, discount, applicableType, applicableItems, startDate, endDate } = req.body;
        
        let offerName = name.toUpperCase();
        
        // Find the existing offer to know the old applicable items
        const existingOffer = await Offer.findById(offerId);
        
        if (!existingOffer) {
            return res.status(404).json({ success: false, message: 'Offer not found!' });
        }

        // Update the offer
        const updatedOffer = await Offer.findByIdAndUpdate(offerId, {
            name: offerName,
            description,
            discount,
            applicableType,
            applicableItems,
            startDate,
            endDate
        }, { new: true });
        console.log("updatedOffer",updatedOffer)
        // Remove the offer from old applicable items (products or categories)
        if (existingOffer.applicableType === 'category') {
            const productsInOldCategory = await Product.find({ category: { $in: existingOffer.applicableItems } });
            const oldProductIds = productsInOldCategory.map(product => product._id);

            await Product.updateMany(
                { _id: { $in: oldProductIds } },
                { $pull: { offers: existingOffer._id } }
            );
        } else if (existingOffer.applicableType === 'product') {
            await Product.updateMany(
                { _id: { $in: existingOffer.applicableItems } },
                { $pull: { offers: existingOffer._id } }
            );
        }

        // Add the updated offer to new applicable items
        if (applicableType === 'category') {
            const productsInNewCategory = await Product.find({ category: { $in: applicableItems } });
            const newProductIds = productsInNewCategory.map(product => product._id);

            await Product.updateMany(
                { _id: { $in: newProductIds } },
                { $addToSet: { offers: updatedOffer._id } }
            );
        } else if (applicableType === 'product') {
            await Product.updateMany(
                { _id: { $in: applicableItems } },
                { $addToSet: { offers: updatedOffer._id } }
            );
        }
        await handleOfferChange(offerId);
        res.status(200).json({ success: true, message: 'Offer updated successfully!', offer: updatedOffer });
    } catch (error) {
        console.log('Error updating offer:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
};
// active and deactivate function 
const activateOffer= async(req,res)=>{
    const offerId = req.params.id;
    
    try {
        // Find the offer by ID
        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }

        // Toggle the isActive status
        offer.isActive = !offer.isActive;

        // Save the updated offer
        await offer.save();
        await handleOfferChange(offerId);
        // Respond with the new status
        res.json({ success: true, isActive: offer.isActive });
    } catch (error) {
        console.error('Error toggling offer status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}


const deactivateOffer= async(req,res)=>{
  
    try {
        const offerId= req.params.id;
        await Offer.findByIdAndUpdate(offerId,{isActive:false})
        await handleOfferChange(offerId);
        res.json({ success: true, message: 'Offer deactivated successfully.' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Failed to deactivate offer.' });
    }
}

///////////////////////////////////

async function updateProductSalesPrice(productId) {
    try {
        // Get the product with populated offers
        const product = await Product.findById(productId)
            .populate('offer')
            .populate({
                path: 'category',
                populate: {
                    path: 'offer'
                }
            });

        if (!product) {
            throw new Error('Product not found');
        }

        const currentDate = new Date();
        let bestDiscount = 0;
        let originalPrice = product.price;

        // Check product offers
        if (product.offer && product.offer.length > 0) {
            product.offer.forEach(offer => {
                if (offer.isActive && 
                    offer.startDate <= currentDate && 
                    offer.endDate >= currentDate) {
                    bestDiscount = Math.max(bestDiscount, offer.discount);
                }
            });
        }

        // Check category offers
        if (product.category && product.category.offer && product.category.offer.length > 0) {
            product.category.offer.forEach(offer => {
                if (offer.isActive && 
                    offer.startDate <= currentDate && 
                    offer.endDate >= currentDate) {
                    bestDiscount = Math.max(bestDiscount, offer.discount);
                }
            });
        }

        // Calculate new sales price
        const newSalesPrice = bestDiscount > 0 
            ? originalPrice - Math.round(originalPrice * (bestDiscount / 100))
            : originalPrice;

        // Update the product's sales price
        await Product.findByIdAndUpdate(productId, {
            salesPrice: newSalesPrice,
            productOffer: bestDiscount
        });

        return {
            success: true,
            newSalesPrice,
            appliedDiscount: bestDiscount
        };
    } catch (error) {
        console.error('Error updating product sales price:', error);
        throw error;
    }
}



// Function to update offers when changes are made
async function handleOfferChange(offerId) {
    try {
        const offer = await Offer.findById(offerId);
        if (!offer) {
            throw new Error('Offer not found');
        }

        // If it's a category offer, update all products in that category
        if (offer.applicableType === 'category') {
            const products = await Product.find({
                category: { $in: offer.applicableItems }
            });
            
            for (const product of products) {
                await updateProductSalesPrice(product._id);
            }
        } 
        // If it's a product offer, update those specific products
        else if (offer.applicableType === 'product') {
            for (const productId of offer.applicableItems) {
                await updateProductSalesPrice(productId);
            }
        }

        return {
            success: true,
            message: 'Offers updated successfully'
        };
    } catch (error) {
        console.error('Error handling offer change:', error);
        throw error;
    }
}

// After saving a new offer or updating an existing one
//await handleOfferChange(savedOffer._id);

module.exports={
    getOfferPage,
    createOffer,
    updateOffer,
    activateOffer,
    deactivateOffer,
    //
    updateProductSalesPrice,
    handleOfferChange
}





// Function to handle offer updates - runs every minute
// async function handleOfferUpdates() {
//     const currentDate = new Date();
    
//     try {
//         // 1. Handle Offer Activations
//         await activateNewOffers(currentDate);
        
//         // 2. Handle Offer Deactivations
//         await deactivateExpiredOffers(currentDate);
        
//         // 3. Update Product Prices
//         await updateProductPrices(currentDate);
        
//     } catch (error) {
//         console.error('Error in offer update cron job:', error);
//     }
// }

// // Function to activate new offers
// async function activateNewOffers(currentDate) {
//     try {
//         // Find offers that should start now
//         const newOffers = await Offer.find({
//             isActive: true,
//             startDate: { $lte: currentDate },
//             endDate: { $gt: currentDate }
//         });

//         for (const offer of newOffers) {
//             if (offer.applicableType === 'category') {
//                 // Update all products in the categories
//                 await Product.updateMany(
//                     { category: { $in: offer.applicableItems } },
//                     { $addToSet: { offer: offer._id } }
//                 );
//             } else if (offer.applicableType === 'product') {
//                 // Update specific products
//                 await Product.updateMany(
//                     { _id: { $in: offer.applicableItems } },
//                     { $addToSet: { offer: offer._id } }
//                 );
//             }
//         }
//     } catch (error) {
//         console.error('Error activating offers:', error);
//     }
// }

// // Function to deactivate expired offers
// async function deactivateExpiredOffers(currentDate) {
//     try {
//         // Find expired offers
//         const expiredOffers = await Offer.find({
//             isActive: true,
//             endDate: { $lte: currentDate }
//         });

//         for (const offer of expiredOffers) {
//             // Deactivate the offer
//             await Offer.findByIdAndUpdate(offer._id, { isActive: false });

//             // Remove offer reference from products
//             if (offer.applicableType === 'category') {
//                 await Product.updateMany(
//                     { category: { $in: offer.applicableItems } },
//                     { $pull: { offer: offer._id } }
//                 );
//             } else if (offer.applicableType === 'product') {
//                 await Product.updateMany(
//                     { _id: { $in: offer.applicableItems } },
//                     { $pull: { offer: offer._id } }
//                 );
//             }
//         }
//     } catch (error) {
//         console.error('Error deactivating offers:', error);
//     }
// }

// // Function to update product prices based on active offers
// async function updateProductPrices(currentDate) {
//     try {
//         // Get all active products
//         const products = await Product.find({
//             isListed: true,
//             isDeleted: false
//         }).populate({
//             path: 'category',
//             populate: {
//                 path: 'offer',
//                 match: {
//                     isActive: true,
//                     startDate: { $lte: currentDate },
//                     endDate: { $gt: currentDate }
//                 }
//             }
//         }).populate({
//             path: 'offer',
//             match: {
//                 isActive: true,
//                 startDate: { $lte: currentDate },
//                 endDate: { $gt: currentDate }
//             }
//         });

//         for (const product of products) {
//             let bestDiscount = 0;
//             const originalPrice = product.price;

//             // Check product-specific offers
//             if (product.offer && product.offer.length > 0) {
//                 const productDiscount = Math.max(...product.offer.map(o => o.discount));
//                 bestDiscount = productDiscount;
//             }

//             // Check category offers
//             if (product.category && product.category.offer && product.category.offer.length > 0) {
//                 const categoryDiscount = Math.max(...product.category.offer.map(o => o.discount));
//                 bestDiscount = Math.max(bestDiscount, categoryDiscount);
//             }

//             // Calculate new sales price
//             let newSalesPrice;
//             if (bestDiscount > 0) {
//                 newSalesPrice = originalPrice - (originalPrice * (bestDiscount / 100));
//             } else {
//                 newSalesPrice = originalPrice; // No active offers
//             }

//             // Update product's sales price
//             await Product.findByIdAndUpdate(product._id, {
//                 salesPrice: Math.round(newSalesPrice)
//             });
//         }
//     } catch (error) {
//         console.error('Error updating product prices:', error);
//     }
// }

// // Schedule the cron job to run every minute
// cron.schedule('* * * * *', handleOfferUpdates);