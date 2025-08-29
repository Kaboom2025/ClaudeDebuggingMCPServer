# Python Debug MCP Server - Examples

This directory contains example Python applications for testing the MCP debugger.

## Available Examples

### 1. Flask Web Application (`app.py` and `app_fixed.py`)

**app.py** - Demonstrates common Flask debugging scenarios:
- KeyError when accessing missing request data
- Variable inspection in request handlers
- Debugging HTTP endpoints

**app_fixed.py** - Shows the corrected version with proper error handling

#### Usage:
```bash
# Start with debugpy
python3 -m debugpy --listen localhost:5678 app.py

# In Claude Code, use:
# Tool: attach_to_debugpy
# Arguments: { "script_path": "examples/app.py" }
```

#### Debugging Scenarios:
1. **Missing Field Error**: POST to `/users` without `email` field
2. **Variable Inspection**: Examine `user_data` in breakpoint
3. **Error Handling**: Compare behavior with `app_fixed.py`

### 2. General Python Script (`example.py`)

A comprehensive Python script demonstrating various debugging scenarios:
- Function calls and stack traces
- Variable manipulation
- Loop debugging
- Exception handling

#### Usage:
```bash
python3 -m debugpy --listen localhost:5678 example.py
```

## Quick Test Commands

### Flask App Testing
```bash
# Start Flask app with debugpy
python3 -m debugpy --listen localhost:5678 examples/app.py

# In another terminal, trigger breakpoints:
curl -X POST http://localhost:5001/users -H "Content-Type: application/json" -d '{"name": "John Doe"}'
```

### Debug Workflow
1. **Attach debugger**: `attach_to_debugpy` tool
2. **Set breakpoint**: `set_breakpoint` on line 13 of app.py  
3. **Trigger**: Make HTTP request
4. **Inspect**: Use `get_variables` and `get_call_stack`
5. **Continue**: Use `debug_continue` to resume

## Common Debugging Points

### Flask App (app.py)
- **Line 13**: KeyError location - `user_data['email']`
- **Line 12**: Variable inspection - examine `user_data`
- **Line 10**: Function entry point

### General Script (example.py)  
- **Line 8**: Function definition
- **Line 15**: Loop iteration
- **Line 22**: Exception handling

## Expected Outcomes

### Successful Debugging Session
✅ Attach to debugpy session  
✅ Set breakpoints at specified lines  
✅ Pause execution when breakpoints hit  
✅ Inspect variables in current scope  
✅ Step through code line by line  
✅ Evaluate expressions in debug context  

### Flask Debug Mode Issues (Resolved)
If you see Werkzeug debugger HTML instead of breakpoints:
- Ensure `app.run(debug=False)` in your Flask app
- Restart Flask with debugpy after changing debug mode
- The MCP debugger will warn you about debug mode conflicts