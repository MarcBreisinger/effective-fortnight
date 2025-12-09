/**
 * Date validation utilities for the frontend
 */

/**
 * Check if a date is in the past (before today)
 * @param {Date|string} date - Date object or date string
 * @returns {boolean} - True if date is in the past
 */
export function isPastDate(date) {
  const inputDate = date instanceof Date ? date : new Date(date);
  const today = new Date();
  
  // Set both to midnight for date-only comparison
  inputDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  return inputDate < today;
}

/**
 * Check if a date is today or in the future
 * @param {Date|string} date - Date object or date string
 * @returns {boolean} - True if date is today or future
 */
export function isTodayOrFuture(date) {
  return !isPastDate(date);
}
