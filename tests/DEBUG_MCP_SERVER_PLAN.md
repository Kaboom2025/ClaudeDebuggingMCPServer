# Debug MCP Server Testing Plan

## Current Issue
The Python Debug MCP Server is not working due to hardcoded `python` commands that don't exist on macOS systems where Python is installed as `python3`.

## What We've Done So Far

### ✅ Identified the Root Cause
- MCP server has hardcoded `spawn('python', [` in 3 locations in `processManager.ts`:
  - Line 42: Main Python process spawning
  - Line 74: Debugpy availability check  
  - Line 269: Version check
- These should use `python3` instead of `python`

### ✅ Fixed the TypeScript Code
- Replaced all `spawn('python',` with `spawn('python3',` in `src/processManager.ts`
- Successfully rebuilt the TypeScript project (`npm run build`)
- Verified the built JavaScript contains the fixes

### ✅ Demonstrated Flask App Bug
- Created test that shows Flask app crashes with `KeyError: 'email'` on line 13
- App tries to access `user_data['email']` without checking if key exists
- Successfully reproduced the crash with test requests

## Current Problem: MCP Connection Caching

The MCP server connection is still using the old version despite our fixes because:
- MCP server process started before our fixes
- Built code is correct, but running process hasn't picked up changes
- `mcp__python-debug__check_python_setup` still shows old error

## Testing Plan

### Phase 1: Verify MCP Server Fix
1. **Restart Claude Code** to refresh MCP connections
2. **Test Python Setup**: Run `mcp__python-debug__check_python_setup`
   - Should now show: `✅ Python: Available (Python 3.13.2)`
3. **Test Direct Server**: Run `node build/index.js` to test without MCP layer

### Phase 2: Debug Flask App
1. **Start Debug Session**: Use `mcp__python-debug__start_debug_session` on `app.py`
2. **Set Breakpoint**: Place breakpoint on line 13 (the problematic line)
3. **Trigger Crash**: Send POST request missing `email` field
4. **Inspect Variables**: Use debugger to examine `user_data` contents
5. **Step Through Code**: Show exactly where and why the KeyError occurs

### Phase 3: Demonstrate Fix
1. **Show Fixed Version**: Compare `app.py` vs `app_fixed.py`
2. **Test Fixed Version**: Run same test on fixed version
3. **Explain Best Practices**: 
   - Use `.get()` method with defaults
   - Validate required fields
   - Return proper error responses

### Phase 4: Validate MCP Debugging Tools
Test all MCP debugging functions:
- `start_debug_session` ✓ 
- `set_breakpoint` 
- `debug_step_over`
- `get_variables`
- `evaluate_expression`
- `get_call_stack`

## Expected Outcomes

1. **MCP Server Works**: Python setup check passes
2. **Debug Session Starts**: Can attach to Flask app
3. **Breakpoints Work**: Can pause execution at specific lines  
4. **Variable Inspection**: Can examine request data and see missing `email` key
5. **Step Debugging**: Can step through code line by line
6. **Expression Evaluation**: Can test fixes in real-time

## Test Files Created

- `app.py` - Original Flask app with KeyError bug
- `app_fixed.py` - Fixed version with proper error handling
- `test_flask_crash.py` - Test script to reproduce the crash
- `DEBUG_MCP_SERVER_PLAN.md` - This planning document

## Success Criteria

✅ MCP server `check_python_setup` returns success  
✅ Can start debug session on Flask app  
✅ Can set breakpoints and inspect variables  
✅ Can step through code and see exact crash location  
✅ Can demonstrate the fix prevents the crash  

This plan will prove that the MCP Python Debug Server works correctly for real-world debugging scenarios.