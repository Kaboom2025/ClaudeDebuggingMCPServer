#!/usr/bin/env python3
"""
Test runner for MCP Python debugger examples.

This script helps test the debugging functionality across different Python application types.
"""

import subprocess
import sys
import time
import threading
from pathlib import Path

def run_with_debugpy(script_path: str, port: int = 5678):
    """Run a Python script with debugpy attached."""
    print(f"🚀 Starting {script_path} with debugpy on port {port}")
    
    cmd = [
        sys.executable, '-m', 'debugpy', 
        '--listen', f'localhost:{port}',
        str(script_path)
    ]
    
    try:
        # Run the script with debugpy
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=Path(__file__).parent
        )
        
        print(f"✅ Process started with PID {process.pid}")
        print(f"📡 Debugpy listening on port {port}")
        print(f"🔗 Attach with: mcp__python-debug__attach_to_debugpy")
        print(f"   Arguments: {{ \"script_path\": \"{script_path}\", \"port\": {port} }}")
        
        return process
        
    except Exception as e:
        print(f"❌ Failed to start {script_path}: {e}")
        return None

def monitor_process(process, script_name):
    """Monitor a process and print its output."""
    def print_output():
        if process.stdout:
            for line in iter(process.stdout.readline, ''):
                print(f"[{script_name}] {line.strip()}")
    
    def print_errors():
        if process.stderr:
            for line in iter(process.stderr.readline, ''):
                print(f"[{script_name} ERROR] {line.strip()}")
    
    # Start monitoring threads
    stdout_thread = threading.Thread(target=print_output, daemon=True)
    stderr_thread = threading.Thread(target=print_errors, daemon=True)
    
    stdout_thread.start()
    stderr_thread.start()
    
    return stdout_thread, stderr_thread

def test_flask_debugging():
    """Test Flask application debugging."""
    print("\n" + "="*60)
    print("🌶️ FLASK DEBUGGING TEST")
    print("="*60)
    
    script_path = Path(__file__).parent / "app.py"
    process = run_with_debugpy(script_path, port=5678)
    
    if process:
        print("\n📋 Flask Debugging Steps:")
        print("1. Attach debugger with port 5678")
        print("2. Set breakpoint at app.py:13 (KeyError line)")
        print("3. Make POST request:")
        print("   curl -X POST http://localhost:5001/users -H 'Content-Type: application/json' -d '{\"name\": \"John Doe\"}'")
        print("4. Inspect variables when breakpoint hits")
        print("5. Continue execution or step through code")
        
        # Monitor the process
        monitor_process(process, "Flask")
        
        try:
            # Let it run for a bit
            print("\n⏳ Flask app running... Press Ctrl+C to stop")
            process.wait()
        except KeyboardInterrupt:
            print("\n🛑 Stopping Flask app...")
            process.terminate()
            process.wait()

def test_async_debugging():
    """Test async application debugging.""" 
    print("\n" + "="*60)
    print("⚡ ASYNC DEBUGGING TEST") 
    print("="*60)
    
    script_path = Path(__file__).parent / "async_example.py"
    process = run_with_debugpy(script_path, port=5679)
    
    if process:
        print("\n📋 Async Debugging Steps:")
        print("1. Attach debugger with port 5679") 
        print("2. Set breakpoints in async functions:")
        print("   - Line 12: fetch_data() async function")
        print("   - Line 29: process_multiple_urls() concurrent execution")
        print("   - Line 46: simulate_processing() async sleep")
        print("3. Step through async/await code")
        print("4. Inspect async task states and results")
        
        monitor_process(process, "Async")
        
        try:
            print("\n⏳ Async example running... Press Ctrl+C to stop")
            process.wait()
        except KeyboardInterrupt:
            print("\n🛑 Stopping async example...")
            process.terminate()
            process.wait()

def test_class_debugging():
    """Test class-based debugging."""
    print("\n" + "="*60)
    print("🏗️ CLASS DEBUGGING TEST")
    print("="*60)
    
    script_path = Path(__file__).parent / "class_example.py"
    process = run_with_debugpy(script_path, port=5680)
    
    if process:
        print("\n📋 Class Debugging Steps:")
        print("1. Attach debugger with port 5680")
        print("2. Set breakpoints in class methods:")
        print("   - Line 19: process_item() method")
        print("   - Line 47: process_batch() loop")
        print("   - Line 64: get_stats() method")
        print("   - Line 82: AdvancedProcessor inheritance")
        print("3. Inspect object state (self) and method parameters")
        print("4. Debug inheritance and method overriding")
        
        monitor_process(process, "Class")
        
        try:
            print("\n⏳ Class example running... Press Ctrl+C to stop")
            process.wait()
        except KeyboardInterrupt:
            print("\n🛑 Stopping class example...")
            process.terminate()
            process.wait()

def main():
    """Main test runner."""
    print("🧪 MCP Python Debugger - Test Suite")
    print("="*60)
    
    if len(sys.argv) < 2:
        print("\nUsage: python test_runner.py <test_type>")
        print("\nAvailable tests:")
        print("  flask  - Test Flask web application debugging")
        print("  async  - Test async/await debugging")
        print("  class  - Test class-based debugging")
        print("  all    - Run all tests sequentially")
        return
    
    test_type = sys.argv[1].lower()
    
    if test_type == "flask":
        test_flask_debugging()
    elif test_type == "async":
        test_async_debugging()  
    elif test_type == "class":
        test_class_debugging()
    elif test_type == "all":
        print("🔄 Running all debugging tests...")
        print("Note: Each test will run until you press Ctrl+C")
        
        tests = [test_flask_debugging, test_async_debugging, test_class_debugging]
        for test in tests:
            try:
                test()
            except KeyboardInterrupt:
                print(f"\n⏩ Skipping to next test...")
                continue
    else:
        print(f"❌ Unknown test type: {test_type}")
        print("Available: flask, async, class, all")

if __name__ == "__main__":
    main()