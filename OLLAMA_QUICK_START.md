# Quick Start Guide - Ollama Integration

## Prerequisites

1. **Node.js and npm** installed
2. **Ollama** installed and running
3. **Angular CLI** installed globally

## Installation Steps

### 1. Install Ollama

**Windows**:
- Download from [https://ollama.com](https://ollama.com)
- Run the installer

**macOS**:
```bash
brew install ollama
```

**Linux**:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Pull AI Models

```bash
# Recommended for quick start (lightweight)
ollama pull llama3.2:1b

# For better quality (requires more resources)
ollama pull llama3.2:3b
ollama pull mistral:7b
ollama pull codellama:7b
```

### 3. Start Ollama Server

```bash
ollama serve
```

The Ollama API will be available at `http://localhost:11434`

### 4. Install Application Dependencies

```bash
cd ai-chat-app
npm install
```

### 5. Start the Application

```bash
npm start
```

Or for development:
```bash
ng serve
```

The application will open at `http://localhost:4200`

## First Time Usage

### Configure AI Model

1. **Open Settings**:
   - Click the settings icon in the sidebar
   - Go to "AI Model Configuration" section

2. **Select Ollama**:
   - Provider: Select "Ollama"
   - Model: Choose your preferred model (e.g., "Llama 3.2 1B")

3. **Start Chatting**:
   - Go back to the chat
   - You should see "Ollama - Llama 3.2 1B" in the model selector
   - Type a message and start chatting!

### Configure MCP Servers (Optional)

MCP (Model Context Protocol) allows the AI to use tools and access external resources.

1. **Add an MCP Server**:
   - In Settings, find "MCP Servers" section
   - Click "Add Server"
   - Enter server details:
     - Name: e.g., "File System"
     - Description: e.g., "Access to local files"
     - URL: e.g., "http://localhost:3000"

2. **Connect to Server**:
   - Click the "Connect" button next to the server
   - Wait for "Connected" status

3. **View Available Tools**:
   - Click "View Available Tools"
   - See what the MCP server can do

4. **Use in Chat**:
   - Ask the AI to perform tasks using the tools
   - Example: "Can you check the weather in Tokyo?" (if you have a weather MCP server)
   - Approve tool execution when prompted

## Switching Between Providers

### Use Ollama (Local, Free)
1. Model selector → Select "Ollama"
2. Choose your model
3. Start chatting

### Use Google Gemini (Cloud, Requires API Key)
1. Model selector → Select "Google Gemini"
2. Go to Settings → Enter your Gemini API key
3. Start chatting

## Testing the Integration

### Test 1: Basic Chat
```
You: Hello! Who are you?
AI: [Response from Ollama model]
```

### Test 2: Streaming
Watch as the response appears word-by-word in real-time.

### Test 3: Code Generation
```
You: Write a Python function to calculate fibonacci numbers
AI: [Ollama generates code with syntax highlighting]
```

### Test 4: MCP Tool Usage (if configured)
```
You: What's the weather in Tokyo?
AI: [Requests to use weather tool]
[Approve the tool]
AI: [Provides weather information]
```

## Troubleshooting

### Issue: "Cannot connect to Ollama"
**Solution**:
```bash
# Check if Ollama is running
ollama list

# If not, start it
ollama serve
```

### Issue: "Model not found"
**Solution**:
```bash
# Pull the model you want to use
ollama pull llama3.2:1b

# List installed models
ollama list
```

### Issue: Slow responses
**Solutions**:
- Use a smaller model (e.g., llama3.2:1b instead of llama3.1:8b)
- Ensure no other heavy applications are running
- Check your system resources (RAM, CPU)

### Issue: Streaming not working
**Solution**:
- Check browser console for errors (F12)
- Verify Ollama is running at localhost:11434
- Try refreshing the page

## Tips for Best Experience

1. **Model Selection**:
   - `llama3.2:1b`: Fast, good for basic tasks
   - `llama3.2:3b`: Balanced speed and quality
   - `mistral:7b`: High quality, slower
   - `codellama:7b`: Best for coding tasks

2. **Performance**:
   - First response may be slower (model loading)
   - Subsequent responses are faster
   - Keep Ollama running in the background

3. **MCP Integration**:
   - Start with simple MCP servers
   - Test tools individually before complex workflows
   - Always review tool requests before approving

4. **Development**:
   - Check console logs for debugging
   - Use Chrome DevTools Network tab to see API calls
   - Enable "Preserve log" in console for better debugging

## Next Steps

1. **Explore Models**: Try different Ollama models to find what works best for you
2. **Setup MCP**: Configure MCP servers to extend AI capabilities
3. **Customize**: Modify the model list in `environment.ts` to add your preferred models
4. **Contribute**: Add support for more AI providers or MCP servers

## Resources

- [Ollama Documentation](https://ollama.com/docs)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Angular Documentation](https://angular.dev)
- [Project README](./README.md)
- [Implementation Details](./OLLAMA_IMPLEMENTATION.md)

## Support

For issues or questions:
1. Check the console for error messages
2. Review the OLLAMA_IMPLEMENTATION.md for technical details
3. Verify all prerequisites are met
4. Check Ollama and application logs

## Quick Command Reference

```bash
# Ollama Commands
ollama serve                    # Start Ollama server
ollama list                     # List installed models
ollama pull <model>            # Download a model
ollama run <model>             # Test a model in terminal
ollama rm <model>              # Remove a model

# Application Commands
npm install                     # Install dependencies
npm start                       # Start development server
ng build                        # Build for production
ng serve --open                # Start and open browser
```

Enjoy chatting with Ollama! 🚀
