import RecurringTransaction from '../models/RecurringTransaction.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import mongoose from 'mongoose';
import moment from 'moment';

// --- In-memory lock to prevent concurrent processing per user ---
const processingUsers = new Set();
// -------------------------------------------------------------------

// @desc    Add a recurring transaction schedule
// @route   POST /api/recurring
// @access  Private
const addRecurringTransaction = async (req, res) => {
  const { description, amount, type, category, frequency, startDate, account } = req.body;
  try {
    // Basic validation
    if (!description || !amount || !type || !category || !frequency || !startDate || !account) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
    }
    // Check if account exists and belongs to user
    const accountExists = await Account.findOne({ _id: account, user: req.user._id });
    if (!accountExists) {
        return res.status(404).json({ message: 'Account not found or not authorized' });
    }

    const recurring = new RecurringTransaction({
      user: req.user._id,
      account,
      description,
      amount: Number(amount), // Ensure amount is stored as number
      type,
      category,
      frequency,
      startDate: new Date(startDate), // Ensure start date is stored as Date
      lastProcessedDate: null, // Start with null
    });
    const createdRecurring = await recurring.save();
    res.status(201).json(createdRecurring);
  } catch (error) {
    console.error("Add Recurring Error:", error);
     if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
     }
    res.status(500).json({ message: 'Server Error adding recurring schedule' });
  }
};

// @desc    Get all recurring transaction schedules
// @route   GET /api/recurring
// @access  Private
const getRecurringTransactions = async (req, res) => {
  try {
    const transactions = await RecurringTransaction.find({ user: req.user._id })
      .populate('account', 'name') // Populate account name for display
      .sort({ createdAt: -1 }); // Sort by creation date or start date
    res.json(transactions);
  } catch (error) {
     console.error("Get Recurring Error:", error);
    res.status(500).json({ message: 'Server Error fetching recurring schedules' });
  }
};

// @desc    Delete a recurring transaction schedule
// @route   DELETE /api/recurring/:id
// @access  Private
const deleteRecurringTransaction = async (req, res) => {
  try {
    const recurring = await RecurringTransaction.findOne({ _id: req.params.id, user: req.user._id }); // Combine find and user check

    if (!recurring) {
      return res.status(404).json({ message: 'Recurring transaction not found or not authorized' });
    }
    await recurring.deleteOne();
    res.json({ message: 'Recurring transaction schedule removed' });
  } catch (error) {
     console.error("Delete Recurring Error:", error);
     // Handle CastError if ID format is wrong
     if (error.name === 'CastError') {
         return res.status(400).json({ message: 'Invalid ID format' });
     }
    res.status(500).json({ message: 'Server Error deleting recurring schedule' });
  }
};


