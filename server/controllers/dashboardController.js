import Transaction from '../models/Transaction.js';
import moment from 'moment'; // You'll need to `npm install moment`

// @desc    Get dashboard summary data
// @route   GET /api/dashboard/summary
// @access  Private
const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = moment();
    const startOfMonth = now.clone().startOf('month').toDate();
    const endOfMonth = now.clone().endOf('month').toDate();

    const expenseByCategory = await Transaction.aggregate([
      { $match: { user: userId, type: 'expense', date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $project: { category: '$_id', total: 1, _id: 0 } }
    ]);

    // 2. Income vs Expense for the last 6 months
    const sixMonthsAgo = now.clone().subtract(6, 'months').startOf('month').toDate();
    
    const monthlySummary = await Transaction.aggregate([
        { $match: { user: userId, date: { $gte: sixMonthsAgo } } },
        {
            $group: {
                _id: {
                    year: { $year: "$date" },
                    month: { $month: "$date" },
                },
                totalIncome: {
                    $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] }
                },
                totalExpense: {
                    $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] }
                }
            }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    
    res.json({ expenseByCategory, monthlySummary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export { getDashboardSummary };