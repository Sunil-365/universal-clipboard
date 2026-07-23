document.addEventListener('DOMContentLoaded', async () => {
    let isAuthenticated = false;
    if (typeof supabaseClient !== 'undefined') {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            isAuthenticated = !!user;
        } catch (e) {
            isAuthenticated = !!localStorage.getItem('token');
        }
    } else {
        isAuthenticated = !!localStorage.getItem('token');
    }

    const authLinkDesktop = isAuthenticated 
        ? `<a href="/settings">Settings</a>
           <a href="/premium" class="nav-btn nav-btn-dashboard">Dashboard</a>
           <a href="#" onclick="handleLogout(event)" class="nav-btn nav-btn-logout">Log Out</a>`
        : `<a href="/login" class="nav-btn">Log In</a>`;

    const authLinkMobile = isAuthenticated 
        ? `<a href="/settings">Settings</a>
           <a href="/premium" class="nav-btn nav-btn-dashboard" style="text-align: center;">Dashboard</a>
           <a href="#" onclick="handleLogout(event)" class="nav-btn nav-btn-logout" style="text-align: center;">Log Out</a>`
        : `<a href="/login" class="nav-btn" style="text-align: center;">Log In</a>`;

    const navbarHtml = `
        <nav class="navbar">
            <a href="/" class="nav-brand">
                <svg width="28" height="28" viewBox="0 0 512 512" style="border-radius: 6px; flex-shrink: 0;">
                    <rect width="512" height="512" rx="112" fill="var(--accent-primary)"/>
                    <path d="M120 256 L400 120 L280 400 L240 296 L120 256 Z" fill="#FFFFFF"/>
                </svg>
                <span class="brand-text">DropConnect</span>
            </a>
            
            <div class="nav-links" id="nav-auth-links">
                ${authLinkDesktop}
            </div>

            <button class="nav-hamburger" id="nav-hamburger-btn" aria-label="Toggle navigation menu">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
        </nav>

        <div class="nav-mobile-overlay" id="nav-mobile-overlay">
            <div class="nav-links-mobile">
                <a href="/">Home</a>
                <a href="/receiver">Desk Display</a>
                <a href="/sender">Mobile Sender</a>
                ${authLinkMobile}
            </div>
        </div>
    `;

    const footerHtml = `
        <footer style="margin-top: auto; width: 100%; padding: 40px 20px; border-top: 1px solid var(--card-border); background: var(--card-bg); text-align: center; color: var(--text-secondary); font-size: 0.9rem; backdrop-filter: var(--backdrop-blur);">
            <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 20px;">
                <div>© ${new Date().getFullYear()} DropConnect. All rights reserved.</div>
                <div style="display: flex; gap: 20px; flex-wrap: wrap; justify-content: center;">
                    <a href="/terms" style="color: var(--text-secondary); text-decoration: none; font-weight: 500; transition: color 0.2s;">Terms & Conditions</a>
                    <a href="/refund" style="color: var(--text-secondary); text-decoration: none; font-weight: 500; transition: color 0.2s;">Refund Policy</a>
                    <a href="/privacy" style="color: var(--text-secondary); text-decoration: none; font-weight: 500; transition: color 0.2s;">Privacy Policy</a>
                    <a href="/feedback" style="color: var(--text-secondary); text-decoration: none; font-weight: 500; transition: color 0.2s;">Feedback</a>
                </div>
            </div>
        </footer>
    `;

    document.body.insertAdjacentHTML('afterbegin', navbarHtml);
    document.body.insertAdjacentHTML('beforeend', footerHtml);

    const hamburgerBtn = document.getElementById('nav-hamburger-btn');
    const mobileOverlay = document.getElementById('nav-mobile-overlay');

    if (hamburgerBtn && mobileOverlay) {
        hamburgerBtn.addEventListener('click', () => {
            const isOpen = mobileOverlay.classList.contains('open');
            if (isOpen) {
                mobileOverlay.classList.remove('open');
            } else {
                mobileOverlay.classList.add('open');
            }
        });

        mobileOverlay.addEventListener('click', (e) => {
            if (e.target === mobileOverlay) {
                mobileOverlay.classList.remove('open');
            }
        });
    }
});

window.handleLogout = async function(e) {
    if (e) e.preventDefault();
    if (typeof supabaseClient !== 'undefined') {
        try {
            await supabaseClient.auth.signOut();
        } catch(err) {}
    }
    localStorage.removeItem('token');
    window.location.href = '/';
};
