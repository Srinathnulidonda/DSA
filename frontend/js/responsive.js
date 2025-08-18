// js/responsive.js
// Responsive utilities and mobile optimizations

class DSAResponsive {
    static breakpoints = {
        xs: 0,
        sm: 576,
        md: 768,
        lg: 992,
        xl: 1200,
        xxl: 1400
    };

    static currentBreakpoint = null;
    static isMobile = false;
    static isTablet = false;
    static isDesktop = false;
    static isTouchDevice = false;

    // Initialize responsive features
    static init() {
        this.updateDeviceInfo();
        this.initEventListeners();
        this.initMobileOptimizations();
        this.initTouchSupport();
        this.handleOrientationChange();
    }

    // Update device information
    static updateDeviceInfo() {
        const width = window.innerWidth;

        // Determine current breakpoint
        for (const [name, minWidth] of Object.entries(this.breakpoints).reverse()) {
            if (width >= minWidth) {
                this.currentBreakpoint = name;
                break;
            }
        }

        // Device type flags
        this.isMobile = width < this.breakpoints.md;
        this.isTablet = width >= this.breakpoints.md && width < this.breakpoints.lg;
        this.isDesktop = width >= this.breakpoints.lg;

        // Touch device detection
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Update CSS classes
        document.body.classList.toggle('mobile-device', this.isMobile);
        document.body.classList.toggle('tablet-device', this.isTablet);
        document.body.classList.toggle('desktop-device', this.isDesktop);
        document.body.classList.toggle('touch-device', this.isTouchDevice);
    }

