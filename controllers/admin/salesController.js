
const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')
const Product = require('../../models/productSchema')
const moment = require("moment");
const PDFDocument = require("pdfkit"); 
const excelJS = require("exceljs"); 

const loadSalesPage = async (req, res) => {
    if (req.session.admin) {
        try {
            // Fetch all users and products
            const users = await User.find();
            const products = await Product.find();
            const orders = await Order.find();


            const deliveredOrdersCount = await Order.countDocuments({ status: "Delivered" });

            const totalRevenue = await Order.aggregate([
                { 
                    $group: { 
                        _id: null, 
                        totalRevenue: { $sum: "$finalAmount" } 
                    } 
                }
            ]);

            const revenueAmount = totalRevenue.length > 0 ? totalRevenue[0].totalRevenue : 0;

            // Calculate total sales and total discount
            let totalSales = 0;
            let totalDiscount = 0;

            orders.forEach(order => {
                totalSales += order.finalAmount;  // Ensure field name matches schema
                totalDiscount += order.discount;
            });

            // Get today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Get start of the week (last 7 days)
            const lastWeek = new Date();
            lastWeek.setDate(today.getDate() - 7);

            // Get start of the month
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            // Get start of the year
            const firstDayOfYear = new Date(today.getFullYear(), 0, 1);

            // Filter sales data
            const dailySales = orders.filter(order => new Date(order.createdOn) >= today);
            const weeklySales = orders.filter(order => new Date(order.createdOn) >= lastWeek);
            const monthlySales = orders.filter(order => new Date(order.createdOn) >= firstDayOfMonth);
            const yearlySales = orders.filter(order => new Date(order.createdOn) >= firstDayOfYear);

            // Calculate total amounts for each period
            const calculateTotal = (orders) => orders.reduce((sum, order) => sum + order.finalAmount, 0);

            const totalDailySales = calculateTotal(dailySales);
            const totalWeeklySales = calculateTotal(weeklySales);
            const totalMonthlySales = calculateTotal(monthlySales);
            const totalYearlySales = calculateTotal(yearlySales);

            // Render the dashboard page
            res.render("salesreport", {
                users,
                orders,
                products,
                totalSales,
                totalDiscount,
                totalDailySales,
                totalWeeklySales,
                totalMonthlySales,
                totalYearlySales,
                deliveredOrdersCount,

                revenueAmount
            });

        } catch (error) {
          
            res.redirect("/pageNotFound");
        }
    } else {
        res.redirect("/admin/login");
    }
};

const salesReport = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;
        let start, end;

        const today = moment.utc().startOf('day').toDate();
        start = new Date(0); // Unix epoch (all time)
        end = new Date(); // Current date
        switch (filter) {
            case "daily":
              
                start = today;
                end = moment.utc(today).endOf('day').toDate();
                break;
            case "weekly":
                start = new Date(today);
                start.setDate(today.getDate() - 7);
                end = today;
                break;
            case "monthly":
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case "yearly":
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date(today.getFullYear(), 11, 31);
                break;
            case "custom":
                start = new Date(startDate);
                end = new Date(endDate);
                break;
            default:
                return res.status(400).json({ message: "Invalid filter option" });
        }

        // Fetch orders within the selected date range and populate user details
        const orders = await Order.find({
            createdOn: { $gte: start, $lte: end },
            status: "Delivered"  // Filter for delivered orders only
        }).populate("userId", "name"); 
  
        const reportData = orders.map(order => ({
            orderId: order.orderId,   // Ensure you use the correct field name
            customerName: order.userId ? order.userId.name : "Guest",  // Fetch populated user name
            TotalAmount:order.subtotal,
            discount: order.discount || 0,  // Ensure discount field is fetched correctly
            PayableAmount: order.finalAmount || 0.00,  // Use correct schema field          
            date: order.createdOn.toISOString().split('T')[0] // Format date
        }));

        res.json({ success: true, reportData });

    } catch (error) {
        console.error("Error fetching sales report:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const getTopSellingProducts = async (req, res) => {
    try {
        const { filter } = req.query; 

        let startDate, endDate;
        if (filter === 'daily') {
            startDate = moment().startOf('day').toDate();
            endDate = moment().endOf('day').toDate();
        }else if (filter === 'weekly') {
            startDate = moment().subtract(7, 'days').startOf('day').toDate();
            endDate = moment().endOf('day').toDate()
        } else if (filter === 'monthly') {
            startDate = moment().startOf('month').toDate();
            endDate = moment().endOf('month').toDate();
        } else if (filter === 'yearly') {
            startDate = moment().startOf('year').toDate();
            endDate = moment().endOf('year').toDate();
        }else {
            startDate = new Date(0); // Default to all-time if no valid filter
            endDate = new Date();
        }

       
        const orders = await Order.find({
            status: 'Delivered',
            createdOn: { $gte: startDate, $lte: endDate }
        }).populate('orderedItems.productId').limit(10)

       

        
        const productSales = {};
        orders.forEach(order => {
            order.orderedItems.forEach(item => {
                const productId = item.productId._id.toString();
                if (productSales[productId]) {
                    productSales[productId].totalSold += item.quantity;
                } else {
                    productSales[productId] = {
                        productName: item.productName,
                        totalSold: item.quantity
                    };
                }
            });
        });

    
        const topSellingProducts = Object.values(productSales);
        topSellingProducts.sort((a, b) => b.totalSold - a.totalSold); 
        

     
        const limitedTopSellingProducts = topSellingProducts.slice(0, 10); // Limit to top 10 products

     

        res.json(limitedTopSellingProducts);

       // res.json(topSellingProducts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

  
const getTopCategories = async (req, res) => {
    try {
      const { filter } = req.query; 
  
      const dateFilter = getDateFilter(filter); 
  
      const topCategories = await Order.aggregate([
        { $unwind: '$orderedItems' },
        { $lookup: { from: 'products', localField: 'orderedItems.productId', foreignField: '_id', as: 'productDetails' } },
        { $unwind: '$productDetails' },
        { $lookup: { from: 'categories', localField: 'productDetails.category', foreignField: '_id', as: 'categoryDetails' } },
        { $unwind: '$categoryDetails' },
        { $match: { createdAt: { $gte: dateFilter.startDate, $lt: dateFilter.endDate } } },
        { $group: { _id: '$categoryDetails._id', categoryName: { $first: '$categoryDetails.name' }, totalSold: { $sum: '$orderedItems.quantity' } } },
        { $sort: { totalSold: -1 } },
        { $limit: 10 } 
      ]);
  
      res.json(topCategories);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error fetching top categories' });
    }
  };
  
  const getDateFilter = (filter) => {
    const now = new Date();
    let startDate, endDate;
  
    switch (filter) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0)); 
        endDate = new Date(now.setHours(23, 59, 59, 999)); 
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1); 
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); 
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1); 
        endDate = new Date(now.getFullYear(), 12, 31); 
        break;
      default:
        startDate = new Date(0); 
        endDate = new Date(); 
    }
  
    return { startDate, endDate };
  };
  




module.exports = {
    loadSalesPage,
    salesReport,
    getTopSellingProducts,
    getTopCategories,
    getDateFilter,
    

}


