/**
 * Formats a number into a specified currency string.
 * @param {number} amount - The number to format.
 * @param {string} currency - The 3-letter currency code (e.g., 'PKR', 'USD').
 * @returns {string} - The formatted currency string, e.g., "PKR 1,500.00".
 */
export const formatCurrency = (amount, currency = 'PKR') => {
  // Check if amount is a valid number, otherwise return a default value.
  if (typeof amount !== 'number' || isNaN(amount)) {
    return `_`; 
  }

  // Use the browser's built-in Intl.NumberFormat for accurate, locale-aware currency formatting.
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
};