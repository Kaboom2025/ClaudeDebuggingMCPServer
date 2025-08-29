#!/usr/bin/env python3
"""
Example Python script for testing the Python Debug MCP Server.
This script demonstrates various debugging scenarios.
"""

def fibonacci(n):
    """Calculate fibonacci number recursively."""
    print(f"Calculating fibonacci({n})")
    
    if n <= 1:
        return n
    
    result = fibonacci(n - 1) + fibonacci(n - 2)
    return result

def process_data(data):
    """Process a list of data with some potential issues."""
    results = []
    
    for i, item in enumerate(data):
        print(f"Processing item {i}: {item}")
        
        # This might cause issues with certain data types
        if isinstance(item, str):
            processed = item.upper()
        elif isinstance(item, (int, float)):
            processed = item * 2
        else:
            processed = str(item)
            
        results.append(processed)
    
    return results

def main():
    """Main function demonstrating various scenarios."""
    print("🐍 Starting Python Debug Example")
    
    # Test fibonacci calculation
    print("\n--- Fibonacci Test ---")
    fib_number = 5
    result = fibonacci(fib_number)
    print(f"Fibonacci({fib_number}) = {result}")
    
    # Test data processing
    print("\n--- Data Processing Test ---")
    test_data = ["hello", 42, 3.14, [1, 2, 3], None]
    processed = process_data(test_data)
    print(f"Processed data: {processed}")
    
    # Test variable inspection
    print("\n--- Variable Inspection Test ---")
    local_var = "This is a local variable"
    numbers = [1, 2, 3, 4, 5]
    user_info = {
        "name": "Claude",
        "type": "AI Assistant",
        "capabilities": ["debugging", "coding", "analysis"]
    }
    
    print(f"Local variable: {local_var}")
    print(f"Numbers: {numbers}")
    print(f"User info: {user_info}")
    
    # Intentional breakpoint location for testing
    breakpoint_marker = "Set a breakpoint on this line to inspect variables"
    print(f"Debug marker: {breakpoint_marker}")
    
    print("\n🎉 Python Debug Example completed!")

if __name__ == "__main__":
    main()