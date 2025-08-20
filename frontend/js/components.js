// Reusable UI Components
const Components = {
    // Component registry
    registry: new Map(),

    // Register component
    register(name, component) {
        this.registry.set(name, component);
    },

    // Get component
    get(name) {
        return this.registry.get(name);
    },

    // Modal Component
    modal: {
        create(id, options = {}) {
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = id;
            modal.tabIndex = -1;
            modal.setAttribute('aria-labelledby', `${id}Label`);
            modal.setAttribute('aria-hidden', 'true');

            const size = options.size ? `modal-${options.size}` : '';
            const centered = options.centered ? 'modal-dialog-centered' : '';
            const scrollable = options.scrollable ? 'modal-dialog-scrollable' : '';

            modal.innerHTML = `
                <div class="modal-dialog ${size} ${centered} ${scrollable}">
                    <div class="modal-content">
                        ${options.header !== false ? `
                            <div class="modal-header">
                                <h5 class="modal-title" id="${id}Label">${options.title || 'Modal'}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                        ` : ''}
                        <div class="modal-body">
                            ${options.body || ''}
                        </div>
                        ${options.footer !== false ? `
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                ${options.primaryButton ? `<button type="button" class="btn btn-primary" id="${id}Primary">${options.primaryButton}</button>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const bsModal = new bootstrap.Modal(modal);

            return {
                element: modal,
                show: () => bsModal.show(),
                hide: () => bsModal.hide(),
                setBody: (content) => {
                    modal.querySelector('.modal-body').innerHTML = content;
                },
                setTitle: (title) => {
                    const titleEl = modal.querySelector('.modal-title');
                    if (titleEl) titleEl.textContent = title;
                },
                onHidden: (callback) => {
                    modal.addEventListener('hidden.bs.modal', callback);
                },
                destroy: () => {
                    bsModal.dispose();
                    modal.remove();
                }
            };
        },

        confirm(message, options = {}) {
            return new Promise((resolve) => {
                const modal = this.create('confirmModal', {
                    title: options.title || 'Confirm Action',
                    body: `<p>${message}</p>`,
                    primaryButton: options.confirmText || 'Confirm',
                    size: 'sm',
                    centered: true
                });

                const primaryBtn = modal.element.querySelector('#confirmModalPrimary');
                const cancelBtn = modal.element.querySelector('[data-bs-dismiss="modal"]');

                primaryBtn.addEventListener('click', () => {
                    resolve(true);
                    modal.hide();
                });

                cancelBtn.addEventListener('click', () => {
                    resolve(false);
                });

                modal.onHidden(() => {
                    modal.destroy();
                });

                modal.show();
            });
        },

        prompt(message, options = {}) {
            return new Promise((resolve) => {
                const inputId = 'promptInput' + Date.now();
                const modal = this.create('promptModal', {
                    title: options.title || 'Input Required',
                    body: `
                        <p>${message}</p>
                        <input type="text" class="form-control" id="${inputId}" 
                               placeholder="${options.placeholder || ''}" 
                               value="${options.defaultValue || ''}">
                    `,
                    primaryButton: options.confirmText || 'OK',
                    centered: true
                });

                const input = modal.element.querySelector(`#${inputId}`);
                const primaryBtn = modal.element.querySelector('#promptModalPrimary');
                const cancelBtn = modal.element.querySelector('[data-bs-dismiss="modal"]');

                primaryBtn.addEventListener('click', () => {
                    resolve(input.value);
                    modal.hide();
                });

                cancelBtn.addEventListener('click', () => {
                    resolve(null);
                });

                modal.onHidden(() => {
                    modal.destroy();
                });

                modal.show();
                setTimeout(() => input.focus(), 300);
            });
        }
    },

    // Tooltip Component
    tooltip: {
        init() {
            // Initialize all tooltips
            const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
            tooltips.forEach(element => {
                new bootstrap.Tooltip(element);
            });
        },

        create(element, text, options = {}) {
            element.setAttribute('data-bs-toggle', 'tooltip');
            element.setAttribute('title', text);

            if (options.placement) {
                element.setAttribute('data-bs-placement', options.placement);
            }

            return new bootstrap.Tooltip(element, options);
        }
    },

    // Dropdown Component
    dropdown: {
        create(buttonId, items, options = {}) {
            const button = document.getElementById(buttonId);
            if (!button) return null;

            button.className += ' dropdown-toggle';
            button.setAttribute('data-bs-toggle', 'dropdown');
            button.setAttribute('aria-expanded', 'false');

            const menu = document.createElement('ul');
            menu.className = 'dropdown-menu';

            items.forEach(item => {
                const li = document.createElement('li');

                if (item.divider) {
                    li.innerHTML = '<hr class="dropdown-divider">';
                } else {
                    const link = document.createElement('a');
                    link.className = 'dropdown-item';
                    link.href = item.href || '#';
                    link.textContent = item.text;

                    if (item.handler) {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            item.handler();
                        });
                    }

                    li.appendChild(link);
                }

                menu.appendChild(li);
            });

            button.parentNode.insertBefore(menu, button.nextSibling);

            return new bootstrap.Dropdown(button);
        }
    },

    // Tabs Component
    tabs: {
        create(containerId, tabs, options = {}) {
            const container = document.getElementById(containerId);
            if (!container) return null;

            const tabsContainer = document.createElement('div');

            // Create nav tabs
            const nav = document.createElement('ul');
            nav.className = 'nav nav-tabs';
            nav.setAttribute('role', 'tablist');

            // Create tab content
            const content = document.createElement('div');
            content.className = 'tab-content mt-3';

            tabs.forEach((tab, index) => {
                const isActive = index === 0;
                const tabId = `tab-${tab.id || index}`;

                // Create nav item
                const navItem = document.createElement('li');
                navItem.className = 'nav-item';
                navItem.setAttribute('role', 'presentation');

                const navLink = document.createElement('button');
                navLink.className = `nav-link ${isActive ? 'active' : ''}`;
                navLink.id = `${tabId}-tab`;
                navLink.setAttribute('data-bs-toggle', 'tab');
                navLink.setAttribute('data-bs-target', `#${tabId}`);
                navLink.setAttribute('type', 'button');
                navLink.setAttribute('role', 'tab');
                navLink.setAttribute('aria-controls', tabId);
                navLink.setAttribute('aria-selected', isActive);
                navLink.textContent = tab.title;

                navItem.appendChild(navLink);
                nav.appendChild(navItem);

                // Create tab pane
                const pane = document.createElement('div');
                pane.className = `tab-pane fade ${isActive ? 'show active' : ''}`;
                pane.id = tabId;
                pane.setAttribute('role', 'tabpanel');
                pane.setAttribute('aria-labelledby', `${tabId}-tab`);
                pane.innerHTML = tab.content || '';

                content.appendChild(pane);
            });

            tabsContainer.appendChild(nav);
            tabsContainer.appendChild(content);
            container.appendChild(tabsContainer);

            return {
                show: (tabId) => {
                    const tab = new bootstrap.Tab(document.querySelector(`#tab-${tabId}-tab`));
                    tab.show();
                }
            };
        }
    },

    // Pagination Component
    pagination: {
        create(containerId, currentPage, totalPages, onPageChange, options = {}) {
            const container = document.getElementById(containerId);
            if (!container) return null;

            const pagination = document.createElement('nav');
            pagination.setAttribute('aria-label', 'Page navigation');

            const ul = document.createElement('ul');
            ul.className = 'pagination justify-content-center';

            const maxVisible = options.maxVisible || 5;
            const startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
            const endPage = Math.min(totalPages, startPage + maxVisible - 1);

            // Previous button
            const prevLi = document.createElement('li');
            prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
            prevLi.innerHTML = `
                <a class="page-link" href="#" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            `;

            if (currentPage > 1) {
                prevLi.querySelector('a').addEventListener('click', (e) => {
                    e.preventDefault();
                    onPageChange(currentPage - 1);
                });
            }

            ul.appendChild(prevLi);

            // First page
            if (startPage > 1) {
                const firstLi = this.createPageItem(1, onPageChange);
                ul.appendChild(firstLi);

                if (startPage > 2) {
                    const ellipsisLi = document.createElement('li');
                    ellipsisLi.className = 'page-item disabled';
                    ellipsisLi.innerHTML = '<span class="page-link">...</span>';
                    ul.appendChild(ellipsisLi);
                }
            }

            // Page numbers
            for (let i = startPage; i <= endPage; i++) {
                const li = this.createPageItem(i, onPageChange, i === currentPage);
                ul.appendChild(li);
            }

            // Last page
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    const ellipsisLi = document.createElement('li');
                    ellipsisLi.className = 'page-item disabled';
                    ellipsisLi.innerHTML = '<span class="page-link">...</span>';
                    ul.appendChild(ellipsisLi);
                }

                const lastLi = this.createPageItem(totalPages, onPageChange);
                ul.appendChild(lastLi);
            }

            // Next button
            const nextLi = document.createElement('li');
            nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
            nextLi.innerHTML = `
                <a class="page-link" href="#" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            `;

            if (currentPage < totalPages) {
                nextLi.querySelector('a').addEventListener('click', (e) => {
                    e.preventDefault();
                    onPageChange(currentPage + 1);
                });
            }

            ul.appendChild(nextLi);
            pagination.appendChild(ul);
            container.innerHTML = '';
            container.appendChild(pagination);
        },

        createPageItem(page, onPageChange, isActive = false) {
            const li = document.createElement('li');
            li.className = `page-item ${isActive ? 'active' : ''}`;

            const link = document.createElement('a');
            link.className = 'page-link';
            link.href = '#';
            link.textContent = page;

            if (!isActive) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    onPageChange(page);
                });
            }

            li.appendChild(link);
            return li;
        }
    },

    // Progress Bar Component
    progressBar: {
        create(containerId, value = 0, options = {}) {
            const container = document.getElementById(containerId);
            if (!container) return null;

            const progressDiv = document.createElement('div');
            progressDiv.className = 'progress';
            progressDiv.style.height = options.height || '8px';

            const bar = document.createElement('div');
            bar.className = `progress-bar ${options.variant ? `bg-${options.variant}` : ''}`;
            bar.setAttribute('role', 'progressbar');
            bar.style.width = `${value}%`;
            bar.setAttribute('aria-valuenow', value);
            bar.setAttribute('aria-valuemin', '0');
            bar.setAttribute('aria-valuemax', '100');

            if (options.label) {
                bar.textContent = options.label;
            }

            if (options.striped) {
                bar.classList.add('progress-bar-striped');
            }

            if (options.animated) {
                bar.classList.add('progress-bar-animated');
            }

            progressDiv.appendChild(bar);
            container.appendChild(progressDiv);

            return {
                update: (newValue, newLabel) => {
                    bar.style.width = `${newValue}%`;
                    bar.setAttribute('aria-valuenow', newValue);
                    if (newLabel !== undefined) {
                        bar.textContent = newLabel;
                    }
                }
            };
        }
    },

    // Accordion Component
    accordion: {
        create(containerId, items, options = {}) {
            const container = document.getElementById(containerId);
            if (!container) return null;

            const accordion = document.createElement('div');
            accordion.className = 'accordion';
            accordion.id = `accordion-${Date.now()}`;

            items.forEach((item, index) => {
                const itemId = `item-${index}`;
                const collapseId = `collapse-${index}`;

                const accordionItem = document.createElement('div');
                accordionItem.className = 'accordion-item';

                accordionItem.innerHTML = `
                    <h2 class="accordion-header" id="heading-${itemId}">
                        <button class="accordion-button ${index !== 0 ? 'collapsed' : ''}" 
                                type="button" 
                                data-bs-toggle="collapse" 
                                data-bs-target="#${collapseId}" 
                                aria-expanded="${index === 0}" 
                                aria-controls="${collapseId}">
                            ${item.title}
                        </button>
                    </h2>
                    <div id="${collapseId}" 
                         class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" 
                         aria-labelledby="heading-${itemId}" 
                         data-bs-parent="#${accordion.id}">
                        <div class="accordion-body">
                            ${item.content}
                        </div>
                    </div>
                `;

                accordion.appendChild(accordionItem);
            });

            container.appendChild(accordion);

            return accordion;
        }
    },

    // Loading Component
    loading: {
        create(containerId, options = {}) {
            const container = document.getElementById(containerId);
            if (!container) return null;

            const loading = document.createElement('div');
            loading.className = 'd-flex justify-content-center align-items-center p-4';

            const spinner = document.createElement('div');
            spinner.className = `spinner-${options.type || 'border'} text-${options.color || 'primary'}`;
            spinner.setAttribute('role', 'status');

            const srText = document.createElement('span');
            srText.className = 'visually-hidden';
            srText.textContent = options.text || 'Loading...';

            spinner.appendChild(srText);
            loading.appendChild(spinner);

            if (options.text && !options.hideText) {
                const text = document.createElement('span');
                text.className = 'ms-2';
                text.textContent = options.text;
                loading.appendChild(text);
            }

            container.appendChild(loading);

            return {
                remove: () => loading.remove()
            };
        }
    },

    // Alert Component
    alert: {
        create(containerId, message, type = 'info', options = {}) {
            const container = document.getElementById(containerId);
            if (!container) return null;

            const alert = document.createElement('div');
            alert.className = `alert alert-${type} ${options.dismissible ? 'alert-dismissible fade show' : ''}`;
            alert.setAttribute('role', 'alert');

            let content = message;

            if (options.dismissible) {
                content += `
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                `;
            }

            alert.innerHTML = content;
            container.appendChild(alert);

            if (options.autoHide) {
                setTimeout(() => {
                    alert.remove();
                }, options.autoHide);
            }

            return alert;
        }
    }
};

// Initialize tooltips on page load
document.addEventListener('DOMContentLoaded', () => {
    Components.tooltip.init();
});

// Make available globally
window.Components = Components;