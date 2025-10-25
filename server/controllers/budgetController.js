import Budget from '../models/Budget.js';

// @desc    Create or update a budget
// @route   POST /api/budgets
// @access  Private
const createOrUpdateBudget = async (req, res) => {
  const { category, amount } = req.body;
  try {
    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, category: category },
      { amount: amount },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(201).json(budget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all budgets for a user
// @route   GET /api/budgets
// @access  Private
const getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user._id });
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a budget
// @route   DELETE /api/budgets/:id
// @access  Private
const deleteBudget = async (req, res) => {
    try {
        const budget = await Budget.findById(req.params.id);

        if (!budget) {
            return res.status(404).json({ message: 'Budget not found' });
        }

        if (budget.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        await budget.deleteOne();
        res.json({ message: 'Budget removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export { createOrUpdateBudget, getBudgets, deleteBudget };