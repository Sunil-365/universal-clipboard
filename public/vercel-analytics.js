// Vercel Web Analytics Initialization
// This script initializes the Vercel analytics tracking queue
// and loads the analytics script from Vercel's CDN

(function() {
    'use strict';
    
    // Initialize the analytics queue
    window.va = window.va || function() {
        (window.vaq = window.vaq || []).push(arguments);
    };

    // Load the analytics script from Vercel CDN
    // In production, Vercel will automatically inject the correct script path
    // For development, this will log events to console
    var script = document.createElement('script');
    script.defer = true;
    
    // Vercel automatically provides the script at this path when deployed
    // The exact path will be generated when you enable Web Analytics in your Vercel dashboard
    script.src = '/_vercel/insights/script.js';
    
    // Fallback: if not on Vercel, the script won't load but won't break the site
    script.onerror = function() {
        console.log('Vercel Analytics: Script not loaded. Enable Web Analytics in your Vercel dashboard.');
    };
    
    document.head.appendChild(script);
})();
