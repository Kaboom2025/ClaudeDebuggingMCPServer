#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { SessionManager } from './sessionManager.js';
import { ProcessManager } from './processManager.js';
import { DAPClient } from './dapClient.js';
import { logger } from './logger.js';
import { eventBroadcaster } from './eventBroadcaster.js';
import { resolve } from 'path';

// Global instances
const sessionManager = new SessionManager();
const processManager = new ProcessManager();

// Create the server
const server = new Server(
  {
    name: 'python-debug-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define the debug tools this server provides
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Session Management
      {
        name: 'start_debug_session',
        description: 'Start a new Python debugging session with debugpy',
        inputSchema: {
          type: 'object',
          properties: {
            script_path: {
              type: 'string',
              description: 'Path to the Python script to debug',
            },
            args: {
              type: 'array',
              items: { type: 'string' },
              description: 'Command line arguments for the script (optional)',
            },
            cwd: {
              type: 'string',
              description: 'Working directory for the script (optional)',
            },
          },
          required: ['script_path'],
        },
      },
      {
        name: 'attach_to_debugpy',
        description: 'Attach to an existing debugpy session running in your terminal',
        inputSchema: {
          type: 'object',
          properties: {
            port: {
              type: 'number',
              description: 'Port where debugpy is listening (default: 5678)',
              default: 5678,
            },
            script_path: {
              type: 'string',
              description: 'Path to the Python script being debugged',
            },
          },
          required: ['script_path'],
        },
      },
      {
        name: 'stop_debug_session',
        description: 'Stop an active debugging session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'ID of the debug session to stop',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'list_debug_sessions',
        description: 'List all active debug sessions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },

      // Breakpoint Management
      {
        name: 'set_breakpoint',
        description: 'Set a breakpoint at a specific file and line',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'ID of the debug session',
            },
            file: {
              type: 'string',
              description: 'Path to the file',
            },
            line: {
              type: 'number',
              description: 'Line number (1-based)',
            },
          },
          required: ['session_id', 'file', 'line'],
        },
      },
      {
        name: 'remove_breakpoint',
        description: 'Remove a specific breakpoint',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'ID of the debug session',
            },
            file: {
              type: 'string',
              description: 'Path to the file',
            },
            line: {
              type: 'number',
              description: 'Line number (1-based)',
            },
          },
          required: ['session_id', 'file', 'line'],
        },
      },
      {
        name: 'list_breakpoints',
        description: 'List all active breakpoints for a session',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'ID of the debug session',
            },
            file: {
              type: 'string',
              description: 'Optional file filter',
            },
          },
          required: ['session_id'],
        },
      },

      // Execution Control
      {
        name: 'debug_continue',
        description: 'Resume execution of the debugged program',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'ID of the debug session',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'debug_step_over',
        description: 'Execute the next line of code (step over)',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'ID of the debug session',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'debug_step_in',
        description: 'Step into function calls',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'ID of the debug session',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'debug_step_out',
        description: 'Step out of the current function',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'ID of the debug session',
            },
          },
          required: ['session_id'],
        },
      },

      // Runtime Inspection
      {
        name: 'get_variables',
        description: 'Get variables in the current scope',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'ID of the debug session',
            },
            scope: {
              type: 'string',
              enum: ['local', 'global', 'all'],
              description: 'Variable scope to inspect',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'get_call_stack',
        description: 'Get the current call stack',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'ID of the debug session',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'evaluate_expression',
        description: 'Evaluate a Python expression in the debug context',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'ID of the debug session',
            },
            expression: {
              type: 'string',
              description: 'Python expression to evaluate',
            },
          },
          required: ['session_id', 'expression'],
        },
      },

      // System Tools
      {
        name: 'check_python_setup',
        description: 'Check if Python and debugpy are properly installed',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Session Management
      case 'start_debug_session': {
        const { script_path, args: scriptArgs = [], cwd = process.cwd() } = args as {
          script_path: string;
          args?: string[];
          cwd?: string;
        };

        // Validate script path
        const validation = ProcessManager.validateScriptPath(script_path);
        if (!validation.isValid) {
          throw new McpError(ErrorCode.InvalidParams, validation.error!);
        }

        // Create session
        const session = sessionManager.createSession(resolve(cwd, script_path));

        try {
          // Initialize session state in event broadcaster
          eventBroadcaster.updateSessionState(session.id, {
            sessionId: session.id,
            scriptPath: session.scriptPath,
            state: 'starting',
            port: session.port,
            startTime: session.startTime,
            breakpoints: []
          });

          // Start Python process with debugpy
          const { process: pythonProcess, dapClient } = await processManager.startPythonProcess({
            scriptPath: script_path,
            port: session.port,
            args: scriptArgs,
            cwd,
          }, session.id);

          // Store process and client references
          session.pythonProcess = pythonProcess;
          session.dapClient = dapClient;

          // Set up DAP event handlers
          setupDAPEventHandlers(session);

          // Initialize debugger with enhanced robustness
          logger.system(session.id, 'Starting DAP initialization sequence...');
          
          try {
            // Step 1: Initialize with retry logic
            logger.system(session.id, 'Sending initialize request...');
            const initResult = await retryDAPOperation(() => dapClient.initialize(), 'initialize', 3, session.id);
            logger.system(session.id, 'Initialize request successful', { initResult });
            
            // Step 2: Attach with proper event handling
            logger.system(session.id, 'Starting attach sequence...');
            const attachSuccess = await performAttachSequence(dapClient, session.id);
            if (!attachSuccess) {
              throw new Error('Attach sequence failed after retries');
            }
            logger.system(session.id, 'Attach sequence successful');
            
            // Step 3: Validate connection before configurationDone
            await validateDAPConnection(dapClient, session.id);
            
            // Step 4: Configuration done with validation
            logger.system(session.id, 'Sending configurationDone request...');
            const configResult = await retryDAPOperation(() => dapClient.configurationDone(), 'configurationDone', 2, session.id);
            logger.system(session.id, 'ConfigurationDone request successful', { configResult });
            
            // Step 5: Get initial thread information
            await initializeThreadContext(session, dapClient);
            
          } catch (dapError) {
            logger.systemError(session.id, `DAP initialization failed: ${dapError}`, { 
              error: dapError?.toString(),
              step: 'DAP_PROTOCOL_INIT'
            });
            throw new Error(`DAP protocol initialization failed: ${dapError}`);
          }

          sessionManager.updateSessionState(session.id, 'running');
          
          // Update event broadcaster state
          eventBroadcaster.updateSessionState(session.id, {
            state: 'running'
          });

          return {
            content: [
              {
                type: 'text',
                text: `✅ Debug session started successfully!\n\n` +
                      `Session ID: ${session.id}\n` +
                      `Script: ${session.scriptPath}\n` +
                      `Port: ${session.port}\n` +
                      `State: ${session.state}\n\n` +
                      `🐛 Python process is now running with debugpy attached. ` +
                      `You can set breakpoints and control execution.`,
              },
            ],
          };
        } catch (error) {
          // Clean up on failure
          await sessionManager.terminateSession(session.id);
          throw new McpError(ErrorCode.InternalError, `Failed to start debug session: ${error}`);
        }
      }

      case 'attach_to_debugpy': {
        const { port = 5678, script_path } = args as {
          port?: number;
          script_path: string;
        };

        // Validate script path
        const validation = ProcessManager.validateScriptPath(script_path);
        if (!validation.isValid) {
          throw new McpError(ErrorCode.InvalidParams, validation.error!);
        }

        // Create session for attachment
        const session = sessionManager.createSession(resolve(script_path));
        // Override port for attachment
        session.port = port;

        try {
          // Initialize session state in event broadcaster
          eventBroadcaster.updateSessionState(session.id, {
            sessionId: session.id,
            scriptPath: session.scriptPath,
            state: 'starting',
            port: session.port,
            startTime: session.startTime,
            breakpoints: []
          });

          // Create DAP client for existing debugpy session
          const dapClient = new DAPClient(port, session.id);
          session.dapClient = dapClient;
          session.pythonProcess = null; // No process to manage - user controls it

          // Set up DAP event handlers
          setupDAPEventHandlers(session);

          // Connect to existing debugpy session
          logger.system(session.id, `Attaching to existing debugpy session on port ${port}...`);
          
          try {
            // Step 1: Connect to the existing debugpy server
            await dapClient.connect(5000);
            logger.system(session.id, `Connected to debugpy server on port ${port}`);
            
            // Step 2: Initialize with retry logic
            logger.system(session.id, 'Starting DAP initialization sequence...');
            const initResult = await retryDAPOperation(() => dapClient.initialize(), 'initialize', 3, session.id);
            logger.system(session.id, 'Initialize request successful', { initResult });
            
            // Step 3: Attach with proper event handling
            logger.system(session.id, 'Starting attach sequence...');
            const attachSuccess = await performAttachSequence(dapClient, session.id);
            if (!attachSuccess) {
              throw new Error('Attach sequence failed after retries');
            }
            logger.system(session.id, 'Attach sequence successful');
            
            // Step 4: Validate connection
            await validateDAPConnection(dapClient, session.id);
            
            // Step 5: Configuration done
            logger.system(session.id, 'Sending configurationDone request...');
            const configResult = await retryDAPOperation(() => dapClient.configurationDone(), 'configurationDone', 2, session.id);
            logger.system(session.id, 'ConfigurationDone request successful', { configResult });
            
            // Step 6: Initialize thread context
            await initializeThreadContext(session, dapClient);
            
          } catch (dapError) {
            logger.systemError(session.id, `DAP attachment failed: ${dapError}`, { 
              error: dapError?.toString(),
              port,
              step: 'DAP_ATTACH'
            });
            throw new Error(`DAP attachment failed: ${dapError}`);
          }

          sessionManager.updateSessionState(session.id, 'running');
          
          // Update event broadcaster state
          eventBroadcaster.updateSessionState(session.id, {
            state: 'running'
          });

          return {
            content: [
              {
                type: 'text',
                text: `✅ Successfully attached to debugpy session!\n\n` +
                      `Session ID: ${session.id}\n` +
                      `Script: ${session.scriptPath}\n` +
                      `Port: ${session.port}\n` +
                      `State: ${session.state}\n\n` +
                      `🐛 Attached to your running Python process. ` +
                      `You can now set breakpoints and control execution.`,
              },
            ],
          };
        } catch (error) {
          // Clean up on failure
          await sessionManager.terminateSession(session.id);
          throw new McpError(ErrorCode.InternalError, `Failed to attach to debugpy session: ${error}`);
        }
      }

      case 'stop_debug_session': {
        const { session_id } = args as { session_id: string };
        const session = sessionManager.getSession(session_id);

        if (!session) {
          throw new McpError(ErrorCode.InvalidParams, `Session ${session_id} not found`);
        }

        await sessionManager.terminateSession(session_id);

        return {
          content: [
            {
              type: 'text',
              text: `🛑 Debug session ${session_id} stopped successfully.`,
            },
          ],
        };
      }

      case 'list_debug_sessions': {
        const sessions = sessionManager.getAllSessions();
        const stats = sessionManager.getSessionStats();

        if (sessions.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '📋 No active debug sessions.',
              },
            ],
          };
        }

        const sessionList = sessions.map(s => 
          `• ${s.id.substring(0, 8)}... - ${s.scriptPath} [${s.state}] (port ${s.port})`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `📋 Active Debug Sessions (${stats.total}):\n\n${sessionList}\n\n` +
                    `States: ${stats.running} running, ${stats.paused} paused, ${stats.stopped} stopped`,
            },
          ],
        };
      }

      // Breakpoint Management
      case 'set_breakpoint': {
        const { session_id, file, line } = args as {
          session_id: string;
          file: string;
          line: number;
        };

        const session = sessionManager.getSession(session_id);
        if (!session || !session.dapClient) {
          throw new McpError(ErrorCode.InvalidParams, `Session ${session_id} not found or not connected`);
        }

        if (line < 1) {
          throw new McpError(ErrorCode.InvalidParams, 'Line number must be >= 1');
        }

        // Validate DAP connection before attempting breakpoint operations
        try {
          await validateDAPConnection(session.dapClient, session_id);
        } catch (connectionError) {
          throw new McpError(ErrorCode.InternalError, 
            `DAP connection validation failed: ${connectionError}`);
        }

        try {
          // Get existing breakpoints for the file
          const existingBreakpoints = sessionManager.getBreakpoints(session_id, file);
          const existingLines = existingBreakpoints.map(bp => bp.line);

          // Add new breakpoint if not already present
          if (!existingLines.includes(line)) {
            existingLines.push(line);
          }

          logger.breakpoint(session_id, `Setting breakpoints at ${file}`, {
            file,
            requestedLines: existingLines,
            newLine: line
          });

          // Set breakpoints via DAP
          const response = await session.dapClient.setBreakpoints(resolve(file), existingLines);
          
          if (!response || !response.breakpoints) {
            throw new Error('Invalid response from debugpy setBreakpoints');
          }
        
          // Update session breakpoints
          const breakpoints = response.breakpoints.map((bp: any, index: number) => ({
            id: bp.id || index,
            file,
            line: existingLines[index],
            verified: bp.verified,
          }));

          sessionManager.setBreakpoints(session_id, file, breakpoints);
          
          // Enhanced logging for breakpoint set
          const targetBreakpoint = response.breakpoints[existingLines.indexOf(line)];
          const verified = targetBreakpoint?.verified;
          
          logger.breakpoint(session_id, `Breakpoint set at ${file}:${line}`, {
            file,
            line,
            verified,
            id: targetBreakpoint?.id,
            action: 'set'
          });
          
          // Update event broadcaster with new breakpoints
          eventBroadcaster.updateSessionState(session_id, {
            breakpoints: breakpoints.map((bp: any) => ({
              id: bp.id,
              file: bp.file,
              line: bp.line,
              verified: bp.verified
            }))
          });

          return {
            content: [
              {
                type: 'text',
                text: `📍 Breakpoint set at ${file}:${line}\n` +
                      `Status: ${verified ? '✅ Verified' : '⚠️ Unverified'}`,
              },
            ],
          };
          
        } catch (error) {
          logger.systemError(session_id, `Failed to set breakpoint: ${error}`, {
            file,
            line,
            error: error?.toString(),
            sessionState: session.state
          });
          
          throw new McpError(
            ErrorCode.InternalError, 
            `Failed to set breakpoint at ${file}:${line}: ${error}`
          );
        }
      }

      case 'remove_breakpoint': {
        const { session_id, file, line } = args as {
          session_id: string;
          file: string;
          line: number;
        };

        const session = sessionManager.getSession(session_id);
        if (!session || !session.dapClient) {
          throw new McpError(ErrorCode.InvalidParams, `Session ${session_id} not found or not connected`);
        }

        // Get existing breakpoints and remove the specified one
        const existingBreakpoints = sessionManager.getBreakpoints(session_id, file);
        const updatedLines = existingBreakpoints
          .filter(bp => bp.line !== line)
          .map(bp => bp.line);

        // Update breakpoints via DAP
        const response = await session.dapClient.setBreakpoints(resolve(file), updatedLines);
        
        // Update session breakpoints
        const breakpoints = response.breakpoints.map((bp: any, index: number) => ({
          id: bp.id || index,
          file,
          line: updatedLines[index],
          verified: bp.verified,
        }));

        sessionManager.setBreakpoints(session_id, file, breakpoints);

        return {
          content: [
            {
              type: 'text',
              text: `🗑️ Breakpoint removed from ${file}:${line}`,
            },
          ],
        };
      }

      case 'list_breakpoints': {
        const { session_id, file } = args as {
          session_id: string;
          file?: string;
        };

        const session = sessionManager.getSession(session_id);
        if (!session) {
          throw new McpError(ErrorCode.InvalidParams, `Session ${session_id} not found`);
        }

        const breakpoints = sessionManager.getBreakpoints(session_id, file);

        if (breakpoints.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: file 
                  ? `📍 No breakpoints set in ${file}`
                  : '📍 No breakpoints set in this session',
              },
            ],
          };
        }

        const breakpointList = breakpoints.map(bp => 
          `• ${bp.file}:${bp.line} ${bp.verified ? '✅' : '⚠️'}`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `📍 Breakpoints (${breakpoints.length}):\n\n${breakpointList}`,
            },
          ],
        };
      }

      // Execution Control
      case 'debug_continue': {
        const { session_id } = args as { session_id: string };
        const session = sessionManager.getSession(session_id);

        if (!session || !session.dapClient || !session.currentThreadId) {
          throw new McpError(ErrorCode.InvalidParams, 
            `Session ${session_id} not found, not connected, or no active thread`);
        }

        await session.dapClient.continue(session.currentThreadId);
        sessionManager.updateSessionState(session_id, 'running');

        return {
          content: [
            {
              type: 'text',
              text: `▶️ Continuing execution for session ${session_id}`,
            },
          ],
        };
      }

      case 'debug_step_over': {
        const { session_id } = args as { session_id: string };
        const session = sessionManager.getSession(session_id);

        if (!session || !session.dapClient || !session.currentThreadId) {
          throw new McpError(ErrorCode.InvalidParams, 
            `Session ${session_id} not found, not connected, or no active thread`);
        }

        await session.dapClient.stepOver(session.currentThreadId);

        return {
          content: [
            {
              type: 'text',
              text: `⏭️ Step over executed for session ${session_id}`,
            },
          ],
        };
      }

      case 'debug_step_in': {
        const { session_id } = args as { session_id: string };
        const session = sessionManager.getSession(session_id);

        if (!session || !session.dapClient || !session.currentThreadId) {
          throw new McpError(ErrorCode.InvalidParams, 
            `Session ${session_id} not found, not connected, or no active thread`);
        }

        await session.dapClient.stepIn(session.currentThreadId);

        return {
          content: [
            {
              type: 'text',
              text: `⬇️ Step in executed for session ${session_id}`,
            },
          ],
        };
      }

      case 'debug_step_out': {
        const { session_id } = args as { session_id: string };
        const session = sessionManager.getSession(session_id);

        if (!session || !session.dapClient || !session.currentThreadId) {
          throw new McpError(ErrorCode.InvalidParams, 
            `Session ${session_id} not found, not connected, or no active thread`);
        }

        await session.dapClient.stepOut(session.currentThreadId);

        return {
          content: [
            {
              type: 'text',
              text: `⬆️ Step out executed for session ${session_id}`,
            },
          ],
        };
      }

      // Runtime Inspection
      case 'get_variables': {
        const { session_id, scope = 'local' } = args as {
          session_id: string;
          scope?: 'local' | 'global' | 'all';
        };

        const session = sessionManager.getSession(session_id);
        if (!session || !session.dapClient || !session.currentFrameId) {
          throw new McpError(ErrorCode.InvalidParams, 
            `Session ${session_id} not found, not connected, or no active frame`);
        }

        // Enhanced logging for variable inspection
        logger.claudeInspecting(session_id, `Inspecting variables in ${scope} scope`);

        // Get scopes for current frame
        const scopes = await session.dapClient.scopes(session.currentFrameId);
        const variables: any[] = [];

        for (const scopeObj of scopes) {
          if (scope === 'all' || 
              (scope === 'local' && scopeObj.name.toLowerCase().includes('local')) ||
              (scope === 'global' && scopeObj.name.toLowerCase().includes('global'))) {
            
            const scopeVariables = await session.dapClient.variables(scopeObj.variablesReference);
            variables.push(...scopeVariables.map(v => ({ ...v, scope: scopeObj.name })));
          }
        }

        // Log inspection results and broadcast to Claude Code
        if (variables.length > 0) {
          logger.inspection(session_id, `Found ${variables.length} variables in ${scope} scope`, {
            variableCount: variables.length,
            scope
          });
          
          // Broadcast variable inspection to Claude Code
          eventBroadcaster.broadcastVariableInspection(session_id, variables.map(v => ({
            name: v.name,
            value: v.value,
            type: v.type,
            scope: v.scope
          })));
        }

        if (variables.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `🔍 No variables found in ${scope} scope`,
              },
            ],
          };
        }

        const variableList = variables.map(v => 
          `• ${v.name}: ${v.value} (${v.type || 'unknown'}) [${v.scope}]`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `🔍 Variables in ${scope} scope (${variables.length}):\n\n${variableList}`,
            },
          ],
        };
      }

      case 'get_call_stack': {
        const { session_id } = args as { session_id: string };
        const session = sessionManager.getSession(session_id);

        if (!session || !session.dapClient || !session.currentThreadId) {
          throw new McpError(ErrorCode.InvalidParams, 
            `Session ${session_id} not found, not connected, or no active thread`);
        }

        const stackFrames = await session.dapClient.stackTrace(session.currentThreadId);

        if (stackFrames.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '📚 No stack frames available',
              },
            ],
          };
        }

        const stackList = stackFrames.map((frame, index) => 
          `${index === 0 ? '➤' : ' '} ${frame.name} at ${frame.source?.path || 'unknown'}:${frame.line}`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `📚 Call Stack (${stackFrames.length} frames):\n\n${stackList}`,
            },
          ],
        };
      }

      case 'evaluate_expression': {
        const { session_id, expression } = args as {
          session_id: string;
          expression: string;
        };

        const session = sessionManager.getSession(session_id);
        if (!session || !session.dapClient || session.currentFrameId === undefined) {
          throw new McpError(ErrorCode.InvalidParams, 
            `Session ${session_id} not found, not connected, or no active frame`);
        }

        try {
          logger.claudeInspecting(session_id, `Evaluating expression: ${expression}`);
          
          const result = await session.dapClient.evaluate(expression, session.currentFrameId);
          
          logger.inspection(session_id, `Expression evaluated successfully`, {
            expression,
            result: result.result,
            type: result.type
          });
          
          return {
            content: [
              {
                type: 'text',
                text: `💬 Expression: ${expression}\n` +
                      `📊 Result: ${result.result}\n` +
                      `🏷️ Type: ${result.type || 'unknown'}`,
              },
            ],
          };
        } catch (error) {
          logger.inspection(session_id, `Expression evaluation failed`, {
            expression,
            error: error?.toString()
          });
          
          return {
            content: [
              {
                type: 'text',
                text: `💬 Expression: ${expression}\n` +
                      `❌ Error: ${error}`,
              },
            ],
          };
        }
      }

      // System Tools
      case 'check_python_setup': {
        const pythonCheck = await ProcessManager.checkPythonAvailable();
        
        let message = `🐍 Python Setup Check:\n\n`;
        
        if (pythonCheck.available) {
          message += `✅ Python: Available (${pythonCheck.version})\n`;
          
          try {
            await processManager.checkDebugpyAvailable();
            message += `✅ debugpy: Available\n\n`;
            message += `🎉 Your system is ready for Python debugging!`;
          } catch (error) {
            message += `❌ debugpy: Not available\n`;
            message += `💡 Install with: pip install debugpy`;
          }
        } else {
          message += `❌ Python: ${pythonCheck.error}\n`;
          message += `💡 Please install Python and ensure it's in your PATH`;
        }

        return {
          content: [
            {
              type: 'text',
              text: message,
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool ${name}: ${error}`
    );
  }
});

// Set up DAP event handlers for a session with enhanced logging
function setupDAPEventHandlers(session: any) {
  if (!session.dapClient) return;

  session.dapClient.on('stopped', async (body: any) => {
    try {
      // Validate and set thread context
      if (!body.threadId) {
        logger.systemError(session.id, 'Stopped event received without threadId', { body });
        return;
      }

      session.currentThreadId = body.threadId;
      sessionManager.updateSessionState(session.id, 'paused');
      
      // Enhanced logging for execution pause
      logger.executionPaused(session.id, 'EXECUTION PAUSED', {
        reason: body.reason,
        threadId: body.threadId,
        hitBreakpointIds: body.hitBreakpointIds
      });
      
      // Get current frame for variable inspection with retry logic
      try {
        const frames = await retryDAPOperation(
          () => session.dapClient.stackTrace(body.threadId),
          'stackTrace',
          2,
          session.id
        );

        if (frames && frames.length > 0) {
          session.currentFrameId = frames[0].id;
          const location = `${frames[0].source?.path || 'unknown'}:${frames[0].line}${frames[0].name ? ` in ${frames[0].name}()` : ''}`;
          
          logger.execution(session.id, `📍 Location: ${location}`, {
            frameId: frames[0].id,
            file: frames[0].source?.path,
            line: frames[0].line,
            function: frames[0].name
          });
          
          // Update session state with current location
          eventBroadcaster.updateSessionState(session.id, {
            state: 'paused',
            currentLocation: {
              file: frames[0].source?.path || 'unknown',
              line: frames[0].line,
              function: frames[0].name
            }
          });
          
          // Broadcast stack frames
          eventBroadcaster.broadcastStackFrames(session.id, frames.map((f: any) => ({
            id: f.id,
            name: f.name,
            file: f.source?.path,
            line: f.line
          })));

          logger.system(session.id, `Thread context updated`, {
            threadId: session.currentThreadId,
            frameId: session.currentFrameId,
            totalFrames: frames.length
          });
        } else {
          logger.systemError(session.id, 'No stack frames available after stopped event');
        }
      } catch (stackTraceError) {
        logger.systemError(session.id, `Failed to get stack trace after stopped event: ${stackTraceError}`, {
          error: stackTraceError?.toString(),
          threadId: body.threadId
        });
      }
    } catch (error) {
      logger.systemError(session.id, `Error handling stopped event: ${error}`, {
        error: error?.toString(),
        body
      });
    }
  });

  session.dapClient.on('continued', (body: any) => {
    logger.execution(session.id, 'Execution continued', { threadId: body.threadId });
    sessionManager.updateSessionState(session.id, 'running');
    
    // Update event broadcaster state
    eventBroadcaster.updateSessionState(session.id, {
      state: 'running',
      currentLocation: undefined // Clear current location when continuing
    });
  });

  session.dapClient.on('terminated', (body: any) => {
    logger.session(session.id, 'Session terminated', { reason: body.reason });
    sessionManager.updateSessionState(session.id, 'stopped');
    
    eventBroadcaster.updateSessionState(session.id, {
      state: 'stopped'
    });
  });

  session.dapClient.on('exited', (body: any) => {
    const exitMessage = `Session exited with code ${body.exitCode}`;
    if (body.exitCode === 0) {
      logger.session(session.id, exitMessage);
    } else {
      logger.sessionError(session.id, exitMessage, { exitCode: body.exitCode });
    }
    
    sessionManager.updateSessionState(session.id, 'stopped');
    
    eventBroadcaster.updateSessionState(session.id, {
      state: 'stopped'
    });
  });

  session.dapClient.on('output', (body: any) => {
    const category = body.category || 'stdout';
    const output = body.output?.trim();
    if (output) {
      // This handles debugger internal output (different from program stdout/stderr)
      if (category === 'stderr' || category.includes('error')) {
        logger.programError(session.id, output, session.scriptPath);
      } else {
        logger.programOutput(session.id, output, session.scriptPath);
      }
      
      // Broadcast to Claude Code
      eventBroadcaster.broadcastProgramOutput(session.id, output, category === 'stderr' ? 'stderr' : 'stdout');
    }
  });
}

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  logger.systemError('server', `Uncaught exception: ${error.message}`, { 
    error: error.toString(),
    stack: error.stack
  });
  // Don't exit - try to keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  logger.systemError('server', `Unhandled rejection: ${reason}`, { 
    reason: reason?.toString(),
    promise: promise.toString()
  });
  // Don't exit - try to keep server running
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.system('server', '🛑 Shutting down Python Debug MCP Server (SIGINT)...');
  await sessionManager.terminateAllSessions();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.system('server', '🛑 Shutting down Python Debug MCP Server (SIGTERM)...');
  await sessionManager.terminateAllSessions();
  process.exit(0);
});

// Enhanced DAP operation helper methods
async function retryDAPOperation(
  operation: () => Promise<any>, 
  operationName: string, 
  maxRetries: number,
  sessionId: string
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      logger.systemError(sessionId, `DAP ${operationName} attempt ${attempt}/${maxRetries} failed: ${error}`, {
        attempt,
        maxRetries,
        error: error?.toString()
      });
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt - 1), 5000)));
    }
  }
}

async function performAttachSequence(dapClient: any, sessionId: string): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      logger.system(sessionId, `Attach sequence attempt ${attempt}/3`);
      
      // Set up initialized event listener with timeout
      const initializedPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for initialized event'));
        }, 15000);
        
        dapClient.once('initialized', () => {
          clearTimeout(timeout);
          logger.system(sessionId, 'Received initialized event');
          resolve();
        });
      });
      
      // Send attach request
      logger.system(sessionId, 'Sending attach request...');
      try {
        await dapClient.attach();
      } catch (attachError) {
        // Attach might fail but initialized event might still come
        logger.system(sessionId, `Attach request failed, waiting for initialized event: ${attachError}`);
      }
      
      // Wait for initialized event
      await initializedPromise;
      return true;
      
    } catch (error) {
      logger.systemError(sessionId, `Attach sequence attempt ${attempt} failed: ${error}`, {
        attempt,
        error: error?.toString()
      });
      
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  return false;
}

async function validateDAPConnection(dapClient: any, sessionId: string): Promise<void> {
  try {
    // Try to get threads to validate connection
    logger.system(sessionId, 'Validating DAP connection...');
    const threads = await dapClient.threads();
    logger.system(sessionId, `DAP connection validated, found ${threads.length} threads`, {
      threadCount: threads.length
    });
  } catch (error) {
    logger.systemError(sessionId, `DAP connection validation failed: ${error}`, {
      error: error?.toString()
    });
    throw new Error(`DAP connection validation failed: ${error}`);
  }
}

async function initializeThreadContext(session: any, dapClient: any): Promise<void> {
  try {
    // Get available threads
    const threads = await dapClient.threads();
    
    if (threads.length > 0) {
      // Use the main thread (usually the first one)
      session.currentThreadId = threads[0].id;
      logger.system(session.id, `Initialized thread context`, {
        threadId: session.currentThreadId,
        threadName: threads[0].name,
        totalThreads: threads.length
      });
      
      // Try to get stack frames for the current thread
      try {
        const stackFrames = await dapClient.stackTrace(session.currentThreadId);
        if (stackFrames.length > 0) {
          session.currentFrameId = stackFrames[0].id;
          logger.system(session.id, `Initialized frame context`, {
            frameId: session.currentFrameId,
            frameName: stackFrames[0].name
          });
        }
      } catch (frameError) {
        // This is expected if the program hasn't hit a breakpoint yet
        logger.system(session.id, `Frame context not available yet (program running): ${frameError}`);
      }
    } else {
      logger.system(session.id, 'No threads found during initialization');
    }
  } catch (error) {
    // Thread initialization is not critical for basic functionality
    logger.system(session.id, `Thread context initialization failed: ${error}`);
  }
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.system('server', '🟢 Python Debug MCP Server running on stdio');
  logger.system('server', '🐛 Ready to debug Python applications with debugpy');
}

main().catch((error) => {
  logger.systemError('server', 'Server failed to start', { error: error?.toString() });
  process.exit(1);
});