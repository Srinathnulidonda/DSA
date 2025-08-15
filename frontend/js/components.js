// components.js - Reusable UI components

// Component registry
const Components = {};

// Loading Spinner Component
Components.LoadingSpinner = {
    create(options = {}) {
        const { size = 'md', color = 'primary', text = 'Loading...' } = options;

        const spinner = document.createElement('div');
        spinner.className = 'text-center p-4';
        spinner.innerHTML = `
            <div class="spinner-border text-${color} spinner-border-${size}" role="status">
                <span class="visually-hidden">${text}</span>
            </div>
            ${text ? `<p class="mt-2 text-muted">${text}</p>` : ''}
        `;

        return spinner;
    },

    show(container, options = {}) {
        const spinner = this.create(options);
        spinner.id = 'loading-spinner';
        container.appendChild(spinner);
    },

    hide(container) {
        const spinner = container.querySelector('#loading-spinner');
        if (spinner) spinner.remove();
    }
};

// Progress Bar Component
Components.ProgressBar = {
    create(options = {}) {
        const {
            value = 0,
            max = 100,
            label = '',
            color = 'primary',
            striped = false,
            animated = false,
            height = '20px'
        } = options;

        const percentage = (value / max) * 100;

        const progressBar = document.createElement('div');
        progressBar.className = 'progress';
        progressBar.style.height = height;
        progressBar.innerHTML = `
            <div class="progress-bar bg-${color} ${striped ? 'progress-bar-striped' : ''} ${animated ? 'progress-bar-animated' : ''}"
                 role="progressbar"
                 style="width: ${percentage}%"
                 aria-valuenow="${value}"
                 aria-valuemin="0"
                 aria-valuemax="${max}">
                ${label || `${Math.round(percentage)}%`}
            </div>
        `;

        return progressBar;
    },

    update(progressBar, value, max = 100) {
        const bar = progressBar.querySelector('.progress-bar');
        const percentage = (value / max) * 100;

        bar.style.width = `${percentage}%`;
        bar.setAttribute('aria-valuenow', value);
        bar.textContent = `${Math.round(percentage)}%`;
    }
};

// Alert Component
Components.Alert = {
    create(options = {}) {
        const {
            type = 'info',
            title = '',
            message = '',
            dismissible = true,
            icon = null
        } = options;

        const iconMap = {
            'success': 'check-circle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-circle',
            'info': 'info-circle'
        };

        const alertIcon = icon || iconMap[type] || 'info-circle';

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} ${dismissible ? 'alert-dismissible' : ''} fade show`;
        alert.setAttribute('role', 'alert');
        alert.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${alertIcon} me-3 fs-4"></i>
                <div>
                    ${title ? `<h6 class="alert-heading mb-1">${title}</h6>` : ''}
                    ${message}
                </div>
            </div>
            ${dismissible ? '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>' : ''}
        `;

        return alert;
    },

    show(container, options = {}) {
        const alert = this.create(options);
        container.prepend(alert);

        if (options.autoClose) {
            setTimeout(() => {
                const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
                bsAlert.close();
            }, options.autoClose);
        }

        return alert;
    }
};

// Card Component
Components.Card = {
    create(options = {}) {
        const {
            title = '',
            subtitle = '',
            content = '',
            footer = '',
            image = null,
            actions = [],
            className = ''
        } = options;

        const card = document.createElement('div');
        card.className = `card ${className}`;

        let cardHTML = '';

        if (image) {
            cardHTML += `<img src="${image.src}" class="card-img-top" alt="${image.alt || ''}">`;
        }

        cardHTML += '<div class="card-body">';

        if (title) {
            cardHTML += `<h5 class="card-title">${title}</h5>`;
        }

        if (subtitle) {
            cardHTML += `<h6 class="card-subtitle mb-2 text-muted">${subtitle}</h6>`;
        }

        if (content) {
            cardHTML += `<div class="card-text">${content}</div>`;
        }

        if (actions.length > 0) {
            cardHTML += '<div class="d-flex gap-2 mt-3">';
            actions.forEach(action => {
                cardHTML += `<button class="btn btn-${action.variant || 'primary'} ${action.size ? `btn-${action.size}` : ''}"
                                     onclick="${action.onClick}">
                    ${action.icon ? `<i class="${action.icon} me-2"></i>` : ''}
                    ${action.label}
                </button>`;
            });
            cardHTML += '</div>';
        }

        cardHTML += '</div>';

        if (footer) {
            cardHTML += `<div class="card-footer">${footer}</div>`;
        }

        card.innerHTML = cardHTML;
        return card;
    }
};

