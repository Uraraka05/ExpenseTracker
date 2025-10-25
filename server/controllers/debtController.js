import Account from '../models/Account.js';
import moment from 'moment'; // Make sure moment is imported if needed elsewhere, though not strictly required for this calculation logic itself.

const simulateMonth = (debts, availablePayment, strategy) => {
    let remainingPayment = availablePayment;
    let interestPaidThisMonth = 0;
    let updatedDebts = JSON.parse(JSON.stringify(debts));

    // 1. Calculate interest accrued and apply minimum payments (simplified)
    updatedDebts = updatedDebts.map(debt => {
        const currentBalance = Number(debt.balance) || 0;
        const currentRate = Number(debt.interestRate) || 0;

        const monthlyRate = currentRate / 12;
        const interestAccrued = currentBalance * monthlyRate;
        interestPaidThisMonth += interestAccrued;

        // Simplified minimum payment (interest only)
        const minimumPayment = Math.max(0, interestAccrued);
        let paymentApplied = 0;
        if (remainingPayment > 0) {
             paymentApplied = Math.min(minimumPayment, remainingPayment);
             remainingPayment -= paymentApplied;
        }

        return {
            ...debt, // Keep original properties like _id, name, interestRate
            balance: currentBalance + interestAccrued - paymentApplied, // Calculate new balance
            interestAccrued: interestAccrued, // Store for potential use/debugging
            paymentAppliedTowardMinimum: paymentApplied, // Track minimum paid
        };
    });

    // 2. Apply remaining payment based on strategy
    let sortOrder = (strategy === 'snowball')
        ? (a, b) => a.balance - b.balance // Smallest balance first
        : (a, b) => b.interestRate - a.interestRate; // Highest rate first

    updatedDebts.sort(sortOrder);

    for (let i = 0; i < updatedDebts.length && remainingPayment > 0; i++) {
        // Only apply extra payment if balance is positive after minimums/interest
        if (updatedDebts[i].balance > 0) {
             const payment = Math.min(remainingPayment, updatedDebts[i].balance);
             updatedDebts[i].balance -= payment;
             remainingPayment -= payment;
        }
    }

    // Filter out paid-off debts (using a small threshold for floating point inaccuracies)
    updatedDebts = updatedDebts.filter(debt => debt.balance > 0.01);

    return { updatedDebts, interestPaidThisMonth };
};


// @desc    Calculate debt paydown strategies
// @route   POST /api/debt/calculate
// @access  Private
const calculateDebtStrategies = async (req, res) => {
    const { extraPayment } = req.body;
    const userId = req.user._id;
    console.log(`--- Starting Debt Calculation for User ${userId} ---`);
    console.log(`Received Extra Payment: ${extraPayment}`);

    if (isNaN(Number(extraPayment)) || Number(extraPayment) < 0) {
        console.log("Calculation Failed: Invalid extra payment.");
        return res.status(400).json({ message: 'Invalid extra payment amount.' });
    }
    const monthlyExtraPayment = Number(extraPayment);

    try {
        console.log("Fetching debt accounts from DB...");
        // Fetch accounts marked as liability by the user
        const allDebtsRaw = await Account.find({ user: userId, isLiability: true }).lean();
        console.log("Raw Debts Fetched:", JSON.stringify(allDebtsRaw.map(d => ({ name: d.name, balance: d.balance, interestRate: d.interestRate })), null, 2));

        // Prepare initial state: Filter for negative balances and use positive values for calculation
        const initialDebts = allDebtsRaw
            .filter(d => d.balance < 0)
            .map(d => ({
                _id: d._id.toString(),
                name: d.name,
                balance: Math.abs(d.balance), // Use absolute value for calculation
                interestRate: typeof d.interestRate === 'number' ? d.interestRate : 0, // Ensure numeric rate, default 0
            }));
        console.log("Initial Debts for Simulation:", JSON.stringify(initialDebts, null, 2));

        if (initialDebts.length === 0) {
            console.log("Calculation Result: No debts found.");
            return res.json({ snowball: { months: 0, totalInterest: 0, payoffOrder: [] }, avalanche: { months: 0, totalInterest: 0, payoffOrder: [] } });
        }

        // --- Simulate Function (Handles one strategy) ---
        const runSimulation = (strategy) => {
            let currentDebts = JSON.parse(JSON.stringify(initialDebts)); // Deep copy for simulation
            let months = 0;
            let totalInterest = 0;
            let payoffOrder = [];
            let paidOffIds = new Set(); // Track IDs already recorded in payoffOrder
            const initialDebtNames = {}; // Map IDs to names for payoff order
            initialDebts.forEach(d => { initialDebtNames[d._id] = d.name; });

            while (currentDebts.length > 0 && months < 600) { // Limit simulation (e.g., 50 years)
                months++;
                const idsBeforeSim = new Set(currentDebts.map(d => d._id)); // IDs before this month's calculation

                // Calculate total minimum payment for the current set of debts (simplified)
                let currentMinimumPayments = 0;
                currentDebts.forEach(debt => {
                    currentMinimumPayments += Math.max(0, debt.balance * (debt.interestRate / 12));
                });
                const totalMonthlyPayment = currentMinimumPayments + monthlyExtraPayment;

                // Simulate payments and interest for the month
                const { updatedDebts, interestPaidThisMonth } = simulateMonth(currentDebts, totalMonthlyPayment, strategy);
                totalInterest += interestPaidThisMonth;

                // Check which debts were paid off this month
                const idsAfterSim = new Set(updatedDebts.map(d => d._id));
                idsBeforeSim.forEach(id => {
                    if (!idsAfterSim.has(id) && !paidOffIds.has(id)) { // If gone and not yet recorded
                        const paidDebtName = initialDebtNames[id];
                        if(paidDebtName) {
                            payoffOrder.push({ name: paidDebtName, months: months });
                            paidOffIds.add(id); // Mark as recorded
                            console.log(`[${strategy}] Debt ${paidDebtName} paid off in month ${months}`);
                        }
                    }
                });

                currentDebts = updatedDebts; // Update list for next iteration
            }

             // If simulation limit reached, record remaining debts
             if (months >= 600 && currentDebts.length > 0) {
                 console.log(`[${strategy}] Simulation limit reached. Recording remaining debts.`);
                 currentDebts.forEach(debt => {
                     if (!paidOffIds.has(debt._id)) {
                          const debtName = initialDebtNames[debt._id];
                          if(debtName) {
                              payoffOrder.push({ name: debtName, months: months });
                              paidOffIds.add(debt._id);
                          }
                     }
                 });
             }

            // Ensure payoff order is chronological
            payoffOrder.sort((a, b) => a.months - b.months);

            return { months, totalInterest, payoffOrder };
        };
        // --- End Simulate Function ---

        console.log("--- Simulating Snowball ---");
        const snowballResult = runSimulation('snowball');
        console.log("--- Snowball Simulation Complete ---");

        console.log("--- Simulating Avalanche ---");
        const avalancheResult = runSimulation('avalanche');
        console.log("--- Avalanche Simulation Complete ---");

        const finalResults = {
            snowball: snowballResult,
            avalanche: avalancheResult
        };
        console.log("Calculation Result:", JSON.stringify(finalResults, null, 2));
        res.json(finalResults);

    } catch (error) {
        console.error("!!! Debt Calculation Controller Error:", error);
        res.status(500).json({ message: 'Error calculating debt strategies.' });
    }
};

export { calculateDebtStrategies };