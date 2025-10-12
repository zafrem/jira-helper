// Jira Helper Web Application
class JiraHelper {
    constructor() {
        this.currentSection = 'search';
        this.settings = {};
        this.metadata = {};
        this.templates = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadSettings();
        await this.loadMetadata();
        await this.loadTemplates();
        this.updateConnectionStatus();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.closest('.nav-link').dataset.section;
                this.showSection(section);
            });
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.showTab(e.target.closest('.section'), tab);
            });
        });

        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => this.searchIssues());
        document.getElementById('jqlQuery').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchIssues();
        });

        // Settings
        document.getElementById('settingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
        document.getElementById('testConnectionBtn').addEventListener('click', () => this.testConnection());
        document.getElementById('refreshMetadataBtn').addEventListener('click', () => this.refreshMetadata());

        // Create issues
        document.getElementById('singleIssueForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createSingleIssue();
        });
        document.getElementById('bulkUploadBtn').addEventListener('click', () => this.bulkCreateIssues());
        document.getElementById('templateSelect').addEventListener('change', (e) => this.loadTemplate(e.target.value));

        // Verification
        document.getElementById('runVerificationBtn').addEventListener('click', () => this.runVerification());
        document.getElementById('verificationScript').addEventListener('change', (e) => this.loadScriptParameters(e.target.value));
    }

    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Show section
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionName}Section`).classList.add('active');

        this.currentSection = sectionName;

        // Load section-specific data
        if (sectionName === 'verify') {
            this.loadVerificationScripts();
        }
    }

    showTab(sectionElement, tabName) {
        const tabBtns = sectionElement.querySelectorAll('.tab-btn');
        const tabContents = sectionElement.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        sectionElement.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        sectionElement.querySelector(`#${tabName}Tab`).classList.add('active');
    }

    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`/api${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    showLoading(show = true) {
        document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
    }

    showToast(message, type = 'info', title = '') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <div class="toast-header">
                <span class="toast-title">${title || type.charAt(0).toUpperCase() + type.slice(1)}</span>
                <button class="toast-close">&times;</button>
            </div>
            <div class="toast-message">${message}</div>
        `;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }

    async loadSettings() {
        try {
            this.settings = await this.apiCall('/settings');
            
            if (this.settings.jiraUrl) {
                document.getElementById('jiraUrl').value = this.settings.jiraUrl;
            }
            if (this.settings.username) {
                document.getElementById('username').value = this.settings.username;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        const jiraUrl = document.getElementById('jiraUrl').value;
        const username = document.getElementById('username').value;
        const apiToken = document.getElementById('apiToken').value;

        if (!jiraUrl || !username || !apiToken) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            this.showLoading();
            await this.apiCall('/settings', {
                method: 'POST',
                body: JSON.stringify({ jiraUrl, username, apiToken })
            });

            this.settings = { jiraUrl, username, configured: true };
            this.showToast('Settings saved successfully', 'success');
            this.updateConnectionStatus();
            
            // Clear the API token field for security
            document.getElementById('apiToken').value = '';
        } catch (error) {
            this.showToast('Failed to save settings: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async testConnection() {
        try {
            this.showLoading();
            const result = await this.apiCall('/settings/test', { method: 'POST' });
            
            if (result.success) {
                this.showToast(`Connection successful! Connected as ${result.user.displayName}`, 'success');
                this.updateConnectionStatus(true);
            }
        } catch (error) {
            this.showToast('Connection failed: ' + error.message, 'error');
            this.updateConnectionStatus(false);
        } finally {
            this.showLoading(false);
        }
    }

    updateConnectionStatus(connected = null) {
        const statusEl = document.getElementById('connectionStatus');
        
        if (connected === null) {
            connected = this.settings.configured;
        }

        if (connected) {
            statusEl.className = 'connection-status connected';
            statusEl.innerHTML = '<i class="fas fa-circle"></i><span>Connected</span>';
        } else {
            statusEl.className = 'connection-status disconnected';
            statusEl.innerHTML = '<i class="fas fa-circle"></i><span>Not Connected</span>';
        }
    }

    async loadMetadata() {
        try {
            this.metadata = await this.apiCall('/settings/metadata');
            this.populateProjectsAndTypes();
            this.displayMetadata();
        } catch (error) {
            console.error('Error loading metadata:', error);
        }
    }

    async refreshMetadata() {
        try {
            this.showLoading();
            const result = await this.apiCall('/settings/metadata/refresh', { method: 'POST' });
            
            this.metadata = result.metadata;
            this.populateProjectsAndTypes();
            this.displayMetadata();
            this.showToast('Metadata refreshed successfully', 'success');
        } catch (error) {
            this.showToast('Failed to refresh metadata: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    populateProjectsAndTypes() {
        // Populate project dropdowns
        const projectSelect = document.getElementById('project');
        projectSelect.innerHTML = '<option value="">Select Project</option>';
        this.metadata.projects?.forEach(project => {
            projectSelect.innerHTML += `<option value="${project.key}">${project.name} (${project.key})</option>`;
        });

        // Populate issue type dropdown
        const issueTypeSelect = document.getElementById('issueType');
        issueTypeSelect.innerHTML = '<option value="">Select Issue Type</option>';
        this.metadata.issueTypes?.forEach(type => {
            issueTypeSelect.innerHTML += `<option value="${type.name}">${type.name}</option>`;
        });
    }

    displayMetadata() {
        const container = document.getElementById('metadataContent');
        
        container.innerHTML = `
            <div class="metadata-grid">
                <div class="metadata-card">
                    <h4>Projects (${this.metadata.projects?.length || 0})</h4>
                    <ul class="metadata-list">
                        ${this.metadata.projects?.map(p => `<li><strong>${p.key}</strong> - ${p.name}</li>`).join('') || '<li>No projects found</li>'}
                    </ul>
                </div>
                <div class="metadata-card">
                    <h4>Issue Types (${this.metadata.issueTypes?.length || 0})</h4>
                    <ul class="metadata-list">
                        ${this.metadata.issueTypes?.map(t => `<li>${t.name}</li>`).join('') || '<li>No issue types found</li>'}
                    </ul>
                </div>
                <div class="metadata-card">
                    <h4>Custom Fields (${this.metadata.fields?.length || 0})</h4>
                    <ul class="metadata-list">
                        ${this.metadata.fields?.map(f => `<li><strong>${f.id}</strong> - ${f.name}</li>`).join('') || '<li>No custom fields found</li>'}
                    </ul>
                </div>
            </div>
        `;
    }

    async loadTemplates() {
        try {
            this.templates = await this.apiCall('/settings/templates');
            this.populateTemplateSelects();
            this.displayTemplates();
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    populateTemplateSelects() {
        const selects = document.querySelectorAll('#templateSelect, #bulkTemplate');
        selects.forEach(select => {
            const isTemplateSelect = select.id === 'templateSelect';
            select.innerHTML = isTemplateSelect ? '<option value="">Choose a template</option>' : '<option value="">No template</option>';
            
            this.templates.forEach(template => {
                select.innerHTML += `<option value="${template.id}">${template.name}</option>`;
            });
        });
    }

    displayTemplates() {
        const container = document.getElementById('templatesContent');
        
        container.innerHTML = this.templates.map(template => `
            <div class="template-item">
                <div class="template-header">
                    <span class="template-name">${template.name}</span>
                    <div>
                        <button class="btn btn-sm btn-secondary" onclick="app.editTemplate('${template.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteTemplate('${template.id}')">Delete</button>
                    </div>
                </div>
                <div class="template-description">${template.description || 'No description'}</div>
            </div>
        `).join('');
    }

    async searchIssues() {
        const jql = document.getElementById('jqlQuery').value.trim();
        
        if (!jql) {
            this.showToast('Please enter a JQL query', 'warning');
            return;
        }

        try {
            this.showLoading();
            const results = await this.apiCall('/search', {
                method: 'POST',
                body: JSON.stringify({ jql })
            });

            this.displaySearchResults(results);
        } catch (error) {
            this.showToast('Search failed: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displaySearchResults(results) {
        const container = document.getElementById('searchResults');
        const countEl = document.getElementById('resultsCount');
        const listEl = document.getElementById('issuesList');

        countEl.textContent = `${results.issues.length} of ${results.total} issues`;
        
        listEl.innerHTML = results.issues.map(issue => `
            <div class="issue-item">
                <div class="issue-header">
                    <a href="#" class="issue-key">${issue.key}</a>
                    <div class="issue-meta">
                        <span class="status-badge ${issue.status.name.toLowerCase().replace(/\s+/g, '-')}">${issue.status.name}</span>
                        ${issue.priority ? `<span class="priority-badge ${issue.priority.name.toLowerCase()}">${issue.priority.name}</span>` : ''}
                        ${issue.assignee ? `<span>Assignee: ${issue.assignee.displayName}</span>` : '<span>Unassigned</span>'}
                    </div>
                </div>
                <div class="issue-summary">${issue.summary}</div>
                <div class="issue-actions">
                    <button class="btn btn-sm btn-secondary" onclick="app.addComment('${issue.key}')">Add Comment</button>
                    <button class="btn btn-sm btn-secondary" onclick="app.editDescription('${issue.key}')">Edit Description</button>
                    <button class="btn btn-sm btn-warning" onclick="app.verifyIssue('${issue.key}')">Verify</button>
                </div>
            </div>
        `).join('');

        container.style.display = 'block';
    }

    async addComment(issueKey) {
        const comment = prompt('Enter comment:');
        if (!comment) return;

        try {
            this.showLoading();
            await this.apiCall(`/search/issue/${issueKey}/comment`, {
                method: 'POST',
                body: JSON.stringify({ comment })
            });
            
            this.showToast('Comment added successfully', 'success');
        } catch (error) {
            this.showToast('Failed to add comment: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async editDescription(issueKey) {
        const description = prompt('Enter new description:');
        if (description === null) return;

        try {
            this.showLoading();
            await this.apiCall(`/search/issue/${issueKey}/description`, {
                method: 'PUT',
                body: JSON.stringify({ description })
            });
            
            this.showToast('Description updated successfully', 'success');
        } catch (error) {
            this.showToast('Failed to update description: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    verifyIssue(issueKey) {
        document.getElementById('verifyIssueKey').value = issueKey;
        this.showSection('verify');
    }

    async createSingleIssue() {
        const formData = new FormData(document.getElementById('singleIssueForm'));
        const data = Object.fromEntries(formData);
        
        // Process labels
        if (data.labels) {
            data.labels = data.labels.split(',').map(l => l.trim()).filter(l => l);
        }

        try {
            this.showLoading();
            const result = await this.apiCall('/create/single', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            this.showToast(`Issue ${result.issue.key} created successfully`, 'success');
            document.getElementById('singleIssueForm').reset();
        } catch (error) {
            this.showToast('Failed to create issue: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async bulkCreateIssues() {
        const fileInput = document.getElementById('csvFile');
        const templateId = document.getElementById('bulkTemplate').value;
        
        if (!fileInput.files[0]) {
            this.showToast('Please select a CSV file', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('csvFile', fileInput.files[0]);
        if (templateId) {
            formData.append('templateId', templateId);
        }

        try {
            this.showLoading();
            const result = await this.apiCall('/create/bulk', {
                method: 'POST',
                body: formData,
                headers: {} // Remove Content-Type to let browser set it for FormData
            });
            
            this.displayBulkResults(result.results);
            this.showToast(result.message, 'success');
        } catch (error) {
            this.showToast('Bulk creation failed: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayBulkResults(results) {
        const container = document.getElementById('bulkResults');
        
        container.innerHTML = `
            <div class="result-summary">
                <h4>Bulk Creation Results</h4>
                <p>Total: ${results.total} | Successful: ${results.successful} | Failed: ${results.failed}</p>
            </div>
            
            ${results.created.map(item => `
                <div class="result-item success">
                    Row ${item.row}: Created ${item.issue.key} - ${item.issue.summary}
                </div>
            `).join('')}
            
            ${results.errors.map(item => `
                <div class="result-item error">
                    Row ${item.row}: ${item.error}
                </div>
            `).join('')}
        `;
        
        container.style.display = 'block';
    }

    async loadVerificationScripts() {
        try {
            const scripts = await this.apiCall('/verify/scripts');
            const select = document.getElementById('verificationScript');
            
            select.innerHTML = '<option value="">Select Script</option>';
            scripts.forEach(script => {
                select.innerHTML += `<option value="${script.id}">${script.name}</option>`;
            });
        } catch (error) {
            console.error('Error loading verification scripts:', error);
        }
    }

    async runVerification() {
        const issueKey = document.getElementById('verifyIssueKey').value;
        const scriptId = document.getElementById('verificationScript').value;
        const commentPrefix = document.getElementById('commentPrefix').value;
        
        if (!issueKey || !scriptId) {
            this.showToast('Please enter issue key and select a script', 'warning');
            return;
        }

        // Collect script parameters
        const parameters = {};
        document.querySelectorAll('#scriptParameters input, #scriptParameters select').forEach(input => {
            if (input.value) {
                parameters[input.name] = input.value;
            }
        });

        try {
            this.showLoading();
            const result = await this.apiCall('/verify/run', {
                method: 'POST',
                body: JSON.stringify({ issueKey, scriptId, parameters, commentPrefix })
            });
            
            this.displayVerificationResult(result);
            this.showToast(result.message, result.success ? 'success' : 'error');
        } catch (error) {
            this.showToast('Verification failed: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayVerificationResult(result) {
        const container = document.getElementById('verificationResults');
        
        container.className = `verification-results ${result.success ? 'success' : 'error'}`;
        container.innerHTML = `
            <h4>Verification Result</h4>
            <p><strong>Action:</strong> ${result.action}</p>
            <p><strong>Message:</strong> ${result.message}</p>
            <p><strong>Result:</strong> ${result.verificationResult}</p>
        `;
        
        container.style.display = 'block';
    }

    loadTemplate(templateId) {
        // This would populate the template form - placeholder for now
        console.log('Loading template:', templateId);
    }

    loadScriptParameters(scriptId) {
        // This would load script parameters - placeholder for now
        console.log('Loading script parameters for:', scriptId);
    }

    editTemplate(templateId) {
        // Template editing functionality - placeholder
        console.log('Editing template:', templateId);
    }

    deleteTemplate(templateId) {
        // Template deletion functionality - placeholder
        console.log('Deleting template:', templateId);
    }
}

// Initialize the application
const app = new JiraHelper();

// Make app globally available for onclick handlers
window.app = app;
