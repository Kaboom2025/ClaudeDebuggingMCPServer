# app_fixed.py - Fixed version of the Flask app
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/users', methods=['POST'])
def create_user():
    user_data = request.get_json()
    print(f"Received user data: {user_data}")
    
    # Fixed: Use .get() method with default values or check for required fields
    if not user_data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Check for required fields
    if 'name' not in user_data:
        return jsonify({'error': 'Name is required'}), 400
    
    user = {
        'name': user_data['name'],
        'email': user_data.get('email', 'no-email@example.com'),  # Fixed: use .get() with default
        'age': user_data.get('age', 25)
    }
    
    return jsonify(user)

if __name__ == '__main__':
    app.run(debug=True, port=5002)