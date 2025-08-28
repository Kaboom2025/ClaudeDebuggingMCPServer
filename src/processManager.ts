import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { DAPClient } from './dapClient.js';
import { logger } from './logger.js';
import { eventBroadcaster } from './eventBroadcaster.js';

export interface PythonProcessOptions {
  scriptPath: string;
  port: number;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export class ProcessManager {
  
  async startPythonProcess(options: PythonProcessOptions, sessionId?: string): Promise<{
    process: ChildProcess;
    dapClient: DAPClient;
  }> {
    const { scriptPath, port, args = [], cwd = process.cwd(), env = {} } = options;
    const sessionIdForLog = sessionId || 'unknown';

    // Validate script exists
    const resolvedPath = resolve(cwd, scriptPath);
    if (!existsSync(resolvedPath)) {
      logger.sessionError(sessionIdForLog, `Python script not found: ${resolvedPath}`);
      throw new Error(`Python script not found: ${resolvedPath}`);
    }

    logger.session(sessionIdForLog, `DEBUG SESSION STARTED`, {
      scriptPath: resolvedPath,
      port,
      args
    });

    // Check if debugpy is available
    await this.checkDebugpyAvailable();

    // Spawn Python process with debugpy
    const pythonProcess = spawn('python3', [
      '-m', 'debugpy',
      '--listen', `localhost:${port}`,
      '--wait-for-client',
      resolvedPath,
      ...args
    ], {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    logger.system(sessionIdForLog, `Python process started with PID ${pythonProcess.pid}, waiting for DAP connection on port ${port}`, {
      pid: pythonProcess.pid,
      port,
      scriptPath: resolvedPath
    });

    // Set up enhanced output capture
    this.setupEnhancedOutputCapture(pythonProcess, scriptPath, sessionIdForLog);

    // Create DAP client and wait for connection
    const dapClient = new DAPClient(port, sessionIdForLog);
    
    // Wait for Python process to start listening
    await this.waitForConnection(dapClient, 10000, sessionIdForLog);

    return { process: pythonProcess, dapClient };
  }

  async checkDebugpyAvailable(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkProcess = spawn('python3', ['-c', 'import debugpy; print("debugpy available")']);
      
      let output = '';
      checkProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      checkProcess.on('close', (code) => {
        if (code === 0 && output.includes('debugpy available')) {
          resolve();
        } else {
          reject(new Error('debugpy is not installed. Please install it with: pip install debugpy'));
        }
      });

      checkProcess.on('error', (error) => {
        reject(new Error(`Failed to check debugpy availability: ${error.message}`));
      });
    });
  }

  private async waitForConnection(dapClient: DAPClient, timeout: number, sessionId: string): Promise<void> {
    const startTime = Date.now();
    const retryInterval = 500;

    while (Date.now() - startTime < timeout) {
      try {
        await dapClient.connect(1000);
        logger.system(sessionId, `DAP client connected successfully`);
        return;
      } catch (error) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryInterval));
      }
    }

    logger.systemError(sessionId, `Failed to connect to debugpy within ${timeout}ms`);
    throw new Error(`Failed to connect to debugpy within ${timeout}ms`);
  }

  private setupEnhancedOutputCapture(pythonProcess: ChildProcess, scriptPath: string, sessionId: string): void {
    // Capture and correlate stdout with debug events
    pythonProcess.stdout?.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        // Log program output with context
        logger.programOutput(sessionId, output, scriptPath);
        
        // Broadcast to Claude Code debug panel
        eventBroadcaster.broadcastProgramOutput(sessionId, output, 'stdout');
      }
    });

    // Capture and correlate stderr with debug events  
    pythonProcess.stderr?.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        // Filter out debugpy startup messages but log everything else
        if (!output.includes('debugpy') && !output.includes('Waiting for debugger')) {
          // Determine if this looks like an error or just diagnostic info
          const isError = this.isErrorOutput(output);
          
          if (isError) {
            logger.programError(sessionId, output, scriptPath);
          } else {
            logger.programOutput(sessionId, output, scriptPath);
          }
          
          // Broadcast to Claude Code debug panel
          eventBroadcaster.broadcastProgramOutput(sessionId, output, 'stderr');
        }
      }
    });

    // Handle process lifecycle events with enhanced logging
    pythonProcess.on('spawn', () => {
      logger.system(sessionId, `Python process spawned`, { scriptPath, pid: pythonProcess.pid });
      
      // Update session state
      eventBroadcaster.updateSessionState(sessionId, {
        state: 'running',
        scriptPath: scriptPath
      } as any);
    });

    pythonProcess.on('error', (error) => {
      logger.systemError(sessionId, `Python process error: ${error.message}`, { 
        scriptPath, 
        error: error.message,
        pid: pythonProcess.pid
      });
      
      // Update session state to error
      eventBroadcaster.updateSessionState(sessionId, {
        state: 'error'
      } as any);
    });

    pythonProcess.on('exit', (code, signal) => {
      if (code !== null) {
        const isNormalExit = code === 0;
        const message = `Python process exited with code ${code}`;
        
        if (isNormalExit) {
          logger.system(sessionId, message, { scriptPath, exitCode: code });
        } else {
          logger.systemError(sessionId, message, { scriptPath, exitCode: code });
        }
      } else if (signal) {
        logger.system(sessionId, `Python process killed with signal ${signal}`, { 
          scriptPath, 
          signal,
          pid: pythonProcess.pid
        });
      }
      
      // Update session state
      eventBroadcaster.updateSessionState(sessionId, {
        state: 'stopped'
      } as any);
    });
  }

  // Helper method to determine if stderr output represents an error
  private isErrorOutput(output: string): boolean {
    const errorIndicators = [
      'Traceback',
      'Error:',
      'Exception:',
      'TypeError:',
      'ValueError:',
      'AttributeError:',
      'KeyError:',
      'IndexError:',
      'ImportError:',
      'ModuleNotFoundError:',
      'NameError:',
      'SyntaxError:',
      'RuntimeError:',
      'FileNotFoundError:',
      'PermissionError:'
    ];
    
    return errorIndicators.some(indicator => 
      output.includes(indicator)
    );
  }

  async terminateProcess(pythonProcess: ChildProcess, sessionId?: string): Promise<void> {
    if (!pythonProcess || pythonProcess.killed) {
      return;
    }

    const sessionIdForLog = sessionId || 'unknown';
    logger.system(sessionIdForLog, `Terminating Python process ${pythonProcess.pid}`);

    // Try graceful termination first
    pythonProcess.kill('SIGTERM');

    // Wait for graceful termination
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (!pythonProcess.killed) {
          logger.system(sessionIdForLog, `Force killing Python process ${pythonProcess.pid}`);
          pythonProcess.kill('SIGKILL');
        }
        resolve();
      }, 5000);

      pythonProcess.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  static validateScriptPath(scriptPath: string): { isValid: boolean; error?: string } {
    if (!scriptPath) {
      return { isValid: false, error: 'Script path is required' };
    }

    if (!scriptPath.endsWith('.py')) {
      return { isValid: false, error: 'Script must be a Python file (.py)' };
    }

    const resolvedPath = resolve(scriptPath);
    if (!existsSync(resolvedPath)) {
      return { isValid: false, error: `Script file not found: ${resolvedPath}` };
    }

    return { isValid: true };
  }

  static async checkPythonAvailable(): Promise<{ available: boolean; version?: string; error?: string }> {
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', ['--version']);
      
      let output = '';
      let errorOutput = '';

      pythonProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          const version = (output || errorOutput).trim();
          resolve({ available: true, version });
        } else {
          resolve({ 
            available: false, 
            error: 'Python not found. Please ensure Python is installed and in your PATH.' 
          });
        }
      });

      pythonProcess.on('error', (error) => {
        resolve({ 
          available: false, 
          error: `Failed to execute python: ${error.message}` 
        });
      });
    });
  }
}