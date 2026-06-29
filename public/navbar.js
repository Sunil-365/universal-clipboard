document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const authLink = token 
        ? `<a href="settings.html">Settings</a><a href="premium.html" class="nav-btn" style="background: var(--card-border); color: var(--text-primary) !important;">Dashboard</a>`
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

    const footerHtml = `
        <footer style="margin-top: auto; padding: 40px 20px; border-top: 1px solid var(--card-border); text-align: center; color: var(--text-secondary); font-size: 0.9rem;">
            <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 20px;">
                <div>© ${new Date().getFullYear()} DropConnect. All rights reserved.</div>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <a href="contact.html" style="color: var(--text-secondary); text-decoration: none;">Contact Us</a>
                    <a href="terms.html" style="color: var(--text-secondary); text-decoration: none;">Terms & Conditions</a>
                    <a href="refund.html" style="color: var(--text-secondary); text-decoration: none;">Refund & Cancellation</a>
                    <a href="privacy.html" style="color: var(--text-secondary); text-decoration: none;">Privacy Policy</a>
                </div>
            </div>
        </footer>
    `;

    document.body.insertAdjacentHTML('afterbegin', navbarHtml);
    document.body.insertAdjacentHTML('beforeend', footerHtml);
});
