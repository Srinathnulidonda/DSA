// Responsive utilities and mobile interactions

// Mobile detection
const isMobile = {
    Android: () => navigator.userAgent.match(/Android/i),
    BlackBerry: () => navigator.userAgent.match(/BlackBerry/i),
    iOS: () => navigator.userAgent.match(/iPhone|iPad|iPod/i),
    Opera: () => navigator.userAgent.match(/Opera Mini/i),
    Windows: () => navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i),
    any: () => (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows())
};

// Touch events handler
class TouchHandler {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            swipeThreshold: options.swipeThreshold || 50,
            onSwipeLeft: options.onSwipeLeft || null,
            onSwipeRight: options.onSwipeRight || null,
            onSwipeUp: options.onSwipeUp || null,
            onSwipeDown: options.onSwipeDown || null,
            onTap: options.onTap || null,
            onDoubleTap: options.onDoubleTap || null,
            onLongPress: options.onLongPress || null
        };

        this.startX = 0;
        this.startY = 0;
        this.startTime = 0;
        this.longPressTimer = null;
        this.lastTap = 0;

        this.init();
    }

    init() {
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
        this.element.addEventListener('touchend', this.handleTouchEnd.bind(this));
        this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this));
    }

    handleTouchStart(e) {
        const touch = e.touches[0];
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.startTime = Date.now();

        // Long press detection
        if (this.options.onLongPress) {
            this.longPressTimer = setTimeout(() => {
                this.options.onLongPress(e);
            }, 500);
        }
    }

    handleTouchMove(e) {
        // Cancel long press on move
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    handleTouchEnd(e) {
        clearTimeout(this.longPressTimer);

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this.startX;
        const deltaY = touch.clientY - this.startY;
        const deltaTime = Date.now() - this.startTime;

        // Swipe detection
        if (Math.abs(deltaX) > this.options.swipeThreshold || Math.abs(deltaY) > this.options.swipeThreshold) {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (deltaX > 0 && this.options.onSwipeRight) {
                    this.options.onSwipeRight(e);
                } else if (deltaX < 0 && this.options.onSwipeLeft) {
                    this.options.onSwipeLeft(e);
                }
            } else {
                // Vertical swipe
                if (deltaY > 0 && this.options.onSwipeDown) {
                    this.options.onSwipeDown(e);
                } else if (deltaY < 0 && this.options.onSwipeUp) {
                    this.options.onSwipeUp(e);
                }
            }
        } else if (deltaTime < 200) {
            // Tap detection
            const currentTime = Date.now();
            const tapLength = currentTime - this.lastTap;

            if (tapLength < 300 && tapLength > 0 && this.options.onDoubleTap) {
                this.options.onDoubleTap(e);
            } else if (this.options.onTap) {
                this.options.onTap(e);
            }

            this.lastTap = currentTime;
        }
    }

    handleTouchCancel() {
        clearTimeout(this.longPressTimer);
    }
}

// Responsive table handler
class ResponsiveTable {
    constructor(table) {
        this.table = table;
        this.init();
    }

    init() {
        if (window.innerWidth <= 768) {
            this.makeResponsive();
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                this.makeResponsive();
            } else {
                this.restore();
            }
        });
    }

    makeResponsive() {
        const headers = Array.from(this.table.querySelectorAll('thead th')).map(th => th.textContent);
        const rows = this.table.querySelectorAll('tbody tr');

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                if (headers[index]) {
                    cell.setAttribute('data-label', headers[index]);
                    cell.classList.add('responsive-cell');
                }
            });
        });

        this.table.classList.add('responsive-table');
    }

    restore() {
        this.table.classList.remove('responsive-table');
        this.table.querySelectorAll('td').forEach(cell => {
            cell.classList.remove('responsive-cell');
            cell.removeAttribute('data-label');
        });
    }
}

// Mobile menu handler
class MobileMenu {
    constructor() {
        this.init();
    }

    init() {
        // Hamburger menu toggle
        const menuToggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        const backdrop = this.createBackdrop();

        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('show');
                backdrop.classList.toggle('show');
                document.body.classList.toggle('menu-open');
            });

            backdrop.addEventListener('click', () => {
                sidebar.classList.remove('show');
                backdrop.classList.remove('show');
                document.body.classList.remove('menu-open');
            });

            // Swipe to close
            new TouchHandler(sidebar, {
                onSwipeLeft: () => {
                    sidebar.classList.remove('show');
                    backdrop.classList.remove('show');
                    document.body.classList.remove('menu-open');
                }
            });
        }
    }

    createBackdrop() {
        const backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        document.body.appendChild(backdrop);
        return backdrop;
    }
}

// Viewport height fix for mobile browsers
function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Bottom sheet component
class BottomSheet {
    constructor(options = {}) {
        this.options = {
            content: options.content || '',
            height: options.height || '50%',
            onOpen: options.onOpen || null,
            onClose: options.onClose || null
        };

        this.sheet = this.create();
        this.isOpen = false;
    }

    create() {
        const sheet = document.createElement('div');
        sheet.className = 'bottom-sheet';
        sheet.style.height = this.options.height;
        sheet.innerHTML = `
            <div class="bottom-sheet-handle"></div>
            <div class="bottom-sheet-content">
                ${this.options.content}
            </div>
        `;

        document.body.appendChild(sheet);

        // Handle drag to close
        const handle = sheet.querySelector('.bottom-sheet-handle');
        new TouchHandler(handle, {
            onSwipeDown: () => this.close()
        });

        return sheet;
    }

