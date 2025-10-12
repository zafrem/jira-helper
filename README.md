# Jira Helper Web Service

A Node.js-based web application designed to assist users in managing Jira issues more efficiently. This system serves as a local helper tool that interacts with an existing Jira Server instance via Jira's REST API, providing a user-friendly web interface for common issue management tasks.

## Features

### 🔍 Ticket Search & Edit
- Search for Jira tickets using JQL (Jira Query Language)
- Quick add comments to issues from search results
- Edit issue descriptions and summaries directly
- View issue details with status, priority, and assignee information

### ➕ Ticket Creation (with Templates)
- Create new Jira issues individually with a user-friendly form
- Use predefined templates for consistent issue creation
- Bulk creation via CSV file upload
- Support for all standard Jira fields (project, issue type, summary, description, labels, due dates, assignees)

### ✅ Ticket Verification Automation
- Run custom verification scripts on issues
- Automatically close issues that pass verification
- Add detailed failure comments for issues that don't pass
- Consistent comment threading for repeated verification runs

### ⚙️ System Configuration
- Configure connection to Jira server (URL, credentials)
- Retrieve and cache Jira metadata (projects, issue types, custom fields)
- Manage issue templates
- Test connection functionality

## Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **Jira Server**: Compatible with REST API v2 (Jira Server 7.x - 9.x)
- **Jira Account**: Valid account with permissions to search, create, comment, and transition issues
- **API Token**: Personal Access Token or API Token for authentication

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd jira-helper
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`

## Configuration

### Initial Setup

1. **Navigate to Settings**: Click on the "Settings" tab in the web interface
2. **Configure Jira Connection**:
   - **Jira URL**: Enter your Jira server URL (e.g., `https://jira.yourcompany.com`)
   - **Username**: Your Jira username
   - **API Token**: Generate and enter your Jira API token
3. **Test Connection**: Click "Test Connection" to verify your settings
4. **Refresh Metadata**: Click "Refresh" to load projects, issue types, and custom fields

### Environment Variables

Optional environment variables for enhanced security:

```bash
# Custom encryption key for storing API tokens
ENCRYPTION_KEY=your-custom-encryption-key

# Custom port (default: 3000)
PORT=3000

# Environment mode
NODE_ENV=production
```

## Usage

### Searching and Editing Issues

1. Navigate to the **Search & Edit** tab
2. Enter a JQL query (e.g., `project = PROJ AND status = "To Do"`)
3. Click **Search** to view results
4. Use action buttons to:
   - Add comments to issues
   - Edit issue descriptions
   - Quick verify issues

### Creating Issues

#### Single Issue Creation
1. Go to **Create Issues** → **Single Issue** tab
2. Fill in the required fields (Project, Issue Type, Summary)
3. Add optional details (Description, Assignee, Labels, Due Date)
4. Click **Create Issue**

#### Template-Based Creation
1. Go to **Create Issues** → **From Template** tab
2. Select a predefined template
3. Modify any fields as needed
4. Click **Create Issue**

#### Bulk Creation via CSV
1. Go to **Create Issues** → **Bulk Upload** tab
2. Download the CSV template or prepare your own CSV file
3. Select the CSV file and optionally choose a template
4. Click **Upload & Create Issues**

**CSV Format Example:**
```csv
summary,description,issueType,project,assignee,labels,dueDate,priority
"Fix login bug","Users cannot log in on mobile",Bug,PROJ,john.doe,"bug,mobile",2024-01-15,High
"Add dark mode","Implement dark theme",Story,PROJ,jane.smith,"feature,ui",2024-02-01,Medium
```

### Issue Verification

1. Navigate to the **Verify Issues** tab
2. Enter the issue key (e.g., `PROJ-123`)
3. Select a verification script
4. Configure any required parameters
5. Click **Run Verification**

The system will:
- Execute the verification script
- Close the issue if verification passes (returns "ok")
- Add/update a comment with failure details if verification fails

