#!/usr/bin/env python3
"""
Test script to demonstrate the Flask app KeyError crash
"""
import requests
import json
import time
import threading
from app import app

def run_flask_app():
    """Run the Flask app in a separate thread"""
    app.run(debug=True, port=5001, use_reloader=False)

def test_flask_crash():
    """Test the Flask app with data that will cause a KeyError"""
    # Give Flask a moment to start
    time.sleep(2)
    
    # Test 1: Valid request (should work)
    print("🧪 Test 1: Valid request with all fields")
    valid_data = {
        "name": "John Doe",
        "email": "john@example.com",
        "age": 30
    }
    
    try:
        response = requests.post('http://localhost:5001/users', 
                               json=valid_data, 
                               timeout=5)
        print(f"✅ Success: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 2: Missing email field (will cause KeyError crash)
    print("\n🧪 Test 2: Missing email field (will crash)")
    invalid_data = {
        "name": "Jane Doe",
        "age": 25
        # Missing 'email' key - this will cause KeyError on line 13
    }
    
    try:
        response = requests.post('http://localhost:5001/users', 
                               json=invalid_data, 
                               timeout=5)
        print(f"✅ Success: {response.status_code} - {response.json()}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    print("🚀 Starting Flask app and running crash test...")
    
    # Start Flask in background thread
    flask_thread = threading.Thread(target=run_flask_app, daemon=True)
    flask_thread.start()
    
    # Run the tests
    test_flask_crash()