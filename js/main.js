import { initTheme } from './theme.js';
import { initGame } from './game.js';
import { initSecurity } from './security.js';

document.addEventListener('DOMContentLoaded', () => {
    initTheme('themeToggle');
    initGame();
    initSecurity();
});