## Verification Scripts

Custom verification scripts can be added to the `verification-scripts/` directory. Each script should export:

```javascript
module.exports = {
  name: 'Script Name',
  description: 'What this script does',
  parameters: [
    {
      name: 'paramName',
      type: 'string',
      description: 'Parameter description',
      required: true
    }
  ],
  
  async verify(issueKey, parameters) {
    // Your verification logic here
    // Return 'ok' for success, or error message for failure
    return 'ok'; // or return 'Error: Something went wrong';
  }
};
```

### Included Sample Scripts

- **Sample Test**: Demonstrates basic verification with configurable success rate
- **Build Check**: Simulates checking if a build passes for an issue's branch
- **Deployment Check**: Verifies deployment health via HTTP endpoint checks

## Templates

Issue templates help standardize issue creation. Default templates include:

- **Bug Report**: Structured template for reporting bugs
- **Feature Request**: Template for requesting new features
- **General Task**: Basic task template

Templates can be managed through the Settings → Templates tab.

## API Endpoints

The application provides REST API endpoints for integration:

### Settings
- `GET /api/settings` - Get current settings
- `POST /api/settings` - Save settings
- `POST /api/settings/test` - Test Jira connection
- `GET /api/settings/metadata` - Get cached metadata
- `POST /api/settings/metadata/refresh` - Refresh metadata from Jira

### Search & Edit
- `POST /api/search` - Search issues with JQL
- `GET /api/search/issue/:key` - Get issue details
- `POST /api/search/issue/:key/comment` - Add comment
- `PUT /api/search/issue/:key/description` - Update description

### Create Issues
- `POST /api/create/single` - Create single issue
- `POST /api/create/from-template` - Create from template
- `POST /api/create/bulk` - Bulk create from CSV
- `GET /api/create/csv-template` - Download CSV template

### Verification
- `GET /api/verify/scripts` - List available scripts
- `POST /api/verify/run` - Run verification on issue
- `GET /api/verify/history/:key` - Get verification history

## Security

- API tokens are encrypted before storage using AES encryption
- Rate limiting applied to API endpoints (100 requests per 15 minutes)
- CORS protection and security headers via Helmet.js
- Input validation and sanitization
- No direct database access to Jira (uses official REST API only)

## File Structure

```
jira-helper/
├── config/                 # Configuration files (auto-generated)
├── public/                 # Static web files
│   ├── css/               # Stylesheets
│   ├── js/                # Frontend JavaScript
│   └── index.html         # Main HTML file
├── routes/                # Express route handlers
│   ├── settings.js        # Settings management
│   ├── search.js          # Search and edit functionality
│   ├── create.js          # Issue creation
│   └── verify.js          # Verification system
├── utils/                 # Utility modules
│   ├── jiraApi.js         # Jira REST API client
│   ├── config.js          # Configuration management
│   └── csvUtils.js        # CSV processing utilities
├── verification-scripts/   # Custom verification scripts
├── server.js              # Main server file
└── package.json           # Dependencies and scripts
```

## Troubleshooting

### Common Issues

**Connection Failed**
- Verify Jira URL is correct and accessible
- Check username and API token
- Ensure API token has necessary permissions
- Verify network connectivity to Jira server

**Metadata Not Loading**
- Check Jira account permissions
- Verify access to projects and issue types
- Try refreshing metadata from Settings

**Issue Creation Fails**
- Verify required fields for the project
- Check project permissions
- Ensure issue type is valid for the project

**Verification Scripts Not Working**
- Check script syntax and exports
- Verify script permissions
- Review server logs for error details

### Logs

Application logs are available in the console when running the server. For production deployments, consider using a process manager like PM2 for better log management.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review server logs for error details
3. Verify Jira permissions and connectivity
4. Create an issue in the repository with detailed information

---

**Note**: This tool is designed for internal use and should be deployed on secure networks. Always follow your organization's security policies when handling Jira credentials and data.
