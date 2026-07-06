document.addEventListener('DOMContentLoaded', () => {
    // Check local storage for theme preference
    const savedTheme = localStorage.getItem('theme');
    
    // Apply saved theme or default to light
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'theme-toggle-btn';
    toggleBtn.setAttribute('aria-label', 'Toggle Dark Mode');
    
    // SVG Icons
    const moonIcon = `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    const sunIcon = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    
    const updateIcon = () => {
        toggleBtn.innerHTML = document.body.classList.contains('dark-theme') ? sunIcon : moonIcon;
    };
    
    updateIcon();
    
    // Add click event
    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        updateIcon();
        
        // Save preference
        if (document.body.classList.contains('dark-theme')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    });
    
    // Append to body
    document.body.appendChild(toggleBtn);

    // --- Custom Premium Cursor Animation ---
    if (window.matchMedia('(pointer: fine)').matches) {
        const dot = document.createElement('div');
        const outline = document.createElement('div');
        
        dot.className = 'custom-cursor-dot';
        outline.className = 'custom-cursor-outline';
        
        document.body.appendChild(dot);
        document.body.appendChild(outline);
        
        let mouseX = 0;
        let mouseY = 0;
        let outlineX = 0;
        let outlineY = 0;
        let hasMoved = false;
        
        document.addEventListener('mousemove', (e) => {
            if (!hasMoved) {
                dot.style.opacity = '1';
                outline.style.opacity = '1';
                hasMoved = true;
            }
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            dot.style.left = mouseX + 'px';
            dot.style.top = mouseY + 'px';
        });
        
        const animateOutline = () => {
            outlineX += (mouseX - outlineX) * 0.15;
            outlineY += (mouseY - outlineY) * 0.15;
            
            outline.style.left = outlineX + 'px';
            outline.style.top = outlineY + 'px';
            
            requestAnimationFrame(animateOutline);
        };
        requestAnimationFrame(animateOutline);
        
        const interactiveSelector = 'a, button, input, select, textarea, .action-card, .btn, .theme-toggle-btn, [role="button"]';
        
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest(interactiveSelector)) {
                document.body.classList.add('custom-cursor-hover');
            }
        });
        
        document.addEventListener('mouseout', (e) => {
            if (!e.target.closest(interactiveSelector)) {
                document.body.classList.remove('custom-cursor-hover');
            }
        });
        
        document.addEventListener('mouseleave', () => {
            dot.style.opacity = '0';
            outline.style.opacity = '0';
            hasMoved = false;
        });
        
        document.addEventListener('mouseenter', () => {
            hasMoved = false;
        });
    }
});

// --- Anti-Copy & Anti-Inspect Protections ---
// 1. Disable Right-Click context menu
document.addEventListener('contextmenu', e => e.preventDefault());

// 2. Disable common developer keyboard shortcuts
document.addEventListener('keydown', e => {
    // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U (and Mac equivalents)
    if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toUpperCase() === 'U') ||
        (e.metaKey && e.altKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.metaKey && e.key.toUpperCase() === 'U')
    ) {
        e.preventDefault();
        return false;
    }
});


// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('PWA ServiceWorker registered successfully!');
      })
      .catch(err => {
        console.log('PWA ServiceWorker registration failed: ', err);
      });
  });
}
