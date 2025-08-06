// Roadmap Module
const Roadmap = {
    // Render the complete roadmap
    render: function () {
        const roadmapContent = document.getElementById('roadmapContent');
        if (!roadmapContent) return;

        roadmapContent.innerHTML = '';

        window.dsaRoadmap.forEach((week, weekIndex) => {
            const weekCard = this.createWeekCard(week, weekIndex);
            roadmapContent.appendChild(weekCard);
        });
    },

    // Create week card element
    createWeekCard: function (week, weekIndex) {
        const weekCard = document.createElement('div');
        weekCard.className = 'week-card';
        weekCard.innerHTML = `
            <div class="week-header" onclick="toggleWeek(${weekIndex})">
                <div>
                    <div class="week-title">Week ${week.week}: ${week.title}</div>
                    <small class="text-muted">${week.goal}</small>
                </div>
                <div class="week-progress">
                    <span id="week-${weekIndex}-progress">0/7</span>
                    <i class="fas fa-chevron-down ms-2"></i>
                </div>
            </div>
            <div class="week-content" id="week-${weekIndex}-content" style="display: none;">
                ${this.renderWeekDays(week, weekIndex)}
            </div>
        `;

        return weekCard;
    },

    // Render days for a week
    renderWeekDays: function (week, weekIndex) {
        let daysHtml = '';

        week.days.forEach((day, dayIndex) => {
            const dayId = `week-${weekIndex}-day-${dayIndex}`;
            const isCompleted = window.app && window.app.userProgress.completedTopics.includes(dayId);

            daysHtml += `
                <div class="day-item">
                    <div class="day-header">
                        <div>
                            <strong>${day.day}</strong> - ${day.topic}
                            <div class="text-muted small mt-1">${day.activities}</div>
                        </div>
                        <input type="checkbox" class="day-checkbox" id="${dayId}" 
                            ${isCompleted ? 'checked' : ''} 
                            onchange="toggleDayComplete('${dayId}', ${weekIndex})">
                    </div>
                    <div class="mt-2">
                        ${day.resources.map(res => `
                            <a href="${res.url}" target="_blank" class="resource-link">
                                <i class="fas fa-external-link-alt"></i> ${res.name}
                            </a>
                        `).join('')}
                        <span class="text-muted small ms-3">
                            <i class="fas fa-clock"></i> ${day.time}
                        </span>
                    </div>
                </div>
            `;
        });

        if (week.project) {
            daysHtml += `
                <div class="mt-3 p-3 bg-light rounded">
                    <h6 class="mb-2">
                        <i class="fas fa-project-diagram"></i> Week Project: ${week.project.name}
                    </h6>
                    <p class="mb-1 small">${week.project.description}</p>
                    <span class="badge bg-${this.getDifficultyColor(week.project.difficulty)}">
                        ${week.project.difficulty}
                    </span>
                </div>
            `;
        }

        return daysHtml;
    },

    // Get difficulty color
    getDifficultyColor: function (difficulty) {
        const colors = {
            'Beginner': 'success',
            'Intermediate': 'warning',
            'Advanced': 'danger',
            'Expert': 'dark'
        };
        return colors[difficulty] || 'secondary';
    },

    // Toggle week visibility
    toggleWeek: function (weekIndex) {
        const content = document.getElementById(`week-${weekIndex}-content`);
        const isVisible = content.style.display !== 'none';

        // Hide all week contents
        document.querySelectorAll('.week-content').forEach(el => {
            el.style.display = 'none';
        });

        // Update chevron icons
        document.querySelectorAll('.week-header i').forEach(icon => {
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
        });

        // Toggle current week
        if (!isVisible) {
            content.style.display = 'block';
            const chevron = document.querySelector(`#week-${weekIndex}-content`).previousElementSibling.querySelector('i');
            chevron.classList.remove('fa-chevron-down');
            chevron.classList.add('fa-chevron-up');

            // Scroll to week
            setTimeout(() => {
                content.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    },

    // Update today's schedule
    updateTodaySchedule: function (userProgress) {
        const todaySchedule = document.getElementById('todaySchedule');
        if (!todaySchedule) return;

        const today = new Date().getDay();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDayName = dayNames[today];

        // Find today's topics across all weeks
        let todayTopics = [];

        // Calculate which week we should be in based on progress
        const currentWeek = this.getCurrentWeek(userProgress);

        window.dsaRoadmap.forEach((week, weekIndex) => {
            // Only show current and previous weeks
            if (weekIndex <= currentWeek) {
                const dayData = week.days.find(d => d.day === currentDayName);
                if (dayData) {
                    todayTopics.push({
                        week: week.week,
                        weekTitle: week.title,
                        ...dayData,
                        weekIndex: weekIndex,
                        dayIndex: week.days.indexOf(dayData)
                    });
                }
            }
        });

        if (todayTopics.length === 0) {
            todaySchedule.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-coffee fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No scheduled topics for today. Use this time to review or work on projects!</p>
                </div>
            `;
            return;
        }

        // Show only the most relevant topic for today
        const relevantTopic = todayTopics.find(topic => {
            const dayId = `week-${topic.weekIndex}-day-${topic.dayIndex}`;
            return !userProgress.completedTopics.includes(dayId);
        }) || todayTopics[todayTopics.length - 1];

        let scheduleHtml = `
            <div class="day-item mb-3">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-1">
                        <h5 class="mb-1">Week ${relevantTopic.week}: ${relevantTopic.topic}</h5>
                        <p class="text-muted mb-2">${relevantTopic.activities}</p>
                        <div>
                            ${relevantTopic.resources.map(res => `
                                <a href="${res.url}" target="_blank" class="resource-link">
                                    <i class="fas fa-external-link-alt"></i> ${res.name}
                                </a>
                            `).join('')}
                        </div>
                    </div>
                    <div class="text-end">
                        <input type="checkbox" class="day-checkbox" 
                            id="today-week-${relevantTopic.weekIndex}-day-${relevantTopic.dayIndex}" 
                            ${userProgress.completedTopics.includes(`week-${relevantTopic.weekIndex}-day-${relevantTopic.dayIndex}`) ? 'checked' : ''} 
                            onchange="toggleDayComplete('week-${relevantTopic.weekIndex}-day-${relevantTopic.dayIndex}', ${relevantTopic.weekIndex})">
                        <div class="small text-muted mt-1">
                            <i class="fas fa-clock"></i> ${relevantTopic.time}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add upcoming topics preview
        if (todayTopics.length > 1) {
            scheduleHtml += `
                <div class="mt-3">
                    <h6 class="text-muted">Also scheduled for ${currentDayName}:</h6>
                    <ul class="list-unstyled">
            `;

            todayTopics.forEach((topic, index) => {
                if (topic !== relevantTopic) {
                    scheduleHtml += `
                        <li class="small text-muted">
                            <i class="fas fa-angle-right"></i> Week ${topic.week}: ${topic.topic}
                        </li>
                    `;
                }
            });

            scheduleHtml += '</ul></div>';
        }

        todaySchedule.innerHTML = scheduleHtml;
    },

    // Get current week based on progress
    getCurrentWeek: function (userProgress) {
        const completedTopics = userProgress.completedTopics.length;
        const topicsPerWeek = 7;
        return Math.min(13, Math.floor(completedTopics / topicsPerWeek));
    },

    // Filter roadmap based on search
    filter: function (searchTerm) {
        const weekCards = document.querySelectorAll('.week-card');
        const term = searchTerm.toLowerCase();

        weekCards.forEach((card, index) => {
            const week = window.dsaRoadmap[index];
            const weekText = JSON.stringify(week).toLowerCase();

            if (term === '' || weekText.includes(term)) {
                card.style.display = 'block';

                // Highlight matching content
                if (term) {
                    this.highlightSearchTerm(card, term);
                } else {
                    this.removeHighlights(card);
                }
            } else {
                card.style.display = 'none';
            }
        });

        // Show message if no results
        const hasVisibleCards = Array.from(weekCards).some(card => card.style.display !== 'none');
        this.toggleNoResultsMessage(!hasVisibleCards);
    },

    // Highlight search term in content
    highlightSearchTerm: function (element, term) {
        // This is a simplified version - in production, use a proper highlighting library
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;

        while (node = walker.nextNode()) {
            if (node.nodeValue.toLowerCase().includes(term)) {
                textNodes.push(node);
            }
        }

        textNodes.forEach(textNode => {
            const span = document.createElement('span');
            span.innerHTML = textNode.nodeValue.replace(
                new RegExp(term, 'gi'),
                match => `<mark class="bg-warning">${match}</mark>`
            );
            textNode.parentNode.replaceChild(span, textNode);
        });
    },

    // Remove search highlights
    removeHighlights: function (element) {
        const marks = element.querySelectorAll('mark');
        marks.forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
    },

    // Toggle no results message
    toggleNoResultsMessage: function (show) {
        let messageEl = document.getElementById('noResultsMessage');

        if (show && !messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'noResultsMessage';
            messageEl.className = 'text-center py-5';
            messageEl.innerHTML = `
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <p class="text-muted">No topics found matching your search.</p>
            `;
            document.getElementById('roadmapContent').appendChild(messageEl);
        } else if (!show && messageEl) {
            messageEl.remove();
        }
    },

    // Get topic details by ID
    getTopicById: function (topicId) {
        const match = topicId.match(/week-(\d+)-day-(\d+)/);
        if (!match) return null;

        const weekIndex = parseInt(match[1]);
        const dayIndex = parseInt(match[2]);

        const week = window.dsaRoadmap[weekIndex];
        if (!week) return null;

        const day = week.days[dayIndex];
        if (!day) return null;

        return {
            week: week,
            day: day,
            weekIndex: weekIndex,
            dayIndex: dayIndex
        };
    },

    // Get next uncompleted topic
    getNextTopic: function (userProgress) {
        for (let weekIndex = 0; weekIndex < window.dsaRoadmap.length; weekIndex++) {
            const week = window.dsaRoadmap[weekIndex];

            for (let dayIndex = 0; dayIndex < week.days.length; dayIndex++) {
                const dayId = `week-${weekIndex}-day-${dayIndex}`;

                if (!userProgress.completedTopics.includes(dayId)) {
                    return {
                        id: dayId,
                        week: week,
                        day: week.days[dayIndex],
                        weekIndex: weekIndex,
                        dayIndex: dayIndex
                    };
                }
            }
        }

        return null; // All topics completed
    },

    // Get recommended topics based on progress
    getRecommendedTopics: function (userProgress) {
        const recommendations = [];

        // Get next topic
        const nextTopic = this.getNextTopic(userProgress);
        if (nextTopic) {
            recommendations.push({
                type: 'next',
                topic: nextTopic,
                reason: 'Next topic in your learning path'
            });
        }

        // Get topics from current week
        const currentWeek = this.getCurrentWeek(userProgress);
        const weekTopics = window.dsaRoadmap[currentWeek];

        if (weekTopics) {
            weekTopics.days.forEach((day, dayIndex) => {
                const dayId = `week-${currentWeek}-day-${dayIndex}`;

                if (!userProgress.completedTopics.includes(dayId)) {
                    recommendations.push({
                        type: 'current_week',
                        topic: {
                            id: dayId,
                            week: weekTopics,
                            day: day,
                            weekIndex: currentWeek,
                            dayIndex: dayIndex
                        },
                        reason: 'From your current week'
                    });
                }
            });
        }

        // Limit recommendations
        return recommendations.slice(0, 3);
    },

    // Export roadmap data
    exportRoadmap: function () {
        const data = {
            roadmap: window.dsaRoadmap,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `dsa-roadmap-${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        Utils.showToast('Roadmap exported successfully!', 'success');
    }
};

// Export Roadmap module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Roadmap;
}