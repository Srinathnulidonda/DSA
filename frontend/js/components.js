// js/components.js
// Sidebar component
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
            sidebarOverlay.classList.toggle('show');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('show');
            sidebarOverlay.classList.remove('show');
        });
    }

    // Set active menu item
    const currentPath = window.location.pathname;
    document.querySelectorAll('.sidebar-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}

// Mobile navigation component
function initMobileNav() {
    const currentPath = window.location.pathname;
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}

// Progress ring component
function updateProgressRing(element, percentage) {
    const circle = element.querySelector('.progress-ring-circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;

    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;

    const offset = circumference - (percentage / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

// Accordion component
function initAccordions() {
    document.querySelectorAll('[data-accordion]').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const isOpen = content.classList.contains('show');

            // Close all accordions in the same group
            const group = header.closest('[data-accordion-group]');
            if (group) {
                group.querySelectorAll('.accordion-content.show').forEach(item => {
                    item.classList.remove('show');
                });
                group.querySelectorAll('[data-accordion].active').forEach(item => {
                    item.classList.remove('active');
                });
            }

            // Toggle current accordion
            if (!isOpen) {
                content.classList.add('show');
                header.classList.add('active');
            }
        });
    });
}

// Dropdown component
function initDropdowns() {
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-dropdown-toggle]')) {
            e.preventDefault();
            const dropdownId = e.target.getAttribute('data-dropdown-toggle');
            const dropdown = document.getElementById(dropdownId);

            // Close other dropdowns
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                if (menu.id !== dropdownId) {
                    menu.classList.remove('show');
                }
            });

            dropdown.classList.toggle('show');
        } else {
            // Close all dropdowns when clicking outside
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });
}

// Tab component
function initTabs() {
    document.querySelectorAll('[data-tab]').forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = tab.getAttribute('data-tab');
            const tabGroup = tab.closest('[data-tab-group]');

            // Update active tab
            tabGroup.querySelectorAll('[data-tab]').forEach(t => {
                t.classList.remove('active');
            });
            tab.classList.add('active');

            // Update tab content
            const contentGroup = document.querySelector(`[data-tab-content="${tabGroup.getAttribute('data-tab-group')}"]`);
            contentGroup.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.getElementById(targetId).classList.add('active');
        });
    });
}

// Modal component
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    document.body.appendChild(backdrop);
    document.body.classList.add('modal-open');

    modal.classList.add('show');
    modal.style.display = 'block';

    // Close modal on backdrop click
    backdrop.addEventListener('click', () => {
        hideModal(modalId);
    });

    // Close modal on close button click
    modal.querySelectorAll('[data-dismiss="modal"]').forEach(btn => {
        btn.addEventListener('click', () => {
            hideModal(modalId);
        });
    });
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    const backdrop = document.querySelector('.modal-backdrop');

    modal.classList.remove('show');
    modal.style.display = 'none';

    if (backdrop) {
        backdrop.remove();
    }

    document.body.classList.remove('modal-open');
}

// Initialize all components
document.addEventListener('DOMContentLoaded', function () {
    initSidebar();
    initMobileNav();
    initAccordions();
    initDropdowns();
    initTabs();
});

// Export functions for global use
window.updateProgressRing = updateProgressRing;
window.showModal = showModal;
window.hideModal = hideModal;