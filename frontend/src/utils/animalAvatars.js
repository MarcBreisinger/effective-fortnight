/**
 * Cute animal avatars for children
 * Uses 48 adorable animal avatars from the cute-animal-avatars library
 */

// List of all 48 animal avatars
const animalNames = [
  'bear', 'fox', 'rabbit', 'koala', 'mouse', 'cow', 'cat', 'dog',
  'raccoon', 'giraffe', 'lion', 'monkey', 'sheep', 'bunny', 'elephant',
  'blue_bird', 'duck', 'penguin', 'turtle', 'fish', 'frog', 'penguin_baby',
  'lion_cub', 'parrot', 'penguin_round', 'narwhal', 'kid', 'dragon',
  'robot', 'koala_baby', 'owl', 'tiger', 'horse', 'seal', 'turtle_baby',
  'whale', 'penguin_alt', 'kitten', 'dolphin', 'squirrel', 'gecko',
  'robot_green', 'squirrel_alt', 'chicken', 'alien', 'dino', 'sheep_fluffy', 'snail'
];

/**
 * Gets the animal avatar name for a child based on their ID
 * @param {number} childId - The unique ID of the child
 * @returns {string} - The animal name (e.g., 'bear', 'fox', etc.)
 */
export const getChildAnimalAvatar = (childId) => {
  const index = childId % animalNames.length;
  return animalNames[index];
};

/**
 * Gets the avatar image path for a child
 * @param {number} childId - The unique ID of the child
 * @returns {string} - The path to the avatar image
 */
export const getChildAvatarPath = (childId) => {
  const animalName = getChildAnimalAvatar(childId);
  const animalIndex = animalNames.indexOf(animalName) + 1;
  const paddedIndex = String(animalIndex).padStart(2, '0');
  return `/cute-animal-avatars-final/avatars/${paddedIndex}_${animalName}.png`;
};
