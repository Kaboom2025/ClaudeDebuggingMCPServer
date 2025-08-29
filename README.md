# Python Debug MCP Server

A Model Context Protocol (MCP) server that enables AI-driven Python debugging through integration with `debugpy`. This server allows Claude Code to start debugging sessions, set breakpoints, step through code, inspect variables, and evaluate expressions in Python applications.

## Features

### Core Debugging Capabilities
- ✅ **Session Management** - Start and stop Python debugging sessions
- ✅ **Breakpoint Control** - Set, remove, and list breakpoints
- ✅ **Execution Control** - Continue, step over, step in, step out
- ✅ **Variable Inspection** - View local, global, and all variables in current scope
- ✅ **Call Stack Analysis** - Examine the current call stack
- ✅ **Expression Evaluation** - Evaluate Python expressions in debug context
- ✅ **Real-time Logging** - Rich terminal output with debug events and program output

### User Experience
- 🖥️ **Hybrid Interface** - Activity visible in both terminal and Claude Code
- 🔄 **Live Updates** - Real-time debug state synchronization
- 🎨 **Rich Logging** - Colorful terminal output with emojis and status indicators
- 🤝 **Collaborative** - Both user and Claude can control debugging

## Prerequisites

### Required Software
- **Node.js 18+** - For running the MCP server
- **Python 3.8+** - For running Python scripts
- **debugpy** - Python debugging adapter

### Installation

#### Option 1: Install from npm (Recommended)

1. **Install the MCP server**:
   ```bash
   npm install -g python-debug-mcp-server
   ```

2. **Install Python debugpy**:
   ```bash
   pip install debugpy
   ```

3. **Verify setup**:
   ```bash
   python-debug-mcp-server --help
   ```

#### Option 2: Install from source

1. **Clone and build**:
   ```bash
   git clone <repository-url>
   cd python-debug-mcp-server
   npm install
   npm run build
   ```

2. **Install Python debugpy**:
   ```bash
   pip install debugpy
   ```

3. **Verify setup**:
   ```bash
   node build/index.js
   ```

## Linking to Claude Code

To use this MCP server with Claude Code, you have several options:

### Method 1: Using npm package (Recommended)

After installing the npm package globally, add it to Claude Code:

```bash
claude mcp add python-debug --scope user -- python-debug-mcp-server
```

This method automatically handles the configuration and makes the server available to Claude Code.

### Method 2: Using the Built Server

