// Reusable UI Components for DSA Path Application

const Components = {
    // Modal component
    modal: {
        create(options = {}) {
            const defaults = {
                id: Utils.string.random(8),
                title: 'Modal',
                body: '',
                size: '',
                backdrop: true,
                keyboard: true,
                showCloseButton: true,
                buttons: []
            };

            const config = { ...defaults, ...options };

            const modal = Utils.dom.createElement('div', {
                className: `modal fade`,
                id: config.id,
                tabindex: '-1',
                'aria-labelledby': `${config.id}Label`,
                'aria-hidden': 'true'
            });

            const dialog = Utils.dom.createElement('div', {
                className: `modal-dialog ${config.size ? 'modal-' + config.size : ''}`
            });

            const content = Utils.dom.createElement('div', {
                className: 'modal-content'
            });

            // Header
            const header = Utils.dom.createElement('div', {
                className: 'modal-header'
            });

            const title = Utils.dom.createElement('h5', {
                className: 'modal-title',
                id: `${config.id}Label`
            }, config.title);

            header.appendChild(title);

            if (config.showCloseButton) {
                const closeBtn = Utils.dom.createElement('button', {
                    type: 'button',
                    className: 'btn-close',
                    'data-bs-dismiss': 'modal',
                    'aria-label': 'Close'
                });
                header.appendChild(closeBtn);
            }

            // Body
            const body = Utils.dom.createElement('div', {
                className: 'modal-body'
            });

            if (typeof config.body === 'string') {
                body.innerHTML = config.body;
            } else {
                body.appendChild(config.body);
            }

            // Footer
            let footer = null;
            if (config.buttons.length > 0) {
                footer = Utils.dom.createElement('div', {
                    className: 'modal-footer'
                });

                config.buttons.forEach(buttonConfig => {
                    const button = Utils.dom.createElement('button', {
                        type: 'button',
                        className: `btn ${buttonConfig.className || 'btn-secondary'}`,
                        'data-bs-dismiss': buttonConfig.dismiss ? 'modal' : ''
                    }, buttonConfig.text);

                    if (buttonConfig.onClick) {
                        button.addEventListener('click', buttonConfig.onClick);
                    }

                    footer.appendChild(button);
                });
            }

            content.appendChild(header);
            content.appendChild(body);
            if (footer) content.appendChild(footer);
            dialog.appendChild(content);
            modal.appendChild(dialog);

            return modal;
        },

        show(modalElement) {
            document.body.appendChild(modalElement);
            const modal = new bootstrap.Modal(modalElement);
            modal.show();

            // Clean up when modal is hidden
            modalElement.addEventListener('hidden.bs.modal', () => {
                modalElement.remove();
            });

            return modal;
        }
    },

    // Loading spinner component
    loading: {
        create(options = {}) {
            const defaults = {
                size: 'md',
                color: 'primary',
                text: 'Loading...'
            };

            const config = { ...defaults, ...options };

            const container = Utils.dom.createElement('div', {
                className: 'text-center p-4'
            });

            const spinner = Utils.dom.createElement('div', {
                className: `spinner-border text-${config.color} ${config.size === 'sm' ? 'spinner-border-sm' : ''}`,
                role: 'status'
            });

            const sr = Utils.dom.createElement('span', {
                className: 'visually-hidden'
            }, config.text);

            spinner.appendChild(sr);

            if (config.text && config.size !== 'sm') {
                const text = Utils.dom.createElement('div', {
                    className: 'mt-2'
                }, config.text);
                container.appendChild(spinner);
                container.appendChild(text);
            } else {
                container.appendChild(spinner);
            }

            return container;
        },

        overlay(target, show = true) {
            if (show) {
                const overlay = Utils.dom.createElement('div', {
                    className: 'loading-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center',
                    style: 'background-color: rgba(255, 255, 255, 0.8); z-index: 1000;'
                });

                const spinner = this.create({ size: 'md' });
                overlay.appendChild(spinner);

                target.style.position = 'relative';
                target.appendChild(overlay);
            } else {
                const overlay = target.querySelector('.loading-overlay');
                if (overlay) {
                    overlay.remove();
                }
            }
        }
    },

    // Progress bar component
    progressBar: {
        create(options = {}) {
            const defaults = {
                value: 0,
                max: 100,
                color: 'primary',
                striped: false,
                animated: false,
                showLabel: true
            };

            const config = { ...defaults, ...options };

            const container = Utils.dom.createElement('div', {
                className: 'progress'
            });

            const bar = Utils.dom.createElement('div', {
                className: `progress-bar bg-${config.color} ${config.striped ? 'progress-bar-striped' : ''} ${config.animated ? 'progress-bar-animated' : ''}`,
                role: 'progressbar',
                style: `width: ${(config.value / config.max) * 100}%`,
                'aria-valuenow': config.value,
                'aria-valuemin': '0',
                'aria-valuemax': config.max
            });

            if (config.showLabel) {
                bar.textContent = `${Math.round((config.value / config.max) * 100)}%`;
            }

            container.appendChild(bar);

            // Add update method
            container.update = (newValue) => {
                const percentage = (newValue / config.max) * 100;
                bar.style.width = `${percentage}%`;
                bar.setAttribute('aria-valuenow', newValue);
                if (config.showLabel) {
                    bar.textContent = `${Math.round(percentage)}%`;
                }
            };

            return container;
        }
    },

    // Badge component
    badge: {
        create(text, type = 'primary', options = {}) {
            const defaults = {
                pill: false,
                dismissible: false
            };

            const config = { ...defaults, ...options };

            const badge = Utils.dom.createElement('span', {
                className: `badge bg-${type} ${config.pill ? 'rounded-pill' : ''}`
            }, text);

            if (config.dismissible) {
                badge.classList.add('position-relative', 'pe-4');

                const closeBtn = Utils.dom.createElement('button', {
                    type: 'button',
                    className: 'btn-close btn-close-white position-absolute top-50 end-0 translate-middle-y me-1',
                    style: 'font-size: 0.5em;',
                    'aria-label': 'Remove'
                });

                closeBtn.addEventListener('click', () => {
                    badge.remove();
                });

                badge.appendChild(closeBtn);
            }

            return badge;
        }
    },

    // Card component
    card: {
        create(options = {}) {
            const defaults = {
                title: '',
                body: '',
                footer: '',
                headerClass: '',
                bodyClass: '',
                footerClass: '',
                interactive: false
            };

            const config = { ...defaults, ...options };

            const card = Utils.dom.createElement('div', {
                className: `card ${config.interactive ? 'card-interactive' : ''}`
            });

            // Header
            if (config.title) {
                const header = Utils.dom.createElement('div', {
                    className: `card-header ${config.headerClass}`
                });

                if (typeof config.title === 'string') {
                    const title = Utils.dom.createElement('h5', {
                        className: 'card-title mb-0'
                    }, config.title);
                    header.appendChild(title);
                } else {
                    header.appendChild(config.title);
                }

                card.appendChild(header);
            }

            // Body
            if (config.body) {
                const body = Utils.dom.createElement('div', {
                    className: `card-body ${config.bodyClass}`
                });

                if (typeof config.body === 'string') {
                    body.innerHTML = config.body;
                } else {
                    body.appendChild(config.body);
                }

                card.appendChild(body);
            }

            // Footer
            if (config.footer) {
                const footer = Utils.dom.createElement('div', {
                    className: `card-footer ${config.footerClass}`
                });

                if (typeof config.footer === 'string') {
                    footer.innerHTML = config.footer;
                } else {
                    footer.appendChild(config.footer);
                }

                card.appendChild(footer);
            }

            return card;
        }
    },

    // Alert component
    alert: {
        create(message, type = 'info', options = {}) {
            const defaults = {
                dismissible: true,
                fade: true
            };

            const config = { ...defaults, ...options };

            const alert = Utils.dom.createElement('div', {
                className: `alert alert-${type} ${config.dismissible ? 'alert-dismissible' : ''} ${config.fade ? 'fade show' : ''}`,
                role: 'alert'
            });

            if (typeof message === 'string') {
                alert.innerHTML = message;
            } else {
                alert.appendChild(message);
            }

            if (config.dismissible) {
                const closeBtn = Utils.dom.createElement('button', {
                    type: 'button',
                    className: 'btn-close',
                    'data-bs-dismiss': 'alert',
                    'aria-label': 'Close'
                });
                alert.appendChild(closeBtn);
            }

            return alert;
        }
    },

    // Dropdown component
    dropdown: {
        create(options = {}) {
            const defaults = {
                text: 'Dropdown',
                items: [],
                direction: 'down',
                variant: 'secondary'
            };

            const config = { ...defaults, ...options };

            const dropdown = Utils.dom.createElement('div', {
                className: `dropdown drop${config.direction}`
            });

            const button = Utils.dom.createElement('button', {
                className: `btn btn-${config.variant} dropdown-toggle`,
                type: 'button',
                'data-bs-toggle': 'dropdown',
                'aria-expanded': 'false'
            }, config.text);

            const menu = Utils.dom.createElement('ul', {
                className: 'dropdown-menu'
            });

            config.items.forEach(item => {
                const li = Utils.dom.createElement('li');

                if (item.divider) {
                    li.innerHTML = '<hr class="dropdown-divider">';
                } else {
                    const link = Utils.dom.createElement('a', {
                        className: `dropdown-item ${item.disabled ? 'disabled' : ''}`,
                        href: item.href || '#'
                    }, item.text);

                    if (item.onClick) {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            item.onClick(e);
                        });
                    }

                    li.appendChild(link);
                }

                menu.appendChild(li);
            });

            dropdown.appendChild(button);
            dropdown.appendChild(menu);

            return dropdown;
        }
    },

    // Pagination component
    pagination: {
        create(options = {}) {
            const defaults = {
                currentPage: 1,
                totalPages: 1,
                maxVisible: 5,
                showFirstLast: true,
                showPrevNext: true,
                size: ''
            };

            const config = { ...defaults, ...options };

            const nav = Utils.dom.createElement('nav', {
                'aria-label': 'Pagination'
            });

            const ul = Utils.dom.createElement('ul', {
                className: `pagination pagination-custom ${config.size ? 'pagination-' + config.size : ''} justify-content-center`
            });

            // Calculate visible page range
            const half = Math.floor(config.maxVisible / 2);
            let start = Math.max(1, config.currentPage - half);
            let end = Math.min(config.totalPages, start + config.maxVisible - 1);

            if (end - start + 1 < config.maxVisible) {
                start = Math.max(1, end - config.maxVisible + 1);
            }

            // First page
            if (config.showFirstLast && start > 1) {
                ul.appendChild(this.createPageItem(1, config.currentPage, config.onPageChange));
                if (start > 2) {
                    ul.appendChild(this.createPageItem('...', config.currentPage, null, true));
                }
            }

            // Previous
            if (config.showPrevNext && config.currentPage > 1) {
                ul.appendChild(this.createPageItem('‹', config.currentPage, () => {
                    if (config.onPageChange) config.onPageChange(config.currentPage - 1);
                }));
            }

            // Page numbers
            for (let i = start; i <= end; i++) {
                ul.appendChild(this.createPageItem(i, config.currentPage, config.onPageChange));
            }

            // Next
            if (config.showPrevNext && config.currentPage < config.totalPages) {
                ul.appendChild(this.createPageItem('›', config.currentPage, () => {
                    if (config.onPageChange) config.onPageChange(config.currentPage + 1);
                }));
            }

            // Last page
            if (config.showFirstLast && end < config.totalPages) {
                if (end < config.totalPages - 1) {
                    ul.appendChild(this.createPageItem('...', config.currentPage, null, true));
                }
                ul.appendChild(this.createPageItem(config.totalPages, config.currentPage, config.onPageChange));
            }

            nav.appendChild(ul);
            return nav;
        },

        createPageItem(page, currentPage, onClick, disabled = false) {
            const li = Utils.dom.createElement('li', {
                className: `page-item ${page === currentPage ? 'active' : ''} ${disabled ? 'disabled' : ''}`
            });

            const link = Utils.dom.createElement('a', {
                className: 'page-link',
                href: '#'
            }, page.toString());

            if (onClick && !disabled) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    onClick(page);
                });
            }

            li.appendChild(link);
            return li;
        }
    },

    // Empty state component
    emptyState: {
        create(options = {}) {
            const defaults = {
                icon: 'fas fa-inbox',
                title: 'No data found',
                description: 'There are no items to display.',
                action: null
            };

            const config = { ...defaults, ...options };

            const container = Utils.dom.createElement('div', {
                className: 'empty-state text-center py-5'
            });

            const icon = Utils.dom.createElement('i', {
                className: `${config.icon} fa-3x text-muted mb-3`
            });

            const title = Utils.dom.createElement('h3', {
                className: 'text-muted mb-2'
            }, config.title);

            const description = Utils.dom.createElement('p', {
                className: 'text-muted mb-3'
            }, config.description);

            container.appendChild(icon);
            container.appendChild(title);
            container.appendChild(description);

            if (config.action) {
                container.appendChild(config.action);
            }

            return container;
        }
    }
};

// Export Components for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Components;
}