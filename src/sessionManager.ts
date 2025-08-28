import { v4 as uuidv4 } from 'uuid';
import { ChildProcess } from 'child_process';
import { DAPClient } from './dapClient.js';
import { logger } from './logger.js';
import { eventBroadcaster } from './eventBroadcaster.js';

export interface Breakpoint {
  id: number;
  file: string;
  line: number;
  verified?: boolean;
}

export interface DebugSession {
  id: string;
  scriptPath: string;
  pythonProcess: ChildProcess | null;
  dapClient: DAPClient | null;
  port: number;
  state: 'starting' | 'running' | 'paused' | 'stopped' | 'error';
  breakpoints: Map<string, Breakpoint[]>; // file -> breakpoints
  currentThreadId?: number;
  currentFrameId?: number;
  startTime: Date;
}

export class SessionManager {
  private sessions: Map<string, DebugSession> = new Map();
  private static portCounter = 5678; // Starting port for debugpy

  createSession(scriptPath: string): DebugSession {
    const sessionId = uuidv4();
    const port = SessionManager.getNextPort();
    
    const session: DebugSession = {
      id: sessionId,
      scriptPath,
      pythonProcess: null,
      dapClient: null,
      port,
      state: 'starting',
      breakpoints: new Map(),
      startTime: new Date()
    };

    this.sessions.set(sessionId, session);
    logger.session(sessionId, `Created debug session for ${scriptPath} on port ${port}`, {
      scriptPath,
      port,
      sessionId
    });
    
    return session;
  }

  getSession(sessionId: string): DebugSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): DebugSession[] {
    return Array.from(this.sessions.values());
  }

  updateSessionState(sessionId: string, state: DebugSession['state']): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      const oldState = session.state;
      session.state = state;
      logger.session(sessionId, `Session state changed: ${oldState} → ${state}`, {
        oldState,
        newState: state
      });
    }
  }

  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    logger.session(sessionId, `Terminating session`, { scriptPath: session.scriptPath });

    // Close DAP client connection
    if (session.dapClient) {
      await session.dapClient.close();
      session.dapClient = null;
    }

    // Kill Python process
    if (session.pythonProcess && !session.pythonProcess.killed) {
      session.pythonProcess.kill('SIGTERM');
      
      // Force kill if it doesn't terminate gracefully
      setTimeout(() => {
        if (session.pythonProcess && !session.pythonProcess.killed) {
          logger.system(sessionId, `Force killing Python process`);
          session.pythonProcess.kill('SIGKILL');
        }
      }, 2000);
    }

    session.state = 'stopped';
    
    // Remove from event broadcaster
    eventBroadcaster.removeSessionState(sessionId);
    
    this.sessions.delete(sessionId);
  }

  async terminateAllSessions(): Promise<void> {
    const sessions = Array.from(this.sessions.keys());
    await Promise.all(sessions.map(id => this.terminateSession(id)));
  }

  setBreakpoints(sessionId: string, file: string, breakpoints: Breakpoint[]): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.breakpoints.set(file, breakpoints);
      logger.breakpoint(sessionId, `Updated breakpoints for ${file}: ${breakpoints.length} breakpoints`, {
        file,
        breakpointCount: breakpoints.length,
        breakpoints: breakpoints.map(bp => ({ line: bp.line, verified: bp.verified }))
      });
    }
  }

  getBreakpoints(sessionId: string, file?: string): Breakpoint[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    if (file) {
      return session.breakpoints.get(file) || [];
    }

    // Return all breakpoints across all files
    const allBreakpoints: Breakpoint[] = [];
    for (const fileBreakpoints of session.breakpoints.values()) {
      allBreakpoints.push(...fileBreakpoints);
    }
    return allBreakpoints;
  }

  private static getNextPort(): number {
    return ++this.portCounter;
  }

  getSessionStats(): { total: number; running: number; paused: number; stopped: number } {
    const sessions = Array.from(this.sessions.values());
    return {
      total: sessions.length,
      running: sessions.filter(s => s.state === 'running').length,
      paused: sessions.filter(s => s.state === 'paused').length,
      stopped: sessions.filter(s => s.state === 'stopped').length
    };
  }
}