Add this configuration to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "python-debug": {
      "command": "node",
      "args": ["/path/to/your/debugclaudecode/build/index.js"],
      "env": {}
    }
  }
}
```

### Method 3: Using npm start

Alternatively, you can use the npm script:

```json
{
  "mcpServers": {
    "python-debug": {
      "command": "npm",
      "args": ["start"],
      "cwd": "/path/to/your/debugclaudecode",
      "env": {}
    }
  }
}
```

### Configuration Steps

1. **Open Claude Code settings** and navigate to the MCP servers configuration
2. **Add the server configuration** using one of the methods above
3. **Update the path** to match your actual installation directory
4. **Restart Claude Code** to load the new MCP server
5. **Verify connection** - you should see the python-debug server available in Claude Code

### Accessing the Configuration

The exact location of Claude Code's MCP configuration varies by platform:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Once configured, Claude Code will have access to all the Python debugging tools provided by this MCP server.

## Usage

### Starting the Server

Run the server directly:
```bash
npm start
# or
node build/index.js
# or use the binary name
python-debug-mcp-server
```

The server will output:
```
🟢 Python Debug MCP Server running on stdio
🐛 Ready to debug Python applications with debugpy
```

### Connecting to Claude Code

Add this server to your Claude Code MCP configuration to enable the debugging tools.

### Available Tools

#### Session Management

**`start_debug_session`** - Start a new Python debugging session (MCP manages the process)
- `script_path` (required) - Path to Python script to debug
- `args` (optional) - Command line arguments for the script
- `cwd` (optional) - Working directory for the script

**`attach_to_debugpy`** - Attach to existing debugpy session (user controls the process)
- `script_path` (required) - Path to Python script being debugged
- `port` (optional) - Port where debugpy is listening (default: 5678)

**`stop_debug_session`** - Stop an active debugging session
- `session_id` (required) - ID of the debug session to stop

**`list_debug_sessions`** - List all active debug sessions

#### Breakpoint Management

**`set_breakpoint`** - Set a breakpoint at specific file and line
- `session_id` (required) - ID of the debug session
- `file` (required) - Path to the file
- `line` (required) - Line number (1-based)

**`remove_breakpoint`** - Remove a specific breakpoint
- `session_id` (required) - ID of the debug session
- `file` (required) - Path to the file  
- `line` (required) - Line number (1-based)

**`list_breakpoints`** - List all active breakpoints for a session
- `session_id` (required) - ID of the debug session
- `file` (optional) - Optional file filter

#### Execution Control

**`debug_continue`** - Resume execution of the debugged program
- `session_id` (required) - ID of the debug session

**`debug_step_over`** - Execute the next line of code (step over)
- `session_id` (required) - ID of the debug session

**`debug_step_in`** - Step into function calls  
- `session_id` (required) - ID of the debug session

**`debug_step_out`** - Step out of the current function
- `session_id` (required) - ID of the debug session

#### Runtime Inspection

**`get_variables`** - Get variables in the current scope
- `session_id` (required) - ID of the debug session
- `scope` (optional) - Variable scope: 'local', 'global', or 'all' (default: 'local')

**`get_call_stack`** - Get the current call stack
- `session_id` (required) - ID of the debug session

**`evaluate_expression`** - Evaluate a Python expression in debug context
- `session_id` (required) - ID of the debug session
- `expression` (required) - Python expression to evaluate

#### System Tools

**`check_python_setup`** - Check if Python and debugpy are properly installed

## User-Controlled Debugging (Recommended)

For maximum control and stability, you can run your Python application in your own terminal and attach the MCP debugger to it.

### Quick Start

1. **Start your Python app with debugpy:**
   ```bash
   python3 -m debugpy --listen localhost:5678 your_script.py
   ```

2. **Attach the MCP debugger:**
   ```
   Tool: attach_to_debugpy
   Arguments: { "script_path": "your_script.py", "port": 5678 }
   ```

3. **Set breakpoints and debug normally**

### Detailed Steps

#### For Flask/Web Applications

1. **Start Flask with debugpy (disable Flask debug mode):**
   ```python
   # In your app.py, ensure debug=False
   if __name__ == '__main__':
       app.run(debug=False, port=5001)  # Important: debug=False
   ```

   ```bash
   python3 -m debugpy --listen localhost:5678 app.py
   ```

2. **Your app will start serving immediately** on port 5001 while debugpy listens on port 5678

3. **Attach the debugger:**
   ```
   Tool: attach_to_debugpy 
   Arguments: { "script_path": "app.py" }
   ```

4. **Set breakpoints on request handlers:**
   ```
   Tool: set_breakpoint
   Arguments: { "session_id": "...", "file": "app.py", "line": 25 }
   ```

5. **Make HTTP requests** to trigger breakpoints and inspect variables

#### Why User-Controlled?

- ✅ **Full control** - You manage when to start/stop your application
- ✅ **No conflicts** - Avoids Flask debug mode vs debugpy conflicts  
- ✅ **Stability** - More reliable connection and debugging experience
- ✅ **Real environment** - Debug in your actual runtime environment

#### Flask Debug Mode Conflict

⚠️ **Important:** Flask's debug mode (`debug=True`) conflicts with debugpy. Always use `debug=False` when debugging with this MCP server.

```python
# ❌ This won't work well with debugpy
app.run(debug=True)

# ✅ This works perfectly with debugpy  
app.run(debug=False)
```

## Example Debugging Workflow

### 1. Check System Setup
```
Tool: check_python_setup
```
Expected output:
```
🐍 Python Setup Check:

✅ Python: Available (Python 3.11.0)
✅ debugpy: Available

🎉 Your system is ready for Python debugging!
```

### 2. Start Debug Session
```
Tool: start_debug_session
Arguments: { "script_path": "example.py" }
```

Terminal output:
```
🚀 Created debug session abc123... for /path/to/example.py on port 5679
🐍 Starting Python process: /path/to/example.py
📡 Python process started with PID 12345, waiting for DAP connection on port 5679
🔗 Connected to debugpy on port 5679
✅ DAP client connected successfully
```

### 3. Set Breakpoints
```
Tool: set_breakpoint
Arguments: { "session_id": "abc123...", "file": "example.py", "line": 45 }
```

Terminal output:
```
📍 Updated breakpoints for example.py: 1 breakpoints
```

### 4. Let Execution Continue
The Python program will run until it hits the breakpoint:

Terminal output:
```
⏸️ Session abc123... stopped: breakpoint
📍 Current frame: main at /path/to/example.py:45
```

### 5. Inspect Variables
```
Tool: get_variables  
Arguments: { "session_id": "abc123...", "scope": "local" }
```

### 6. Step Through Code
```
Tool: debug_step_over
Arguments: { "session_id": "abc123..." }
```

### 7. Evaluate Expressions
```
Tool: evaluate_expression
Arguments: { "session_id": "abc123...", "expression": "len(numbers)" }
```

## Example Output

The server provides rich, real-time logging in the terminal:

```
🟢 Python Debug MCP Server running on stdio
🐛 Ready to debug Python applications with debugpy

