#!/usr/bin/env node

// Comprehensive test to reproduce the "Server disconnected unexpectedly" error
const { spawn } = require('child_process');
const readline = require('readline');

console.log('🧪 Testing MCP Debug Server Breakpoint Issue');
console.log('='.repeat(50));

// Start the MCP server as a persistent process
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let sessionId = null;

// Handle server output
server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('📤 SERVER:', output.trim());
  
  // Extract session ID from successful debug session start
  const sessionMatch = output.match(/Session ID: ([a-f0-9-]+)/);
  if (sessionMatch) {
    sessionId = sessionMatch[1];
    console.log(`🎯 Captured Session ID: ${sessionId}`);
    
    // Wait a moment, then try to set a breakpoint
    setTimeout(() => {
      testSetBreakpoint(sessionId);
    }, 2000);
  }
});

server.stderr.on('data', (data) => {
  console.log('❌ SERVER ERROR:', data.toString());
});

server.on('exit', (code, signal) => {
  console.log(`💀 Server exited with code ${code}, signal ${signal}`);
});

server.on('error', (error) => {
  console.log(`🚨 Server process error: ${error}`);
});

// Function to send a command to the server
function sendCommand(command) {
  console.log(`📨 SENDING: ${JSON.stringify(command)}`);
  server.stdin.write(JSON.stringify(command) + '\n');
}

// Function to test setting a breakpoint
function testSetBreakpoint(sessionId) {
  console.log(`\n🎯 Testing breakpoint setting with session ${sessionId}...`);
  
  const setBreakpointCommand = {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "set_breakpoint",
      "arguments": {
        "session_id": sessionId,
        "file": "/Users/saalik/Documents/Projects/debugclaudecodemain/debugclaudecode/tests/app.py",
        "line": 8
      }
    }
  };
  
  sendCommand(setBreakpointCommand);
  
  // Set a timeout to check if server is still alive
  setTimeout(() => {
    console.log('\n🔍 Checking if server is still responsive...');
    const listCommand = {
      "jsonrpc": "2.0",
      "id": 3,
      "method": "tools/call",
      "params": {
        "name": "list_debug_sessions",
        "arguments": {}
      }
    };
    sendCommand(listCommand);
  }, 3000);
}

// Start by requesting a debug session
setTimeout(() => {
  console.log('\n🚀 Starting debug session...');
  const startCommand = {
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
  sendCommand(startCommand);
}, 1000);

// Clean shutdown after 15 seconds
setTimeout(() => {
  console.log('\n🛑 Test complete, shutting down...');
  server.kill('SIGTERM');
  process.exit(0);
}, 15000);
