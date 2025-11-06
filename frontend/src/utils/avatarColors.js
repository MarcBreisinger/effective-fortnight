/**
 * Generates a consistent color for a child avatar based on their ID
 * @param {number} childId - The unique ID of the child
 * @returns {string} - A hex color code
 */
export const getChildAvatarColor = (childId) => {
  // Predefined palette of pleasant, accessible colors
  const colorPalette = [
    '#1976d2', // Blue
    '#d32f2f', // Red
    '#388e3c', // Green
    '#f57c00', // Orange
    '#7b1fa2', // Purple
    '#0097a7', // Cyan
    '#c2185b', // Pink
    '#5d4037', // Brown
    '#455a64', // Blue Grey
    '#f9a825', // Yellow
    '#00796b', // Teal
    '#e64a19', // Deep Orange
    '#303f9f', // Indigo
    '#689f38', // Light Green
    '#afb42b', // Lime
    '#6d4c41', // Deep Brown
    '#512da8', // Deep Purple
    '#0288d1', // Light Blue
  ];

  // Use the child ID to consistently select a color
  const colorIndex = childId % colorPalette.length;
  return colorPalette[colorIndex];
};
