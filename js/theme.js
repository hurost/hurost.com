export const brandPalette = {
    gold: '#eec68e',
    olive: '#455548',
    lightGreen: '#a5d2ae',
    darkGreen: '#263b2e',
    coral: '#eb8d6d',
    lightGrey: '#ededed',
    charcoal: '#3c3c3b'
};

let isDarkMode = false;

export function initTheme(toggleElementId) {
    const themeToggle = document.getElementById(toggleElementId);
    if (!themeToggle) return;

    themeToggle.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('dark-mode', isDarkMode);
    });
}

export function getIsDarkMode() {
    return isDarkMode;
}

export function getActivePalette() {
    if (isDarkMode) {
        return [
            brandPalette.gold,       // #eec68e
            brandPalette.coral,      // #eb8d6d
            brandPalette.lightGreen, // #a5d2ae
            brandPalette.lightGrey,  // #ededed
            '#ffffff'                // سفید
        ];
    } else {
        return [
            brandPalette.gold,
            brandPalette.coral,
            brandPalette.olive,
            brandPalette.charcoal,
            brandPalette.darkGreen
        ];
    }
}