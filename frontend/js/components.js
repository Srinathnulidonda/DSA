// Reusable UI Components

// Modal Component
class Modal {
    constructor(options = {}) {
        this.options = {
            title: 'Modal',
            content: '',
            size: 'md', // sm, md, lg, xl
            closeButton: true,
            backdrop: true,
            keyboard: true,
            onShow: null,
            onHide: null,
            ...options
        };

        this.create();
    }

    create() {
        this.element = document.createElement('div');
        this.element.className = 'modal fade';
        this.element.tabIndex = -1;
        this.element.setAttribute('data-bs-backdrop', this.options.backdrop ? 'true' : 'static');
        this.element.setAttribute('data-bs-keyboard', this.options.keyboard);

        this.element.innerHTML = `
            <div class="modal-dialog modal-${this.options.size}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${this.options.title}</h5>
                        ${this.options.closeButton ? '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' : ''}
                    </div>
                    <div class="modal-body">
                        ${this.options.content}
                    </div>
                    ${this.options.footer ? `<div class="modal-footer">${this.options.footer}</div>` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(this.element);

        // Initialize Bootstrap modal
        this.bsModal = new bootstrap.Modal(this.element);

        // Event listeners
        this.element.addEventListener('show.bs.modal', () => {
            if (this.options.onShow) this.options.onShow();
        });

        this.element.addEventListener('hide.bs.modal', () => {
            if (this.options.onHide) this.options.onHide();
        });

        this.element.addEventListener('hidden.bs.modal', () => {
            this.destroy();
        });
    }

    show() {
        this.bsModal.show();
    }

    hide() {
        this.bsModal.hide();
    }

    destroy() {
        this.element.remove();
    }

    setContent(content) {
        this.element.querySelector('.modal-body').innerHTML = content;
    }

    setTitle(title) {
        this.element.querySelector('.modal-title').textContent = title;
    }
}

// Dropdown Component
class Dropdown {
    constructor(trigger, options = {}) {
        this.trigger = trigger;
        this.options = {
            items: [],
            position: 'bottom', // top, bottom, left, right
            align: 'start', // start, end, center
            onSelect: null,
            ...options
        };

        this.create();
    }

    create() {
        this.menu = document.createElement('div');
        this.menu.className = `dropdown-menu dropdown-menu-${this.options.align}`;

        this.options.items.forEach(item => {
            if (item.divider) {
                const divider = document.createElement('hr');
                divider.className = 'dropdown-divider';
                this.menu.appendChild(divider);
            } else {
                const link = document.createElement('a');
                link.className = 'dropdown-item';
                link.href = item.href || '#';
                link.innerHTML = `
                    ${item.icon ? `<i class="${item.icon} me-2"></i>` : ''}
                    ${item.text}
                `;

                if (item.disabled) {
                    link.classList.add('disabled');
                }

                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!item.disabled) {
                        if (item.action) item.action();
                        if (this.options.onSelect) this.options.onSelect(item);
                        this.hide();
                    }
                });

                this.menu.appendChild(link);
            }
        });

        // Position the dropdown
        this.trigger.parentElement.style.position = 'relative';
        this.trigger.parentElement.appendChild(this.menu);

        // Toggle on trigger click
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Close on outside click
        document.addEventListener('click', () => {
            this.hide();
        });
    }

    show() {
        this.menu.classList.add('show');
        this.position();
    }

    hide() {
        this.menu.classList.remove('show');
    }

    toggle() {
        if (this.menu.classList.contains('show')) {
            this.hide();
        } else {
            this.show();
        }
    }

    position() {
        const triggerRect = this.trigger.getBoundingClientRect();
        const menuRect = this.menu.getBoundingClientRect();

        // Reset position
        this.menu.style.top = '';
        this.menu.style.bottom = '';
        this.menu.style.left = '';
        this.menu.style.right = '';

        // Position based on options
        switch (this.options.position) {
            case 'top':
                this.menu.style.bottom = '100%';
                break;
            case 'bottom':
            default:
                this.menu.style.top = '100%';
                break;
        }
    }

    destroy() {
        this.menu.remove();
    }
}

// Tabs Component
class Tabs {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            defaultTab: 0,
            onChange: null,
            ...options
        };

        this.init();
    }

    init() {
        this.tabs = this.container.querySelectorAll('[data-tab]');
        this.panels = this.container.querySelectorAll('[data-tab-panel]');

        this.tabs.forEach((tab, index) => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.showTab(index);
            });
        });

        // Show default tab
        this.showTab(this.options.defaultTab);
    }

    showTab(index) {
        // Update tabs
        this.tabs.forEach((tab, i) => {
            if (i === index) {
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
            } else {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
            }
        });

        // Update panels
        this.panels.forEach((panel, i) => {
            if (i === index) {
                panel.classList.add('show', 'active');
                panel.setAttribute('aria-hidden', 'false');
            } else {
                panel.classList.remove('show', 'active');
                panel.setAttribute('aria-hidden', 'true');
            }
        });

        // Callback
        if (this.options.onChange) {
            this.options.onChange(index);
        }
    }

    getCurrentTab() {
        return Array.from(this.tabs).findIndex(tab => tab.classList.contains('active'));
    }
}

// Pagination Component
class Pagination {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            totalPages: 1,
            currentPage: 1,
            maxVisible: 5,
            onChange: null,
            ...options
        };

        this.render();
    }

    render() {
        const pages = this.getVisiblePages();

        this.container.innerHTML = `
            <nav aria-label="Pagination">
                <ul class="pagination">
                    <li class="page-item ${this.options.currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="prev">
                            <i class="bi bi-chevron-left"></i>
                        </a>
                    </li>
                    ${pages.map(page => {
            if (page === '...') {
                return '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            return `
                            <li class="page-item ${page === this.options.currentPage ? 'active' : ''}">
                                <a class="page-link" href="#" data-page="${page}">${page}</a>
                            </li>
                        `;
        }).join('')}
                    <li class="page-item ${this.options.currentPage === this.options.totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="next">
                            <i class="bi bi-chevron-right"></i>
                        </a>
                    </li>
                </ul>
            </nav>
        `;

        // Event listeners
        this.container.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;

                if (page === 'prev' && this.options.currentPage > 1) {
                    this.goToPage(this.options.currentPage - 1);
                } else if (page === 'next' && this.options.currentPage < this.options.totalPages) {
                    this.goToPage(this.options.currentPage + 1);
                } else if (page !== '...' && !isNaN(page)) {
                    this.goToPage(parseInt(page));
                }
            });
        });
    }

