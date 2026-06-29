document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const authLink = token 
        ? `<a href="premium.html" class="nav-btn" style="background: var(--card-border); color: var(--text-primary) !important;">Dashboard</a>`
        : `<a href="login.html" class="nav-btn">Log In</a>`;

    const navbarHtml = `
        <nav class="navbar">
            <a href="/" class="nav-brand">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                    <rect x="9" y="9" width="6" height="6"></rect>
                    <line x1="9" y1="1" x2="9" y2="4"></line>
                    <line x1="15" y1="1" x2="15" y2="4"></line>
                    <line x1="9" y1="20" x2="9" y2="23"></line>
                    <line x1="15" y1="20" x2="15" y2="23"></line>
                    <line x1="20" y1="9" x2="23" y2="9"></line>
                    <line x1="20" y1="14" x2="23" y2="14"></line>
                    <line x1="1" y1="9" x2="4" y2="9"></line>
                    <line x1="1" y1="14" x2="4" y2="14"></line>
                </svg>
                DropConnect
            </a>
            <div class="nav-links">
                <a href="pricing.html">Pricing</a>
                ${authLink}
            </div>
        </nav>
    `;

    document.body.insertAdjacentHTML('afterbegin', navbarHtml);
});
