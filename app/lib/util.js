/*
 * Misc Utility Functions
 */

// Returns the DOM element with the provided ID
export const $ = (id) => document.getElementById(id);

// Returns children of the provided parent element with a given name
export const getChildElementsByName = (parent, name) => parent.querySelector(`span[name=${name}]`);

// Returns a random integer in the range [min, max). min is optional and defaults to 0
export const randomInt = (max, min = 0) => min + Math.floor(Math.random() * max);

// Returns a random float in the range [min, max]. min is optional and defaults to 0
export const randomFloat = (max, min = 0) => min + (Math.random() * max);

// Returns a random 8 bit RGB hex value in the range (0x000000, 0xffffff)
export const random8BitColor = () => Math.random() * 0xffffff;