    getVisiblePages() {
        const pages = [];
        const { currentPage, totalPages, maxVisible } = this.options;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            const half = Math.floor(maxVisible / 2);
            let start = currentPage - half;
            let end = currentPage + half;

            if (start < 1) {
                start = 1;
                end = maxVisible;
            }

            if (end > totalPages) {
                end = totalPages;
                start = totalPages - maxVisible + 1;
            }

            if (start > 1) {
                pages.push(1);
                if (start > 2) pages.push('...');
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (end < totalPages) {
                if (end < totalPages - 1) pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    }

    goToPage(page) {
        if (page >= 1 && page <= this.options.totalPages && page !== this.options.currentPage) {
            this.options.currentPage = page;
            this.render();

            if (this.options.onChange) {
                this.options.onChange(page);
            }
        }
    }

    setTotalPages(total) {
        this.options.totalPages = total;
        if (this.options.currentPage > total) {
            this.options.currentPage = total;
        }
        this.render();
    }
}

// Progress Bar Component
class ProgressBar {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            value: 0,
            max: 100,
            showLabel: true,
            striped: false,
            animated: false,
            color: 'primary',
            height: '1rem',
            ...options
        };

        this.create();
    }

    create() {
        const percentage = (this.options.value / this.options.max) * 100;

        this.container.innerHTML = `
            <div class="progress" style="height: ${this.options.height}">
                <div class="progress-bar bg-${this.options.color} ${this.options.striped ? 'progress-bar-striped' : ''} ${this.options.animated ? 'progress-bar-animated' : ''}"
                     role="progressbar"
                     style="width: ${percentage}%"
                     aria-valuenow="${this.options.value}"
                     aria-valuemin="0"
                     aria-valuemax="${this.options.max}">
                    ${this.options.showLabel ? `${Math.round(percentage)}%` : ''}
                </div>
            </div>
        `;

        this.progressBar = this.container.querySelector('.progress-bar');
    }

    setValue(value) {
        this.options.value = value;
        const percentage = (value / this.options.max) * 100;

        this.progressBar.style.width = `${percentage}%`;
        this.progressBar.setAttribute('aria-valuenow', value);

        if (this.options.showLabel) {
            this.progressBar.textContent = `${Math.round(percentage)}%`;
        }
    }

    setMax(max) {
        this.options.max = max;
        this.setValue(this.options.value);
    }

    setColor(color) {
        this.progressBar.className = this.progressBar.className.replace(/bg-\w+/, `bg-${color}`);
    }
}

