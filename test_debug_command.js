#!/usr/bin/env node

// Simple test script to send debug command to MCP server
const command = {
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "start_debug_session",
    "arguments": {
      "script_path": "/Users/saalik/Documents/Projects/debugclaudecodemain/debugclaudecode/tests/app.py",
      "cwd": "/Users/saalik/Documents/Projects/debugclaudecodemain/debugclaudecode/tests"
    }
  }
};

console.log(JSON.stringify(command));
