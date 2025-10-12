/**
 * Sample Test Verification Script
 * This is a simple example that demonstrates how verification scripts work
 */

module.exports = {
  name: 'Sample Test',
  description: 'A sample verification script that randomly passes or fails for demonstration',
  parameters: [
    {
      name: 'successRate',
      type: 'number',
      description: 'Success rate (0-100)',
      default: 70
    }
  ],
  
  async verify(issueKey, parameters = {}) {
    const successRate = parameters.successRate || 70;
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Random success/failure based on success rate
    const random = Math.random() * 100;
    
    if (random < successRate) {
      return 'ok';
    } else {
      return `Test failed: Random number ${random.toFixed(2)} is below success rate ${successRate}%`;
    }
  }
};
