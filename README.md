# Kiro Web IDE

A modern, lightweight web-based IDE with AI assistance, built with React and Node.js.

## Features

- 🌐 **Web-based IDE** - Access Kiro from any browser
- 🤖 **AI Assistant** - Integrated Kiro AI for coding help
- 📁 **File Management** - Full project and file organization
- 🎨 **Modern UI** - Clean, responsive design with dark/light mode
- 🔗 **GitHub Integration** - One-click push to GitHub
- 👥 **Real-time Collaboration** - Work together on projects
- ⚡ **Fast Performance** - Optimized for speed and efficiency

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+
- Docker (optional)

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

   This starts both frontend (http://localhost:3000) and backend (http://localhost:5000)

### Docker Setup

```bash
# Build and start all services
npm run docker:up

# Stop services
npm run docker:down
```

## Project Structure

```
kiro-web/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── store/
│   │   └── utils/
│   └── package.json
├── backend/           # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── types/
│   └── package.json
└── docker-compose.yml
```

## Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both frontend and backend for production
- `npm run test` - Run tests for both frontend and backend
- `npm run lint` - Lint code in both projects
- `npm run format` - Format code with Prettier

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- Monaco Editor for code editing
- Zustand for state management
- React Query for server state
- Socket.io for real-time features

### Backend
- Node.js with Express and TypeScript
- Socket.io for WebSocket connections
- Passport.js for GitHub OAuth
- Redis for session storage
- Multer for file uploads

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details