// Modal Component
Components.Modal = {
    create(options = {}) {
        const {
            id = `modal-${Date.now()}`,
            title = '',
            body = '',
            footer = '',
            size = 'md',
            centered = true,
            scrollable = false,
            backdrop = true
        } = options;

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = id;
        modal.setAttribute('tabindex', '-1');
        if (backdrop === 'static') {
            modal.setAttribute('data-bs-backdrop', 'static');
            modal.setAttribute('data-bs-keyboard', 'false');
        }

        modal.innerHTML = `
            <div class="modal-dialog modal-${size} ${centered ? 'modal-dialog-centered' : ''} ${scrollable ? 'modal-dialog-scrollable' : ''}">
                <div class="modal-content">
                    ${title ? `
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                    ` : ''}
                    <div class="modal-body">
                        ${body}
                    </div>
                    ${footer ? `
                        <div class="modal-footer">
                            ${footer}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        return modal;
    },

    show(options = {}) {
        const modal = this.create(options);
        document.body.appendChild(modal);

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });

        return bsModal;
    },

    confirm(options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Confirm',
                message = 'Are you sure?',
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                confirmVariant = 'primary',
                cancelVariant = 'secondary'
            } = options;

            const modalOptions = {
                title,
                body: message,
                footer: `
                    <button type="button" class="btn btn-${cancelVariant}" data-bs-dismiss="modal">${cancelText}</button>
                    <button type="button" class="btn btn-${confirmVariant}" id="confirm-btn">${confirmText}</button>
                `,
                backdrop: 'static'
            };

            const bsModal = this.show(modalOptions);
            const modal = bsModal._element;

            modal.querySelector('#confirm-btn').addEventListener('click', () => {
                resolve(true);
                bsModal.hide();
            });

            modal.addEventListener('hidden.bs.modal', () => {
                resolve(false);
            });
        });
    }
};

