const fs = require('fs').promises;
const path = require('path');
const CryptoJS = require('crypto-js');

const CONFIG_FILE = path.join(__dirname, '../config/settings.json');
const METADATA_FILE = path.join(__dirname, '../config/metadata.json');
const TEMPLATES_FILE = path.join(__dirname, '../config/templates.json');

// Simple encryption key - in production, this should be from environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'jira-helper-default-key-change-in-production';

// Encrypt sensitive data
function encrypt(text) {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

// Decrypt sensitive data
function decrypt(encryptedText) {
  const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Get settings
async function getSettings() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    const settings = JSON.parse(data);
    
    // Decrypt API token if it exists
    if (settings.apiToken) {
      settings.apiToken = decrypt(settings.apiToken);
    }
    
    return settings;
  } catch (error) {
    // Return default settings if file doesn't exist
    return {
      jiraUrl: '',
      username: '',
      apiToken: '',
      configured: false
    };
  }
}

// Save settings
async function saveSettings(settings) {
  try {
    // Encrypt API token before saving
    const settingsToSave = { ...settings };
    if (settingsToSave.apiToken) {
      settingsToSave.apiToken = encrypt(settingsToSave.apiToken);
    }
    
    await fs.writeFile(CONFIG_FILE, JSON.stringify(settingsToSave, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

// Get metadata
async function getMetadata() {
  try {
    const data = await fs.readFile(METADATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {
      projects: [],
      issueTypes: [],
      fields: [],
      lastUpdated: null
    };
  }
}

// Save metadata
async function saveMetadata(metadata) {
  try {
    metadata.lastUpdated = new Date().toISOString();
    await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving metadata:', error);
    return false;
  }
}

// Get templates
async function getTemplates() {
  try {
    const data = await fs.readFile(TEMPLATES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Return default templates if file doesn't exist
    return getDefaultTemplates();
  }
}

// Save templates
async function saveTemplates(templates) {
  try {
    await fs.writeFile(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving templates:', error);
    return false;
  }
}

// Get default templates
function getDefaultTemplates() {
  return [
    {
      id: 'bug-report',
      name: 'Bug Report',
      issueType: 'Bug',
      summary: 'Bug: [Brief description]',
      description: `**Bug Description:**
[Describe the bug clearly and concisely]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [Third step]

**Expected Behavior:**
[What you expected to happen]

**Actual Behavior:**
[What actually happened]

**Environment:**
- Browser: [e.g., Chrome 91.0]
- OS: [e.g., Windows 10]
- Version: [e.g., 1.0.0]

**Additional Information:**
[Any additional information, screenshots, or logs]`,
      labels: ['bug'],
      priority: 'Medium'
    },
    {
      id: 'feature-request',
      name: 'Feature Request',
      issueType: 'Story',
      summary: 'Feature: [Brief description]',
      description: `**Feature Description:**
[Describe the feature you'd like to see]

**Use Case:**
[Explain why this feature would be useful]

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

**Additional Notes:**
[Any additional information or context]`,
      labels: ['feature', 'enhancement'],
      priority: 'Low'
    },
    {
      id: 'task',
      name: 'General Task',
      issueType: 'Task',
      summary: 'Task: [Brief description]',
      description: `**Task Description:**
[Describe what needs to be done]

**Requirements:**
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

**Definition of Done:**
- [ ] [Done criterion 1]
- [ ] [Done criterion 2]
- [ ] [Done criterion 3]`,
      labels: ['task'],
      priority: 'Medium'
    }
  ];
}

module.exports = {
  getSettings,
  saveSettings,
  getMetadata,
  saveMetadata,
  getTemplates,
  saveTemplates,
  getDefaultTemplates
};