// @desc    Process any due recurring transactions (v5 - Simplified Logic)
// @route   POST /api/recurring/process
// @access  Private
const processRecurringTransactions = async (req, res) => {
    const userId = req.user._id.toString();
    const now = moment();

    // Acquire Lock
    if (processingUsers.has(userId)) {
        console.log(`[User: ${userId}] Recurring processing skipped: Already in progress.`);
        return res.status(200).json({ message: "Processing already in progress." });
    }
    processingUsers.add(userId);
    console.log(`[User: ${userId}] Acquired lock. Starting recurring processing check...`);

    let globalProcessedCount = 0;
    let errorsOccurred = false;

    try {
        // Fetch all recurring schedules for the user
        const recurringTxs = await RecurringTransaction.find({ user: req.user._id });
        console.log(`[User: ${userId}] Found ${recurringTxs.length} recurring schedules to check.`);

        // Process each schedule individually
        for (const tx of recurringTxs) {
            // Calculate the single NEXT due date based on current state
            const lastRan = tx.lastProcessedDate ? moment(tx.lastProcessedDate) : moment(tx.startDate);
            const nextDueDate = lastRan.clone().add(1, tx.frequency);

            // Check if this single next due date is in the past or today
            if (nextDueDate.isSameOrBefore(now, 'day')) {
                console.log(`[User: ${userId}] Schedule '${tx.description}' needs processing for ${nextDueDate.format('YYYY-MM-DD')}.`);

                // --- Attempt to process this single due date ---
                let transactionCommitted = false;
                let retries = 3;

                while (retries > 0 && !transactionCommitted) {
                    const session = await mongoose.startSession();
                    session.startTransaction();
                    try {
                        // Re-fetch docs inside transaction for latest state
                        const account = await Account.findById(tx.account).session(session);
                        const currentTxDocInDB = await RecurringTransaction.findById(tx._id).session(session);

                        // Pre-checks
                        if (!currentTxDocInDB) {
                           console.warn(` -> Schedule ${tx._id} deleted during processing. Aborting.`);
                           await session.abortTransaction(); break; // Exit retry loop
                        }
                        if (!account) {
                           console.warn(` -> Account ${tx.account} not found. Aborting.`);
                           await session.abortTransaction(); break; // Exit retry loop
                        }
                        // Check if already processed (most critical check)
                        if (currentTxDocInDB.lastProcessedDate && moment(currentTxDocInDB.lastProcessedDate).isSameOrAfter(nextDueDate, 'day')) {
                            console.log(` -> Date ${nextDueDate.format('YYYY-MM-DD')} already processed in DB. Skipping transaction.`);
                            await session.abortTransaction(); // No changes needed
                            transactionCommitted = true; // Mark as handled to exit retry loop
                            break; // Exit retry loop
                        }

                        // Create Transaction for this due date
                        console.log(` -> Creating transaction for ${nextDueDate.format('YYYY-MM-DD')}`);
                        const newTransaction = new Transaction({
                             user: tx.user, account: tx.account, description: tx.description,
                             amount: tx.amount, type: tx.type, category: tx.category,
                             date: nextDueDate.toDate(), recurringSource: tx._id
                         });
                        await newTransaction.save({ session });

                        // Update Balance
                        const change = tx.type === 'income' ? tx.amount : -tx.amount;
                        account.balance += change;
                        await account.save({ session });

                        // Update Recurring Doc's lastProcessedDate to this due date
                        currentTxDocInDB.lastProcessedDate = nextDueDate.toDate();
                        await currentTxDocInDB.save({ session });

                        // Commit
                        await session.commitTransaction();
                        console.log(` -> Successfully processed ${nextDueDate.format('YYYY-MM-DD')}`);
                        transactionCommitted = true; // Mark retry loop success
                        globalProcessedCount++;

                    } catch (error) {
                        await session.abortTransaction();
                        console.error(` -> Transaction Error (Attempt ${4 - retries}) for ${nextDueDate.format('YYYY-MM-DD')}:`, error.codeName === 'WriteConflict' ? 'WriteConflict' : error.message);
                        if (error.errorLabels?.includes('TransientTransactionError') || error.codeName === 'WriteConflict') {
                            retries--;
                            if (retries > 0) {
                                console.log(` -> Retrying... (${retries} left)`);
                                await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 150)); // Slightly longer delay
                            } else {
                                 console.error(` -> Max retries reached for due date ${nextDueDate.format('YYYY-MM-DD')}.`);
                                 errorsOccurred = true; // Mark failure for this schedule
                            }
                        } else { // Non-retryable error
                            console.error(' -> Non-retryable error occurred. Stopping processing for this schedule.');
                            retries = 0; // Stop retrying
                            errorsOccurred = true; // Mark failure for this schedule
                        }
                    } finally {
                        session.endSession();
                    }
                } // End retry while loop

                // If processing this date failed after retries, we stop trying for this schedule FOR THIS RUN
                // It will be picked up again the next time processRecurringTransactions is called.
                if (!transactionCommitted) {
                     console.error(`[User: ${userId}] Failed to process ${nextDueDate.format('YYYY-MM-DD')} for '${tx.description}' after retries.`);
                     // No 'break' here - let the outer 'for' loop continue to the next schedule
                }

            } else {
                // Next due date is in the future, nothing to do for this schedule right now
                // console.log(`[User: ${userId}] Schedule '${tx.description}' is up to date. Next due: ${nextDueDate.format('YYYY-MM-DD')}`);
            }
        } // End for loop (each recurring tx)

        console.log(`[User: ${userId}] Finished recurring processing check. Total processed this run: ${globalProcessedCount}`);
        res.json({ message: `Processed ${globalProcessedCount} recurring transactions this run.` });

    } catch (error) {
        // Error fetching initial schedules or other unexpected error
        console.error(`!!! [User: ${userId}] Global Recurring Processing Error:`, error);
        errorsOccurred = true;
        res.status(500).json({ message: 'Server error during recurring processing setup.' });
    } finally {
        // Release Lock
        processingUsers.delete(userId);
        console.log(`Released lock for user ${userId}. Errors occurred during run: ${errorsOccurred}`);
    }
};

// --- Export all functions ---
export {
  addRecurringTransaction,
  getRecurringTransactions,
  deleteRecurringTransaction,
  processRecurringTransactions,
};