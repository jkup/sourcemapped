import { describeCount } from './format.js';

// DEMO_ORIGINAL_SOURCE_SENTINEL: present in the map, never in scanner output.
const button = document.querySelector<HTMLButtonElement>('#counter');
if (!button) throw new Error('Missing demo counter');
let count = 0;
button.textContent = describeCount(count);
button.addEventListener('click', () => {
  button.textContent = describeCount(++count);
});
