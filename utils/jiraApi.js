const axios = require('axios');
const { getSettings } = require('./config');

class JiraAPI {
  constructor() {
    this.baseURL = null;
    this.auth = null;
    this.initialized = false;
  }

  async initialize() {
    const settings = await getSettings();
    if (settings.jiraUrl && settings.username && settings.apiToken) {
      this.baseURL = settings.jiraUrl.replace(/\/$/, ''); // Remove trailing slash
      this.auth = {
        username: settings.username,
        password: settings.apiToken
      };
      this.initialized = true;
      return true;
    }
    return false;
  }

  async makeRequest(method, endpoint, data = null, params = {}) {
    if (!this.initialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Jira connection not configured. Please configure settings first.');
      }
    }

    try {
      const config = {
        method,
        url: `${this.baseURL}/rest/api/2${endpoint}`,
        auth: this.auth,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        params
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('Jira API Error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.errorMessages?.[0] || 
        error.response?.data?.message || 
        error.message || 
        'Jira API request failed'
      );
    }
  }

  // Test connection
  async testConnection() {
    try {
      const result = await this.makeRequest('GET', '/myself');
      return { success: true, user: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get projects
  async getProjects() {
    return await this.makeRequest('GET', '/project');
  }

  // Get issue types
  async getIssueTypes() {
    return await this.makeRequest('GET', '/issuetype');
  }

  // Get fields (including custom fields)
  async getFields() {
    return await this.makeRequest('GET', '/field');
  }

  // Get create metadata for a project
  async getCreateMetadata(projectKey) {
    const params = projectKey ? { projectKeys: projectKey } : {};
    return await this.makeRequest('GET', '/issue/createmeta', null, params);
  }

  // Search issues
  async searchIssues(jql, startAt = 0, maxResults = 50) {
    const params = {
      jql,
      startAt,
      maxResults,
      fields: 'summary,status,issuetype,priority,assignee,created,updated,description'
    };
    return await this.makeRequest('GET', '/search', null, params);
  }

  // Get issue details
  async getIssue(issueKey) {
    return await this.makeRequest('GET', `/issue/${issueKey}`);
  }

  // Create issue
  async createIssue(issueData) {
    return await this.makeRequest('POST', '/issue', issueData);
  }

  // Update issue
  async updateIssue(issueKey, updateData) {
    return await this.makeRequest('PUT', `/issue/${issueKey}`, updateData);
  }

  // Add comment to issue
  async addComment(issueKey, comment) {
    const commentData = {
      body: comment
    };
    return await this.makeRequest('POST', `/issue/${issueKey}/comment`, commentData);
  }

  // Update comment
  async updateComment(issueKey, commentId, comment) {
    const commentData = {
      body: comment
    };
    return await this.makeRequest('PUT', `/issue/${issueKey}/comment/${commentId}`, commentData);
  }

  // Get comments for an issue
  async getComments(issueKey) {
    return await this.makeRequest('GET', `/issue/${issueKey}/comment`);
  }

  // Get available transitions for an issue
  async getTransitions(issueKey) {
    return await this.makeRequest('GET', `/issue/${issueKey}/transitions`);
  }

  // Transition issue
  async transitionIssue(issueKey, transitionId, comment = null) {
    const transitionData = {
      transition: {
        id: transitionId
      }
    };

    if (comment) {
      transitionData.update = {
        comment: [{
          add: {
            body: comment
          }
        }]
      };
    }

    return await this.makeRequest('POST', `/issue/${issueKey}/transitions`, transitionData);
  }

  // Find transition to close/resolve issue
  async findCloseTransition(issueKey) {
    const transitions = await this.getTransitions(issueKey);
    
    // Look for common close/resolve transition names
    const closeKeywords = ['close', 'resolve', 'done', 'complete', 'finish'];
    
    for (const transition of transitions.transitions) {
      const name = transition.name.toLowerCase();
      if (closeKeywords.some(keyword => name.includes(keyword))) {
        return transition;
      }
    }
    
    return null;
  }
}

module.exports = new JiraAPI();
