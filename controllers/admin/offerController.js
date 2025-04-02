const Product= require('../../models/productSchema')
const Offer= require('../../models/offerSchema');
const Category = require('../../models/categorySchema');
const cron = require('node-cron');
const { MESSAGES, STATUS } = require('../../config/constants');
const getOfferPage = async (req, res) => {
    try {
       
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
        
        res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_ERROR });
    }
};


// create offers
const createOffer = async (req, res) => {
   

    try {
        const { offerName, offerDescription, discountAmount, applicableType, selectedItems, startDate, endDate } = req.body;
       
        if (!offerName || !offerDescription || !discountAmount || 
            !applicableType || !selectedItems || !startDate || !endDate) {
            return res.status(STATUS.BAD_REQUEST).json({ 
                success: false, 
                message: MESSAGES.ALL_FIELDS_REQUIRED
            });
        }

        if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
            return res.status(STATUS.BAD_REQUEST).json({ 
                success: false, 
                message: `Please select at least one ${applicableType}` 
            });
        }

        const existingOffer = await Offer.findOne({ name: offerName.toUpperCase() });
        
        if (existingOffer) {
         
            return res.status(STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.OFFER_NAME_EXISTS });
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
        
        // Save the offer to the database
        const savedOffer = await offer.save();

       
        if (applicableType == 'category') {
            try {
                // Find categories by their IDs
                const categories = await Category.find({ _id: { $in: selectedItems } });
        
                if (categories.length > 0) {
                    
                    // Update category offer and store offer ID
                    await Category.updateMany(
                        { _id: { $in: selectedItems } },
                        { 
                            $set: { categoryOffer: discountAmount,offer: savedOffer._id },
                           
                        }
                    );
                   }
            } catch (error) {
              
                throw error;
            }
        } if (applicableType == 'product') {
            try {
                // Update products
                const result = await Product.updateMany(
                    { _id: { $in: selectedItems } },
                    { 
                        $set: { productOffer: discountAmount ,offer: savedOffer._id},
                     
                    }
                );
                
            } catch (error) {
                
                throw error;
            }
        }


        await handleOfferChange(savedOffer._id);
      
      
        res.status(STATUS.CREATED).json({ success: true, message: MESSAGES.OFFER_CREATED});
    } catch (error) {
        
        res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR});
    }
};

const updateOffer = async (req, res) => {
    try {
        
        const { offerId, name, description, discount, applicableType, applicableItems, startDate, endDate } = req.body;

        if (!offerId || !name || !description || !discount || !applicableType || !applicableItems || !startDate || !endDate) {
            return res.status(STATUS.BAD_REQUEST).json({ success: false, message: MESSAGES.FIELD_REQUIRED });
        }

        if (!Array.isArray(applicableItems) || applicableItems.length === 0) {
            return res.status(STATUS.BAD_REQUEST).json({ success: false, message: `Please select at least one ${applicableType}` });
        }

        const existingOffer = await Offer.findById(offerId);
        if (!existingOffer) {
            return res.status(STATUS.NOT_FOUND).json({ success: false, message: MESSAGES.OFFER_NOT_FOUND });
        }

        
        if (existingOffer.applicableType === 'category') {
            await Category.updateMany(
                { _id: { $in: existingOffer.applicableItems } },
                { 
                    $set: { categoryOffer: 0 }, 
                    $unset:  { offer: 1 } 
                   
                }
            );
           
        } if (existingOffer.applicableType ==='product') {
            await Product.updateMany(
                { _id: { $in: existingOffer.applicableItems } },
                { 
                    $set: { productOffer: 0 }, 
                    $unset:  { offer: 1 } 
                  
                }
            );
        }

        // Update the offer
        const updatedOffer = await Offer.findByIdAndUpdate(offerId, {
            name: name.toUpperCase(),
            description: description,
            discount: discount,
            applicableType,
            applicableItems: applicableItems,
            startDate,
            endDate
        }, { new: true });

        

        // Apply the updated offer to new applicable categories or products
        if (applicableType === 'category') {
            await Category.updateMany(
                { _id: { $in: applicableItems } },
                { 
                    $set: { categoryOffer: discount, offer: updatedOffer._id },
                   
                }
            );
           
        } if (applicableType === 'product') {
            await Product.updateMany(
                { _id: { $in: applicableItems } },
                { 
                    $set: { productOffer: discount ,offer: updatedOffer._id },
                  
                }
            );
        }
        await handleOfferChange(offerId);
        res.status(STATUS.SUCCESS).json({ success: true, message: MESSAGES.OFFER_UPDATED, offer: updatedOffer });
    } catch (error) {
 
        res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_ERROR });
    }
};

