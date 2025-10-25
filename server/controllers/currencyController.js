import Currency from '../models/Currency.js';

// @desc    Get user's currency settings
// @route   GET /api/currency
// @access  Private
const getCurrencySettings = async (req, res) => {
  try {
    let settings = await Currency.findOne({ user: req.user._id });

    if (!settings) {
      settings = new Currency({
        user: req.user._id,
        baseCurrency: 'INR',
        rates: { 'USD': 83.50 } 
      });
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update user's currency settings
// @route   PUT /api/currency
// @access  Private
const updateCurrencySettings = async (req, res) => {
  const { baseCurrency, rates } = req.body;
  try {
    const settings = await Currency.findOneAndUpdate(
      { user: req.user._id },
      { baseCurrency, rates },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export { getCurrencySettings, updateCurrencySettings };