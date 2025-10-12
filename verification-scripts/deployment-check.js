/**
 * Deployment Check Verification Script
 * Verifies that a deployment is successful and healthy
 */

const axios = require('axios');

module.exports = {
  name: 'Deployment Check',
  description: 'Verifies that a deployment is successful by checking health endpoints',
  parameters: [
    {
      name: 'healthUrl',
      type: 'string',
      description: 'Health check URL to verify',
      required: true
    },
    {
      name: 'expectedStatus',
      type: 'number',
      description: 'Expected HTTP status code',
      default: 200
    },
    {
      name: 'timeout',
      type: 'number',
      description: 'Request timeout in milliseconds',
      default: 5000
    }
  ],
  
  async verify(issueKey, parameters = {}) {
    const { healthUrl, expectedStatus = 200, timeout = 5000 } = parameters;
    
    if (!healthUrl) {
      return 'Health URL parameter is required';
    }
    
    try {
      console.log(`Checking deployment health at: ${healthUrl}`);
      
      const response = await axios.get(healthUrl, {
        timeout: timeout,
        validateStatus: () => true // Don't throw on non-2xx status codes
      });
      
      if (response.status === expectedStatus) {
        return 'ok';
      } else {
        return `Deployment check failed: Expected status ${expectedStatus}, got ${response.status}`;
      }
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        return `Deployment check failed: Request timeout after ${timeout}ms`;
      } else if (error.code === 'ECONNREFUSED') {
        return 'Deployment check failed: Connection refused - service may not be running';
      } else {
        return `Deployment check failed: ${error.message}`;
      }
    }
  }
};
