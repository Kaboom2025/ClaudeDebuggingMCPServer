import { createConnection, Socket } from 'net';
import { EventEmitter } from 'events';
import { logger } from './logger.js';

export interface DAPRequest {
  seq: number;
  type: 'request';
  command: string;
  arguments?: any;
}

export interface DAPResponse {
  seq: number;
  type: 'response';
  request_seq: number;
  success: boolean;
  command: string;
  message?: string;
  body?: any;
}

export interface DAPEvent {
  seq: number;
  type: 'event';
  event: string;
  body?: any;
}

export type DAPMessage = DAPRequest | DAPResponse | DAPEvent;

export interface Variable {
  name: string;
  value: string;
  type?: string;
  variablesReference: number;
}

export interface StackFrame {
  id: number;
  name: string;
  source?: {
    name?: string;
    path?: string;
  };
  line: number;
  column: number;
}

export interface Thread {
  id: number;
  name: string;
}

export class DAPClient extends EventEmitter {
  private socket: Socket | null = null;
  private connected = false;
  private sequenceNumber = 1;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
  private messageBuffer = '';
  private sessionId?: string;

  constructor(private port: number, sessionId?: string) {
    super();
    this.sessionId = sessionId;
  }

  async connect(timeout = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`Connection timeout after ${timeout}ms`));
      }, timeout);

      this.socket = createConnection({ port: this.port, host: 'localhost' });

      this.socket.on('connect', () => {
        clearTimeout(timeoutHandle);
        this.connected = true;
        if (this.sessionId) {
          logger.system(this.sessionId, `Connected to debugpy on port ${this.port}`);
        }
        resolve();
      });

      this.socket.on('data', (data) => {
        this.handleData(data);
      });

      this.socket.on('error', (error) => {
        clearTimeout(timeoutHandle);
        if (this.sessionId) {
          logger.systemError(this.sessionId, `DAP connection error: ${error.message}`, { error: error.message });
        }
        reject(error);
      });

      this.socket.on('close', () => {
        this.connected = false;
        if (this.sessionId) {
          logger.system(this.sessionId, `DAP connection closed`);
        }
        this.emit('disconnected');
      });
    });
  }

  async close(): Promise<void> {
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
    this.connected = false;
  }

  private handleData(data: Buffer): void {
    this.messageBuffer += data.toString();

    while (true) {
      const headerEnd = this.messageBuffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        break; // Incomplete message
      }

      const headers = this.messageBuffer.substring(0, headerEnd);
      const contentLengthMatch = headers.match(/Content-Length: (\d+)/);
      
      if (!contentLengthMatch) {
        if (this.sessionId) {
          logger.systemError(this.sessionId, 'No Content-Length header found in DAP message');
        }
        break;
      }

      const contentLength = parseInt(contentLengthMatch[1]);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;

      if (this.messageBuffer.length < messageEnd) {
        break; // Incomplete message
      }

      const messageContent = this.messageBuffer.substring(messageStart, messageEnd);
      this.messageBuffer = this.messageBuffer.substring(messageEnd);

      try {
        const message: DAPMessage = JSON.parse(messageContent);
        this.handleMessage(message);
      } catch (error) {
        if (this.sessionId) {
          logger.systemError(this.sessionId, `Failed to parse DAP message: ${error}`, { error: error?.toString() });
        }
      }
    }
  }

  private handleMessage(message: DAPMessage): void {
    if (message.type === 'response') {
      const response = message as DAPResponse;
      const pending = this.pendingRequests.get(response.request_seq);
      if (pending) {
        this.pendingRequests.delete(response.request_seq);
        if (response.success) {
          pending.resolve(response.body);
        } else {
          pending.reject(new Error(response.message || 'Request failed'));
        }
      }
    } else if (message.type === 'event') {
      const event = message as DAPEvent;
      
      // Log DAP events with appropriate detail level
      if (this.sessionId) {
        logger.system(this.sessionId, `DAP Event: ${event.event}`, { 
          event: event.event,
          body: event.body 
        });
      }
      
      this.emit('event', event);
      this.emit(event.event, event.body);
    }
  }

  private async sendRequest(command: string, args?: any): Promise<any> {
    if (!this.connected || !this.socket) {
      throw new Error('DAP client not connected');
    }

    const request: DAPRequest = {
      seq: this.sequenceNumber++,
      type: 'request',
      command,
      arguments: args
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(request.seq, { resolve, reject });

      const messageContent = JSON.stringify(request);
      const message = `Content-Length: ${messageContent.length}\r\n\r\n${messageContent}`;

      this.socket!.write(message);

      // Add timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(request.seq)) {
          this.pendingRequests.delete(request.seq);
          reject(new Error(`Request timeout: ${command}`));
        }
      }, 10000);
    });
  }

  async initialize(): Promise<any> {
    return this.sendRequest('initialize', {
      clientID: 'python-debug-mcp-server',
      clientName: 'Python Debug MCP Server',
      adapterID: 'python',
      pathFormat: 'path',
      linesStartAt1: true,
      columnsStartAt1: true,
      supportsVariableType: true,
      supportsVariablePaging: true,
      supportsRunInTerminalRequest: false
    });
  }

  async launch(program: string): Promise<any> {
    return this.sendRequest('launch', {
      program,
      console: 'internalConsole',
      cwd: process.cwd(),
      stopOnEntry: false
    });
  }

  async attach(): Promise<any> {
    // debugpy attach request format for local debugging
    return this.sendRequest('attach', {
      pathMappings: [{
        localRoot: process.cwd(),
        remoteRoot: process.cwd()
      }],
      justMyCode: false
    });
  }

  async setBreakpoints(source: string, lines: number[]): Promise<any> {
    return this.sendRequest('setBreakpoints', {
      source: { path: source },
      breakpoints: lines.map(line => ({ line }))
    });
  }

  async configurationDone(): Promise<any> {
    return this.sendRequest('configurationDone');
  }

  async continue(threadId: number): Promise<any> {
    return this.sendRequest('continue', { threadId });
  }

  async stepOver(threadId: number): Promise<any> {
    return this.sendRequest('next', { threadId });
  }

  async stepIn(threadId: number): Promise<any> {
    return this.sendRequest('stepIn', { threadId });
  }

  async stepOut(threadId: number): Promise<any> {
    return this.sendRequest('stepOut', { threadId });
  }

  async pause(threadId: number): Promise<any> {
    return this.sendRequest('pause', { threadId });
  }

  async threads(): Promise<Thread[]> {
    const response = await this.sendRequest('threads');
    return response.threads || [];
  }

  async stackTrace(threadId: number): Promise<StackFrame[]> {
    const response = await this.sendRequest('stackTrace', { threadId });
    return response.stackFrames || [];
  }

  async scopes(frameId: number): Promise<any[]> {
    const response = await this.sendRequest('scopes', { frameId });
    return response.scopes || [];
  }

  async variables(variablesReference: number): Promise<Variable[]> {
    const response = await this.sendRequest('variables', { variablesReference });
    return response.variables || [];
  }

  async evaluate(expression: string, frameId?: number): Promise<any> {
    return this.sendRequest('evaluate', {
      expression,
      frameId,
      context: 'repl'
    });
  }

  async disconnect(): Promise<any> {
    try {
      await this.sendRequest('disconnect');
    } catch (error) {
      // Ignore disconnect errors
    }
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
    this.connected = false;
  }
}