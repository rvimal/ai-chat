# MCP Tools Toggle Feature

## Issue Fixed
Previously, MCP tools were automatically sent with **every AI request**, causing the AI to think it could only respond using those tools. This led to responses like "I cannot answer general knowledge questions" even for simple queries like "What is JavaScript?".

## Solution
MCP tools are now **opt-in** via a toggle switch in the chat interface.

### Changes Made

1. **ChatRequest Model** - Added `useMcpTools` flag
   - Controls whether MCP tools are included in the request
   - Default: `false` (tools not included)

2. **Chat Service** - Conditional tool inclusion
   - Only fetches and sends MCP tools when `useMcpTools` is `true`
   - Reduces API payload and allows general conversations

3. **Chat Component** - MCP Tools Toggle
   - Added a toggle switch in the model selector bar
   - Label: "🔧 MCP Tools"
   - Preference saved in localStorage

## Usage

### For General Questions (Default)
- **MCP Tools Toggle**: OFF (unchecked)
- Ask anything: "What is JavaScript?", "Explain machine learning", etc.
- AI responds normally without tool constraints

### For Tasks Requiring Tools
- **MCP Tools Toggle**: ON (checked)
- Ask tool-related questions: "Check the weather in Tokyo", "Search my notes", etc.
- AI can use connected MCP tools when needed

## UI Location

The MCP Tools toggle is located in the top bar of the chat interface:

```
[Provider ▼] [Model ▼] [🔧 MCP Tools ☑] Model description
```

## Example Scenarios

### Scenario 1: General Knowledge (Tools OFF)
```
User: What is JavaScript?
AI: JavaScript is a high-level, interpreted programming language...
```

### Scenario 2: Using Tools (Tools ON)
```
User: Check the weather in Tokyo
AI: 🔧 Tool Request: get_weather
[User approves]
AI: The current weather in Tokyo is...
```

### Scenario 3: Mixed Usage
1. Turn tools OFF → Ask "Explain React hooks"
2. Get detailed explanation
3. Turn tools ON → Ask "Show me my React notes"
4. AI uses note-taking MCP tool

## Technical Details

### Request Flow

**Without MCP Tools:**
```json
{
  "model": "llama3.2:1b",
  "messages": [{
    "role": "user",
    "content": "What is JavaScript?"
  }],
  "stream": true
}
```

**With MCP Tools:**
```json
{
  "model": "llama3.2:1b",
  "messages": [{
    "role": "user",
    "content": "Check the weather"
  }],
  "stream": true,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Fetch current weather",
        "parameters": {...}
      }
    }
  ]
}
```

### localStorage Key
- Key: `use_mcp_tools`
- Value: `"true"` or `"false"`
- Persists across sessions

## Benefits

1. **Better AI Responses** - No tool constraints for general questions
2. **Faster Responses** - Smaller payload when tools not needed
3. **User Control** - Explicit control over when tools are used
4. **Reduced Confusion** - AI doesn't think it's limited to tool-only responses

## Recommendations

- **Default (OFF)**: Good for most conversations
- **Turn ON**: When you need the AI to access external data or perform actions
- **Connected MCP Servers**: Tools only work if MCP servers are connected in Settings

## Troubleshooting

### AI still won't answer general questions
- Verify MCP Tools toggle is OFF
- Refresh the page
- Check browser console for errors

### Tools not working when toggle is ON
- Ensure MCP servers are connected (Settings → MCP Servers)
- Verify servers show "Connected" status
- Check that tools are listed under server details

### Toggle state not persisting
- Check browser's localStorage permissions
- Try clearing site data and reconfiguring