// Tooltip Component
class Tooltip {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            content: element.getAttribute('title') || 'Tooltip',
            placement: element.getAttribute('data-placement') || 'top',
            trigger: 'hover', // hover, click, focus, manual
            delay: 200,
            ...options
        };

        this.create();
    }

    create() {
        // Remove title attribute to prevent default tooltip
        this.element.removeAttribute('title');

        // Create tooltip element
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tooltip bs-tooltip-' + this.options.placement;
        this.tooltip.innerHTML = `
            <div class="tooltip-arrow"></div>
            <div class="tooltip-inner">${this.options.content}</div>
        `;

        // Setup triggers
        switch (this.options.trigger) {
            case 'hover':
                this.element.addEventListener('mouseenter', () => this.show());
                this.element.addEventListener('mouseleave', () => this.hide());
                break;
            case 'click':
                this.element.addEventListener('click', () => this.toggle());
                break;
            case 'focus':
                this.element.addEventListener('focus', () => this.show());
                this.element.addEventListener('blur', () => this.hide());
                break;
        }
    }

    show() {
        clearTimeout(this.hideTimeout);

        this.showTimeout = setTimeout(() => {
            document.body.appendChild(this.tooltip);
            this.position();

            requestAnimationFrame(() => {
                this.tooltip.classList.add('show');
            });
        }, this.options.delay);
    }

    hide() {
        clearTimeout(this.showTimeout);

        this.hideTimeout = setTimeout(() => {
            this.tooltip.classList.remove('show');

            setTimeout(() => {
                if (this.tooltip.parentElement) {
                    this.tooltip.remove();
                }
            }, 150);
        }, 100);
    }

    toggle() {
        if (this.tooltip.classList.contains('show')) {
            this.hide();
        } else {
            this.show();
        }
    }

    position() {
        const elementRect = this.element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();

        let top = 0;
        let left = 0;

        switch (this.options.placement) {
            case 'top':
                top = elementRect.top - tooltipRect.height - 10;
                left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = elementRect.bottom + 10;
                left = elementRect.left + (elementRect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = elementRect.top + (elementRect.height - tooltipRect.height) / 2;
                left = elementRect.left - tooltipRect.width - 10;
                break;
            case 'right':
                top = elementRect.top + (elementRect.height - tooltipRect.height) / 2;
                left = elementRect.right + 10;
                break;
        }

        // Adjust for viewport boundaries
        const padding = 10;
        if (left < padding) left = padding;
        if (left + tooltipRect.width > window.innerWidth - padding) {
            left = window.innerWidth - tooltipRect.width - padding;
        }
        if (top < padding) top = padding;
        if (top + tooltipRect.height > window.innerHeight - padding) {
            top = window.innerHeight - tooltipRect.height - padding;
        }

        this.tooltip.style.top = top + window.scrollY + 'px';
        this.tooltip.style.left = left + window.scrollX + 'px';
    }

    setContent(content) {
        this.options.content = content;
        this.tooltip.querySelector('.tooltip-inner').innerHTML = content;
    }

    destroy() {
        this.hide();
        clearTimeout(this.showTimeout);
        clearTimeout(this.hideTimeout);
    }
}

// Accordion Component
class Accordion {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            allowMultiple: false,
            defaultOpen: null,
            ...options
        };

        this.init();
    }

    init() {
        this.items = this.container.querySelectorAll('.accordion-item');

        this.items.forEach((item, index) => {
            const button = item.querySelector('.accordion-button');
            const collapse = item.querySelector('.accordion-collapse');

            button.addEventListener('click', () => {
                this.toggle(index);
            });

            // Set default open state
            if (this.options.defaultOpen === index) {
                this.open(index);
            }
        });
    }

    toggle(index) {
        const item = this.items[index];
        const button = item.querySelector('.accordion-button');
        const collapse = item.querySelector('.accordion-collapse');

        if (button.classList.contains('collapsed')) {
            this.open(index);
        } else {
            this.close(index);
        }
    }

    open(index) {
        const item = this.items[index];
        const button = item.querySelector('.accordion-button');
        const collapse = item.querySelector('.accordion-collapse');
        const body = collapse.querySelector('.accordion-body');

        // Close others if not allowing multiple
        if (!this.options.allowMultiple) {
            this.items.forEach((otherItem, otherIndex) => {
                if (otherIndex !== index) {
                    this.close(otherIndex);
                }
            });
        }

        button.classList.remove('collapsed');
        collapse.style.height = body.offsetHeight + 'px';

        setTimeout(() => {
            collapse.style.height = 'auto';
        }, 350);
    }

    close(index) {
        const item = this.items[index];
        const button = item.querySelector('.accordion-button');
        const collapse = item.querySelector('.accordion-collapse');

        button.classList.add('collapsed');
        collapse.style.height = collapse.offsetHeight + 'px';

        requestAnimationFrame(() => {
            collapse.style.height = '0';
        });
    }

    openAll() {
        this.items.forEach((_, index) => this.open(index));
    }

    closeAll() {
        this.items.forEach((_, index) => this.close(index));
    }
}