// active and deactivate function 
const activateOffer= async(req,res)=>{
    const offerId = req.params.id;
    
    try {
        // Find the offer by ID
        const offer = await Offer.findById(offerId);
        if (!offer) {
            res.redirect("/pageerror");
        }

        // Toggle the isActive status
        offer.isActive = !offer.isActive;

        // Save the updated offer
        await offer.save();
        await handleOfferChange(offerId);
        // Respond with the new status
        res.json({ success: true, isActive: offer.isActive });
    } catch (error) {
        
        res.status(STATUS.SERVER_ERROR).json({ success: false, message:MESSAGES.INTERNAL_ERROR });
    }
}


const deactivateOffer= async(req,res)=>{
  
    try {
        const offerId= req.params.id;
        await Offer.findByIdAndUpdate(offerId,{isActive:false})
        await handleOfferChange(offerId);
        res.json({ success: true, message: MESSAGES.OFFER_DEACTIVATED });
    } catch (error) {
        
        res.redirect("/pageerror");
    }
}


async function updateProductSalesPrice(productId) {
    try {
        
        
        // Get the product without relying on populate
        const product = await Product.findById(productId);
        
        if (!product) {
            throw new Error(MESSAGES.PRODUCT_NOT_FOUND);
        }
        
        
        
        const currentDate = new Date();
        let bestDiscount = 0;
        let originalPrice = product.price;
        
        
        // Get product offer if exists
        if (product.offer) {
            const productOffer = await Offer.findById(product.offer);
            if (productOffer && productOffer.isActive && 
                productOffer.startDate <= currentDate && 
                productOffer.endDate >= currentDate) {
                bestDiscount = productOffer.discount;
                
            }
        }
        
        // Get category offer if exists
        if (product.category) {
            const category = await Category.findById(product.category);
            if (category && category.offer) {
                const categoryOffer = await Offer.findById(category.offer);
                if (categoryOffer && categoryOffer.isActive && 
                    categoryOffer.startDate <= currentDate && 
                    categoryOffer.endDate >= currentDate) {
                    const categoryDiscount = categoryOffer.discount;
                    
                    // Use whichever discount is greater
                    bestDiscount = Math.max(bestDiscount, categoryDiscount);
                   
                }
            }
        }

        // Calculate new sales price
        const newSalesPrice = bestDiscount > 0 
            ? originalPrice - Math.round(originalPrice * (bestDiscount / 100))
            : originalPrice;
        
        
        
        // Update the product's sales price
        const updatedProduct = await Product.findByIdAndUpdate(
            productId, 
            {
                salesPrice: newSalesPrice,
                productOffer: bestDiscount
            },
            { new: true } 
        );
        
               
        return {
            success: true,
            newSalesPrice,
            appliedDiscount: bestDiscount
        };
    } catch (error) {
        
        throw error;
    }
}



// Function to update offers when changes are made
async function handleOfferChange(offerId) {
    try {
       
        const offer = await Offer.findById(offerId);
        if (!offer) {
           
            throw new Error(MESSAGES.OFFER_NOT_FOUND);
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
        
        else if (offer.applicableType === 'product') {
            
            for (const productId of offer.applicableItems) {
                
                await updateProductSalesPrice(productId);
            }
        }
       
        return {
            success: true,
            message: MESSAGES.OFFER_UPDATED
        };
    } catch (error) {
        console.error('Error handling offer change:', error);
        throw error;
    }
}


cron.schedule('0 0 * * *', async () => {
   
    try {
        const products = await Product.find();
       
        for (const product of products) {
            await updateProductSalesPrice(product._id);
        }
       
    } catch (error) {
        console.error('Error in daily offer update:', error);
    }
});

module.exports={
    getOfferPage,
    createOffer,
    updateOffer,
    activateOffer,
    deactivateOffer,
    updateProductSalesPrice,
    handleOfferChange
}

