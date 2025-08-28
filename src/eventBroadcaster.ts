import { EventEmitter } from 'events';
import { DebugEvent, logger } from './logger.js';

export interface DebugSessionState {
  sessionId: string;
  scriptPath: string;
  state: 'starting' | 'running' | 'paused' | 'stopped' | 'error';
  port: number;
  startTime: Date;
  currentLocation?: {
    file: string;
    line: number;
    function?: string;
  };
  breakpoints: Array<{
    id: number;
    file: string;
    line: number;
    verified: boolean;
  }>;
  variables?: Array<{
    name: string;
    value: string;
    type?: string;
    scope: string;
  }>;
  stackFrames?: Array<{
    id: number;
    name: string;
    file?: string;
    line: number;
  }>;
}

export interface ClaudeCodeEvent {
  type: 'session_state_changed' | 'debug_event' | 'program_output' | 'variable_inspected';
  timestamp: Date;
  sessionId: string;
  data: any;
}

export class EventBroadcaster extends EventEmitter {
  private static instance: EventBroadcaster | null = null;
  private sessionStates: Map<string, DebugSessionState> = new Map();

  static getInstance(): EventBroadcaster {
    if (!this.instance) {
      this.instance = new EventBroadcaster();
    }
    return this.instance;
  }

  constructor() {
    super();
    
    // Listen to debug events from logger
    logger.on('debugEvent', (event: DebugEvent) => {
      this.handleDebugEvent(event);
    });
  }

  // Update session state and broadcast to Claude Code
  updateSessionState(sessionId: string, updates: Partial<DebugSessionState>): void {
    const currentState = this.sessionStates.get(sessionId);
    const newState: DebugSessionState = {
      ...currentState,
      ...updates,
      sessionId
    } as DebugSessionState;

    this.sessionStates.set(sessionId, newState);

    // Broadcast state change to Claude Code debug panel
    this.broadcastToClaudeCode({
      type: 'session_state_changed',
      timestamp: new Date(),
      sessionId,
      data: newState
    });
  }

  // Get current session state
  getSessionState(sessionId: string): DebugSessionState | undefined {
    return this.sessionStates.get(sessionId);
  }

  // Get all session states
  getAllSessionStates(): DebugSessionState[] {
    return Array.from(this.sessionStates.values());
  }

  // Remove session state
  removeSessionState(sessionId: string): void {
    this.sessionStates.delete(sessionId);
    
    // Notify Claude Code that session is gone
    this.broadcastToClaudeCode({
      type: 'session_state_changed',
      timestamp: new Date(),
      sessionId,
      data: null // null indicates session removal
    });
  }

  // Handle debug events and update session state accordingly
  private handleDebugEvent(event: DebugEvent): void {
    const sessionState = this.sessionStates.get(event.sessionId);
    
    if (sessionState) {
      // Update session state based on debug event
      switch (event.category) {
        case 'execution':
          if (event.message.includes('EXECUTION PAUSED')) {
            sessionState.state = 'paused';
            if (event.data?.location) {
              sessionState.currentLocation = this.parseLocation(event.data.location);
            }
          } else if (event.message.includes('continued') || event.message.includes('Continue')) {
            sessionState.state = 'running';
          }
          break;
          
        case 'breakpoint':
          // Update breakpoints array if needed
          if (event.data && event.data.file && event.data.line) {
            this.updateBreakpointsInState(sessionState, event.data);
          }
          break;
          
        case 'inspection':
          // Update variables if this was a variable inspection
          if (event.data?.variables) {
            sessionState.variables = event.data.variables;
          }
          if (event.data?.stackFrames) {
            sessionState.stackFrames = event.data.stackFrames;
          }
          break;
      }
      
      this.sessionStates.set(event.sessionId, sessionState);
    }

    // Broadcast the debug event to Claude Code
    this.broadcastToClaudeCode({
      type: 'debug_event',
      timestamp: event.timestamp,
      sessionId: event.sessionId,
      data: event
    });
  }

  // Parse location string into structured data
  private parseLocation(location: string): { file: string; line: number; function?: string } | undefined {
    // Expected format: "file.py:25 in function_name()" or "file.py:25"
    const match = location.match(/^(.+):(\d+)(?:\s+in\s+(.+))?$/);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2]),
        function: match[3]
      };
    }
    return undefined;
  }

  // Update breakpoints in session state
  private updateBreakpointsInState(sessionState: DebugSessionState, data: any): void {
    if (!sessionState.breakpoints) {
      sessionState.breakpoints = [];
    }
    
    // Add or update breakpoint
    if (data.action === 'set' || data.action === 'add') {
      const existingIndex = sessionState.breakpoints.findIndex(
        bp => bp.file === data.file && bp.line === data.line
      );
      
      const breakpoint = {
        id: data.id || Date.now(),
        file: data.file,
        line: data.line,
        verified: data.verified !== false
      };
      
      if (existingIndex >= 0) {
        sessionState.breakpoints[existingIndex] = breakpoint;
      } else {
        sessionState.breakpoints.push(breakpoint);
      }
    }
    
    // Remove breakpoint
    if (data.action === 'remove') {
      sessionState.breakpoints = sessionState.breakpoints.filter(
        bp => !(bp.file === data.file && bp.line === data.line)
      );
    }
  }

  // Broadcast event to Claude Code debug panel
  private broadcastToClaudeCode(event: ClaudeCodeEvent): void {
    // Emit event for Claude Code integration
    // This would be consumed by Claude Code's debug panel
    this.emit('claude_code_event', event);
    
    // For now, also log to debug output for development
    if (process.env.NODE_ENV === 'development') {
      console.error(`🎯 [CLAUDE_CODE_EVENT] ${event.type}:`, JSON.stringify(event.data, null, 2));
    }
  }

  // Methods for external components to trigger broadcasts
  
  // Broadcast program output
  broadcastProgramOutput(sessionId: string, output: string, source: 'stdout' | 'stderr'): void {
    this.broadcastToClaudeCode({
      type: 'program_output',
      timestamp: new Date(),
      sessionId,
      data: {
        output,
        source,
        scriptPath: this.sessionStates.get(sessionId)?.scriptPath
      }
    });
  }

  // Broadcast variable inspection results
  broadcastVariableInspection(
    sessionId: string, 
    variables: Array<{ name: string; value: string; type?: string; scope: string }>
  ): void {
    // Update session state
    const sessionState = this.sessionStates.get(sessionId);
    if (sessionState) {
      sessionState.variables = variables;
      this.sessionStates.set(sessionId, sessionState);
    }

    this.broadcastToClaudeCode({
      type: 'variable_inspected',
      timestamp: new Date(),
      sessionId,
      data: { variables }
    });
  }

  // Broadcast stack frame information
  broadcastStackFrames(
    sessionId: string,
    stackFrames: Array<{ id: number; name: string; file?: string; line: number }>
  ): void {
    // Update session state
    const sessionState = this.sessionStates.get(sessionId);
    if (sessionState) {
      sessionState.stackFrames = stackFrames;
      this.sessionStates.set(sessionId, sessionState);
    }

    this.broadcastToClaudeCode({
      type: 'debug_event',
      timestamp: new Date(),
      sessionId,
      data: {
        category: 'inspection',
        message: 'Stack frames updated',
        stackFrames
      }
    });
  }
}

// Export singleton instance
export const eventBroadcaster = EventBroadcaster.getInstance();