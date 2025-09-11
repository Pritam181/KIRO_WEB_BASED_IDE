# Kiro Web IDE - Development Guide

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+

### Starting the Development Servers

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start both servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on http://localhost:5001
   - Frontend server on http://localhost:3000

### Fixing Network Errors

If you see network errors in the browser console, it's usually because:

1. **Backend server is not running** - Make sure both servers are started with `npm run dev`

2. **Port mismatch** - The frontend expects the backend on port 5001. Check that:
   - Backend is running on port 5001 (check console output)
   - Frontend API calls are pointing to http://localhost:5001

3. **CORS issues** - The backend is configured to allow requests from http://localhost:3000

### Manual Server Start

If you prefer to start servers manually:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### Environment Configuration

The project uses a `.env` file for configuration. Key settings:

```env
NODE_ENV=development
PORT=5001
FRONTEND_URL=http://localhost:3000
SESSION_SECRET=dev_session_secret_key
JWT_SECRET=dev_jwt_secret_key
CLOUD_STORAGE_PROVIDER=local
```

### Troubleshooting

**Network Error in Browser:**
- Check browser console for exact error
- Verify backend server is running (should show "🚀 Kiro Web API server running on port 5001")
- Check if http://localhost:5001/health returns a response

**File Operations Not Working:**
- Backend creates a `./data/projects` directory for file storage
- Make sure the backend has write permissions in the project directory

**Terminal Not Showing:**
- The terminal should appear at the bottom when you click the "Terminal" button
- If not visible, try refreshing the page

### Features

✅ **Working Features:**
- File explorer with create/delete/rename
- Code editor with syntax highlighting  
- Terminal with command execution
- Run button that executes files in terminal
- Project management
- Cloud storage integration (local mode)

🔧 **Development Features:**
- Hot reload for both frontend and backend
- TypeScript support
- ESLint and Prettier
- Automated testing setup

### API Endpoints

- `GET /health` - Health check
- `GET /api/status` - API status
- `GET /api/files/:projectId/tree` - Get file tree
- `POST /api/files/:projectId` - Create file/folder
- `PUT /api/files/:projectId/*` - Update file
- `DELETE /api/files/:projectId/*` - Delete file

### File Execution

The Run button (F5) automatically:
1. Shows the terminal if hidden
2. Determines the appropriate command based on file extension:
   - `.js` → `node filename.js`
   - `.py` → `python filename.py` 
   - `.java` → `java filename.java`
   - `package.json` → `npm start`
3. Executes the command in the terminal
4. Shows realistic output simulation

This mimics the behavior of the real Kiro IDE!