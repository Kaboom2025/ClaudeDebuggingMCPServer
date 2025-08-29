#!/usr/bin/env node

// Test script to verify breakpoint setting works
const fs = require('fs');
const { spawn } = require('child_process');

// Command 1: Start debug session
const startDebugCommand = {
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

// Command 2: List sessions  
const listSessionsCommand = {
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "list_debug_sessions",
    "arguments": {}
  }
};

console.log('=== Starting Debug Session ===');
console.log(JSON.stringify(startDebugCommand));
console.log('');
console.log('=== Then List Sessions ===');
console.log(JSON.stringify(listSessionsCommand));
