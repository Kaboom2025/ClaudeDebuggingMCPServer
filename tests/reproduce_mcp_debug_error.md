# Reproducing the MCP Python Debug Error

This document explains how to manually reproduce the MCP debug server disconnection error we encountered.

## The Error

When attempting to use the MCP Python Debug tools, we get:
```
MCP error -32603: MCP error -32603: Error executing tool set_breakpoint: Error: Server[pid=81938] disconnected unexpectedly
```

## Steps to Reproduce

1. Start a debug session:
   ```
   mcp__python-debug__start_debug_session with script_path: /Users/saalik/Documents/Projects/debugclaudecodemain/debugclaudecode/tests/app.py
   ```

2. The session starts successfully and returns:
   ```
   Session ID: 85462e25-cb94-4ccb-8362-237182468d40
   Script: /Users/saalik/Documents/Projects/debugclaudecodemain/debugclaudecode/tests/app.py
   Port: 5679
   State: running
   ```

3. List sessions to confirm it's running:
   ```
   mcp__python-debug__list_debug_sessions
   ```
   Shows the session as [running]

4. Try to set a breakpoint:
   ```
   mcp__python-debug__set_breakpoint with:
   - session_id: 85462e25-cb94-4ccb-8362-237182468d40
   - file: /Users/saalik/Documents/Projects/debugclaudecodemain/debugclaudecode/tests/app.py
   - line: 8 (or 12)
   ```

5. This fails with the disconnection error

## Observations

- The debug session starts successfully
- The session appears to be running when listed
- Any attempt to interact with the session (set breakpoints) causes the "Server disconnected unexpectedly" error
- This suggests the debugpy process may be crashing or the MCP bridge to it is failing

## Possible Causes

1. The Flask app might be exiting immediately after starting
2. Port conflicts with the debugpy server
3. Issues with the debugpy installation or compatibility
4. MCP Python Debug server internal error

## Environment Details

- Working directory: /Users/saalik/Documents/Projects/debugclaudecodemain
- Platform: darwin (macOS)
- Script being debugged: Flask application that runs on port 5001