🚀 Created debug session a1b2c3d4 for /path/to/example.py on port 5679
🐍 Starting Python process: /path/to/example.py
🔗 Connected to debugpy on port 5679
📍 Updated breakpoints for example.py: 1 breakpoints

📤 [STDOUT example.py] 🐍 Starting Python Debug Example
📤 [STDOUT example.py] --- Fibonacci Test ---
⏸️ Session a1b2c3d4 stopped: breakpoint
📍 Current frame: main at /path/to/example.py:45

▶️ Session a1b2c3d4 continued
📤 [STDOUT example.py] Processed data: ['HELLO', 84, 6.28, '[1, 2, 3]', 'None']
🏁 Session a1b2c3d4 exited with code 0
```

## Architecture

```
Terminal (Rich Logs)          Claude Code (Debug Panel)
┌─────────────────┐          ┌──────────────────────┐
│ MCP Debug Server│◄────────►│ Debug Tools & Status │
│                 │          │                      │
│ 🚀 Session logs │          │ 🐛 Active session    │
│ 📍 Breakpoints  │          │ ⏸️  Paused at line   │
│ ⏸️  Execution   │          │ 📊 Variable inspector│
│ 📤 Program Output│          │ 📚 Call stack       │
└─────────────────┘          └──────────────────────┘
         ▲                            ▲
         │                            │
         ▼                            │
┌─────────────────┐                   │
│ debugpy (DAP)   │◄──────────────────┘
│ ↕               │
│ Python Process  │
│ (your script)   │
└─────────────────┘
```

## Troubleshooting

### Common Issues

#### Setup Issues

**"debugpy is not installed"**
```bash
pip install debugpy
```

**"Python not found"**
- Ensure Python 3.8+ is installed and in your PATH
- Try `python3 --version` to verify
- On macOS/Linux, use `python3` not `python`

#### Connection Issues

**"Failed to attach to debugpy session"**
- Ensure your Python app is running with debugpy:
  ```bash
  python3 -m debugpy --listen localhost:5678 your_script.py
  ```
- Verify the port number matches (default: 5678)
- Check if another process is using the debug port

**"DAP connection validation failed"**
- Your Python process may have exited
- Restart your Python app with debugpy
- Check terminal for Python error messages

**"Server disconnected unexpectedly"**
- Usually indicates Flask debug mode conflict
- Ensure `app.run(debug=False)` in your Flask app
- Restart both Flask app and debug session

#### Flask-Specific Issues

**Breakpoints not hitting in Flask**
- Disable Flask debug mode: `app.run(debug=False)`  
- Flask's debugger conflicts with debugpy
- Restart Flask with debugpy after changing debug mode

**"Werkzeug Debugger" appears instead of breakpoint**
- Flask debug mode is enabled
- Change `app.run(debug=True)` to `app.run(debug=False)`
- Flask's HTML debugger catches exceptions before debugpy

#### Session Issues

**"Session not found"**
- Check the session ID is correct
- List active sessions with `list_debug_sessions`
- Session may have terminated if Python process ended

**Curl requests hanging indefinitely**
- This is normal when breakpoint is hit
- Use debugger tools to continue execution
- Press Ctrl+C to cancel hanging requests

### Debug Server Logs

The server provides detailed logging for troubleshooting:
- 🚀 Session creation and management
- 📍 Breakpoint operations  
- ⏸️ Execution state changes
- 📤 Program output (stdout/stderr)
- ❌ Error conditions

## Development

### Building from Source
```bash
git clone <repo>
cd python-debug-mcp-server
npm install
npm run build
```

### Development Mode
```bash
npm run dev  # Watches for changes and rebuilds
```

### Testing
Use the included `example.py` script for testing:
```bash
python-debug-mcp-server
# Then use MCP tools to debug example.py
```

## Contributing

This is an MVP implementation focusing on core Python debugging functionality. Future enhancements could include:

- Conditional breakpoints
- Watch expressions  
- Multi-threaded debugging
- Remote debugging support
- Integration with popular Python frameworks

---

## 🎉 Ready to Debug!

Your Python Debug MCP Server is ready to provide AI-driven debugging capabilities to Claude Code. Start debugging Python applications with the power of AI assistance!