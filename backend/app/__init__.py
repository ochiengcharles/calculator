from flask import Flask
from flask_cors import CORS

try:
    from backend.config import Config
    from backend.app.extensions import db
    from backend.app.routes.calculator import calculator_bp
except ImportError:
    from config import Config
    from app.extensions import db
    from app.routes.calculator import calculator_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    CORS(app, resources={r'/api/*': {'origins': '*'}}, supports_credentials=True)
    app.register_blueprint(calculator_bp)

    with app.app_context():
        db.create_all()

    return app
