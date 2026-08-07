document.addEventListener('DOMContentLoaded', () => {
    fetch('assets/data/content.json')
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.navigation) renderNavigation(data.navigation);
            if (data.wideMind) renderWideMind(data.wideMind);
        })
        .catch(error => console.error('خطا در دریافت اطلاعات:', error));
});

function renderNavigation(navItems) {
    // انتخاب بر اساس Class به جای ID برای هماهنگی کامل با HTML
    const navContainer = document.querySelector('.main-menu');
    if (!navContainer || !navItems) return;

    navContainer.innerHTML = navItems
        .map(item => `<li><a href="${item.link}">${item.title}</a></li>`)
        .join('');
}

function renderWideMind(projects) {
    const gridContainer = document.getElementById('wide-mind-grid');
    if (!gridContainer || !projects) return;

    gridContainer.innerHTML = projects
        .map(project => `
        <article class="project-card">
          <div class="card-image">
            <img src="${project.image}" alt="${project.title}" onerror="this.style.display='none'">
          </div>
          <div class="card-body">
            <span class="status-badge">${project.status}</span>
            <h3>${project.title}</h3>
            <p>${project.summary}</p>
            <a href="${project.link}" class="btn-link">اطلاعات بیشتر ←</a>
          </div>
        </article>
      `)
        .join('');
}