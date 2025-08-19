// js/responsive.js
// Responsive utilities
const responsive = {
    isMobile: () => window.innerWidth < 768,
    isTablet: () => window.innerWidth >= 768 && window.innerWidth < 992,
    isDesktop: () => window.innerWidth >= 992,

    onResize: (callback) => {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(callback, 250);
        });
    }
};

// Mobile menu handling
function initMobileMenu() {
    if (responsive.isMobile()) {
        // Convert desktop menu to mobile
        const desktopMenu = document.querySelector('.sidebar-menu');
        const mobileMenu = document.querySelector('.mobile-nav-menu');

        if (desktopMenu && mobileMenu) {
            // Clone menu items
            const menuItems = desktopMenu.querySelectorAll('.sidebar-item');
            menuItems.forEach((item, index) => {
                if (index < 5) { // Only show first 5 items in mobile nav
                    const link = item.querySelector('.sidebar-link');
                    const mobileItem = mobileMenu.children[index];
                    if (mobileItem && link) {
                        const mobileLink = mobileItem.querySelector('.mobile-nav-link');
                        mobileLink.href = link.href;
                    }
                }
            });
        }
    }
}

// Touch gestures
function initTouchGestures() {
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left
                document.body.classList.add('swipe-left');
            } else {
                // Swipe right
                document.body.classList.add('swipe-right');
            }

            setTimeout(() => {
                document.body.classList.remove('swipe-left', 'swipe-right');
            }, 300);
        }
    }
}

// Responsive images
function initResponsiveImages() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Responsive tables
function initResponsiveTables() {
    document.querySelectorAll('table').forEach(table => {
        if (!table.parentElement.classList.contains('table-responsive')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        }
    });
}

// Viewport height fix for mobile
function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Orientation change handling
function handleOrientationChange() {
    const orientation = window.orientation || 0;
    document.body.setAttribute('data-orientation',
        Math.abs(orientation) === 90 ? 'landscape' : 'portrait'
    );
}

// Initialize responsive features
document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initTouchGestures();
    initResponsiveImages();
    initResponsiveTables();
    setViewportHeight();
    handleOrientationChange();

    // Handle resize events
    responsive.onResize(() => {
        setViewportHeight();
        initMobileMenu();
    });

    // Handle orientation change
    window.addEventListener('orientationchange', handleOrientationChange);
});

// Export responsive utilities
window.responsive = responsive;