    // Initialize event listeners
    static initEventListeners() {
        // Debounced resize handler
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.updateDeviceInfo();
                this.handleResize();
            }, 250);
        });

        // Orientation change
        window.addEventListener('orientationchange', () => {
            this.handleOrientationChange();
        });

        // Viewport height fix for mobile browsers
        this.fixViewportHeight();
        window.addEventListener('resize', () => this.fixViewportHeight());
    }

    // Initialize mobile-specific optimizations
    static initMobileOptimizations() {
        if (this.isMobile) {
            // Disable hover effects on mobile
            this.disableHoverEffects();

            // Optimize images for mobile
            this.optimizeImages();

            // Setup mobile navigation
            this.setupMobileNavigation();

            // Initialize swipe gestures
            this.initSwipeGestures();
        }
    }

    // Initialize touch support
    static initTouchSupport() {
        if (!this.isTouchDevice) return;

        // Fast click implementation
        let touchStartTime;
        let touchStartX;
        let touchStartY;

        document.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', (e) => {
            const touchEndTime = Date.now();
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const timeDiff = touchEndTime - touchStartTime;
            const distX = Math.abs(touchEndX - touchStartX);
            const distY = Math.abs(touchEndY - touchStartY);

            // Fast click detection
            if (timeDiff < 200 && distX < 10 && distY < 10) {
                e.preventDefault();
                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: touchEndX,
                    clientY: touchEndY
                });
                e.target.dispatchEvent(clickEvent);
            }
        });

        // Prevent double-tap zoom
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        });
    }

    // Fix viewport height for mobile browsers
    static fixViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    // Handle resize events
    static handleResize() {
        // Update mobile navigation
        this.updateMobileNavigation();

        // Adjust grid layouts
        this.adjustGridLayouts();

        // Update charts/visualizations
        this.updateCharts();
    }

    // Handle orientation change
    static handleOrientationChange() {
        const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
        document.body.classList.toggle('portrait', orientation === 'portrait');
        document.body.classList.toggle('landscape', orientation === 'landscape');

        // Specific adjustments for landscape mode on mobile
        if (this.isMobile && orientation === 'landscape') {
            this.optimizeForLandscape();
        }
    }

    // Disable hover effects on mobile
    static disableHoverEffects() {
        const style = document.createElement('style');
        style.textContent = `
            @media (hover: none) {
                .hover-lift:hover,
                .hover-scale:hover,
                .hover-glow:hover {
                    transform: none !important;
                    box-shadow: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Optimize images for mobile
    static optimizeImages() {
        const images = document.querySelectorAll('img[data-src-mobile]');
        images.forEach(img => {
            const mobileSrc = img.dataset.srcMobile;
            if (mobileSrc) {
                img.src = mobileSrc;
            }
        });
    }

    // Setup mobile navigation
    static setupMobileNavigation() {
        // Mobile menu toggle
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        const mobileMenu = document.querySelector('.mobile-menu');

        if (menuToggle && mobileMenu) {
            menuToggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('active');
                document.body.classList.toggle('menu-open');
            });
        }

        // Close menu on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.mobile-menu') && !e.target.closest('.mobile-menu-toggle')) {
                mobileMenu?.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });
    }

    // Initialize swipe gestures
    static initSwipeGestures() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        });

        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe();
        });

        const handleSwipe = () => {
            const swipeThreshold = 50;
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                // Horizontal swipe
                if (Math.abs(diffX) > swipeThreshold) {
                    if (diffX > 0) {
                        this.onSwipeRight();
                    } else {
                        this.onSwipeLeft();
                    }
                }
            } else {
                // Vertical swipe
                if (Math.abs(diffY) > swipeThreshold) {
                    if (diffY > 0) {
                        this.onSwipeDown();
                    } else {
                        this.onSwipeUp();
                    }
                }
            }
        };

        this.handleSwipe = handleSwipe;
    }

    // Swipe event handlers
    static onSwipeRight() {
        // Open sidebar on swipe right
        if (this.isMobile) {
            const sidebar = document.querySelector('.sidebar');
            sidebar?.classList.add('active');
        }
    }

    static onSwipeLeft() {
        // Close sidebar on swipe left
        if (this.isMobile) {
            const sidebar = document.querySelector('.sidebar');
            sidebar?.classList.remove('active');
        }
    }

    static onSwipeUp() {
        // Custom implementation
    }

    static onSwipeDown() {
        // Pull to refresh implementation
        if (window.scrollY === 0) {
            // Trigger refresh
        }
    }

    // Update mobile navigation
    static updateMobileNavigation() {
        const mobileNav = document.querySelector('.mobile-nav');
        if (!mobileNav) return;

        if (this.isMobile) {
            mobileNav.style.display = 'flex';
        } else {
            mobileNav.style.display = 'none';
        }
    }

    // Adjust grid layouts for different screen sizes
    static adjustGridLayouts() {
        const grids = document.querySelectorAll('[data-responsive-grid]');

        grids.forEach(grid => {
            const baseColumns = parseInt(grid.dataset.responsiveGrid);
            let columns = baseColumns;

            if (this.isMobile) {
                columns = 1;
            } else if (this.isTablet) {
                columns = Math.min(2, baseColumns);
            }

            grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
        });
    }

    // Update charts for responsive display
    static updateCharts() {
        if (window.Chart) {
            Chart.instances.forEach(chart => {
                chart.resize();
            });
        }
    }

    // Optimize for landscape orientation on mobile
    static optimizeForLandscape() {
        // Hide non-essential elements
        const elements = document.querySelectorAll('.hide-landscape-mobile');
        elements.forEach(el => {
            el.style.display = 'none';
        });
    }

    // Get current breakpoint
    static getCurrentBreakpoint() {
        return this.currentBreakpoint;
    }

    // Check if screen matches breakpoint
    static matchesBreakpoint(breakpoint) {
        const width = window.innerWidth;
        const minWidth = this.breakpoints[breakpoint];
        const breakpointNames = Object.keys(this.breakpoints);
        const nextIndex = breakpointNames.indexOf(breakpoint) + 1;
        const maxWidth = nextIndex < breakpointNames.length ?
            this.breakpoints[breakpointNames[nextIndex]] - 1 :
            Infinity;

        return width >= minWidth && width <= maxWidth;
    }

    // Responsive table handler
    static makeTablesResponsive() {
        const tables = document.querySelectorAll('table:not(.responsive-table)');

        tables.forEach(table => {
            table.classList.add('responsive-table');

            if (this.isMobile) {
                // Convert to card layout on mobile
                this.convertTableToCards(table);
            } else {
                // Wrap in scrollable container
                const wrapper = document.createElement('div');
                wrapper.className = 'table-responsive';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        });
    }

    // Convert table to card layout for mobile
    static convertTableToCards(table) {
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
        const rows = table.querySelectorAll('tbody tr');

        const container = document.createElement('div');
        container.className = 'table-cards';

        rows.forEach(row => {
            const card = document.createElement('div');
            card.className = 'card mb-3';
            card.innerHTML = '<div class="card-body">';

            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                const label = headers[index] || '';
                card.querySelector('.card-body').innerHTML += `
                    <div class="row mb-2">
                        <div class="col-5 fw-bold">${label}:</div>
                        <div class="col-7">${cell.innerHTML}</div>
                    </div>
                `;
            });

            card.innerHTML += '</div>';
            container.appendChild(card);
        });

        table.style.display = 'none';
        table.parentNode.insertBefore(container, table.nextSibling);
    }

    // Responsive font sizing
    static initResponsiveFonts() {
        const elements = document.querySelectorAll('[data-responsive-font]');

        elements.forEach(el => {
            const sizes = el.dataset.responsiveFont.split(',').map(s => s.trim());
            const [mobile, tablet, desktop] = sizes;

            if (this.isMobile && mobile) {
                el.style.fontSize = mobile;
            } else if (this.isTablet && tablet) {
                el.style.fontSize = tablet;
            } else if (this.isDesktop && desktop) {
                el.style.fontSize = desktop;
            }
        });
    }

    // Lazy loading for mobile
    static initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const lazyElements = document.querySelectorAll('[data-lazy]');

            const lazyLoad = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;

                        if (element.tagName === 'IMG') {
                            element.src = element.dataset.lazy;
                        } else {
                            element.style.backgroundImage = `url(${element.dataset.lazy})`;
                        }

                        element.removeAttribute('data-lazy');
                        lazyLoad.unobserve(element);
                    }
                });
            }, {
                rootMargin: '50px'
            });

            lazyElements.forEach(el => lazyLoad.observe(el));
        }
    }

    // Handle mobile keyboard
    static handleMobileKeyboard() {
        const inputs = document.querySelectorAll('input, textarea');

        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                if (this.isMobile) {
                    // Scroll input into view
                    setTimeout(() => {
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                }
            });
        });
    }

    // Performance optimizations for mobile
    static optimizePerformance() {
        if (this.isMobile) {
            // Reduce animation complexity
            document.body.classList.add('reduce-motion');

            // Disable parallax effects
            const parallaxElements = document.querySelectorAll('[data-parallax]');
            parallaxElements.forEach(el => {
                el.removeAttribute('data-parallax');
            });

            // Reduce particle counts
            if (window.DSAAnimations) {
                window.DSAAnimations.particleCount = 20; // Reduced from 50
            }
        }
    }
}

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    DSAResponsive.init();
    DSAResponsive.makeTablesResponsive();
    DSAResponsive.initResponsiveFonts();
    DSAResponsive.initLazyLoading();
    DSAResponsive.handleMobileKeyboard();
    DSAResponsive.optimizePerformance();
});

// Export for use
window.DSAResponsive = DSAResponsive;