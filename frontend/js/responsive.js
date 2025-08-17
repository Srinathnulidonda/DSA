// js/responsive.js
// Responsive utilities and mobile optimizations

// Mobile detection
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isTablet() {
    return /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(navigator.userAgent.toLowerCase());
}

// Viewport utilities
function getViewportWidth() {
    return Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
}

function getViewportHeight() {
    return Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
}

// Responsive breakpoints
const breakpoints = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400
};

function getCurrentBreakpoint() {
    const width = getViewportWidth();
    let current = 'xs';

    for (const [breakpoint, minWidth] of Object.entries(breakpoints)) {
        if (width >= minWidth) {
            current = breakpoint;
        }
    }

    return current;
}

// Touch events handling
function initTouchEvents() {
    if (!isMobile()) return;

    // Improve touch responsiveness
    document.addEventListener('touchstart', () => { }, { passive: true });

    // Swipe detection
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const minSwipeDistance = 50;

        // Horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0) {
                // Swipe right - show sidebar on mobile
                const sidebar = document.getElementById('sidebar');
                if (sidebar && getViewportWidth() < breakpoints.md) {
                    sidebar.classList.add('show');
                }
            } else {
                // Swipe left - hide sidebar on mobile
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('show')) {
                    sidebar.classList.remove('show');
                }
            }
        }
    }
}

// Responsive tables
function makeTablesResponsive() {
    const tables = document.querySelectorAll('table:not(.table-responsive-stack)');

    tables.forEach(table => {
        if (getViewportWidth() < breakpoints.md) {
            // Wrap table in responsive container
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
    });
}

// Responsive images
function optimizeImages() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Mobile menu handling
function initMobileMenu() {
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (getViewportWidth() < breakpoints.md) {
            const sidebar = document.getElementById('sidebar');
            const sidebarToggle = e.target.closest('[onclick*="toggleSidebar"]');

            if (sidebar && sidebar.classList.contains('show') &&
                !sidebar.contains(e.target) && !sidebarToggle) {
                sidebar.classList.remove('show');
            }
        }
    });
}

// Orientation change handling
function handleOrientationChange() {
    const orientation = window.orientation || 0;
    document.body.classList.remove('landscape', 'portrait');

    if (Math.abs(orientation) === 90) {
        document.body.classList.add('landscape');
    } else {
        document.body.classList.add('portrait');
    }
}

// Viewport height fix for mobile browsers
function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Debounce function for resize events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize responsive features
function initResponsive() {
    // Initial setup
    initTouchEvents();
    makeTablesResponsive();
    optimizeImages();
    initMobileMenu();
    handleOrientationChange();
    setViewportHeight();

    // Handle resize
    const handleResize = debounce(() => {
        setViewportHeight();
        makeTablesResponsive();
    }, 250);

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
        handleOrientationChange();
        setViewportHeight();
    });

    // Add responsive classes to body
    document.body.classList.add(getCurrentBreakpoint());

    window.addEventListener('resize', debounce(() => {
        // Remove all breakpoint classes
        Object.keys(breakpoints).forEach(bp => {
            document.body.classList.remove(bp);
        });
        // Add current breakpoint
        document.body.classList.add(getCurrentBreakpoint());
    }, 250));
}

// Mobile-specific optimizations
function mobileOptimizations() {
    if (isMobile()) {
        // Disable hover effects on mobile
        try {
            document.createEvent('TouchEvent');
            document.body.classList.add('touch-device');
        } catch (e) {
            document.body.classList.add('no-touch');
        }

        // Optimize animations for mobile
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduced-motion');
        }

        // Prevent zoom on input focus
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                if (getViewportWidth() < breakpoints.md) {
                    document.querySelector('meta[name="viewport"]').setAttribute('content',
                        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
                }
            });

            input.addEventListener('blur', () => {
                document.querySelector('meta[name="viewport"]').setAttribute('content',
                    'width=device-width, initial-scale=1.0');
            });
        });
    }
}

// Export functions
window.isMobile = isMobile;
window.isTablet = isTablet;
window.getCurrentBreakpoint = getCurrentBreakpoint;
window.getViewportWidth = getViewportWidth;
window.getViewportHeight = getViewportHeight;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initResponsive();
    mobileOptimizations();
});

// Add responsive styles
const style = document.createElement('style');
style.textContent = `
    /* Custom viewport height */
    .h-screen {
        height: 100vh;
        height: calc(var(--vh, 1vh) * 100);
    }
    
    /* Touch device optimizations */
    .touch-device .hover-effect:hover {
        transform: none !important;
        box-shadow: none !important;
    }
    
    /* Reduced motion */
    .reduced-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
    
    /* Landscape specific */
    .landscape .mobile-nav {
        height: 50px;
    }
    
    .landscape .main-content {
        margin-bottom: 50px;
    }
    
    /* Loading optimization */
    img[data-src] {
        filter: blur(5px);
        transition: filter 0.3s;
    }
    
    img[data-src].loaded {
        filter: blur(0);
    }
    
    /* Responsive utilities */
    @media (max-width: 575.98px) {
        .hide-xs { display: none !important; }
    }
    
    @media (min-width: 576px) and (max-width: 767.98px) {
        .hide-sm { display: none !important; }
    }
    
    @media (min-width: 768px) and (max-width: 991.98px) {
        .hide-md { display: none !important; }
    }
    
    @media (min-width: 992px) and (max-width: 1199.98px) {
        .hide-lg { display: none !important; }
    }
    
    @media (min-width: 1200px) {
        .hide-xl { display: none !important; }
    }
`;
document.head.appendChild(style);