    open() {
        this.sheet.classList.add('show');
        this.isOpen = true;
        if (this.options.onOpen) this.options.onOpen();
    }

    close() {
        this.sheet.classList.remove('show');
        this.isOpen = false;
        if (this.options.onClose) this.options.onClose();
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    destroy() {
        this.sheet.remove();
    }
}

// Pull to refresh
class PullToRefresh {
    constructor(options = {}) {
        this.options = {
            container: options.container || document.body,
            onRefresh: options.onRefresh || (() => window.location.reload()),
            threshold: options.threshold || 100
        };

        this.startY = 0;
        this.currentY = 0;
        this.refreshing = false;

        this.init();
    }

    init() {
        this.createIndicator();

        this.options.container.addEventListener('touchstart', this.handleStart.bind(this), { passive: true });
        this.options.container.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
        this.options.container.addEventListener('touchend', this.handleEnd.bind(this));
    }

    createIndicator() {
        this.indicator = document.createElement('div');
        this.indicator.className = 'pull-to-refresh-indicator';
        this.indicator.innerHTML = '<i class="fas fa-sync"></i>';
        this.options.container.prepend(this.indicator);
    }

    handleStart(e) {
        if (window.scrollY === 0 && !this.refreshing) {
            this.startY = e.touches[0].pageY;
        }
    }

    handleMove(e) {
        if (!this.startY || this.refreshing) return;

        this.currentY = e.touches[0].pageY;
        const diff = this.currentY - this.startY;

        if (diff > 0 && window.scrollY === 0) {
            e.preventDefault();

            const progress = Math.min(diff / this.options.threshold, 1);
            this.indicator.style.transform = `translateY(${diff}px) rotate(${progress * 360}deg)`;
            this.indicator.style.opacity = progress;

            if (diff > this.options.threshold) {
                this.indicator.classList.add('ready');
            } else {
                this.indicator.classList.remove('ready');
            }
        }
    }

    async handleEnd() {
        if (!this.startY || this.refreshing) return;

        const diff = this.currentY - this.startY;

        if (diff > this.options.threshold) {
            this.refreshing = true;
            this.indicator.classList.add('refreshing');

            await this.options.onRefresh();

            this.refreshing = false;
            this.indicator.classList.remove('refreshing', 'ready');
        }

        this.indicator.style.transform = '';
        this.indicator.style.opacity = '';
        this.startY = 0;
        this.currentY = 0;
    }
}

// Orientation change handler
function handleOrientationChange() {
    const orientation = window.orientation || 0;
    document.body.setAttribute('data-orientation',
        orientation === 0 || orientation === 180 ? 'portrait' : 'landscape'
    );
}

// Initialize responsive features
document.addEventListener('DOMContentLoaded', () => {
    // Set viewport height
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);

    // Initialize mobile menu
    new MobileMenu();

    // Make tables responsive
    document.querySelectorAll('table').forEach(table => {
        new ResponsiveTable(table);
    });

    // Handle orientation changes
    handleOrientationChange();
    window.addEventListener('orientationchange', handleOrientationChange);

    // Add mobile class to body
    if (isMobile.any()) {
        document.body.classList.add('is-mobile');
    }

    // Prevent overscroll on iOS
    document.body.addEventListener('touchmove', (e) => {
        if (e.target.closest('.scrollable')) return;
        if (e.touches.length > 1) return;

        const scrollable = e.target.closest('.modal-body, .sidebar, .main-content');
        if (!scrollable) e.preventDefault();
    }, { passive: false });
});

// Export utilities
window.ResponsiveUtils = {
    isMobile,
    TouchHandler,
    ResponsiveTable,
    MobileMenu,
    BottomSheet,
    PullToRefresh,
    setViewportHeight
};

// Responsive CSS
const responsiveStyles = document.createElement('style');
responsiveStyles.textContent = `
    /* Use viewport height */
    .full-height {
        height: 100vh;
        height: calc(var(--vh, 1vh) * 100);
    }
    
    /* Menu open state */
    body.menu-open {
        overflow: hidden;
    }
    
    /* Sidebar backdrop */
    .sidebar-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1030;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s, visibility 0.3s;
    }
    
    .sidebar-backdrop.show {
        opacity: 1;
        visibility: visible;
    }
    
    /* Responsive table */
    @media (max-width: 768px) {
        .responsive-table thead {
            display: none;
        }
        
        .responsive-table tbody tr {
            display: block;
            margin-bottom: 1rem;
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
        }
        
        .responsive-table td {
            display: block;
            text-align: right;
            padding: 0.75rem;
            position: relative;
            padding-left: 50%;
        }
        
        .responsive-table td::before {
            content: attr(data-label);
            position: absolute;
            left: 0.75rem;
            top: 0.75rem;
            font-weight: 600;
            text-align: left;
        }
    }
    
    /* Bottom sheet handle */
    .bottom-sheet-handle {
        width: 40px;
        height: 4px;
        background: #cbd5e1;
        border-radius: 2px;
        margin: 0.75rem auto;
    }
    
    /* Pull to refresh */
    .pull-to-refresh-indicator {
        position: fixed;
        top: -50px;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 40px;
        background: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        opacity: 0;
        transition: opacity 0.3s;
        z-index: 1000;
    }
    
    .pull-to-refresh-indicator.ready {
        color: #10b981;
    }
    
    .pull-to-refresh-indicator.refreshing {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        to { transform: translateX(-50%) rotate(360deg); }
    }
`;

document.head.appendChild(responsiveStyles);