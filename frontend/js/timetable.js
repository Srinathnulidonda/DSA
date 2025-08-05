// DSA Roadmap Data
const dsaRoadmap = [
    {
        week: 1,
        title: "Programming Fundamentals",
        description: "Set up your development environment and master the basics",
        days: [
            {
                day: 1,
                topic: "Environment Setup",
                activities: "Install Python/C++, Git setup, GitHub account",
                resources: [
                    { name: "Python.org", url: "https://python.org", type: "documentation" },
                    { name: "GitHub Guides", url: "https://guides.github.com", type: "tutorial" }
                ],
                time: "2 hrs",
                practiceLinks: []
            },
            {
                day: 2,
                topic: "Basic Syntax",
                activities: "Variables, data types, operators, I/O",
                resources: [
                    { name: "CS Dojo Python Tutorial", url: "https://youtube.com/c/CSDojo", type: "video" },
                    { name: "Programiz Python", url: "https://programiz.com/python-programming", type: "tutorial" }
                ],
                time: "2 hrs",
                practiceLinks: [
                    { name: "HackerRank Python Domain", url: "https://hackerrank.com/domains/python" }
                ]
            },
            {
                day: 3,
                topic: "Control Flow",
                activities: "If-else, loops, break/continue",
                resources: [
                    { name: "W3Schools Python", url: "https://w3schools.com/python", type: "tutorial" },
                    { name: "Python Tutor", url: "http://pythontutor.com", type: "visualizer" }
                ],
                time: "2 hrs",
                practiceLinks: []
            },
            {
                day: 4,
                topic: "Functions",
                activities: "Parameters, return values, scope",
                resources: [
                    { name: "CS Dojo Functions", url: "https://youtube.com/watch?v=9Os0o3wzS_I", type: "video" },
                    { name: "Real Python", url: "https://realpython.com", type: "article" }
                ],
                time: "2 hrs",
                practiceLinks: []
            }
        ],
        project: {
            title: "Calculator App",
            description: "Build a scientific calculator with memory functions",
            features: [
                "Basic operations",
                "Memory store/recall",
                "Advanced functions (power, sqrt, trigonometry)"
            ],
            time: "6 hrs"
        }
    },
    {
        week: 2,
        title: "Arrays & Strings",
        description: "Master the fundamentals of arrays and string manipulation",
        days: [
            {
                day: 1,
                topic: "Arrays Basics",
                activities: "Create, access, update, iterate",
                resources: [
                    { name: "VisuAlgo Arrays", url: "https://visualgo.net/en/array", type: "visualizer" },
                    { name: "CS Dojo Arrays", url: "https://youtube.com/c/CSDojo", type: "video" }
                ],
                time: "2 hrs",
                practiceLinks: [
                    { name: "LeetCode Array Explore", url: "https://leetcode.com/explore/learn/card/array-and-string/" }
                ]
            },
            {
                day: 2,
                topic: "Array Operations",
                activities: "Searching, sorting basics, reversing",
                resources: [
                    { name: "USFCA Visualization", url: "https://www.cs.usfca.edu/~galles/visualization/Algorithms.html", type: "visualizer" },
                    { name: "GeeksforGeeks Arrays", url: "https://geeksforgeeks.org/array-data-structure/", type: "article" }
                ],
                time: "2 hrs",
                practiceLinks: []
            },
            {
                day: 3,
                topic: "String Manipulation",
                activities: "Methods, slicing, pattern matching",
                resources: [
                    { name: "Python String Methods", url: "https://docs.python.org/3/library/stdtypes.html#string-methods", type: "documentation" },
                    { name: "GeeksforGeeks Strings", url: "https://geeksforgeeks.org/string-data-structure/", type: "article" }
                ],
                time: "2 hrs",
                practiceLinks: []
            },
            {
                day: 4,
                topic: "2D Arrays",
                activities: "Matrix operations, traversal patterns",
                resources: [
                    { name: "VisuAlgo 2D Arrays", url: "https://visualgo.net/en/array", type: "visualizer" },
                    { name: "Programiz 2D Arrays", url: "https://programiz.com/c-programming/c-arrays", type: "tutorial" }
                ],
                time: "2 hrs",
                practiceLinks: []
            }
        ],
        project: {
            title: "Text Analytics Tool",
            description: "Build tool to analyze text files",
            features: [
                "Word frequency counter",
                "Find longest/shortest words",
                "Pattern search & replace",
                "Generate statistics report"
            ],
            time: "6 hrs"
        }
    },
    // Continue with remaining weeks...
    {
        week: 3,
        title: "Linked Lists",
        description: "Learn dynamic data structures and pointer manipulation",
        days: [
            {
                day: 1,
                topic: "Singly Linked Lists",
                activities: "Node structure, traversal",
                resources: [
                    { name: "VisuAlgo Linked List", url: "https://visualgo.net/en/list", type: "visualizer" },
                    { name: "CS Dojo Linked Lists", url: "https://youtube.com/c/CSDojo", type: "video" }
                ],
                time: "2 hrs",
                practiceLinks: []
            },
            {
                day: 2,
                topic: "List Operations",
                activities: "Insert, delete, search",
                resources: [
                    { name: "USFCA Linked List Viz", url: "https://www.cs.usfca.edu/~galles/visualization/Algorithms.html", type: "visualizer" },
                    { name: "mycodeschool YouTube", url: "https://youtube.com/user/mycodeschool", type: "video" }
                ],
                time: "2 hrs",
                practiceLinks: []
            },
            {
                day: 3,
                topic: "Advanced Operations",
                activities: "Reverse, detect cycle, merge",
                resources: [
                    { name: "LeetCode #206", url: "https://leetcode.com/problems/reverse-linked-list/", type: "practice" },
                    { name: "Back To Back SWE", url: "https://youtube.com/c/BackToBackSWE", type: "video" }
                ],
                time: "2 hrs",
                practiceLinks: [
                    { name: "LeetCode #141", url: "https://leetcode.com/problems/linked-list-cycle/" }
                ]
            },
            {
                day: 4,
                topic: "Doubly & Circular Lists",
                activities: "Bidirectional traversal, applications",
                resources: [
                    { name: "GeeksforGeeks", url: "https://geeksforgeeks.org/doubly-linked-list/", type: "article" },
                    { name: "VisuAlgo Doubly LL", url: "https://visualgo.net/en/list", type: "visualizer" }
                ],
                time: "2 hrs",
                practiceLinks: []
            }
        ],
        project: {
            title: "Music Playlist Manager",
            description: "Build a music playlist system",
            features: [
                "Add/remove songs",
                "Play next/previous",
                "Shuffle feature",
                "Loop playlist option"
            ],
            time: "6 hrs"
        }
    }
    // Add remaining 11 weeks following the same pattern...
];

