// js/components.js
// Load reusable components
async function loadComponents() {
    // Load sidebar
    const sidebarContainer = document.getElementById('sidebarContainer');
    if (sidebarContainer) {
        const sidebarResponse = await fetch('/components/sidebar.html');
        sidebarContainer.innerHTML = await sidebarResponse.text();

        // Execute sidebar scripts
        const scripts = sidebarContainer.querySelectorAll('script');
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            document.body.appendChild(newScript);
        });
    }

    // Load topbar
    const topbarContainer = document.getElementById('topbarContainer');
    if (topbarContainer) {
        const topbarResponse = await fetch('/components/topbar.html');
        topbarContainer.innerHTML = await topbarResponse.text();

        // Execute topbar scripts
        const scripts = topbarContainer.querySelectorAll('script');
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            document.body.appendChild(newScript);
        });
    }

    // Load mobile nav
    const mobileNavContainer = document.getElementById('mobileNavContainer');
    if (mobileNavContainer) {
        const mobileNavResponse = await fetch('/components/mobile-nav.html');
        mobileNavContainer.innerHTML = await mobileNavResponse.text();

        // Execute mobile nav scripts
        const scripts = mobileNavContainer.querySelectorAll('script');
        scripts.forEach(script => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            document.body.appendChild(newScript);
        });
    }
}

// Notification functions
function showNotification(title, message, type = 'info') {
    // Create toast element
    const toastHtml = `
        <div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <i class="fas fa-${getNotificationIcon(type)} text-${type} me-2"></i>
                <strong class="me-auto">${title}</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;

    // Create container if it doesn't exist
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(container);
    }

    // Add toast to container
    const toastElement = document.createElement('div');
    toastElement.innerHTML = toastHtml;
    container.appendChild(toastElement.firstElementChild);

    // Show toast
    const toast = new bootstrap.Toast(toastElement.firstElementChild);
    toast.show();

    // Remove after hidden
    toastElement.firstElementChild.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Export functions
window.loadComponents = loadComponents;
window.showNotification = showNotification;