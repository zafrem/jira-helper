const express = require('express');
const router = express.Router();
const jiraApi = require('../utils/jiraApi');

// Search issues using JQL
router.post('/', async (req, res) => {
  try {
    const { jql, startAt = 0, maxResults = 50 } = req.body;
    
    if (!jql || jql.trim() === '') {
      return res.status(400).json({ error: 'JQL query is required' });
    }
    
    const results = await jiraApi.searchIssues(jql, startAt, maxResults);
    
    // Format the results for the frontend
    const formattedIssues = results.issues.map(issue => ({
      key: issue.key,
      id: issue.id,
      summary: issue.fields.summary,
      status: {
        name: issue.fields.status.name,
        statusCategory: issue.fields.status.statusCategory
      },
      issueType: {
        name: issue.fields.issuetype.name,
        iconUrl: issue.fields.issuetype.iconUrl
      },
      priority: issue.fields.priority ? {
        name: issue.fields.priority.name,
        iconUrl: issue.fields.priority.iconUrl
      } : null,
      assignee: issue.fields.assignee ? {
        displayName: issue.fields.assignee.displayName,
        emailAddress: issue.fields.assignee.emailAddress
      } : null,
      created: issue.fields.created,
      updated: issue.fields.updated,
      description: issue.fields.description
    }));
    
    res.json({
      issues: formattedIssues,
      total: results.total,
      startAt: results.startAt,
      maxResults: results.maxResults
    });
  } catch (error) {
    console.error('Error searching issues:', error);
    res.status(500).json({ error: 'Failed to search issues: ' + error.message });
  }
});

// Get issue details
router.get('/issue/:issueKey', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const issue = await jiraApi.getIssue(issueKey);
    
    const formattedIssue = {
      key: issue.key,
      id: issue.id,
      summary: issue.fields.summary,
      description: issue.fields.description,
      status: {
        name: issue.fields.status.name,
        statusCategory: issue.fields.status.statusCategory
      },
      issueType: {
        name: issue.fields.issuetype.name,
        iconUrl: issue.fields.issuetype.iconUrl
      },
      priority: issue.fields.priority ? {
        name: issue.fields.priority.name,
        iconUrl: issue.fields.priority.iconUrl
      } : null,
      assignee: issue.fields.assignee ? {
        displayName: issue.fields.assignee.displayName,
        emailAddress: issue.fields.assignee.emailAddress
      } : null,
      reporter: issue.fields.reporter ? {
        displayName: issue.fields.reporter.displayName,
        emailAddress: issue.fields.reporter.emailAddress
      } : null,
      created: issue.fields.created,
      updated: issue.fields.updated,
      labels: issue.fields.labels || [],
      components: issue.fields.components || [],
      fixVersions: issue.fields.fixVersions || []
    };
    
    res.json(formattedIssue);
  } catch (error) {
    console.error('Error getting issue details:', error);
    res.status(500).json({ error: 'Failed to get issue details: ' + error.message });
  }
});

// Add comment to issue
router.post('/issue/:issueKey/comment', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const { comment } = req.body;
    
    if (!comment || comment.trim() === '') {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    
    const result = await jiraApi.addComment(issueKey, comment);
    
    res.json({
      success: true,
      message: 'Comment added successfully',
      comment: {
        id: result.id,
        body: result.body,
        author: result.author,
        created: result.created
      }
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment: ' + error.message });
  }
});

// Update issue description
router.put('/issue/:issueKey/description', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const { description } = req.body;
    
    if (description === undefined) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    const updateData = {
      fields: {
        description: description
      }
    };
    
    await jiraApi.updateIssue(issueKey, updateData);
    
    res.json({
      success: true,
      message: 'Issue description updated successfully'
    });
  } catch (error) {
    console.error('Error updating issue description:', error);
    res.status(500).json({ error: 'Failed to update issue description: ' + error.message });
  }
});

// Update issue summary
router.put('/issue/:issueKey/summary', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const { summary } = req.body;
    
    if (!summary || summary.trim() === '') {
      return res.status(400).json({ error: 'Summary is required' });
    }
    
    const updateData = {
      fields: {
        summary: summary
      }
    };
    
    await jiraApi.updateIssue(issueKey, updateData);
    
    res.json({
      success: true,
      message: 'Issue summary updated successfully'
    });
  } catch (error) {
    console.error('Error updating issue summary:', error);
    res.status(500).json({ error: 'Failed to update issue summary: ' + error.message });
  }
});

// Get comments for an issue
router.get('/issue/:issueKey/comments', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const comments = await jiraApi.getComments(issueKey);
    
    const formattedComments = comments.comments.map(comment => ({
      id: comment.id,
      body: comment.body,
      author: {
        displayName: comment.author.displayName,
        emailAddress: comment.author.emailAddress
      },
      created: comment.created,
      updated: comment.updated
    }));
    
    res.json({
      comments: formattedComments,
      total: comments.total
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({ error: 'Failed to get comments: ' + error.message });
  }
});

module.exports = router;
