const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const moment = require("moment");
const PDFDocument = require("pdfkit");
const excelJS = require("exceljs");
const { STATUS ,MESSAGES} = require("../../config/constants");

const loadSalesPage = async (req, res) => {
  if (req.session.admin) {
    try {
      
      const users = await User.find();
      const products = await Product.find();
      const orders = await Order.find();

      const deliveredOrdersCount = await Order.countDocuments({
        status: "Delivered",
      });

      const totalRevenue = await Order.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$finalAmount" },
          },
        },
      ]);

      const revenueAmount =
        totalRevenue.length > 0 ? totalRevenue[0].totalRevenue : 0;

      let totalSales = 0;
      let totalDiscount = 0;

      orders.forEach((order) => {
        totalSales += order.finalAmount;
        totalDiscount += order.discount;
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);

      const firstDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      const firstDayOfYear = new Date(today.getFullYear(), 0, 1);

      const dailySales = orders.filter(
        (order) => new Date(order.createdOn) >= today
      );
      const weeklySales = orders.filter(
        (order) => new Date(order.createdOn) >= lastWeek
      );
      const monthlySales = orders.filter(
        (order) => new Date(order.createdOn) >= firstDayOfMonth
      );
      const yearlySales = orders.filter(
        (order) => new Date(order.createdOn) >= firstDayOfYear
      );

      const calculateTotal = (orders) =>
        orders.reduce((sum, order) => sum + order.finalAmount, 0);

      const totalDailySales = calculateTotal(dailySales);
      const totalWeeklySales = calculateTotal(weeklySales);
      const totalMonthlySales = calculateTotal(monthlySales);
      const totalYearlySales = calculateTotal(yearlySales);

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
        revenueAmount,
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
  
      const today = moment.utc().startOf("day").toDate();
      start = new Date(0);
      end = new Date();
  
      switch (filter) {
        case "daily":
          start = today;
          end = moment.utc(today).endOf("day").toDate();
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
          return res.status(STATUS.BAD_REQUEST).json({ message: MESSAGES.INVALID_FILTER });
      }
  
      
  
      
      const orders = await Order.find({
        createdAt: { $gte: start, $lte: end },
        status: { $in: ['Delivered','Processing',"Shipping,","Out for Delivery"] } ,
       
      }).populate("userId", "name");
  
      
      const reportData = orders.map((order) => ({
        orderId: order.orderId,
        customerName: order.userId ? order.userId.name : "Guest",
        TotalAmount: order.subtotal,
        discount: order.discount || 0,
        PayableAmount: order.finalAmount || 0.0,
        date: order.createdAt.toISOString().split("T")[0],
      }));
  
      
  
      // **Fetch sales data for the chart**
      const chartData = await Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: start, $lte: end }, 
            status: { $in: ['Delivered','Processing',"Shipping,","Out for Delivery"] } 
          
          } 
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            totalAmount: { $sum: "$finalAmount" },
          },
        },
        { $sort: { _id: 1 } }
      ]);
  
      
  
      res.json({ success: true, reportData, chartData }); 
    } catch (error) {
      
      res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR});
    }
  };
  

const getTopSellingProducts = async (req, res) => {
  try {
    const { filter } = req.query;

    let startDate, endDate;
    if (filter === "daily") {
      startDate = moment().startOf("day").toDate();
      endDate = moment().endOf("day").toDate();
    } else if (filter === "weekly") {
      startDate = moment().subtract(7, "days").startOf("day").toDate();
      endDate = moment().endOf("day").toDate();
    } else if (filter === "monthly") {
      startDate = moment().startOf("month").toDate();
      endDate = moment().endOf("month").toDate();
    } else if (filter === "yearly") {
      startDate = moment().startOf("year").toDate();
      endDate = moment().endOf("year").toDate();
    } else {
      startDate = new Date(0); 
      endDate = new Date();
    }

    const orders = await Order.find({
      status: "Delivered",
      createdOn: { $gte: startDate, $lte: endDate },
    })
      .populate("orderedItems.productId")
      .limit(10);

    const productSales = {};
    orders.forEach((order) => {
      order.orderedItems.forEach((item) => {
        const productId = item.productId._id.toString();
        if (productSales[productId]) {
          productSales[productId].totalSold += item.quantity;
        } else {
          productSales[productId] = {
            productName: item.productName,
            totalSold: item.quantity,
          };
        }
      });
    });

    const topSellingProducts = Object.values(productSales);
    topSellingProducts.sort((a, b) => b.totalSold - a.totalSold);

    const limitedTopSellingProducts = topSellingProducts.slice(0, 10);

    res.json(limitedTopSellingProducts);
  } catch (err) {
    
    res.status(STATUS.SERVER_ERROR).json({ error: MESSAGES.SERVER_ERROR });
  }
};

const getTopCategories = async (req, res) => {
  try {
    const { filter } = req.query;

    const dateFilter = getDateFilter(filter);

    const topCategories = await Order.aggregate([
      { $unwind: "$orderedItems" },
      { $match: { "orderedItems.status": "Delivered" } },
      {
        $lookup: {
          from: "products",
          localField: "orderedItems.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "categories",
          localField: "productDetails.category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" },
      {
        $match: {
          createdAt: { $gte: dateFilter.startDate, $lt: dateFilter.endDate },
        },
      },
      {
        $group: {
          _id: "$categoryDetails._id",
          categoryName: { $first: "$categoryDetails.name" },
          totalSold: { $sum: "$orderedItems.quantity" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
    ]);

    res.json(topCategories);
  } catch (err) {
    
    res.status(STATUS.SERVER_ERROR).json({ message: MESSAGES.TOP_CATEGORIES_ERROR });
  }
};

const getDateFilter = (filter) => {
  const now = new Date();
  let startDate, endDate;

  switch (filter) {
    case "daily":
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
      break;
    case "monthly":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case "yearly":
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 12, 31);
      break;
    default:
      startDate = new Date(0);
      endDate = new Date();
  }

  return { startDate, endDate };
};

const cancelledReturnedOrdersReport = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;
    let start, end;

    const today = moment.utc().startOf("day").toDate();
    start = new Date(0);
    end = new Date();

    switch (filter) {
      case "daily":
        start = today;
        end = moment.utc(today).endOf("day").toDate();
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
        return res.status(STATUS.BAD_REQUEST).json({ message: MESSAGES.INVALID_FILTER});
    }

    const orders = await Order.find({
      createdOn: { $gte: start, $lte: end },
      "orderedItems.status": { $in: ["Cancelled", "Returned"] },
    }).populate("userId", "name");

    const reportData = orders.flatMap((order) => {
      return order.orderedItems
        .filter(
          (item) => item.status === "Cancelled" || item.status === "Returned"
        )
        .map((item) => ({
          orderId: order.orderId,
          customerName: order.userId ? order.userId.name : "Guest",
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          status: item.status,
          date: order.createdOn.toISOString().split("T")[0],
          totalAmount: order.subtotal,
        }));
    });

   
    res.json({ success: true, reportData });
  } catch (error) {
    
    res.status(STATUS.SERVER_ERROR).json({ success: false, message: MESSAGES.SERVER_ERROR});
  }
};

module.exports = {
  loadSalesPage,
  salesReport,
  getTopSellingProducts,
  getTopCategories,
  getDateFilter,
  cancelledReturnedOrdersReport,
};
