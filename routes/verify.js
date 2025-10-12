const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const jiraApi = require('../utils/jiraApi');

const VERIFICATION_SCRIPTS_DIR = path.join(__dirname, '../verification-scripts');

// Get available verification scripts
router.get('/scripts', async (req, res) => {
  try {
    const files = await fs.readdir(VERIFICATION_SCRIPTS_DIR);
    const scripts = [];
    
    for (const file of files) {
      if (file.endsWith('.js')) {
        try {
          const scriptPath = path.join(VERIFICATION_SCRIPTS_DIR, file);
          const script = require(scriptPath);
          
          scripts.push({
            id: path.basename(file, '.js'),
            name: script.name || path.basename(file, '.js'),
            description: script.description || 'No description available',
            parameters: script.parameters || []
          });
        } catch (error) {
          console.error(`Error loading script ${file}:`, error);
        }
      }
    }
    
    res.json(scripts);
  } catch (error) {
    console.error('Error getting verification scripts:', error);
    res.status(500).json({ error: 'Failed to get verification scripts' });
  }
});

// Run verification on an issue
router.post('/run', async (req, res) => {
  try {
    const { issueKey, scriptId, parameters = {}, commentPrefix = '[Verification]' } = req.body;
    
    if (!issueKey || !scriptId) {
      return res.status(400).json({ error: 'Issue key and script ID are required' });
    }
    
    // Check if issue exists
    try {
      await jiraApi.getIssue(issueKey);
    } catch (error) {
      return res.status(404).json({ error: 'Issue not found: ' + error.message });
    }
    
    // Load and run the verification script
    const scriptPath = path.join(VERIFICATION_SCRIPTS_DIR, `${scriptId}.js`);
    
    try {
      await fs.access(scriptPath);
    } catch (error) {
      return res.status(404).json({ error: 'Verification script not found' });
    }
    
    let verificationResult;
    try {
      // Load the script
      delete require.cache[require.resolve(scriptPath)]; // Clear cache
      const script = require(scriptPath);
      
      // Run the verification
      if (typeof script.verify === 'function') {
        verificationResult = await script.verify(issueKey, parameters);
      } else {
        throw new Error('Script does not export a verify function');
      }
    } catch (error) {
      console.error('Error running verification script:', error);
      verificationResult = `Script error: ${error.message}`;
    }
    
    // Process the result
    const isSuccess = verificationResult === 'ok' || verificationResult === 'OK';
    
    if (isSuccess) {
      // Try to close the issue
      try {
        const closeTransition = await jiraApi.findCloseTransition(issueKey);
        
        if (closeTransition) {
          await jiraApi.transitionIssue(
            issueKey,
            closeTransition.id,
            `${commentPrefix} Verification passed. Issue auto-closed.`
          );
          
          res.json({
            success: true,
            action: 'closed',
            message: 'Verification passed. Issue has been closed.',
            verificationResult,
            transition: closeTransition.name
          });
        } else {
          // Can't close, just add a comment
          await jiraApi.addComment(issueKey, `${commentPrefix} Verification passed, but no close transition available.`);
          
          res.json({
            success: true,
            action: 'commented',
            message: 'Verification passed, but issue could not be auto-closed. Comment added.',
            verificationResult
          });
        }
      } catch (error) {
        console.error('Error closing issue:', error);
        res.json({
          success: true,
          action: 'verified',
          message: 'Verification passed, but failed to update issue: ' + error.message,
          verificationResult
        });
      }
    } else {
      // Verification failed, add or update comment
      try {
        const comments = await jiraApi.getComments(issueKey);
        const existingComment = comments.comments.find(comment => 
          comment.body.startsWith(commentPrefix)
        );
        
        const commentText = `${commentPrefix} ${verificationResult}`;
        
        if (existingComment) {
          // Update existing comment
          await jiraApi.updateComment(issueKey, existingComment.id, commentText);
        } else {
          // Add new comment
          await jiraApi.addComment(issueKey, commentText);
        }
        
        res.json({
          success: true,
          action: 'commented',
          message: 'Verification failed. Comment added to issue.',
          verificationResult
        });
      } catch (error) {
        console.error('Error adding comment:', error);
        res.json({
          success: false,
          message: 'Verification failed and could not update issue: ' + error.message,
          verificationResult
        });
      }
    }
  } catch (error) {
    console.error('Error in verification:', error);
    res.status(500).json({ error: 'Failed to run verification: ' + error.message });
  }
});

// Get verification history for an issue
router.get('/history/:issueKey', async (req, res) => {
  try {
    const { issueKey } = req.params;
    const { commentPrefix = '[Verification]' } = req.query;
    
    const comments = await jiraApi.getComments(issueKey);
    const verificationComments = comments.comments
      .filter(comment => comment.body.startsWith(commentPrefix))
      .map(comment => ({
        id: comment.id,
        body: comment.body,
        author: comment.author.displayName,
        created: comment.created,
        updated: comment.updated
      }));
    
    res.json({
      issueKey,
      verificationComments,
      total: verificationComments.length
    });
  } catch (error) {
    console.error('Error getting verification history:', error);
    res.status(500).json({ error: 'Failed to get verification history: ' + error.message });
  }
});

module.exports = router;
