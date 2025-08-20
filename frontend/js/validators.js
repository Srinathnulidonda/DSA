// Validation Functions for DSA Path Application

const Validators = {
    /**
     * Email validation
     */
    email: {
        validate(email) {
            const result = {
                isValid: false,
                errors: []
            };

            if (!email || typeof email !== 'string') {
                result.errors.push('Email is required');
                return result;
            }

            const trimmedEmail = email.trim();

            if (trimmedEmail.length === 0) {
                result.errors.push('Email is required');
                return result;
            }

            if (!VALIDATION_RULES.EMAIL.PATTERN.test(trimmedEmail)) {
                result.errors.push('Please enter a valid email address');
                return result;
            }

            if (trimmedEmail.length > 254) {
                result.errors.push('Email address is too long');
                return result;
            }

            result.isValid = true;
            return result;
        }
    },

    /**
     * Password validation
     */
    password: {
        validate(password) {
            const result = {
                isValid: false,
                errors: [],
                strength: 0
            };

            if (!password || typeof password !== 'string') {
                result.errors.push('Password is required');
                return result;
            }

            const rules = VALIDATION_RULES.PASSWORD;

            // Length check
            if (password.length < rules.MIN_LENGTH) {
                result.errors.push(`Password must be at least ${rules.MIN_LENGTH} characters long`);
            } else {
                result.strength += 1;
            }

            // Uppercase check
            if (rules.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
                result.errors.push('Password must contain at least one uppercase letter');
            } else if (/[A-Z]/.test(password)) {
                result.strength += 1;
            }

            // Lowercase check
            if (rules.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
                result.errors.push('Password must contain at least one lowercase letter');
            } else if (/[a-z]/.test(password)) {
                result.strength += 1;
            }

            // Number check
            if (rules.REQUIRE_NUMBER && !/\d/.test(password)) {
                result.errors.push('Password must contain at least one number');
            } else if (/\d/.test(password)) {
                result.strength += 1;
            }

            // Special character check
            if (rules.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                result.errors.push('Password must contain at least one special character');
            } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                result.strength += 1;
            }

            // Additional strength checks
            if (password.length >= 12) result.strength += 1;
            if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) result.strength += 1;

            result.isValid = result.errors.length === 0;
            result.strengthText = this.getStrengthText(result.strength);

            return result;
        },

        getStrengthText(strength) {
            if (strength <= 2) return 'Weak';
            if (strength <= 4) return 'Fair';
            if (strength <= 5) return 'Good';
            return 'Strong';
        },

        getStrengthColor(strength) {
            if (strength <= 2) return 'danger';
            if (strength <= 4) return 'warning';
            if (strength <= 5) return 'info';
            return 'success';
        }
    },

    /**
     * Name validation
     */
    name: {
        validate(name) {
            const result = {
                isValid: false,
                errors: []
            };

            if (!name || typeof name !== 'string') {
                result.errors.push('Name is required');
                return result;
            }

            const trimmedName = name.trim();

            if (trimmedName.length === 0) {
                result.errors.push('Name is required');
                return result;
            }

            if (trimmedName.length < 2) {
                result.errors.push('Name must be at least 2 characters long');
                return result;
            }

            if (trimmedName.length > 50) {
                result.errors.push('Name must be less than 50 characters');
                return result;
            }

            if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
                result.errors.push('Name can only contain letters, spaces, hyphens, and apostrophes');
                return result;
            }

            result.isValid = true;
            return result;
        }
    },

    /**
     * Note validation
     */
    note: {
        validateTitle(title) {
            const result = {
                isValid: false,
                errors: []
            };

            if (!title || typeof title !== 'string') {
                result.errors.push('Note title is required');
                return result;
            }

            const trimmedTitle = title.trim();

            if (trimmedTitle.length === 0) {
                result.errors.push('Note title is required');
                return result;
            }

            if (trimmedTitle.length < VALIDATION_RULES.NOTE_TITLE.MIN_LENGTH) {
                result.errors.push(`Title must be at least ${VALIDATION_RULES.NOTE_TITLE.MIN_LENGTH} character long`);
                return result;
            }

            if (trimmedTitle.length > VALIDATION_RULES.NOTE_TITLE.MAX_LENGTH) {
                result.errors.push(`Title must be less than ${VALIDATION_RULES.NOTE_TITLE.MAX_LENGTH} characters`);
                return result;
            }

            result.isValid = true;
            return result;
        },

        validateContent(content) {
            const result = {
                isValid: false,
                errors: []
            };

            if (!content) {
                content = '';
            }

            if (typeof content !== 'string') {
                result.errors.push('Note content must be text');
                return result;
            }

            if (content.length > VALIDATION_RULES.NOTE_CONTENT.MAX_LENGTH) {
                result.errors.push(`Content must be less than ${VALIDATION_RULES.NOTE_CONTENT.MAX_LENGTH} characters`);
                return result;
            }

            result.isValid = true;
            return result;
        },

        validateTags(tags) {
            const result = {
                isValid: false,
                errors: []
            };

            if (!tags) {
                result.isValid = true;
                return result;
            }

            if (!Array.isArray(tags)) {
                result.errors.push('Tags must be an array');
                return result;
            }

            if (tags.length > 10) {
                result.errors.push('Maximum 10 tags are allowed');
                return result;
            }

            for (const tag of tags) {
                if (typeof tag !== 'string') {
                    result.errors.push('All tags must be text');
                    return result;
                }

                if (tag.trim().length === 0) {
                    result.errors.push('Tags cannot be empty');
                    return result;
                }

                if (tag.length > 20) {
                    result.errors.push('Each tag must be less than 20 characters');
                    return result;
                }

                if (!/^[a-zA-Z0-9\s-_]+$/.test(tag)) {
                    result.errors.push('Tags can only contain letters, numbers, spaces, hyphens, and underscores');
                    return result;
                }
            }

            result.isValid = true;
            return result;
        }
    },

    /**
     * File validation
     */
    file: {
        validateImage(file) {
            const result = {
                isValid: false,
                errors: []
            };

            if (!file) {
                result.errors.push('No file selected');
                return result;
            }

            if (!(file instanceof File)) {
                result.errors.push('Invalid file object');
                return result;
            }

            // Check file type
            if (!APP_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type)) {
                result.errors.push('Only JPEG, PNG, WebP, and GIF images are allowed');
                return result;
            }

            // Check file size
            if (file.size > APP_CONFIG.MAX_FILE_SIZE) {
                const maxSizeMB = APP_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
                result.errors.push(`File size must be less than ${maxSizeMB}MB`);
                return result;
            }

            result.isValid = true;
            return result;
        }
    },

    /**
     * Form validation utilities
     */
    form: {
        validateField(fieldName, value, rules = {}) {
            const result = {
                isValid: false,
                errors: []
            };

            // Required check
            if (rules.required && (!value || (typeof value === 'string' && value.trim().length === 0))) {
                result.errors.push(`${fieldName} is required`);
                return result;
            }

            // Skip other validations if field is empty and not required
            if (!value || (typeof value === 'string' && value.trim().length === 0)) {
                result.isValid = true;
                return result;
            }

            // String validations
            if (typeof value === 'string') {
                const trimmedValue = value.trim();

                if (rules.minLength && trimmedValue.length < rules.minLength) {
                    result.errors.push(`${fieldName} must be at least ${rules.minLength} characters long`);
                }

                if (rules.maxLength && trimmedValue.length > rules.maxLength) {
                    result.errors.push(`${fieldName} must be less than ${rules.maxLength} characters`);
                }

                if (rules.pattern && !rules.pattern.test(trimmedValue)) {
                    result.errors.push(rules.patternMessage || `${fieldName} format is invalid`);
                }
            }

            // Number validations
            if (typeof value === 'number' || (typeof value === 'string' && !isNaN(value))) {
                const numValue = typeof value === 'number' ? value : parseFloat(value);

                if (rules.min !== undefined && numValue < rules.min) {
                    result.errors.push(`${fieldName} must be at least ${rules.min}`);
                }

                if (rules.max !== undefined && numValue > rules.max) {
                    result.errors.push(`${fieldName} must be no more than ${rules.max}`);
                }
            }

            // Custom validation function
            if (rules.custom && typeof rules.custom === 'function') {
                const customResult = rules.custom(value);
                if (customResult !== true) {
                    result.errors.push(customResult || `${fieldName} is invalid`);
                }
            }

            result.isValid = result.errors.length === 0;
            return result;
        },

        validateForm(formData, validationRules) {
            const results = {};
            let isFormValid = true;

            Object.entries(validationRules).forEach(([fieldName, rules]) => {
                const value = formData[fieldName];
                const fieldResult = this.validateField(fieldName, value, rules);
                results[fieldName] = fieldResult;

                if (!fieldResult.isValid) {
                    isFormValid = false;
                }
            });

            return {
                isValid: isFormValid,
                fields: results,
                getAllErrors() {
                    const allErrors = [];
                    Object.values(results).forEach(result => {
                        allErrors.push(...result.errors);
                    });
                    return allErrors;
                }
            };
        }
    },

    /**
     * Real-time validation for input fields
     */
    realTime: {
        setupValidation(form, validationRules) {
            const fields = form.querySelectorAll('input, textarea, select');

            fields.forEach(field => {
                const fieldName = field.name || field.id;
                if (!fieldName || !validationRules[fieldName]) return;

                // Create error display element
                let errorElement = form.querySelector(`#${fieldName}-error`);
                if (!errorElement) {
                    errorElement = document.createElement('div');
                    errorElement.id = `${fieldName}-error`;
                    errorElement.className = 'invalid-feedback';
                    field.parentNode.appendChild(errorElement);
                }

                // Validation function
                const validate = () => {
                    const result = Validators.form.validateField(fieldName, field.value, validationRules[fieldName]);

                    if (result.isValid) {
                        field.classList.remove('is-invalid');
                        field.classList.add('is-valid');
                        errorElement.textContent = '';
                    } else {
                        field.classList.remove('is-valid');
                        field.classList.add('is-invalid');
                        errorElement.textContent = result.errors[0]; // Show first error
                    }

                    return result.isValid;
                };

                // Add event listeners
                field.addEventListener('blur', validate);
                field.addEventListener('input', Utils.time.debounce(validate, 500));

                // Store validation function for later use
                field._validate = validate;
            });
        },

        validateAll(form) {
            const fields = form.querySelectorAll('input[data-validate], textarea[data-validate], select[data-validate]');
            let isValid = true;

            fields.forEach(field => {
                if (field._validate && !field._validate()) {
                    isValid = false;
                }
            });

            return isValid;
        }
    },

    /**
     * Sanitization utilities
     */
    sanitize: {
        text(input) {
            if (typeof input !== 'string') return '';
            return input.trim().replace(/\s+/g, ' ');
        },

        html(input) {
            if (typeof input !== 'string') return '';
            const temp = document.createElement('div');
            temp.textContent = input;
            return temp.innerHTML;
        },

        email(input) {
            if (typeof input !== 'string') return '';
            return input.trim().toLowerCase();
        },

        filename(input) {
            if (typeof input !== 'string') return '';
            return input.trim().replace(/[^a-zA-Z0-9.-]/g, '_');
        }
    }
};

// Export Validators for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Validators;
}