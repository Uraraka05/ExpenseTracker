import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js'; // Keep if you delete transactions on account delete
import mongoose from 'mongoose'; // Keep if using sessions (optional here)

// @desc    Add a new account
// @route   POST /api/accounts
// @access  Private
const addAccount = async (req, res) => {
  const { name, type, balance, interestRate } = req.body;
  try {
    // Determine if it's a liability based on type
    const liabilityTypes = ['Credit Card', 'Loan', 'Mortgage', 'Other Liability'];
    const isLiability = liabilityTypes.includes(type);
    // Convert interest rate % to decimal
    const rateDecimal = isLiability && interestRate ? parseFloat(interestRate) / 100 : 0;

    const account = new Account({
      user: req.user._id,
      name,
      type,
      balance: Number(balance) || 0, // Ensure balance is a number
      interestRate: rateDecimal,
      isLiability: isLiability,
    });
    const createdAccount = await account.save();
    res.status(201).json(createdAccount);
  } catch (error) {
     console.error("Add Account Error:", error);
     // Handle validation errors specifically
     if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
     }
     res.status(500).json({ message: 'Server Error adding account' });
  }
};

// @desc    Get all accounts for a user
// @route   GET /api/accounts
// @access  Private
const getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user._id }).sort({ name: 1 }); // Sort alphabetically
    res.json(accounts);
  } catch (error) {
    console.error("Get Accounts Error:", error);
    res.status(500).json({ message: 'Server Error fetching accounts' });
  }
};

// @desc    Delete an account
// @route   DELETE /api/accounts/:id
// @access  Private
const deleteAccount = async (req, res) => {
  const session = await mongoose.startSession(); // Use session for multi-doc operation
  session.startTransaction();
  try {
    const account = await Account.findById(req.params.id).session(session);
    if (!account) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Account not found' });
    }
    // Make sure user owns the account
    if (account.user.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      return res.status(401).json({ message: 'User not authorized' });
    }

    // --- Optional but Recommended: Delete related data ---
    // Delete Transactions associated with this account
    await Transaction.deleteMany({ account: req.params.id }, { session });
    // Consider deleting related Transfers, Recurring Schedules etc. if needed
    // Example: await Transfer.deleteMany({ $or: [{ fromAccount: req.params.id }, { toAccount: req.params.id }] }, { session });
    // Example: await RecurringTransaction.deleteMany({ account: req.params.id }, { session });
    // --- End Optional ---

    await account.deleteOne({ session }); // Delete the account itself

    await session.commitTransaction();
    res.json({ message: 'Account and associated transactions removed' });

  } catch (error) {
    await session.abortTransaction();
    console.error("Delete Account Error:", error);
    res.status(500).json({ message: 'Server Error deleting account' });
  } finally {
     session.endSession();
  }
};

// @desc    Update an account
// @route   PUT /api/accounts/:id
// @access  Private
const updateAccount = async (req, res) => {
  // Destructure all expected fields, even if optional
  const { name, type, balance, interestRate } = req.body;

  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (account.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    // Use the potentially new type if provided, otherwise the existing one
    const currentType = type || account.type;
    const liabilityTypes = ['Credit Card', 'Loan', 'Mortgage', 'Other Liability'];
    const isLiability = liabilityTypes.includes(currentType);

    // Update fields only if they are provided in the request body
    if (name !== undefined) account.name = name;
    if (type !== undefined) account.type = type;

    // Direct balance update - use with caution
    /*if (balance !== undefined) {
        account.balance = Number(balance);
    }
*/
    account.interestRate = isLiability && interestRate !== undefined
        ? parseFloat(interestRate) / 100
        : 0; // Set to 0 if not liability or rate not provided
    account.isLiability = isLiability;

    const updatedAccount = await account.save(); // Mongoose validation runs here
    res.json(updatedAccount);

  } catch (error) {
    console.error("Account Update Error:", error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server Error updating account' });
  }
};


export { addAccount, getAccounts, deleteAccount, updateAccount };