// Project management system
class ProjectManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.currentFilter = 'all';
        this.editingProject = null;
    }

    loadProjects() {
        this.populateWeekSelector();
        this.renderProjects();
        this.setupFilterListeners();
    }

    populateWeekSelector() {
        const weekSelect = document.getElementById('project-week');
        if (!weekSelect) return;

        weekSelect.innerHTML = '<option value="">Select Week</option>' +
            Array.from({ length: 14 }, (_, i) => i + 1)
                .map(week => `<option value="${week}">Week ${week}</option>`)
                .join('');
    }

    renderProjects() {
        const container = document.getElementById('projects-grid');
        if (!container) return;

        const filteredProjects = this.getFilteredProjects();

        if (filteredProjects.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        container.innerHTML = filteredProjects.map((project, index) => {
            return `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="project-card stagger-item" style="animation-delay: ${index * 0.1}s">
                        <div class="project-header">
                            <div>
                                <h5 class="project-title">${this.escapeHtml(project.name)}</h5>
                                <span class="project-status ${project.status}">${this.formatStatus(project.status)}</span>
                            </div>
                            <div class="project-actions">
                                <div class="dropdown">
                                    <button class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                                            data-bs-toggle="dropdown">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li><a class="dropdown-item" href="#" onclick="projects.editProject('${project.id}')">
                                            <i class="fas fa-edit me-2"></i>Edit
                                        </a></li>
                                        <li><a class="dropdown-item" href="#" onclick="projects.duplicateProject('${project.id}')">
                                            <i class="fas fa-copy me-2"></i>Duplicate
                                        </a></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item text-danger" href="#" onclick="projects.deleteProject('${project.id}')">
                                            <i class="fas fa-trash me-2"></i>Delete
                                        </a></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        
                        <div class="project-description">
                            ${this.escapeHtml(project.description)}
                        </div>
                        
                        ${project.week ? `
                            <div class="project-week mb-2">
                                <span class="badge bg-primary">Week ${project.week}</span>
                            </div>
                        ` : ''}
                        
                        ${project.technologies && project.technologies.length > 0 ? `
                            <div class="project-tech mb-3">
                                ${project.technologies.map(tech =>
                `<span class="tech-tag">${tech}</span>`
            ).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="project-progress mb-3">
                            <div class="d-flex justify-content-between mb-1">
                                <small>Progress</small>
                                <small>${project.progress || 0}%</small>
                            </div>
                            <div class="progress progress-sm">
                                <div class="progress-bar" style="width: ${project.progress || 0}%"></div>
                            </div>
                        </div>
                        
                        <div class="project-links">
                            ${project.githubUrl ? `
                                <a href="${project.githubUrl}" target="_blank" class="project-link github">
                                    <i class="fab fa-github me-1"></i>GitHub
                                </a>
                            ` : ''}
                            ${project.demoUrl ? `
                                <a href="${project.demoUrl}" target="_blank" class="project-link demo">
                                    <i class="fas fa-external-link-alt me-1"></i>Demo
                                </a>
                            ` : ''}
                            <button class="btn btn-sm btn-outline-primary" onclick="projects.viewProject('${project.id}')">
                                <i class="fas fa-eye me-1"></i>View Details
                            </button>
                        </div>
                        
                        <div class="project-footer mt-3">
                            <small class="text-muted">
                                Created: ${this.formatDate(project.createdAt)}
                                ${project.updatedAt && project.updatedAt !== project.createdAt ?
                    ` • Updated: ${this.formatDate(project.updatedAt)}` : ''}
                            </small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getFilteredProjects() {
        return this.dashboard.userData.projects
            .filter(project => {
                if (this.currentFilter === 'all') return true;
                return project.status === this.currentFilter;
            })
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    }

    renderEmptyState() {
        return `
            <div class="col-12">
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-project-diagram"></i>
                    </div>
                    <h4 class="empty-state-title">No Projects Found</h4>
                    <p class="empty-state-description">
                        ${this.currentFilter === 'all' ?
                'Start building your project portfolio by adding your first project!' :
                `No projects with status "${this.formatStatus(this.currentFilter)}" found.`
            }
                    </p>
                    <button class="btn btn-primary" onclick="projects.showAddProjectModal()">
                        <i class="fas fa-plus me-2"></i>Add Your First Project
                    </button>
                </div>
            </div>
        `;
    }

    setupFilterListeners() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.filter;
                this.updateFilterButtons();
                this.renderProjects();
            });
        });
    }

    updateFilterButtons() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });
    }

    showAddProjectModal() {
        this.editingProject = null;
        this.setupProjectModal();
        const modal = new bootstrap.Modal(document.getElementById('addProjectModal'));
        modal.show();
    }

    setupProjectModal() {
        const form = document.getElementById('add-project-form');
        if (!form) return;

        // Populate week selector
        const weekSelect = document.getElementById('project-week');
        if (weekSelect && weekSelect.children.length <= 1) {
            weekSelect.innerHTML += Array.from({ length: 14 }, (_, i) => i + 1)
                .map(week => `<option value="${week}">Week ${week}</option>`)
                .join('');
        }

        // Clear or populate form based on edit mode
        if (this.editingProject) {
            this.populateEditForm();
        } else {
            this.clearForm();
        }
    }

    populateEditForm() {
        const project = this.editingProject;
        document.getElementById('project-name').value = project.name;
        document.getElementById('project-description').value = project.description;
        document.getElementById('project-week').value = project.week || '';
        document.getElementById('project-status').value = project.status;
        document.getElementById('project-github').value = project.githubUrl || '';
        document.getElementById('project-demo').value = project.demoUrl || '';
        document.getElementById('project-tech').value = project.technologies ? project.technologies.join(', ') : '';

        // Update modal title
        document.querySelector('#addProjectModal .modal-title').innerHTML =
            '<i class="fas fa-edit me-2"></i>Edit Project';
    }

    clearForm() {
        document.getElementById('project-name').value = '';
        document.getElementById('project-description').value = '';
        document.getElementById('project-week').value = '';
        document.getElementById('project-status').value = 'planned';
        document.getElementById('project-github').value = '';
        document.getElementById('project-demo').value = '';
        document.getElementById('project-tech').value = '';

        // Reset modal title
        document.querySelector('#addProjectModal .modal-title').innerHTML =
            '<i class="fas fa-plus me-2"></i>Add New Project';
    }

    saveProject() {
        const name = document.getElementById('project-name').value.trim();
        const description = document.getElementById('project-description').value.trim();
        const week = document.getElementById('project-week').value;
        const status = document.getElementById('project-status').value;
        const githubUrl = document.getElementById('project-github').value.trim();
        const demoUrl = document.getElementById('project-demo').value.trim();
        const techInput = document.getElementById('project-tech').value.trim();

        if (!name || !description) {
            this.dashboard.showNotification('Validation Error', 'Name and description are required.', 'error');
            return;
        }

        // Validate URLs
        if (githubUrl && !this.isValidUrl(githubUrl)) {
            this.dashboard.showNotification('Invalid URL', 'Please enter a valid GitHub URL.', 'error');
            return;
        }

        if (demoUrl && !this.isValidUrl(demoUrl)) {
            this.dashboard.showNotification('Invalid URL', 'Please enter a valid demo URL.', 'error');
            return;
        }

        const technologies = techInput ? techInput.split(',').map(tech => tech.trim()).filter(tech => tech) : [];

        const projectData = {
            name,
            description,
            week: week ? parseInt(week) : null,
            status,
            githubUrl: githubUrl || null,
            demoUrl: demoUrl || null,
            technologies,
            progress: this.calculateProgress(status),
            updatedAt: new Date().toISOString()
        };

        if (this.editingProject) {
            // Update existing project
            const projectIndex = this.dashboard.userData.projects.findIndex(p => p.id === this.editingProject.id);
            if (projectIndex !== -1) {
                this.dashboard.userData.projects[projectIndex] = {
                    ...this.dashboard.userData.projects[projectIndex],
                    ...projectData
                };
                this.dashboard.showNotification('Project Updated!', 'Your project has been successfully updated.', 'success');
            }
        } else {
            // Add new project
            const newProject = {
                id: this.generateProjectId(),
                ...projectData,
                createdAt: new Date().toISOString()
            };

            this.dashboard.userData.projects.unshift(newProject);
            this.dashboard.showNotification('Project Added!', 'Your project has been successfully created.', 'success');
        }

        this.dashboard.saveUserData();
        this.dashboard.checkAchievements();
        this.loadProjects();

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addProjectModal'));
        modal.hide();
    }

    calculateProgress(status) {
        switch (status) {
            case 'planned': return 0;
            case 'in-progress': return 50;
            case 'completed': return 100;
            default: return 0;
        }
    }

    editProject(projectId) {
        this.editingProject = this.dashboard.userData.projects.find(project => project.id === projectId);
        if (this.editingProject) {
            this.showAddProjectModal();
        }
    }

    deleteProject(projectId) {
        if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            this.dashboard.userData.projects = this.dashboard.userData.projects.filter(project => project.id !== projectId);
            this.dashboard.saveUserData();
            this.loadProjects();
            this.dashboard.showNotification('Project Deleted', 'The project has been removed.', 'info');
        }
    }

    duplicateProject(projectId) {
        const originalProject = this.dashboard.userData.projects.find(p => p.id === projectId);
        if (!originalProject) return;

        const duplicatedProject = {
            ...originalProject,
            id: this.generateProjectId(),
            name: `${originalProject.name} (Copy)`,
            status: 'planned',
            progress: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.dashboard.userData.projects.unshift(duplicatedProject);
        this.dashboard.saveUserData();
        this.loadProjects();
        this.dashboard.showNotification('Project Duplicated!', 'A copy of the project has been created.', 'success');
    }

    viewProject(projectId) {
        const project = this.dashboard.userData.projects.find(p => p.id === projectId);
        if (!project) return;

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <div>
                            <h5 class="modal-title">${this.escapeHtml(project.name)}</h5>
                            <div class="project-meta-modal">
                                <span class="badge bg-${this.getStatusColor(project.status)} me-2">
                                    ${this.formatStatus(project.status)}
                                </span>
                                ${project.week ? `<span class="badge bg-primary me-2">Week ${project.week}</span>` : ''}
                                <small class="text-muted">
                                    Created: ${this.formatDate(project.createdAt)}
                                </small>
                            </div>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="project-details">
                            <div class="mb-4">
                                <h6>Description</h6>
                                <p>${this.escapeHtml(project.description)}</p>
                            </div>
                            
                            ${project.technologies && project.technologies.length > 0 ? `
                                <div class="mb-4">
                                    <h6>Technologies Used</h6>
                                    <div class="tech-tags">
                                        ${project.technologies.map(tech =>
            `<span class="badge bg-light text-dark me-1">${tech}</span>`
        ).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="mb-4">
                                <h6>Progress</h6>
                                <div class="progress mb-2">
                                    <div class="progress-bar" style="width: ${project.progress || 0}%"></div>
                                </div>
                                <small class="text-muted">${project.progress || 0}% complete</small>
                            </div>
                            
                            ${project.githubUrl || project.demoUrl ? `
                                <div class="mb-4">
                                    <h6>Links</h6>
                                    <div class="project-links-modal">
                                        ${project.githubUrl ? `
                                            <a href="${project.githubUrl}" target="_blank" class="btn btn-outline-dark me-2">
                                                <i class="fab fa-github me-1"></i>View on GitHub
                                            </a>
                                        ` : ''}
                                        ${project.demoUrl ? `
                                            <a href="${project.demoUrl}" target="_blank" class="btn btn-outline-primary">
                                                <i class="fas fa-external-link-alt me-1"></i>Live Demo
                                            </a>
                                        ` : ''}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="project-timeline">
                                <h6>Timeline</h6>
                                <ul class="timeline">
                                    <li>
                                        <strong>Created:</strong> ${this.formatDate(project.createdAt)}
                                    </li>
                                    ${project.updatedAt && project.updatedAt !== project.createdAt ? `
                                        <li>
                                            <strong>Last Updated:</strong> ${this.formatDate(project.updatedAt)}
                                        </li>
                                    ` : ''}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="projects.editProject('${project.id}'); bootstrap.Modal.getInstance(this.closest('.modal')).hide();">
                            <i class="fas fa-edit me-1"></i>Edit Project
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    filterProjects(filter) {
        this.currentFilter = filter;
        this.updateFilterButtons();
        this.renderProjects();
    }

    // Utility methods
    generateProjectId() {
        return 'project_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    formatStatus(status) {
        const statusMap = {
            'planned': 'Planned',
            'in-progress': 'In Progress',
            'completed': 'Completed'
        };
        return statusMap[status] || status;
    }

    getStatusColor(status) {
        const colorMap = {
            'planned': 'info',
            'in-progress': 'warning',
            'completed': 'success'
        };
        return colorMap[status] || 'secondary';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
}

// Global functions
function showAddProjectModal() {
    if (window.projects) {
        window.projects.showAddProjectModal();
    }
}

function saveProject() {
    if (window.projects) {
        window.projects.saveProject();
    }
}

// Initialize when dashboard is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.dashboard) {
            window.projects = new ProjectManager(window.dashboard);

            // Override dashboard's loadProjects method
            window.dashboard.loadProjects = () => {
                window.projects.loadProjects();
            };
        }
    }, 100);
});
