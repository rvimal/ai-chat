# AI Chat Application

A ChatGPT-like web application built with Angular 19, featuring LLM integration and Model Context Protocol (MCP) support.

## Features

- 💬 **ChatGPT-like Interface**: Clean, modern chat interface similar to ChatGPT
- 🔐 **User Authentication**: JWT-based authentication with session management
- 🌓 **Light & Dark Theme**: Toggle between light and dark modes
- 💾 **Session Persistence**: Conversations saved in localStorage
- 🔌 **MCP Integration**: Support for Model Context Protocol servers (@modelcontextprotocol/sdk v1.25.1)
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Real-time Chat**: Mock streaming responses (ready for real LLM API)

## Tech Stack

- **Framework**: Angular 19
- **Styling**: Bootstrap 5 with custom SCSS
- **State Management**: RxJS + Angular Services
- **HTTP**: Angular HttpClient with interceptors
- **Authentication**: JWT-based
- **MCP SDK**: @modelcontextprotocol/sdk v1.25.1

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Angular CLI 19

### Installation

```bash
# Navigate to project directory
cd ai-chat-app

# Install dependencies (already done)
npm install

# Start development server
npm start
```

The application will be available at `http://localhost:4200`

### Build for Production

```bash
npm run build
```

## Configuration

### LLM API Integration

1. Go to Settings (gear icon in sidebar)
2. Configure your LLM API endpoint and key
3. Update `ChatService` to use real API (currently using mock responses)

### MCP Server Setup

1. Navigate to Settings
2. Add your MCP server details
3. Connect to the server

## Usage

### Demo Login

Click "Demo Login" on the login page to access the application.

### Starting a Conversation

1. Click "New Chat" in the sidebar
2. Type your message and press Enter

### Managing Conversations

- Click conversations in sidebar to view
- Use three-dot menu to rename or delete
- Conversations auto-save to localStorage

## License

MIT
