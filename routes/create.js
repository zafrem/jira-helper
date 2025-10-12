const express = require('express');
const multer = require('multer');
const router = express.Router();
const jiraApi = require('../utils/jiraApi');
const { getTemplates } = require('../utils/config');
const { parseCSV, processIssueCSVData, generateSampleCSV } = require('../utils/csvUtils');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Create a single issue
router.post('/single', async (req, res) => {
  try {
    const {
      project,
      issueType,
      summary,
      description,
      assignee,
      labels,
      dueDate,
      priority,
      components
    } = req.body;
    
    if (!project || !issueType || !summary) {
      return res.status(400).json({
        error: 'Project, issue type, and summary are required'
      });
    }
    
    // Build the issue data
    const issueData = {
      fields: {
        project: {
          key: project
        },
        issuetype: {
          name: issueType
        },
        summary: summary,
        description: description || ''
      }
    };
    
    // Add optional fields
    if (assignee) {
      issueData.fields.assignee = {
        name: assignee
      };
    }
    
    if (labels && Array.isArray(labels) && labels.length > 0) {
      issueData.fields.labels = labels;
    }
    
    if (dueDate) {
      issueData.fields.duedate = dueDate;
    }
    
    if (priority) {
      issueData.fields.priority = {
        name: priority
      };
    }
    
    if (components && Array.isArray(components) && components.length > 0) {
      issueData.fields.components = components.map(comp => ({ name: comp }));
    }
    
    const result = await jiraApi.createIssue(issueData);
    
    res.json({
      success: true,
      message: 'Issue created successfully',
      issue: {
        key: result.key,
        id: result.id,
        self: result.self
      }
    });
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({ error: 'Failed to create issue: ' + error.message });
  }
});

// Create issues from template
router.post('/from-template', async (req, res) => {
  try {
    const { templateId, overrides = {} } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }
    
    const templates = await getTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Merge template with overrides
    const issueData = {
      fields: {
        project: {
          key: overrides.project || template.project
        },
        issuetype: {
          name: overrides.issueType || template.issueType || 'Task'
        },
        summary: overrides.summary || template.summary,
        description: overrides.description || template.description || ''
      }
    };
    
    // Add optional fields from template or overrides
    const assignee = overrides.assignee || template.assignee;
    if (assignee) {
      issueData.fields.assignee = { name: assignee };
    }
    
    const labels = overrides.labels || template.labels;
    if (labels && Array.isArray(labels) && labels.length > 0) {
      issueData.fields.labels = labels;
    }
    
    const dueDate = overrides.dueDate || template.dueDate;
    if (dueDate) {
      issueData.fields.duedate = dueDate;
    }
    
    const priority = overrides.priority || template.priority;
    if (priority) {
      issueData.fields.priority = { name: priority };
    }
    
    const result = await jiraApi.createIssue(issueData);
    
    res.json({
      success: true,
      message: 'Issue created from template successfully',
      issue: {
        key: result.key,
        id: result.id,
        self: result.self
      }
    });
  } catch (error) {
    console.error('Error creating issue from template:', error);
    res.status(500).json({ error: 'Failed to create issue from template: ' + error.message });
  }
});

// Bulk create issues from CSV
router.post('/bulk', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }
    
    const { templateId } = req.body;
    let template = null;
    
    // Get template if specified
    if (templateId) {
      const templates = await getTemplates();
      template = templates.find(t => t.id === templateId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
    }
    
    // Parse CSV
    const csvData = await parseCSV(req.file.buffer);
    
    if (csvData.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }
    
    // Process CSV data
    const processed = processIssueCSVData(csvData, template);
    
    if (!processed.valid) {
      return res.status(400).json({
        error: 'CSV validation failed',
        errors: processed.errors
      });
    }
    
    // Create issues
    const results = [];
    const errors = [];
    
    for (const row of processed.data) {
      try {
        if (row.errors.length > 0) {
          errors.push({
            row: row.rowNumber,
            errors: row.errors
          });
          continue;
        }
        
        const issueData = {
          fields: {
            project: {
              key: row.data.project
            },
            issuetype: {
              name: row.data.issueType || 'Task'
            },
            summary: row.data.summary,
            description: row.data.description || ''
          }
        };
        
        // Add optional fields
        if (row.data.assignee) {
          issueData.fields.assignee = { name: row.data.assignee };
        }
        
        if (row.data.labels && row.data.labels.length > 0) {
          issueData.fields.labels = row.data.labels;
        }
        
        if (row.data.dueDate) {
          issueData.fields.duedate = row.data.dueDate;
        }
        
        if (row.data.priority) {
          issueData.fields.priority = { name: row.data.priority };
        }
        
        if (row.data.components && row.data.components.length > 0) {
          issueData.fields.components = row.data.components.map(comp => ({ name: comp }));
        }
        
        const result = await jiraApi.createIssue(issueData);
        
        results.push({
          row: row.rowNumber,
          success: true,
          issue: {
            key: result.key,
            id: result.id,
            summary: row.data.summary
          }
        });
        
        // Small delay to avoid overwhelming Jira
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error creating issue for row ${row.rowNumber}:`, error);
        errors.push({
          row: row.rowNumber,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Bulk creation completed. ${results.length} issues created, ${errors.length} failed.`,
      results: {
        created: results,
        errors: errors,
        total: processed.data.length,
        successful: results.length,
        failed: errors.length
      }
    });
  } catch (error) {
    console.error('Error in bulk create:', error);
    res.status(500).json({ error: 'Failed to process bulk create: ' + error.message });
  }
});

// Get CSV sample template
router.get('/csv-template', async (req, res) => {
  try {
    const csvContent = await generateSampleCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="jira-issues-template.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error generating CSV template:', error);
    res.status(500).json({ error: 'Failed to generate CSV template' });
  }
});

// Get create metadata for a project
router.get('/metadata/:projectKey?', async (req, res) => {
  try {
    const { projectKey } = req.params;
    const metadata = await jiraApi.getCreateMetadata(projectKey);
    res.json(metadata);
  } catch (error) {
    console.error('Error getting create metadata:', error);
    res.status(500).json({ error: 'Failed to get create metadata: ' + error.message });
  }
});

module.exports = router;