// Generate Week Tabs
function generateWeekTabs() {
    const weekTabs = document.getElementById('weekTabs');
    if (!weekTabs) return;

    weekTabs.innerHTML = dsaRoadmap.map((week, index) => `
        <button class="week-tab ${index === 0 ? 'active' : ''}" 
                onclick="showWeek(${week.week})" 
                data-week="${week.week}">
            Week ${week.week}
            <div class="small">
                ${getWeekProgress(week.week)}% Complete
            </div>
        </button>
    `).join('');
}

// Show Week Content
function showWeek(weekNumber) {
    const weekData = dsaRoadmap.find(w => w.week === weekNumber);
    if (!weekData) return;

    // Update active tab
    document.querySelectorAll('.week-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-week="${weekNumber}"]`).classList.add('active');

    // Generate week content
    const weekContent = document.getElementById('weekContent');
    weekContent.innerHTML = `
        <div class="week-container">
            <div class="week-header bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg mb-4">
                <h3 class="mb-2">Week ${weekData.week}: ${weekData.title}</h3>
                <p class="mb-3">${weekData.description}</p>
                <div class="progress bg-white bg-opacity-20" style="height: 8px;">
                    <div class="progress-bar bg-white" 
                         style="width: ${getWeekProgress(weekNumber)}%"></div>
                </div>
            </div>
            
            <div class="row mb-4">
                ${weekData.days.map(day => generateDayCard(weekData.week, day)).join('')}
            </div>
            
            ${weekData.project ? generateProjectCard(weekData.week, weekData.project) : ''}
        </div>
    `;
}

// Generate Day Card
function generateDayCard(week, day) {
    const isCompleted = isDayCompleted(week, day.day);
    const isCurrent = (week === progressData.currentWeek && day.day === progressData.currentDay);

    return `
        <div class="col-lg-6 col-xl-4 mb-3">
            <div class="day-card card h-100 ${isCompleted ? 'completed' : ''} ${isCurrent ? 'border-primary' : ''}">
                <div class="day-header ${isCompleted ? 'bg-success text-white' : isCurrent ? 'bg-primary text-white' : ''}">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">Day ${day.day}</h6>
                        <div class="day-status">
                            ${isCompleted ? '<i class="fas fa-check-circle"></i>' :
            isCurrent ? '<i class="fas fa-play-circle"></i>' :
                '<i class="far fa-circle"></i>'}
                        </div>
                    </div>
                </div>
                
                <div class="day-content">
                    <h6 class="text-primary mb-2">${day.topic}</h6>
                    <p class="text-muted small mb-3">${day.activities}</p>
                    
                    <div class="d-flex align-items-center mb-3">
                        <i class="fas fa-clock text-warning me-2"></i>
                        <span class="small">${day.time}</span>
                    </div>
                    
                    ${day.resources.length > 0 ? `
                        <div class="resources-section mb-3">
                            <h6 class="small text-uppercase text-muted mb-2">Resources</h6>
                            <div class="d-flex flex-wrap gap-1">
                                ${day.resources.map(resource => `
                                    <a href="${resource.url}" target="_blank" 
                                       class="btn btn-outline-primary btn-sm">
                                        <i class="fas fa-${getResourceIcon(resource.type)}"></i>
                                        ${resource.name}
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${day.practiceLinks.length > 0 ? `
                        <div class="practice-section mb-3">
                            <h6 class="small text-uppercase text-muted mb-2">Practice</h6>
                            <div class="d-flex flex-wrap gap-1">
                                ${day.practiceLinks.map(link => `
                                    <a href="${link.url}" target="_blank" 
                                       class="btn btn-outline-success btn-sm">
                                        <i class="fas fa-code"></i>
                                        ${link.name}
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="day-actions mt-auto">
                        ${!isCompleted ? `
                            <button class="btn btn-success btn-sm w-100" 
                                    onclick="markDayComplete(${week}, ${day.day})"
                                    ${!isCurrent ? 'disabled' : ''}>
                                <i class="fas fa-check"></i>
                                ${isCurrent ? 'Mark Complete' : 'Complete Previous Days First'}
                            </button>
                        ` : `
                            <button class="btn btn-outline-success btn-sm w-100" disabled>
                                <i class="fas fa-check"></i> Completed
                            </button>
                        `}
                        
                        <button class="btn btn-outline-primary btn-sm w-100 mt-2" 
                                onclick="showDayNotes(${week}, ${day.day})">
                            <i class="fas fa-sticky-note"></i> Notes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Generate Project Card
function generateProjectCard(week, project) {
    const isCompleted = isProjectCompleted(week);

    return `
        <div class="project-section">
            <div class="card">
                <div class="card-header bg-warning text-dark">
                    <h5 class="card-title mb-0">
                        <i class="fas fa-project-diagram"></i>
                        Week ${week} Project: ${project.title}
                    </h5>
                </div>
                <div class="card-body">
                    <p class="card-text">${project.description}</p>
                    
                    <div class="row">
                        <div class="col-md-8">
                            <h6 class="text-muted mb-2">Project Features:</h6>
                            <ul class="list-unstyled">
                                ${project.features.map(feature => `
                                    <li class="mb-1">
                                        <i class="fas fa-check-circle text-success me-2"></i>
                                        ${feature}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        <div class="col-md-4">
                            <div class="project-stats">
                                <div class="d-flex align-items-center mb-2">
                                    <i class="fas fa-clock text-warning me-2"></i>
                                    <span>${project.time}</span>
                                </div>
                                
                                <div class="project-actions">
                                    ${!isCompleted ? `
                                        <button class="btn btn-primary btn-sm w-100 mb-2" 
                                                onclick="startProject(${week})">
                                            <i class="fas fa-play"></i> Start Project
                                        </button>
                                    ` : `
                                        <button class="btn btn-success btn-sm w-100 mb-2" disabled>
                                            <i class="fas fa-check"></i> Completed
                                        </button>
                                    `}
                                    
                                    <button class="btn btn-outline-primary btn-sm w-100" 
                                            onclick="showProjectDetails(${week})">
                                        <i class="fas fa-info-circle"></i> View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Utility Functions
function getWeekProgress(weekNumber) {
    return progressData.weekProgress[weekNumber - 1] || 0;
}

function isDayCompleted(week, day) {
    // Check if this day has been completed
    const dayIndex = (week - 1) * 7 + (day - 1);
    return dayIndex < progressData.completedDays;
}

function isProjectCompleted(week) {
    return progressData.projects.some(p => p.week === week);
}

function getResourceIcon(type) {
    const icons = {
        'video': 'play',
        'tutorial': 'book',
        'documentation': 'file-alt',
        'visualizer': 'eye',
        'article': 'newspaper',
        'practice': 'code'
    };
    return icons[type] || 'link';
}

// Project Functions
function startProject(week) {
    const projectData = dsaRoadmap.find(w => w.week === week)?.project;
    if (!projectData) return;

    showNotification(`Starting ${projectData.title}! Good luck! 🚀`, 'info');

    // Add to recent activity
    addActivity('project', `Started Week ${week} Project: ${projectData.title}`);
    saveProgress();
}

function showProjectDetails(week) {
    const projectData = dsaRoadmap.find(w => w.week === week)?.project;
    if (!projectData) return;

    // Create modal for project details
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${projectData.title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>${projectData.description}</p>
                    
                    <h6>Project Requirements:</h6>
                    <ul>
                        ${projectData.features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                    
                    <div class="alert alert-info">
                        <strong>Estimated Time:</strong> ${projectData.time}
                    </div>
                    
                    <h6>Helpful Resources:</h6>
                    <div class="d-flex flex-wrap gap-2">
                        <a href="https://github.com" target="_blank" class="btn btn-outline-dark btn-sm">
                            <i class="fab fa-github"></i> GitHub
                        </a>
                        <a href="https://codepen.io" target="_blank" class="btn btn-outline-primary btn-sm">
                            <i class="fab fa-codepen"></i> CodePen
                        </a>
                        <a href="https://repl.it" target="_blank" class="btn btn-outline-success btn-sm">
                            <i class="fas fa-code"></i> Repl.it
                        </a>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" onclick="startProject(${week})">
                        Start Project
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();

    // Clean up modal after hiding
    modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
    });
}

function showDayNotes(week, day) {
    const noteKey = `week_${week}_day_${day}`;
    const existingNote = progressData.notes[noteKey] || '';

    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Notes - Week ${week}, Day ${day}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <textarea id="dayNoteContent" class="form-control" rows="10" 
                              placeholder="Add your notes for this day...">${existingNote}</textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="saveDayNote('${noteKey}')">
                        Save Notes
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();

    // Clean up modal after hiding
    modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
    });

    window.currentDayNoteModal = bootstrapModal;
}

function saveDayNote(noteKey) {
    const content = document.getElementById('dayNoteContent').value;
    progressData.notes[noteKey] = content;
    saveProgress();

    if (window.currentDayNoteModal) {
        window.currentDayNoteModal.hide();
    }

    showNotification('Notes saved successfully!', 'success');
}

// Load Timetable
function loadTimetable() {
    generateWeekTabs();
    showWeek(progressData.currentWeek || 1);
}

// Make functions globally available
window.showWeek = showWeek;
window.startProject = startProject;
window.showProjectDetails = showProjectDetails;
window.showDayNotes = showDayNotes;
window.saveDayNote = saveDayNote;