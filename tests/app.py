# app.py - User's clean code
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/users', methods=['POST'])
def create_user():
    user_data = request.get_json()
    print(f"Received user data: {user_data}")
    
    user = {
        'name': user_data['name'],
        'email': user_data['email'],  # Will cause KeyError
        'age': user_data.get('age', 25)
    }
    
    return jsonify(user)

if __name__ == '__main__':
    app.run(debug=True, port=5001)