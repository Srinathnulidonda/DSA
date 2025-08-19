// Form Validators

class Validator {
    constructor() {
        this.errors = {};
    }

    // Clear errors
    clearErrors() {
        this.errors = {};
    }

    // Add error
    addError(field, message) {
        if (!this.errors[field]) {
            this.errors[field] = [];
        }
        this.errors[field].push(message);
    }

    // Get errors for field
    getFieldErrors(field) {
        return this.errors[field] || [];
    }

    // Get all errors
    getAllErrors() {
        return this.errors;
    }

    // Check if has errors
    hasErrors() {
        return Object.keys(this.errors).length > 0;
    }

    // Validation rules
    required(value, field, message = null) {
        if (!value || value.toString().trim() === '') {
            this.addError(field, message || `${field} is required`);
            return false;
        }
        return true;
    }

    email(value, field, message = null) {
        if (!utils.isValidEmail(value)) {
            this.addError(field, message || 'Invalid email address');
            return false;
        }
        return true;
    }

    minLength(value, min, field, message = null) {
        if (value.length < min) {
            this.addError(field, message || `Must be at least ${min} characters`);
            return false;
        }
        return true;
    }

    maxLength(value, max, field, message = null) {
        if (value.length > max) {
            this.addError(field, message || `Must be no more than ${max} characters`);
            return false;
        }
        return true;
    }

    pattern(value, pattern, field, message = null) {
        if (!pattern.test(value)) {
            this.addError(field, message || 'Invalid format');
            return false;
        }
        return true;
    }

    match(value1, value2, field, message = null) {
        if (value1 !== value2) {
            this.addError(field, message || 'Values do not match');
            return false;
        }
        return true;
    }

    numeric(value, field, message = null) {
        if (isNaN(value) || value === '') {
            this.addError(field, message || 'Must be a number');
            return false;
        }
        return true;
    }

    min(value, min, field, message = null) {
        if (parseFloat(value) < min) {
            this.addError(field, message || `Must be at least ${min}`);
            return false;
        }
        return true;
    }

    max(value, max, field, message = null) {
        if (parseFloat(value) > max) {
            this.addError(field, message || `Must be no more than ${max}`);
            return false;
        }
        return true;
    }

    // Validate form
    validateForm(formElement) {
        this.clearErrors();
        const formData = new FormData(formElement);
        const data = {};

        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }

        return data;
    }

    // Show errors on form
    showFormErrors(formElement) {
        // Clear previous errors
        formElement.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        formElement.querySelectorAll('.invalid-feedback').forEach(el => {
            el.remove();
        });

        // Show new errors
        Object.entries(this.errors).forEach(([field, messages]) => {
            const input = formElement.querySelector(`[name="${field}"]`);
            if (input) {
                input.classList.add('is-invalid');

                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = messages[0]; // Show first error

                if (input.parentElement.classList.contains('input-group')) {
                    input.parentElement.parentElement.appendChild(feedback);
                } else {
                    input.parentElement.appendChild(feedback);
                }
            }
        });
    }

    // Clear form errors
    clearFormErrors(formElement) {
        formElement.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
        formElement.querySelectorAll('.invalid-feedback').forEach(el => {
            el.remove();
        });
    }
}

// Form validation helpers
const FormValidator = {
    // Validate login form
    validateLogin(email, password) {
        const validator = new Validator();

        validator.required(email, 'email');
        if (email) validator.email(email, 'email');

        validator.required(password, 'password');

        return validator;
    },

    // Validate registration form
    validateRegister(email, password, confirmPassword, name) {
        const validator = new Validator();

        validator.required(name, 'name');
        if (name) {
            validator.minLength(name, APP_CONFIG.VALIDATION.MIN_NAME_LENGTH, 'name');
            validator.maxLength(name, APP_CONFIG.VALIDATION.MAX_NAME_LENGTH, 'name');
        }

        validator.required(email, 'email');
        if (email) validator.email(email, 'email');

        validator.required(password, 'password');
        if (password) {
            validator.minLength(password, APP_CONFIG.VALIDATION.MIN_PASSWORD_LENGTH, 'password');
            validator.maxLength(password, APP_CONFIG.VALIDATION.MAX_PASSWORD_LENGTH, 'password');
        }

        validator.required(confirmPassword, 'confirmPassword', 'Password confirmation is required');
        if (password && confirmPassword) {
            validator.match(password, confirmPassword, 'confirmPassword', 'Passwords do not match');
        }

        return validator;
    },

    // Validate note form
    validateNote(title, content) {
        const validator = new Validator();

        validator.required(title, 'title');
        if (title) {
            validator.maxLength(title, APP_CONFIG.VALIDATION.MAX_NOTE_TITLE_LENGTH, 'title');
        }

        if (content) {
            validator.maxLength(content, APP_CONFIG.VALIDATION.MAX_NOTE_CONTENT_LENGTH, 'content');
        }

        return validator;
    }
};

// Export
window.Validator = Validator;
window.FormValidator = FormValidator;