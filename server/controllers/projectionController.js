import Account from '../models/Account.js';
import RecurringTransaction from '../models/RecurringTransaction.js';
import moment from 'moment'; // Make sure moment is installed

// @desc    Get cash flow projection
// @route   GET /api/projections
// @access  Private
const getCashFlowProjection = async (req, res) => {
  try {
    const userId = req.user._id;
    // Get duration in months from query (default to 3 months)
    const durationMonths = parseInt(req.query.duration) || 3;
    const endDate = moment().add(durationMonths, 'months').endOf('day');

    // 1. Get current balances
    const accounts = await Account.find({ user: userId });
    let currentBalances = {};
    let totalBalance = 0;
    accounts.forEach(acc => {
        currentBalances[acc._id.toString()] = acc.balance;
        totalBalance += acc.balance;
    });

    // 2. Get recurring transactions
    const recurringTxs = await RecurringTransaction.find({ user: userId });

    // 3. Simulate future transactions
    const projectionData = [];
    let currentDate = moment().startOf('day');
    let simulatedBalances = { ...currentBalances }; // Copy initial balances
    let simulatedTotalBalance = totalBalance;

    // Add starting point
    projectionData.push({ date: currentDate.format('YYYY-MM-DD'), balance: simulatedTotalBalance });

    // Loop day by day until end date
    while (currentDate.isBefore(endDate)) {
      currentDate.add(1, 'day'); // Move to the next day

      let dailyChange = 0;

      for (const tx of recurringTxs) {
        const startDate = moment(tx.startDate);
        // Check if today is a scheduled date based on frequency
        let isDue = false;
        switch (tx.frequency) {
          case 'daily':
            // Due if start date is today or in the past
            if (currentDate.isSameOrAfter(startDate, 'day')) {
                 isDue = true;
            }
            break;
          case 'weekly':
            // Due if it's the same day of the week AND after start date
            if (currentDate.isSameOrAfter(startDate, 'day') && currentDate.day() === startDate.day()) {
              isDue = true;
            }
            break;
          case 'monthly':
            // Due if it's the same day of the month AND after start date
             if (currentDate.isSameOrAfter(startDate, 'day') && currentDate.date() === startDate.date()) {
              isDue = true;
            }
            // Handle end-of-month cases (e.g., start date 31st, current month only has 30 days)
             else if (currentDate.isSameOrAfter(startDate, 'day') && startDate.date() > currentDate.daysInMonth() && currentDate.isSame(currentDate.clone().endOf('month'), 'day')) {
                 isDue = true;
             }
            break;
          case 'yearly':
            // Due if it's the same month and day AND after start date
            if (currentDate.isSameOrAfter(startDate, 'day') && currentDate.month() === startDate.month() && currentDate.date() === startDate.date()) {
              isDue = true;
            }
            break;
        }

        if (isDue) {
          const amount = Number(tx.amount);
          const accountId = tx.account.toString();
          if (simulatedBalances[accountId] !== undefined) { // Check if account still exists
            const change = tx.type === 'income' ? amount : -amount;
            simulatedBalances[accountId] += change;
            dailyChange += change;
          }
        }
      } // End loop through recurring txs for the day

       // If balance changed today, update total and potentially add data point
       if (dailyChange !== 0) {
           simulatedTotalBalance += dailyChange;
           // Optional: Add daily data points for higher resolution chart
           // projectionData.push({ date: currentDate.format('YYYY-MM-DD'), balance: simulatedTotalBalance });
       }

        // --- Store data point at the end of each month ---
        if (currentDate.isSame(currentDate.clone().endOf('month'), 'day')) {
            projectionData.push({ date: currentDate.format('YYYY-MM-DD'), balance: simulatedTotalBalance });
        }

    } // End loop through days

    // Ensure the final end date is included if not already end of month
     if (!moment(projectionData[projectionData.length - 1]?.date).isSame(endDate.format('YYYY-MM-DD'))) {
         projectionData.push({ date: endDate.format('YYYY-MM-DD'), balance: simulatedTotalBalance });
     }


    res.json(projectionData);

  } catch (error) {
    console.error("Projection Error:", error);
    res.status(500).json({ message: 'Server Error calculating projection' });
  }
};

export { getCashFlowProjection };