// Table Component
Components.Table = {
    create(options = {}) {
        const {
            columns = [],
            data = [],
            striped = true,
            hover = true,
            bordered = false,
            small = false,
            responsive = true,
            className = ''
        } = options;

        const tableWrapper = document.createElement('div');
        if (responsive) {
            tableWrapper.className = 'table-responsive';
        }

        const table = document.createElement('table');
        table.className = `table ${striped ? 'table-striped' : ''} ${hover ? 'table-hover' : ''} 
                          ${bordered ? 'table-bordered' : ''} ${small ? 'table-sm' : ''} ${className}`;

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column.label;
            if (column.width) th.style.width = column.width;
            if (column.className) th.className = column.className;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');

        data.forEach(row => {
            const tr = document.createElement('tr');

            columns.forEach(column => {
                const td = document.createElement('td');

                if (column.render) {
                    td.innerHTML = column.render(row[column.field], row);
                } else {
                    td.textContent = row[column.field] || '';
                }

                if (column.className) td.className = column.className;
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        tableWrapper.appendChild(table);

        return responsive ? tableWrapper : table;
    }
};

// Tabs Component
Components.Tabs = {
    create(options = {}) {
        const {
            tabs = [],
            activeTab = 0,
            variant = 'tabs', // tabs, pills
            justified = false,
            vertical = false
        } = options;

        const container = document.createElement('div');
        if (vertical) {
            container.className = 'd-flex align-items-start';
        }

        // Create nav
        const nav = document.createElement('ul');
        nav.className = `nav nav-${variant} ${justified ? 'nav-justified' : ''} ${vertical ? 'flex-column' : ''}`;
        nav.setAttribute('role', 'tablist');

        // Create tab content container
        const tabContent = document.createElement('div');
        tabContent.className = `tab-content ${vertical ? 'flex-grow-1 ms-3' : 'mt-3'}`;

        tabs.forEach((tab, index) => {
            // Create nav item
            const navItem = document.createElement('li');
            navItem.className = 'nav-item';

            const navLink = document.createElement('button');
            navLink.className = `nav-link ${index === activeTab ? 'active' : ''}`;
            navLink.setAttribute('data-bs-toggle', 'tab');
            navLink.setAttribute('data-bs-target', `#tab-${index}`);
            navLink.setAttribute('type', 'button');
            navLink.innerHTML = `
                ${tab.icon ? `<i class="${tab.icon} me-2"></i>` : ''}
                ${tab.label}
            `;

            navItem.appendChild(navLink);
            nav.appendChild(navItem);

            // Create tab pane
            const tabPane = document.createElement('div');
            tabPane.className = `tab-pane fade ${index === activeTab ? 'show active' : ''}`;
            tabPane.id = `tab-${index}`;
            tabPane.innerHTML = tab.content;

            tabContent.appendChild(tabPane);
        });

        container.appendChild(nav);
        container.appendChild(tabContent);

        return container;
    }
};

// Dropdown Component
Components.Dropdown = {
    create(options = {}) {
        const {
            label = 'Dropdown',
            items = [],
            variant = 'primary',
            size = 'md',
            split = false,
            direction = 'down' // down, up, start, end
        } = options;

        const dropdown = document.createElement('div');
        dropdown.className = `${direction === 'down' ? 'dropdown' : `drop${direction}`}`;

        let dropdownHTML = '';

        if (split) {
            dropdownHTML = `
                <button type="button" class="btn btn-${variant} btn-${size}">${label}</button>
                <button type="button" class="btn btn-${variant} btn-${size} dropdown-toggle dropdown-toggle-split"
                        data-bs-toggle="dropdown">
                    <span class="visually-hidden">Toggle Dropdown</span>
                </button>
            `;
        } else {
            dropdownHTML = `
                <button class="btn btn-${variant} btn-${size} dropdown-toggle" type="button" data-bs-toggle="dropdown">
                    ${label}
                </button>
            `;
        }

        dropdownHTML += '<ul class="dropdown-menu">';

        items.forEach(item => {
            if (item.divider) {
                dropdownHTML += '<li><hr class="dropdown-divider"></li>';
            } else if (item.header) {
                dropdownHTML += `<li><h6 class="dropdown-header">${item.header}</h6></li>`;
            } else {
                dropdownHTML += `
                    <li>
                        <a class="dropdown-item ${item.active ? 'active' : ''} ${item.disabled ? 'disabled' : ''}"
                           href="${item.href || '#'}"
                           ${item.onClick ? `onclick="${item.onClick}"` : ''}>
                            ${item.icon ? `<i class="${item.icon} me-2"></i>` : ''}
                            ${item.label}
                        </a>
                    </li>
                `;
            }
        });

        dropdownHTML += '</ul>';
        dropdown.innerHTML = dropdownHTML;

        return dropdown;
    }
};

// Pagination Component
Components.Pagination = {
    create(options = {}) {
        const {
            currentPage = 1,
            totalPages = 1,
            maxVisible = 5,
            size = 'md', // sm, md, lg
            alignment = 'start', // start, center, end
            onPageChange = () => { }
        } = options;

        const nav = document.createElement('nav');
        const ul = document.createElement('ul');
        ul.className = `pagination pagination-${size} justify-content-${alignment}`;

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `
            <a class="page-link" href="#" data-page="${currentPage - 1}">
                <i class="fas fa-chevron-left"></i>
            </a>
        `;
        ul.appendChild(prevLi);

        // Page numbers
        const startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        const endPage = Math.min(totalPages, startPage + maxVisible - 1);

        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
            ul.appendChild(li);
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `
            <a class="page-link" href="#" data-page="${currentPage + 1}">
                <i class="fas fa-chevron-right"></i>
            </a>
        `;
        ul.appendChild(nextLi);

        // Add click handlers
        ul.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.closest('.page-link');
            if (target && !target.parentElement.classList.contains('disabled')) {
                const page = parseInt(target.dataset.page);
                onPageChange(page);
            }
        });

        nav.appendChild(ul);
        return nav;
    }
};

// Badge Component
Components.Badge = {
    create(options = {}) {
        const {
            text = '',
            variant = 'primary',
            pill = true,
            icon = null
        } = options;

        const badge = document.createElement('span');
        badge.className = `badge bg-${variant} ${pill ? 'rounded-pill' : ''}`;
        badge.innerHTML = `
            ${icon ? `<i class="${icon} me-1"></i>` : ''}
            ${text}
        `;

        return badge;
    }
};

// Toast Component
Components.Toast = {
    create(options = {}) {
        const {
            title = '',
            message = '',
            variant = 'primary',
            icon = null,
            time = 'Just now',
            autohide = true,
            delay = 5000
        } = options;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'alert');
        if (autohide) {
            toast.setAttribute('data-bs-autohide', 'true');
            toast.setAttribute('data-bs-delay', delay);
        }

        toast.innerHTML = `
            <div class="toast-header">
                ${icon ? `<i class="${icon} text-${variant} me-2"></i>` : ''}
                <strong class="me-auto">${title}</strong>
                <small>${time}</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;

        return toast;
    },

    show(options = {}) {
        const toast = this.create(options);

        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(container);
        }

        container.appendChild(toast);

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });

        return bsToast;
    }
};

// Export components
window.Components = Components;