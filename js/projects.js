// ===== PROJECTS CONTROLLER =====

class ProjectsController {
    constructor(app) {
        this.app = app;
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.sortBy = 'week';
        this.sortOrder = 'asc';
        this.projects = [];
        this.selectedProject = null;

        this.init();
    }

    init() {
        this.setupProjectEventListeners();
        this.initializeProjects();
    }

    setupProjectEventListeners() {
        // Filter buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.filter-btn')) {
                this.handleFilterChange(e.target);
            }
        });

        // Week filter dropdown
        const weekFilter = document.getElementById('weekFilter');
        if (weekFilter) {
            weekFilter.addEventListener('change', (e) => {
                this.handleWeekFilter(e.target.value);
            });
        }

        // Search input
        const searchInput = document.getElementById('projectSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Project actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.project-action') || e.target.closest('.project-action')) {
                this.handleProjectAction(e.target.closest('.project-action'));
            }
        });

        // Sort controls
        document.addEventListener('click', (e) => {
            if (e.target.matches('.sort-control')) {
                this.handleSort(e.target.dataset.sort);
            }
        });
    }

    initializeProjects() {
        // Initialize with default projects from roadmap
        this.projects = [...DSA_ROADMAP.projects];

        // Add user's custom projects
        const customProjects = this.app.progress.customProjects || [];
        this.projects.push(...customProjects);

        // Update project status based on progress
        this.updateProjectStatuses();

        // Initialize week filter options
        this.initializeWeekFilter();
    }

    // ===== MAIN PROJECTS LOADING =====
    loadProjects() {
        this.renderProjectsGrid();
        this.updateProjectStats();
    }

    renderProjectsGrid() {
        const container = document.getElementById('projectsGrid');
        if (!container) return;

        const filteredProjects = this.getFilteredProjects();

        if (filteredProjects.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        container.innerHTML = filteredProjects.map(project =>
            this.generateProjectCardHTML(project)
        ).join('');

        // Add animation to project cards
        this.animateProjectCards();
    }

    generateProjectCardHTML(project) {
        const statusBadge = this.getStatusBadge(project.status);
        const difficultyBadge = this.getDifficultyBadge(project.difficulty);
        const progressPercentage = this.calculateProjectProgress(project);

        return `
            <div class="col-lg-4 col-md-6 mb-4" data-aos="fade-up">
                <div class="project-card" data-project-id="${project.id}">
                    <div class="project-card-header">
                        <div class="project-status-badge">${statusBadge}</div>
                        <div class="project-week">Week ${project.week}</div>
                        <h5 class="project-title">${project.name}</h5>
                        <p class="project-topic">${project.topic}</p>
                    </div>
                    
                    <div class="project-card-body">
                        <p class="project-description">${project.description}</p>
                        
                        <div class="project-meta">
                            <div class="project-difficulty">
                                ${difficultyBadge}
                            </div>
                            <div class="project-time">
                                <i class="fas fa-clock me-1"></i>
                                ${project.estimatedTime}
                            </div>
                        </div>
                        
                        <div class="project-features">
                            <h6>Key Features:</h6>
                            <ul class="features-list">
                                ${project.features?.slice(0, 3).map(feature =>
            `<li>${feature}</li>`
        ).join('') || '<li>Feature list not available</li>'}
                                ${project.features?.length > 3 ?
                `<li class="more-features">+${project.features.length - 3} more features</li>` : ''
            }
                            </ul>
                        </div>
                        
                        <div class="project-tech-stack">
                            <h6>Tech Stack:</h6>
                            <div class="tech-tags">
                                ${project.techStack?.map(tech =>
                `<span class="tech-tag">${tech}</span>`
            ).join('') || '<span class="tech-tag">Not specified</span>'}
                            </div>
                        </div>
                        
                        <div class="project-progress">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="progress-label">Progress</span>
                                <span class="progress-percentage">${progressPercentage}%</span>
                            </div>
                            <div class="progress" style="height: 8px;">
                                <div class="progress-bar bg-success" style="width: ${progressPercentage}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="project-card-footer">
                        <div class="project-actions">
                            ${this.generateProjectActionButtons(project)}
                        </div>
                        
                        <div class="project-links">
                            ${project.githubUrl ? `
                                <a href="${project.githubUrl}" target="_blank" class="project-link github">
                                    <i class="fab fa-github"></i> GitHub
                                </a>
                            ` : ''}
                            ${project.demoUrl ? `
                                <a href="${project.demoUrl}" target="_blank" class="project-link demo">
                                    <i class="fas fa-external-link-alt"></i> Demo
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateProjectActionButtons(project) {
        const userProject = this.app.progress.userProjects?.[project.id];
        const status = userProject?.status || project.status || 'planned';

        switch (status) {
            case 'planned':
                return `
                    <button class="btn btn-primary project-action" data-action="start" data-project-id="${project.id}">
                        <i class="fas fa-play me-2"></i>Start Project
                    </button>
                `;
            case 'in-progress':
                return `
                    <button class="btn btn-success project-action" data-action="complete" data-project-id="${project.id}">
                        <i class="fas fa-check me-2"></i>Mark Complete
                    </button>
                    <button class="btn btn-outline-secondary project-action" data-action="pause" data-project-id="${project.id}">
                        <i class="fas fa-pause me-2"></i>Pause
                    </button>
                `;
            case 'completed':
                return `
                    <button class="btn btn-outline-success" disabled>
                        <i class="fas fa-check-circle me-2"></i>Completed
                    </button>
                    <button class="btn btn-outline-primary project-action" data-action="view" data-project-id="${project.id}">
                        <i class="fas fa-eye me-2"></i>View Details
                    </button>
                `;
            default:
                return `
                    <button class="btn btn-outline-primary project-action" data-action="view" data-project-id="${project.id}">
                        <i class="fas fa-info-circle me-2"></i>View Details
                    </button>
                `;
        }
    }

    getStatusBadge(status) {
        const badges = {
            'planned': '<span class="badge bg-secondary">Planned</span>',
            'in-progress': '<span class="badge bg-warning">In Progress</span>',
            'completed': '<span class="badge bg-success">Completed</span>',
            'paused': '<span class="badge bg-info">Paused</span>'
        };
        return badges[status] || badges['planned'];
    }

    getDifficultyBadge(difficulty) {
        const badges = {
            'Beginner': '<span class="badge bg-success">Beginner</span>',
            'Intermediate': '<span class="badge bg-warning">Intermediate</span>',
            'Advanced': '<span class="badge bg-danger">Advanced</span>'
        };
        return badges[difficulty] || badges['Beginner'];
    }

    getEmptyStateHTML() {
        return `
            <div class="col-12">
                <div class="empty-state text-center py-5">
                    <div class="empty-state-icon mb-3">
                        <i class="fas fa-folder-open fa-4x text-muted"></i>
                    </div>
                    <h4 class="text-muted">No Projects Found</h4>
                    <p class="text-muted">Try adjusting your filters or add a new project to get started.</p>
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addProjectModal">
                        <i class="fas fa-plus me-2"></i>Add Your First Project
                    </button>
                </div>
            </div>
        `;
    }

    // ===== FILTERING & SEARCHING =====
    getFilteredProjects() {
        let filtered = [...this.projects];

        // Apply status filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(project => {
                const userProject = this.app.progress.userProjects?.[project.id];
                const status = userProject?.status || project.status || 'planned';
                return status === this.currentFilter;
            });
        }

        // Apply week filter
        const weekFilter = document.getElementById('weekFilter')?.value;
        if (weekFilter && weekFilter !== 'all') {
            filtered = filtered.filter(project => project.week === parseInt(weekFilter));
        }

        // Apply search filter
        if (this.currentSearch) {
            const searchTerm = this.currentSearch.toLowerCase();
            filtered = filtered.filter(project =>
                project.name.toLowerCase().includes(searchTerm) ||
                project.description.toLowerCase().includes(searchTerm) ||
                project.topic.toLowerCase().includes(searchTerm) ||
                project.techStack?.some(tech => tech.toLowerCase().includes(searchTerm))
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (this.sortBy) {
                case 'week':
                    aValue = a.week;
                    bValue = b.week;
                    break;
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'difficulty':
                    const difficultyOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
                    aValue = difficultyOrder[a.difficulty] || 1;
                    bValue = difficultyOrder[b.difficulty] || 1;
                    break;
                case 'status':
                    const statusOrder = { 'planned': 1, 'in-progress': 2, 'paused': 3, 'completed': 4 };
                    const aStatus = this.app.progress.userProjects?.[a.id]?.status || a.status || 'planned';
                    const bStatus = this.app.progress.userProjects?.[b.id]?.status || b.status || 'planned';
                    aValue = statusOrder[aStatus] || 1;
                    bValue = statusOrder[bStatus] || 1;
                    break;
                default:
                    aValue = a.id;
                    bValue = b.id;
            }

            if (this.sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        return filtered;
    }

    handleFilterChange(button) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        this.currentFilter = button.dataset.filter;
        this.renderProjectsGrid();
    }

    handleWeekFilter(week) {
        this.renderProjectsGrid();
    }

    handleSearch(query) {
        this.currentSearch = query;
        this.renderProjectsGrid();
    }

    handleSort(sortBy) {
        if (this.sortBy === sortBy) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = sortBy;
            this.sortOrder = 'asc';
        }

        this.renderProjectsGrid();
    }

    // ===== PROJECT ACTIONS =====
    handleProjectAction(button) {
        const action = button.dataset.action;
        const projectId = parseInt(button.dataset.projectId);
        const project = this.projects.find(p => p.id === projectId);

        if (!project) return;

        switch (action) {
            case 'start':
                this.startProject(project);
                break;
            case 'complete':
                this.completeProject(project);
                break;
            case 'pause':
                this.pauseProject(project);
                break;
            case 'view':
                this.viewProjectDetails(project);
                break;
            case 'edit':
                this.editProject(project);
                break;
            case 'delete':
                this.deleteProject(project);
                break;
        }
    }

    startProject(project) {
        this.updateProjectStatus(project.id, 'in-progress');
        this.app.addActivity(`Started project: ${project.name}`, 'project');
        this.app.showNotification('Project Started!', `Good luck with ${project.name}!`, 'success');
        this.renderProjectsGrid();
    }

    completeProject(project) {
        this.updateProjectStatus(project.id, 'completed');
        this.app.progress.projectsCompleted++;
        this.app.addActivity(`Completed project: ${project.name}`, 'success');
        this.app.showNotification('Project Completed!', `Congratulations on completing ${project.name}!`, 'success');
        this.app.checkForAchievements();
        this.renderProjectsGrid();
        this.showProjectCompletionModal(project);
    }

    pauseProject(project) {
        this.updateProjectStatus(project.id, 'paused');
        this.app.addActivity(`Paused project: ${project.name}`, 'warning');
        this.renderProjectsGrid();
    }

    viewProjectDetails(project) {
        this.showProjectDetailsModal(project);
    }

    updateProjectStatus(projectId, status) {
        if (!this.app.progress.userProjects) {
            this.app.progress.userProjects = {};
        }

        if (!this.app.progress.userProjects[projectId]) {
            this.app.progress.userProjects[projectId] = {};
        }

        this.app.progress.userProjects[projectId].status = status;
        this.app.progress.userProjects[projectId].lastUpdated = Date.now();

        this.app.saveProgress();
    }

    // ===== PROJECT MODALS =====
    showProjectDetailsModal(project) {
        const userProject = this.app.progress.userProjects?.[project.id] || {};
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${project.name}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="project-details">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>Week:</strong> ${project.week}
                                </div>
                                <div class="col-md-6">
                                    <strong>Topic:</strong> ${project.topic}
                                </div>
                            </div>
                            
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <strong>Difficulty:</strong> ${this.getDifficultyBadge(project.difficulty)}
                                </div>
                                <div class="col-md-6">
                                    <strong>Estimated Time:</strong> ${project.estimatedTime}
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <strong>Description:</strong>
                                <p>${project.description}</p>
                            </div>
                            
                            <div class="mb-3">
                                <strong>Learning Objectives:</strong>
                                <ul>
                                    ${project.learningObjectives?.map(obj => `<li>${obj}</li>`).join('') ||
            '<li>Objectives not specified</li>'}
                                </ul>
                            </div>
                            
                            <div class="mb-3">
                                <strong>Key Features:</strong>
                                <ul>
                                    ${project.features?.map(feature => `<li>${feature}</li>`).join('') ||
            '<li>Features not specified</li>'}
                                </ul>
                            </div>
                            
                            <div class="mb-3">
                                <strong>Tech Stack:</strong>
                                <div class="tech-tags">
                                    ${project.techStack?.map(tech =>
                `<span class="tech-tag">${tech}</span>`
            ).join('') || '<span class="tech-tag">Not specified</span>'}
                                </div>
                            </div>
                            
                            ${userProject.notes ? `
                                <div class="mb-3">
                                    <strong>Your Notes:</strong>
                                    <p>${userProject.notes}</p>
                                </div>
                            ` : ''}
                            
                            ${userProject.githubUrl || userProject.demoUrl ? `
                                <div class="mb-3">
                                    <strong>Your Links:</strong>
                                    <div class="project-links">
                                        ${userProject.githubUrl ? `
                                            <a href="${userProject.githubUrl}" target="_blank" class="btn btn-outline-dark me-2">
                                                <i class="fab fa-github me-1"></i> GitHub
                                            </a>
                                        ` : ''}
                                        ${userProject.demoUrl ? `
                                            <a href="${userProject.demoUrl}" target="_blank" class="btn btn-outline-primary">
                                                <i class="fas fa-external-link-alt me-1"></i> Demo
                                            </a>
                                        ` : ''}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="app.projectsController.editProject(${project.id})" data-bs-dismiss="modal">
                            Edit Project
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

    showProjectCompletionModal(project) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-trophy me-2"></i>Project Completed!
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <div class="completion-animation mb-3">
                            <i class="fas fa-check-circle fa-4x text-success"></i>
                        </div>
                        <h4>Congratulations!</h4>
                        <p>You've successfully completed <strong>${project.name}</strong>!</p>
                        <p class="text-muted">Add your project links and notes to showcase your work.</p>
                        
                        <form id="projectCompletionForm" class="mt-4">
                            <div class="mb-3">
                                <label class="form-label">GitHub Repository URL</label>
                                <input type="url" class="form-control" id="completionGithubUrl" 
                                       placeholder="https://github.com/username/project">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Live Demo URL</label>
                                <input type="url" class="form-control" id="completionDemoUrl" 
                                       placeholder="https://your-demo.com">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Project Notes</label>
                                <textarea class="form-control" id="completionNotes" rows="3" 
                                          placeholder="What did you learn? What challenges did you face?"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Skip</button>
                        <button type="button" class="btn btn-success" onclick="app.projectsController.saveProjectCompletion(${project.id})" data-bs-dismiss="modal">
                            Save Details
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

    saveProjectCompletion(projectId) {
        const githubUrl = document.getElementById('completionGithubUrl')?.value;
        const demoUrl = document.getElementById('completionDemoUrl')?.value;
        const notes = document.getElementById('completionNotes')?.value;

        if (!this.app.progress.userProjects) {
            this.app.progress.userProjects = {};
        }

        if (!this.app.progress.userProjects[projectId]) {
            this.app.progress.userProjects[projectId] = {};
        }

        const userProject = this.app.progress.userProjects[projectId];
        userProject.githubUrl = githubUrl;
        userProject.demoUrl = demoUrl;
        userProject.notes = notes;
        userProject.completedAt = Date.now();

        this.app.saveProgress();
        this.renderProjectsGrid();

        this.app.showNotification('Project Details Saved!', 'Your project information has been saved.', 'success');
    }

    // ===== PROJECT CRUD =====
    saveProject() {
        const form = document.getElementById('addProjectForm');
        if (!form) return;

        const formData = new FormData(form);

        const newProject = {
            id: Date.now(), // Simple ID generation
            name: formData.get('projectName'),
            week: parseInt(formData.get('projectWeek')),
            topic: formData.get('projectTopic'),
            description: formData.get('projectDescription'),
            difficulty: formData.get('projectDifficulty'),
            estimatedTime: '4 hours', // Default
            techStack: formData.get('projectTech')?.split(',').map(t => t.trim()).filter(t => t) || [],
            status: formData.get('projectStatus'),
            githubUrl: formData.get('projectGithub'),
            demoUrl: formData.get('projectDemo'),
            notes: formData.get('projectNotes'),
            isCustom: true,
            createdAt: Date.now()
        };

        // Add to projects array
        this.projects.push(newProject);

        // Save to user progress
        if (!this.app.progress.customProjects) {
            this.app.progress.customProjects = [];
        }
        this.app.progress.customProjects.push(newProject);

        this.app.saveProgress();
        this.renderProjectsGrid();

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addProjectModal'));
        if (modal) modal.hide();

        // Reset form
        form.reset();

        this.app.showNotification('Project Added!', `${newProject.name} has been added to your portfolio.`, 'success');
    }

    editProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        // Pre-fill form with project data
        const form = document.getElementById('addProjectForm');
        if (form) {
            form.querySelector('#projectName').value = project.name;
            form.querySelector('#projectWeek').value = project.week;
            form.querySelector('#projectTopic').value = project.topic;
            form.querySelector('#projectDescription').value = project.description || '';
            form.querySelector('#projectDifficulty').value = project.difficulty;
            form.querySelector('#projectTech').value = project.techStack?.join(', ') || '';
            form.querySelector('#projectGithub').value = project.githubUrl || '';
            form.querySelector('#projectDemo').value = project.demoUrl || '';
            form.querySelector('#projectNotes').value = project.notes || '';

            // Change form to edit mode
            form.dataset.editingId = projectId;
            document.querySelector('#addProjectModal .modal-title').textContent = 'Edit Project';
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('addProjectModal'));
        modal.show();
    }

    deleteProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project || !project.isCustom) return;

        if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
            // Remove from projects array
            this.projects = this.projects.filter(p => p.id !== projectId);

            // Remove from custom projects
            this.app.progress.customProjects = this.app.progress.customProjects?.filter(p => p.id !== projectId) || [];

            this.app.saveProgress();
            this.renderProjectsGrid();

            this.app.showNotification('Project Deleted', `${project.name} has been removed.`, 'info');
        }
    }

    // ===== UTILITY METHODS =====
    updateProjectStatuses() {
        this.projects.forEach(project => {
            const userProject = this.app.progress.userProjects?.[project.id];
            if (userProject) {
                project.status = userProject.status;
                project.githubUrl = userProject.githubUrl || project.githubUrl;
                project.demoUrl = userProject.demoUrl || project.demoUrl;
                project.notes = userProject.notes || project.notes;
            }
        });
    }

    calculateProjectProgress(project) {
        const userProject = this.app.progress.userProjects?.[project.id];
        const status = userProject?.status || project.status || 'planned';

        const progressMap = {
            'planned': 0,
            'in-progress': 50,
            'paused': 25,
            'completed': 100
        };

        return progressMap[status] || 0;
    }

    updateProjectStats() {
        const stats = this.calculateProjectStats();

        // Update any project statistics displays
        const statsContainer = document.getElementById('projectStats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="row">
                    <div class="col-md-3">
                        <div class="stat-item">
                            <div class="stat-value">${stats.total}</div>
                            <div class="stat-label">Total Projects</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-item">
                            <div class="stat-value">${stats.completed}</div>
                            <div class="stat-label">Completed</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-item">
                            <div class="stat-value">${stats.inProgress}</div>
                            <div class="stat-label">In Progress</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-item">
                            <div class="stat-value">${Math.round(stats.completionRate)}%</div>
                            <div class="stat-label">Completion Rate</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    calculateProjectStats() {
        const total = this.projects.length;
        const completed = this.projects.filter(p => {
            const userProject = this.app.progress.userProjects?.[p.id];
            const status = userProject?.status || p.status || 'planned';
            return status === 'completed';
        }).length;

        const inProgress = this.projects.filter(p => {
            const userProject = this.app.progress.userProjects?.[p.id];
            const status = userProject?.status || p.status || 'planned';
            return status === 'in-progress';
        }).length;

        const completionRate = total > 0 ? (completed / total) * 100 : 0;

        return { total, completed, inProgress, completionRate };
    }

    initializeWeekFilter() {
        const weekFilter = document.getElementById('weekFilter');
        if (!weekFilter) return;

        // Clear existing options
        weekFilter.innerHTML = '<option value="all">All Weeks</option>';

        // Add week options
        for (let i = 1; i <= 14; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Week ${i}`;
            weekFilter.appendChild(option);
        }
    }

    animateProjectCards() {
        // Add staggered animation to project cards
        const cards = document.querySelectorAll('.project-card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('animate-fade-in');
        });
    }

    // ===== PUBLIC API =====
    refreshProjects() {
        this.initializeProjects();
        this.renderProjectsGrid();
        this.updateProjectStats();
    }

    getProjectById(id) {
        return this.projects.find(p => p.id === id);
    }

    getProjectsByWeek(week) {
        return this.projects.filter(p => p.week === week);
    }

    getCompletedProjects() {
        return this.projects.filter(p => {
            const userProject = this.app.progress.userProjects?.[p.id];
            const status = userProject?.status || p.status || 'planned';
            return status === 'completed';
        });
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectsController;
}

// Global function for HTML handlers
window.ProjectsController = ProjectsController;