// Chart Components
class ProgressChart {
    constructor(canvas, data, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.data = data;
        this.options = {
            lineColor: '#3b82f6',
            fillColor: 'rgba(59, 130, 246, 0.1)',
            pointColor: '#3b82f6',
            gridColor: '#e5e7eb',
            ...options
        };

        this.draw();
    }

    draw() {
        const { width, height } = this.canvas.getBoundingClientRect();
        this.canvas.width = width;
        this.canvas.height = height;

        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);

        // Calculate scales
        const padding = 40;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;

        const maxValue = Math.max(...this.data.values);
        const xStep = graphWidth / (this.data.labels.length - 1);
        const yScale = graphHeight / maxValue;

        // Draw grid
        this.ctx.strokeStyle = this.options.gridColor;
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= 5; i++) {
            const y = padding + (graphHeight / 5) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(padding, y);
            this.ctx.lineTo(width - padding, y);
            this.ctx.stroke();
        }

        // Draw line
        this.ctx.strokeStyle = this.options.lineColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();

        this.data.values.forEach((value, index) => {
            const x = padding + xStep * index;
            const y = height - padding - (value * yScale);

            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        this.ctx.stroke();

        // Fill area
        this.ctx.fillStyle = this.options.fillColor;
        this.ctx.lineTo(width - padding, height - padding);
        this.ctx.lineTo(padding, height - padding);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw points
        this.ctx.fillStyle = this.options.pointColor;
        this.data.values.forEach((value, index) => {
            const x = padding + xStep * index;
            const y = height - padding - (value * yScale);

            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Draw labels
        this.ctx.fillStyle = '#6b7280';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'center';

        this.data.labels.forEach((label, index) => {
            const x = padding + xStep * index;
            this.ctx.fillText(label, x, height - padding + 20);
        });
    }

    update(data) {
        this.data = data;
        this.draw();
    }
}

// Loading Skeleton Component
class Skeleton {
    static card() {
        return `
            <div class="card skeleton-card">
                <div class="card-body">
                    <div class="skeleton skeleton-title mb-3"></div>
                    <div class="skeleton skeleton-text mb-2"></div>
                    <div class="skeleton skeleton-text mb-2" style="width: 80%"></div>
                    <div class="skeleton skeleton-text" style="width: 60%"></div>
                </div>
            </div>
        `;
    }

    static list(count = 5) {
        let html = '<div class="skeleton-list">';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="skeleton-item d-flex align-items-center mb-3">
                    <div class="skeleton skeleton-avatar me-3"></div>
                    <div class="flex-grow-1">
                        <div class="skeleton skeleton-text mb-2" style="width: 40%"></div>
                        <div class="skeleton skeleton-text" style="width: 60%"></div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        return html;
    }

    static table(rows = 5, cols = 4) {
        let html = '<table class="table skeleton-table"><tbody>';
        for (let i = 0; i < rows; i++) {
            html += '<tr>';
            for (let j = 0; j < cols; j++) {
                html += '<td><div class="skeleton skeleton-text"></div></td>';
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        return html;
    }

    static form() {
        return `
            <div class="skeleton-form">
                <div class="mb-3">
                    <div class="skeleton skeleton-label mb-2"></div>
                    <div class="skeleton skeleton-input"></div>
                </div>
                <div class="mb-3">
                    <div class="skeleton skeleton-label mb-2"></div>
                    <div class="skeleton skeleton-input"></div>
                </div>
                <div class="mb-3">
                    <div class="skeleton skeleton-label mb-2"></div>
                    <div class="skeleton skeleton-textarea"></div>
                </div>
                <div class="skeleton skeleton-button"></div>
            </div>
        `;
    }
}

// Export components
window.Modal = Modal;
window.Dropdown = Dropdown;
window.Tabs = Tabs;
window.Pagination = Pagination;
window.ProgressBar = ProgressBar;
window.Tooltip = Tooltip;
window.Accordion = Accordion;
window.ProgressChart = ProgressChart;
window.Skeleton = Skeleton;

// Initialize tooltips on load
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(element => {
        new Tooltip(element);
    });
});