document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const authLink = token 
        ? `<a href="settings">Settings</a><a href="premium" class="nav-btn" style="background: var(--card-border); color: var(--text-primary) !important;">Dashboard</a><a href="#" onclick="localStorage.removeItem('token'); window.location.href='/';" class="nav-btn" style="background: rgba(239, 68, 68, 0.1); color: var(--danger) !important; border: 1px solid var(--danger); margin-left: 10px;">Log Out</a>`
        : `<a href="login" class="nav-btn">Log In</a>`;

    const navbarHtml = `
        <nav class="navbar">
            <a href="/" class="nav-brand">
                <svg width="24" height="24" viewBox="0 0 512 512" style="border-radius: 5px;">
                    <rect width="512" height="512" rx="112" fill="var(--accent-primary)"/>
                    <path d="M120 256 L400 120 L280 400 L240 296 L120 256 Z" fill="#FFFFFF"/>
                </svg>
                DropConnect
            </a>
            <div class="nav-links">
                ${authLink}
            </div>
        </nav>
    `;

    const footerHtml = `
        <footer style="margin-top: auto; padding: 40px 20px; border-top: 1px solid var(--card-border); text-align: center; color: var(--text-secondary); font-size: 0.9rem;">
            <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 20px;">
                <div>© ${new Date().getFullYear()} DropConnect. All rights reserved.</div>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <a href="contact" style="color: var(--text-secondary); text-decoration: none;">Contact Us</a>
                    <a href="terms" style="color: var(--text-secondary); text-decoration: none;">Terms & Conditions</a>
                    <a href="refund" style="color: var(--text-secondary); text-decoration: none;">Refund & Cancellation</a>
                    <a href="privacy" style="color: var(--text-secondary); text-decoration: none;">Privacy Policy</a>
                </div>
            </div>
        </footer>
    `;

    document.body.insertAdjacentHTML('afterbegin', navbarHtml);
    document.body.insertAdjacentHTML('beforeend', footerHtml);
});
