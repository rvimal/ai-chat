# Quick Start Guide - AI Chat Application

## 🚀 Getting Started in 30 Seconds

### 1. Start the Application
The server is already running at: **http://localhost:4200/**

### 2. Login
- Click **"Demo Login"** button on the login page
- Or enter any email/password and click "Sign In"

### 3. Start Chatting
1. Click **"New Chat"** button in the sidebar
2. Type your message in the input box
3. Press **Enter** or click the **Send** button

## 💡 Key Features to Try

### 💬 Chat Features
- **Send Messages:** Type and press Enter
- **View Responses:** Mock AI responses appear after ~1 second
- **Scroll:** Auto-scrolls to latest message

### 📚 Conversation Management
- **Create:** Click "New Chat" button
- **Switch:** Click any conversation in sidebar
- **Rename:** Click three-dot menu → "Rename"
- **Delete:** Click three-dot menu → "Delete"

### 🎨 Theme Switching
- Click the **sun/moon icon** in the sidebar header
- Theme preference is automatically saved

### ⚙️ Settings (Coming Soon)
- Click the **gear icon** in the sidebar footer
- Configure MCP servers
- Set API endpoints

## 📱 Interface Overview

```
┌─────────────────────────────────────────────┐
│  Sidebar          │  Main Chat Area         │
│                   │                          │
│  [AI Chat]  [🌙]  │  ┌──────────────────┐   │
│  [New Chat]       │  │ Messages         │   │
│                   │  │                  │   │
│  Conversations:   │  │ User: Hello!     │   │
│  • New Chat       │  │ AI: Hi there!    │   │
│  • Previous       │  │                  │   │
│                   │  └──────────────────┘   │
│                   │                          │
│  [⚙️ Settings]    │  [Type message...] [▶]  │
└─────────────────────────────────────────────┘
```

## 🔧 Current Status

### ✅ Working Features
- Full chat interface
- Message sending/receiving (mock responses)
- Conversation persistence (localStorage)
- Light/Dark theme toggle
- Responsive design
- Authentication (mock)

### 🚧 Ready for Integration
- Real LLM API connection
- Backend authentication
- MCP server connections
- Database storage

## 📖 What's Happening Behind the Scenes

### Mock Responses
The app currently uses **mock LLM responses** for demonstration:
- Responses appear after 1 second
- Multiple response variations
- Simulates real chat behavior

### Data Storage
- **Conversations:** Saved to browser localStorage
- **Theme:** Saved to browser localStorage
- **Auth:** Temporary (session-based)

### To Connect Real LLM
Update `src/app/services/chat/chat.service.ts`:
```typescript
sendMessage(request: ChatRequest): Observable<ChatResponse> {
  return this.http.post<ChatResponse>(this.API_URL, request);
}
```

## 🎯 Try These Actions

1. **Create Multiple Chats:**
   - Click "New Chat" 3 times
   - Send different messages in each
   - Switch between them

2. **Test Theme:**
   - Toggle light/dark mode
   - Refresh page (theme persists!)

3. **Manage Conversations:**
   - Rename a conversation
   - Delete old conversations
   - See conversation message count

4. **Responsive Testing:**
   - Resize browser window
   - Try on mobile device (if available)

## 💻 Development Commands

```bash
# Start dev server (already running)
npm start

# Build for production
npm run build

# Run tests (when needed)
npm test

# Format code
npm run format
```

## 🐛 Troubleshooting

**Can't see the app?**
- Check that server is running at http://localhost:4200/
- Check terminal for any errors

**Login not working?**
- Just click "Demo Login" - no real credentials needed

**Messages not appearing?**
- Check browser console for errors (F12)
- Refresh the page

**Theme not switching?**
- Clear browser cache
- Check localStorage is enabled

## 🎉 You're All Set!

The application is fully functional with mock data. Start chatting to see it in action!

**Next:** Configure real LLM API endpoints in Settings when ready.
