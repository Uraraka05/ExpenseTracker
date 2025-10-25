import Transfer from '../models/Transfer.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import mongoose from 'mongoose';

// @desc    Create a new transfer
// @route   POST /api/transfers
// @access  Private
const createTransfer = async (req, res) => {
  const { fromAccount, toAccount, amount, date, description } = req.body;

  // --- 1. Ensure amount is a number ---
  const transferAmount = Number(amount);
  if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ message: 'Invalid transfer amount' });
  }
  // ------------------------------------

  if (fromAccount === toAccount) {
    return res.status(400).json({ message: 'Cannot transfer to the same account' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const fromAcc = await Account.findById(fromAccount).session(session);
    const toAcc = await Account.findById(toAccount).session(session);

    if (!fromAcc || !toAcc) {
      throw new Error('One or both accounts not found');
    }
    if (fromAcc.user.toString() !== req.user._id.toString() || toAcc.user.toString() !== req.user._id.toString()) {
      throw new Error('User not authorized for one or both accounts');
    }
    // Use the numeric transferAmount for comparison
    if (fromAcc.balance < transferAmount) {
      throw new Error('Insufficient funds');
    }

    const transfer = new Transfer({
      user: req.user._id,
      fromAccount,
      toAccount,
      amount: transferAmount, // Store the number
      date : new Date(date),
      description: description || 'Account Transfer'
    });
    const createdTransfer = await transfer.save({ session });

    const expenseTx = new Transaction({
      user: req.user._id, account: fromAccount,
      description: `Transfer to ${toAcc.name} ${description ? `(${description})` : ''}`,
      amount: transferAmount, type: 'expense', category: 'Transfer', date, transfer: createdTransfer._id
    });
    await expenseTx.save({ session });
    
    const incomeTx = new Transaction({
      user: req.user._id, account: toAccount,
      description: `Transfer from ${fromAcc.name} ${description ? `(${description})` : ''}`,
      amount: transferAmount, type: 'income', category: 'Transfer', date, transfer: createdTransfer._id
    });
    await incomeTx.save({ session });

    // --- 2. Perform math with numbers ---
    fromAcc.balance -= transferAmount;
    toAcc.balance += transferAmount;
    // ------------------------------------
    await fromAcc.save({ session });
    await toAcc.save({ session });
    
    await session.commitTransaction();
    res.status(201).json(createdTransfer);

  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    res.status(400).json({ message: error.message || 'Transfer failed' });
  } finally {
    session.endSession();
  }
};

// @desc    Get all transfers
// @route   GET /api/transfers
// @access  Private
const getTransfers = async (req, res) => {
  // ... (This function is unchanged) ...
  try {
    const transfers = await Transfer.find({ user: req.user._id })
      .populate('fromAccount', 'name')
      .populate('toAccount', 'name')
      .sort({ date: -1 });
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a transfer
// @route   PUT /api/transfers/:id
// @access  Private
const updateTransfer = async (req, res) => {
    const { fromAccount, toAccount, amount, date, description } = req.body;
    
    // --- 1. Ensure new amount is a number ---
    const newAmount = Number(amount);
    if (isNaN(newAmount) || newAmount <= 0) {
        return res.status(400).json({ message: 'Invalid new transfer amount' });
    }
    // ---------------------------------------

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const transfer = await Transfer.findById(req.params.id).session(session);
        if (!transfer || transfer.user.toString() !== req.user._id.toString()) {
            throw new Error('Transfer not found or not authorized');
        }

        // --- 2. Ensure old amount is treated as a number ---
        const oldAmount = Number(transfer.amount);
        // ------------------------------------------------

        // --- Revert the OLD transactions (using numbers) ---
        const oldFromAcc = await Account.findById(transfer.fromAccount).session(session);
        const oldToAcc = await Account.findById(transfer.toAccount).session(session);
        oldFromAcc.balance += oldAmount; // Give money back
        oldToAcc.balance -= oldAmount;   // Take money away
        await oldFromAcc.save({ session });
        // Only save if different from oldFromAcc to avoid potential conflicts
        if(oldFromAcc._id.toString() !== oldToAcc._id.toString()){
            await oldToAcc.save({ session });
        }


        // --- Apply the NEW transactions (using numbers) ---
        const newFromAcc = await Account.findById(fromAccount).session(session);
        const newToAcc = await Account.findById(toAccount).session(session);
        // Use newAmount for check
        if (newFromAcc.balance < newAmount) {
            throw new Error('Insufficient funds for update');
        }
        newFromAcc.balance -= newAmount; // Take new amount
        newToAcc.balance += newAmount;   // Give new amount
        
        await newFromAcc.save({ session });
         // Only save if different from newFromAcc
        if (newFromAcc._id.toString() !== newToAcc._id.toString()) {
            await newToAcc.save({ session });
        }
        

        // --- Update the linked Transaction documents (using newAmount) ---
        const newDesc = description || 'Account Transfer';
        await Transaction.findOneAndUpdate(
            { transfer: transfer._id, type: 'expense' },
            { account: fromAccount, amount: newAmount, date: date ? new Date(date) : undefined, description: `Transfer to ${newToAcc.name} ${description ? `(${description})` : ''}` },
            { session, runValidators: true } // Added runValidators
        );
        await Transaction.findOneAndUpdate(
            { transfer: transfer._id, type: 'income' },
            { account: toAccount, amount: newAmount, date: date ? new Date(date) : undefined, description: `Transfer from ${newFromAcc.name} ${description ? `(${description})` : ''}` },
            { session, runValidators: true } // Added runValidators
        );

        // --- Update the Transfer document itself (using newAmount) ---
        transfer.fromAccount = fromAccount;
        transfer.toAccount = toAccount;
        transfer.amount = newAmount; // Store number
        transfer.date = date ? new Date(date) : transfer.date;
        transfer.description = newDesc;
        const updatedTransfer = await transfer.save({ session });

        await session.commitTransaction();
        res.json(updatedTransfer);

    } catch (error) {
        await session.abortTransaction();
        console.error(error);
        res.status(400).json({ message: error.message || 'Update failed' });
    } finally {
        session.endSession();
    }
};


// @desc    Delete a transfer
// @route   DELETE /api/transfers/:id
// @access  Private
const deleteTransfer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const transfer = await Transfer.findById(req.params.id).session(session);
        if (!transfer || transfer.user.toString() !== req.user._id.toString()) {
            throw new Error('Transfer not found or not authorized');
        }

        // --- 1. Ensure amount is treated as a number ---
        const transferAmount = Number(transfer.amount);
        // -----------------------------------------------

        // Find and revert account balances (using numbers)
        const fromAcc = await Account.findById(transfer.fromAccount).session(session);
        const toAcc = await Account.findById(transfer.toAccount).session(session);
        // Check if accounts still exist before updating balance
        if(fromAcc) {
            fromAcc.balance += transferAmount; // Give money back
            await fromAcc.save({ session });
        }
        if(toAcc && fromAcc._id.toString() !== toAcc._id.toString()) { // Check existence and if different
            toAcc.balance -= transferAmount;   // Take money away
            await toAcc.save({ session });
        }

        // Delete the two linked transactions
        await Transaction.deleteMany({ transfer: transfer._id }, { session });

        // Delete the transfer itself
        await transfer.deleteOne({ session });

        await session.commitTransaction();
        res.json({ message: 'Transfer deleted' });

    } catch (error) {
        await session.abortTransaction();
        console.error(error);
        res.status(400).json({ message: error.message || 'Delete failed' });
    } finally {
        session.endSession();
    }
};


export { createTransfer, getTransfers, updateTransfer, deleteTransfer };