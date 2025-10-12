/**
 * Build Check Verification Script
 * Simulates checking if a build passes for the given issue
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;

module.exports = {
  name: 'Build Check',
  description: 'Verifies that the build passes for the branch associated with this issue',
  parameters: [
    {
      name: 'branch',
      type: 'string',
      description: 'Git branch name to check (defaults to issue key)',
      required: false
    },
    {
      name: 'buildCommand',
      type: 'string',
      description: 'Build command to run',
      default: 'npm test'
    }
  ],
  
  async verify(issueKey, parameters = {}) {
    const branch = parameters.branch || issueKey.toLowerCase();
    const buildCommand = parameters.buildCommand || 'npm test';
    
    try {
      // Simulate checking if branch exists
      console.log(`Checking branch: ${branch}`);
      
      // In a real implementation, you might:
      // 1. Check if the branch exists in git
      // 2. Checkout the branch
      // 3. Run the build/test command
      // 4. Return the result
      
      // For this example, we'll simulate a build process
      const result = await runCommand(buildCommand);
      
      if (result.exitCode === 0) {
        return 'ok';
      } else {
        return `Build failed with exit code ${result.exitCode}:\n${result.stderr}`;
      }
    } catch (error) {
      return `Build verification error: ${error.message}`;
    }
  }
};

function runCommand(command) {
  return new Promise((resolve) => {
    // For demo purposes, simulate a command that sometimes passes/fails
    const random = Math.random();
    
    setTimeout(() => {
      if (random > 0.3) {
        resolve({
          exitCode: 0,
          stdout: 'All tests passed',
          stderr: ''
        });
      } else {
        resolve({
          exitCode: 1,
          stdout: '',
          stderr: 'Test suite failed: 2 tests failed'
        });
      }
    }, 2000); // Simulate 2 second build time
  });
}
