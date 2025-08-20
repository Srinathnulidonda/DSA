// Validation Functions
const Validators = {
    // Email validation
    email(email) {
        if (!email) {
            return { isValid: false, message: 'Email is required' };
        }

        if (!REGEX_PATTERNS.EMAIL.test(email)) {
            return { isValid: false, message: 'Please enter a valid email address' };
        }

        return { isValid: true };
    },

    // Password validation
    password(password) {
        if (!password) {
            return { isValid: false, message: 'Password is required' };
        }

        if (password.length < 8) {
            return { isValid: false, message: 'Password must be at least 8 characters long' };
        }

        if (!REGEX_PATTERNS.PASSWORD.test(password)) {
            return {
                isValid: false,
                message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
            };
        }

        return { isValid: true };
    },

    // Confirm password validation
    confirmPassword(password, confirmPassword) {
        if (!confirmPassword) {
            return { isValid: false, message: 'Please confirm your password' };
        }

        if (password !== confirmPassword) {
            return { isValid: false, message: 'Passwords do not match' };
        }

        return { isValid: true };
    },

    // Name validation
    name(name) {
        if (!name || !name.trim()) {
            return { isValid: false, message: 'Name is required' };
        }

        if (name.trim().length < 2) {
            return { isValid: false, message: 'Name must be at least 2 characters long' };
        }

        if (name.trim().length > 50) {
            return { isValid: false, message: 'Name must be less than 50 characters long' };
        }

        return { isValid: true };
    },

    // URL validation
    url(url) {
        if (!url) {
            return { isValid: false, message: 'URL is required' };
        }

        if (!REGEX_PATTERNS.URL.test(url)) {
            return { isValid: false, message: 'Please enter a valid URL' };
        }

        return { isValid: true };
    },

    // Note title validation
    noteTitle(title) {
        if (!title || !title.trim()) {
            return { isValid: false, message: 'Note title is required' };
        }

        if (title.trim().length < 3) {
            return { isValid: false, message: 'Title must be at least 3 characters long' };
        }

        if (title.trim().length > 100) {
            return { isValid: false, message: 'Title must be less than 100 characters long' };
        }

        return { isValid: true };
    },

    // Note content validation
    noteContent(content) {
        if (!content || !content.trim()) {
            return { isValid: false, message: 'Note content is required' };
        }

        if (content.trim().length > 10000) {
            return { isValid: false, message: 'Content must be less than 10,000 characters long' };
        }

        return { isValid: true };
    },

    // Tags validation
    tags(tags) {
        if (!Array.isArray(tags)) {
            return { isValid: false, message: 'Tags must be an array' };
        }

        if (tags.length > 10) {
            return { isValid: false, message: 'Maximum 10 tags allowed' };
        }

        for (const tag of tags) {
            if (typeof tag !== 'string' || tag.trim().length === 0) {
                return { isValid: false, message: 'All tags must be non-empty strings' };
            }

            if (tag.trim().length > 20) {
                return { isValid: false, message: 'Each tag must be less than 20 characters long' };
            }
        }

        return { isValid: true };
    },

    // File validation
    file(file, options = {}) {
        if (!file) {
            return { isValid: false, message: 'File is required' };
        }

        // Check file size
        const maxSize = options.maxSize || APP_CONFIG.MAX_FILE_SIZE;
        if (file.size > maxSize) {
            return {
                isValid: false,
                message: `File size must be less than ${Utils.formatFileSize(maxSize)}`
            };
        }

        // Check file type
        if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
            return {
                isValid: false,
                message: `File type ${file.type} is not allowed`
            };
        }

        return { isValid: true };
    },

    // Image file validation
    image(file) {
        const fileValidation = this.file(file);
        if (!fileValidation.isValid) {
            return fileValidation;
        }

        if (!APP_CONFIG.SUPPORTED_IMAGE_TYPES.includes(file.type)) {
            return {
                isValid: false,
                message: 'Please select a valid image file (JPEG, PNG, GIF, or WebP)'
            };
        }

        return { isValid: true };
    },

    // Search query validation
    searchQuery(query) {
        if (!query || !query.trim()) {
            return { isValid: false, message: 'Search query is required' };
        }

        if (query.trim().length < 2) {
            return { isValid: false, message: 'Search query must be at least 2 characters long' };
        }

        if (query.trim().length > 100) {
            return { isValid: false, message: 'Search query must be less than 100 characters long' };
        }

        return { isValid: true };
    },

    // Time validation (for timer)
    time(minutes) {
        if (typeof minutes !== 'number') {
            return { isValid: false, message: 'Time must be a number' };
        }

        if (minutes < 1) {
            return { isValid: false, message: 'Time must be at least 1 minute' };
        }

        if (minutes > 120) {
            return { isValid: false, message: 'Time must be less than 120 minutes' };
        }

        return { isValid: true };
    },

    // Week validation
    week(week) {
        if (typeof week !== 'number') {
            return { isValid: false, message: 'Week must be a number' };
        }

        if (week < 1 || week > APP_CONFIG.ROADMAP_WEEKS) {
            return {
                isValid: false,
                message: `Week must be between 1 and ${APP_CONFIG.ROADMAP_WEEKS}`
            };
        }

        return { isValid: true };
    },

    // Form validation helper
    validateForm(formData, rules) {
        const errors = {};
        let isValid = true;

        Object.keys(rules).forEach(field => {
            const rule = rules[field];
            const value = formData[field];

            // Check if field is required
            if (rule.required && (value === undefined || value === null || value === '')) {
                errors[field] = `${rule.label || field} is required`;
                isValid = false;
                return;
            }

            // Skip validation if field is empty and not required
            if (!rule.required && (value === undefined || value === null || value === '')) {
                return;
            }

            // Apply validation rules
            if (rule.type && this[rule.type]) {
                const validation = this[rule.type](value, rule.options);
                if (!validation.isValid) {
                    errors[field] = validation.message;
                    isValid = false;
                }
            }

            // Apply custom validator
            if (rule.validator) {
                const validation = rule.validator(value);
                if (!validation.isValid) {
                    errors[field] = validation.message;
                    isValid = false;
                }
            }
        });

        return { isValid, errors };
    },

    // Real-time field validation
    validateField(value, rules) {
        if (!rules) return { isValid: true };

        // Check required
        if (rules.required && (value === undefined || value === null || value === '')) {
            return { isValid: false, message: `${rules.label || 'Field'} is required` };
        }

        // Skip if empty and not required
        if (!rules.required && (value === undefined || value === null || value === '')) {
            return { isValid: true };
        }

        // Apply type validation
        if (rules.type && this[rules.type]) {
            return this[rules.type](value, rules.options);
        }

        // Apply custom validator
        if (rules.validator) {
            return rules.validator(value);
        }

        return { isValid: true };
    },

    // Form validation schemas
    schemas: {
        login: {
            email: { type: 'email', required: true, label: 'Email' },
            password: { required: true, label: 'Password' }
        },

        register: {
            name: { type: 'name', required: true, label: 'Name' },
            email: { type: 'email', required: true, label: 'Email' },
            password: { type: 'password', required: true, label: 'Password' },
            confirmPassword: {
                required: true,
                label: 'Confirm Password',
                validator: (value, formData) => {
                    return Validators.confirmPassword(formData.password, value);
                }
            }
        },

        forgotPassword: {
            email: { type: 'email', required: true, label: 'Email' }
        },

        resetPassword: {
            password: { type: 'password', required: true, label: 'Password' },
            confirmPassword: {
                required: true,
                label: 'Confirm Password',
                validator: (value, formData) => {
                    return Validators.confirmPassword(formData.password, value);
                }
            }
        },

        note: {
            title: { type: 'noteTitle', required: true, label: 'Title' },
            content: { type: 'noteContent', required: true, label: 'Content' },
            tags: { type: 'tags', required: false, label: 'Tags' }
        },

        profile: {
            name: { type: 'name', required: true, label: 'Name' },
            email: { type: 'email', required: true, label: 'Email' }
        },

        search: {
            query: { type: 'searchQuery', required: true, label: 'Search Query' }
        },

        timer: {
            duration: { type: 'time', required: true, label: 'Duration' }
        }
    },

    // Helper methods
    showFieldError(fieldElement, message) {
        // Remove existing error
        this.clearFieldError(fieldElement);

        // Add error class
        fieldElement.classList.add('is-invalid');

        // Create error element
        const errorElement = document.createElement('div');
        errorElement.className = 'invalid-feedback';
        errorElement.textContent = message;

        // Insert after field
        fieldElement.parentNode.appendChild(errorElement);
    },

    clearFieldError(fieldElement) {
        fieldElement.classList.remove('is-invalid');

        // Remove error message
        const errorElement = fieldElement.parentNode.querySelector('.invalid-feedback');
        if (errorElement) {
            errorElement.remove();
        }
    },

    clearFormErrors(formElement) {
        const invalidFields = formElement.querySelectorAll('.is-invalid');
        invalidFields.forEach(field => this.clearFieldError(field));
    },

    showFormErrors(formElement, errors) {
        Object.keys(errors).forEach(fieldName => {
            const fieldElement = formElement.querySelector(`[name="${fieldName}"]`);
            if (fieldElement) {
                this.showFieldError(fieldElement, errors[fieldName]);
            }
        });
    },

    // Real-time validation setup
    setupRealTimeValidation(formElement, schema) {
        Object.keys(schema).forEach(fieldName => {
            const fieldElement = formElement.querySelector(`[name="${fieldName}"]`);
            if (!fieldElement) return;

            const validateField = Utils.debounce(() => {
                const value = fieldElement.value;
                const rules = schema[fieldName];
                const validation = this.validateField(value, rules);

                if (!validation.isValid) {
                    this.showFieldError(fieldElement, validation.message);
                } else {
                    this.clearFieldError(fieldElement);
                }
            }, 500);

            fieldElement.addEventListener('input', validateField);
            fieldElement.addEventListener('blur', validateField);
        });
    }
};

// Make available globally
window.Validators = Validators;