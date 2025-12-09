/**
 * Date validation utilities for preventing modifications to past dates
 */

/**
 * Check if a date is in the past (before today)
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {boolean} - True if date is in the past
 */
function isPastDate(dateString) {
  const inputDate = new Date(dateString);
  const today = new Date();
  
  // Set both to midnight for date-only comparison
  inputDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  return inputDate < today;
}

/**
 * Middleware to reject requests for past dates
 * Checks the 'date' parameter in req.params
 */
function rejectPastDates(req, res, next) {
  const { date } = req.params;
  
  if (!date) {
    return res.status(400).json({ error: 'Date parameter is required' });
  }
  
  if (isPastDate(date)) {
    return res.status(403).json({ 
      error: 'Cannot modify data for past dates',
      detail: 'Changes are only allowed for today and future dates'
    });
  }
  
  next();
}

module.exports = {
  isPastDate,
  rejectPastDates
};
