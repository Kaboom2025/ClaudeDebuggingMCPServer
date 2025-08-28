#!/usr/bin/env python3

def fibonacci(n):
    """Calculate the nth Fibonacci number."""
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return fibonacci(n-1) + fibonacci(n-2)

def main():
    print("Starting Fibonacci calculator...")
    
    # Calculate some Fibonacci numbers
    for i in range(1, 8):
        result = fibonacci(i)
        print(f"fibonacci({i}) = {result}")
    
    # Introduce an error for testing error logging
    try:
        x = 10 / 0  # Division by zero error
    except ZeroDivisionError as e:
        print(f"Error occurred: {e}")
    
    print("Fibonacci calculation complete!")

if __name__ == "__main__":
    main()