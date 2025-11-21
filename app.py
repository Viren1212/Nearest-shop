from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user

app = Flask(__name__)
app.secret_key = "securekey123"

login_manager = LoginManager()
login_manager.init_app(app)

# -----------------
# User Model
# -----------------
class User(UserMixin):
    def __init__(self, id, username, role):
        self.id = id
        self.username = username
        self.role = role


# TEMP DATABASE
users = {
    "admin@example.com": {"password": "admin123", "role": "admin"},
    "user@example.com": {"password": "user123", "role": "user"},
}

@login_manager.user_loader
def load_user(user_id):
    for email, data in users.items():
        if email == user_id:
            return User(id=email, username=email, role=data["role"])
    return None


# -----------------
# LOGIN ROUTE
# -----------------
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if email in users and users[email]["password"] == password:
        user = User(id=email, username=email, role=users[email]["role"])
        login_user(user)
        return jsonify({"status": "success", "role": user.role})

    return jsonify({"status": "error", "message": "Invalid credentials"}), 401


# -----------------
# LOGOUT
# -----------------
@app.route("/logout")
@login_required
def logout():
    logout_user()
    return jsonify({"status": "logged_out"})

users = {
    "admin@example.com": {"password": "admin123", "role": "admin"},
    "user@example.com": {"password": "user123", "role": "user"},
}


# -----------------
# CHECK ROLE
# -----------------
@app.route("/api/whoami")
def whoami():
    if current_user.is_authenticated:
        return jsonify({"logged_in": True, "role": current_user.role})
    return jsonify({"logged_in": False})


# -----------------
# HOME
# -----------------
@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)
