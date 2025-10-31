import Account from '../models/Account.js';
import RecurringTransaction from '../models/RecurringTransaction.js';
import moment from 'moment-timezone'; // Use moment-timezone
import Transaction from '../models/Transaction.js';

// @desc    Get cash flow projection
// @route   GET /api/projections
// @access  Private
const getCashFlowProjection = async (req, res) => {
  try {
    const userId = req.user._id;
    const durationMonths = parseInt(req.query.duration) || 3;
    const startDate = moment().startOf('day');
    const endDate = moment().add(durationMonths, 'months').endOf('day');

    const mostActiveAccountAgg = await Transaction.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$account", count: { $sum: 1 } } }, // Count transactions per account
      { $sort: { count: -1 } }, // Sort by count descending
      { $limit: 1 } // Take the top one
    ]);
    const defaultAccountId = mostActiveAccountAgg.length > 0 ? mostActiveAccountAgg[0]._id.toString() : null;
    console.log("Default Account ID:", defaultAccountId);

    const accounts = await Account.find({ user: userId });
    let accountBalances = {}; // Stores { accountId: balance }
    let accountProjections = {}; // Stores { accountId: [{ date, balance }] }
    let accountNames = {}; // Stores { accountId: name }

    accounts.forEach(acc => {
      const accId = acc._id.toString();
      accountBalances[accId] = acc.balance;
      accountNames[accId] = acc.name;
      accountProjections[accId] = [{ date: startDate.format('YYYY-MM-DD'), balance: acc.balance }];
    });

    const finalDefaultAccountId = defaultAccountId && accountNames[defaultAccountId] 
                                    ? defaultAccountId 
                                    : (Object.keys(accountNames).length > 0 ? Object.keys(accountNames)[0] : null);

    const recurringTxs = await RecurringTransaction.find({ user: userId });

    const projectionTimeline = []; // For the TOTAL balance
    let totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    projectionTimeline.push({ date: startDate.format('YYYY-MM-DD'), balance: totalBalance });

    let upcomingEvents = []; // To store the list of future events
    let currentDate = startDate.clone();

    while (currentDate.isBefore(endDate)) {
      currentDate.add(1, 'day'); // Move to the next day
      let dailyChange = 0;
      let dailyAccountChanges = {};

      for (const tx of recurringTxs) {
        const txStartDate = moment(tx.startDate);
        let isDue = false;
        const start = moment(tx.startDate).startOf('day');
        
        if (currentDate.isSameOrAfter(start)) {
             switch (tx.frequency) {
                case 'daily': isDue = true; break;
                case 'weekly': if (currentDate.day() === start.day()) isDue = true; break;
                case 'monthly':
                    if (currentDate.date() === start.date()) isDue = true;
                    else if (start.date() > currentDate.daysInMonth() && currentDate.isSame(currentDate.clone().endOf('month'), 'day')) isDue = true;
                    break;
                case 'yearly':
                    if (currentDate.month() === start.month() && currentDate.date() === start.date()) isDue = true;
                    break;
             }
        }

        if (isDue) {
          const amount = Number(tx.amount);
          const accountId = tx.account.toString();
          if (accountBalances[accountId] !== undefined) {
            const change = tx.type === 'income' ? amount : -amount;
            
            upcomingEvents.push({
                date: currentDate.format('YYYY-MM-DD'),
                description: tx.description,
                amount: change,
                accountName: accountNames[accountId]
            });
            
            if (dailyAccountChanges[accountId]) {
                dailyAccountChanges[accountId] += change;
            } else {
                dailyAccountChanges[accountId] = change;
            }
            dailyChange += change;
          }
        }
      } 

      if (dailyChange !== 0) {
        totalBalance += dailyChange;
        for (const accId in dailyAccountChanges) {
             accountBalances[accId] += dailyAccountChanges[accId];
             accountProjections[accId].push({ date: currentDate.format('YYYY-MM-DD'), balance: accountBalances[accId] });
        }
      }

      if (dailyChange !== 0 || currentDate.isSame(currentDate.clone().endOf('month'), 'day')) {
          projectionTimeline.push({ date: currentDate.format('YYYY-MM-DD'), balance: totalBalance });
          if(dailyChange === 0) { // If no change today but it's EOM
               for (const accId in accountBalances) {
                   accountProjections[accId].push({ date: currentDate.format('YYYY-MM-DD'), balance: accountBalances[accId] });
               }
          }
      }
    } 
    res.json({
        projectionTimeline,
        accountProjections,   
        upcomingEvents,
        accountNames,         // Map of ID -> Name
        defaultAccountId: finalDefaultAccountId // Send the default ID
    });

  } catch (error) {
    console.error("Projection Error:", error);
    res.status(500).json({ message: 'Server Error calculating projection' });
  }
};

export { getCashFlowProjection };