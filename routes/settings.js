const express = require('express');
const router = express.Router();
const jiraApi = require('../utils/jiraApi');
const { getSettings, saveSettings, getMetadata, saveMetadata, getTemplates, saveTemplates } = require('../utils/config');

// Get current settings
router.get('/', async (req, res) => {
  try {
    const settings = await getSettings();
    // Don't send the API token to the client
    const safeSettings = {
      jiraUrl: settings.jiraUrl,
      username: settings.username,
      configured: settings.configured || false,
      hasApiToken: !!settings.apiToken
    };
    res.json(safeSettings);
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Save settings
router.post('/', async (req, res) => {
  try {
    const { jiraUrl, username, apiToken } = req.body;
    
    if (!jiraUrl || !username || !apiToken) {
      return res.status(400).json({ error: 'Jira URL, username, and API token are required' });
    }
    
    // Validate URL format
    try {
      new URL(jiraUrl);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid Jira URL format' });
    }
    
    const settings = {
      jiraUrl: jiraUrl.replace(/\/$/, ''), // Remove trailing slash
      username,
      apiToken,
      configured: true
    };
    
    const saved = await saveSettings(settings);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save settings' });
    }
    
    // Reset Jira API instance to use new settings
    jiraApi.initialized = false;
    
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Test Jira connection
router.post('/test', async (req, res) => {
  try {
    const result = await jiraApi.testConnection();
    if (result.success) {
      res.json({
        success: true,
        message: 'Connection successful',
        user: {
          displayName: result.user.displayName,
          emailAddress: result.user.emailAddress,
          accountId: result.user.accountId
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test connection'
    });
  }
});

// Get Jira metadata
router.get('/metadata', async (req, res) => {
  try {
    const metadata = await getMetadata();
    res.json(metadata);
  } catch (error) {
    console.error('Error getting metadata:', error);
    res.status(500).json({ error: 'Failed to get metadata' });
  }
});

// Refresh Jira metadata
router.post('/metadata/refresh', async (req, res) => {
  try {
    const [projects, issueTypes, fields] = await Promise.all([
      jiraApi.getProjects(),
      jiraApi.getIssueTypes(),
      jiraApi.getFields()
    ]);
    
    const metadata = {
      projects: projects.map(p => ({
        id: p.id,
        key: p.key,
        name: p.name,
        projectTypeKey: p.projectTypeKey
      })),
      issueTypes: issueTypes.map(it => ({
        id: it.id,
        name: it.name,
        description: it.description,
        iconUrl: it.iconUrl,
        subtask: it.subtask
      })),
      fields: fields.filter(f => f.custom).map(f => ({
        id: f.id,
        name: f.name,
        schema: f.schema
      }))
    };
    
    const saved = await saveMetadata(metadata);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save metadata' });
    }
    
    res.json({
      success: true,
      message: 'Metadata refreshed successfully',
      metadata
    });
  } catch (error) {
    console.error('Error refreshing metadata:', error);
    res.status(500).json({ error: 'Failed to refresh metadata: ' + error.message });
  }
});

// Get templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await getTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Save templates
router.post('/templates', async (req, res) => {
  try {
    const { templates } = req.body;
    
    if (!Array.isArray(templates)) {
      return res.status(400).json({ error: 'Templates must be an array' });
    }
    
    // Validate template structure
    for (const template of templates) {
      if (!template.id || !template.name) {
        return res.status(400).json({ error: 'Each template must have an id and name' });
      }
    }
    
    const saved = await saveTemplates(templates);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to save templates' });
    }
    
    res.json({ success: true, message: 'Templates saved successfully' });
  } catch (error) {
    console.error('Error saving templates:', error);
    res.status(500).json({ error: 'Failed to save templates' });
  }
});

module.exports = router;
