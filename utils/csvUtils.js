const csv = require('csv-parser');
const { stringify } = require('csv-stringify');
const { Readable } = require('stream');

// Parse CSV data from buffer
function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString());
    
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// Convert array of objects to CSV string
function arrayToCSV(data) {
  return new Promise((resolve, reject) => {
    stringify(data, {
      header: true,
      columns: Object.keys(data[0] || {})
    }, (err, output) => {
      if (err) {
        reject(err);
      } else {
        resolve(output);
      }
    });
  });
}

// Validate CSV headers for issue creation
function validateIssueCSVHeaders(headers) {
  const requiredHeaders = ['summary'];
  const optionalHeaders = [
    'description', 'issueType', 'project', 'assignee', 
    'labels', 'dueDate', 'priority', 'components'
  ];
  const validHeaders = [...requiredHeaders, ...optionalHeaders];
  
  const errors = [];
  
  // Check for required headers
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      errors.push(`Missing required header: ${required}`);
    }
  }
  
  // Check for invalid headers
  for (const header of headers) {
    if (!validHeaders.includes(header)) {
      errors.push(`Invalid header: ${header}. Valid headers are: ${validHeaders.join(', ')}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Process CSV data for issue creation
function processIssueCSVData(csvData, template = null) {
  const processedData = [];
  const errors = [];
  
  csvData.forEach((row, index) => {
    const rowNumber = index + 1;
    const processedRow = {
      rowNumber,
      data: {},
      errors: []
    };
    
    // Apply template defaults if provided
    if (template) {
      processedRow.data = {
        issueType: template.issueType || 'Task',
        project: template.project || '',
        description: template.description || '',
        labels: template.labels || [],
        priority: template.priority || 'Medium',
        assignee: template.assignee || ''
      };
    }
    
    // Process each field from CSV
    Object.keys(row).forEach(key => {
      const value = row[key]?.trim();
      if (!value) return;
      
      switch (key.toLowerCase()) {
        case 'summary':
          processedRow.data.summary = value;
          break;
        case 'description':
          processedRow.data.description = value;
          break;
        case 'issuetype':
        case 'issue_type':
          processedRow.data.issueType = value;
          break;
        case 'project':
          processedRow.data.project = value;
          break;
        case 'assignee':
          processedRow.data.assignee = value;
          break;
        case 'labels':
          // Split labels by comma and trim
          processedRow.data.labels = value.split(',').map(label => label.trim()).filter(label => label);
          break;
        case 'duedate':
        case 'due_date':
          // Validate date format (YYYY-MM-DD)
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            processedRow.data.dueDate = value;
          } else {
            processedRow.errors.push(`Invalid date format for dueDate: ${value}. Expected YYYY-MM-DD`);
          }
          break;
        case 'priority':
          processedRow.data.priority = value;
          break;
        case 'components':
          // Split components by comma and trim
          processedRow.data.components = value.split(',').map(comp => comp.trim()).filter(comp => comp);
          break;
        default:
          // Handle custom fields (prefix with customfield_)
          if (key.startsWith('customfield_')) {
            processedRow.data[key] = value;
          }
          break;
      }
    });
    
    // Validate required fields
    if (!processedRow.data.summary) {
      processedRow.errors.push('Summary is required');
    }
    
    processedData.push(processedRow);
    
    if (processedRow.errors.length > 0) {
      errors.push({
        row: rowNumber,
        errors: processedRow.errors
      });
    }
  });
  
  return {
    data: processedData,
    errors,
    valid: errors.length === 0
  };
}

// Generate sample CSV template
function generateSampleCSV() {
  const sampleData = [
    {
      summary: 'Fix login bug on mobile devices',
      description: 'Users cannot log in on mobile browsers',
      issueType: 'Bug',
      project: 'PROJ',
      assignee: 'john.doe',
      labels: 'bug,mobile,login',
      dueDate: '2024-01-15',
      priority: 'High'
    },
    {
      summary: 'Add dark mode theme',
      description: 'Implement dark mode for better user experience',
      issueType: 'Story',
      project: 'PROJ',
      assignee: 'jane.smith',
      labels: 'feature,ui,theme',
      dueDate: '2024-02-01',
      priority: 'Medium'
    }
  ];
  
  return arrayToCSV(sampleData);
}

module.exports = {
  parseCSV,
  arrayToCSV,
  validateIssueCSVHeaders,
  processIssueCSVData,
  generateSampleCSV
};
