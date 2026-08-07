export function initSecurity() {
    window.addEventListener('contextmenu', (e) => e.preventDefault(), true);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' ||
            ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'i', 'J', 'j'].includes(e.key)) ||
            ((e.ctrlKey || e.metaKey) && ['u', 'U'].includes(e.key))) {
            e.preventDefault();
            return false;
        }
    });
}