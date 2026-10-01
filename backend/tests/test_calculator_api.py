import pytest

from app import create_app
from app.extensions import db


@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite://'
    with app.app_context():
        db.create_all()
    with app.test_client() as client:
        yield client
    with app.app_context():
        db.session.remove()
        db.drop_all()


def test_addition(client):
    response = client.post('/api/calculate', json={'expression': '2 + 2', 'angle_mode': 'DEG'})
    assert response.status_code == 200
    payload = response.get_json()
    assert payload['success'] is True
    assert payload['result'] == 4.0


def test_division_by_zero(client):
    response = client.post('/api/calculate', json={'expression': '10 / 0', 'angle_mode': 'DEG'})
    assert response.status_code == 400
    payload = response.get_json()
    assert payload['success'] is False
    assert 'Cannot divide by zero' in payload['error']


def test_sqrt(client):
    response = client.post('/api/calculate', json={'expression': 'sqrt(144)', 'angle_mode': 'DEG'})
    assert response.status_code == 200
    assert response.get_json()['result'] == 12.0


def test_sin_degree(client):
    response = client.post('/api/calculate', json={'expression': 'sin(90)', 'angle_mode': 'DEG'})
    assert response.status_code == 200
    assert abs(response.get_json()['result'] - 1.0) < 1e-9


def test_history_round_trip(client):
    create_response = client.post('/api/calculate', json={'expression': '5 * 5', 'angle_mode': 'DEG'})
    assert create_response.status_code == 200
    history_response = client.get('/api/history')
    assert history_response.status_code == 200
    entries = history_response.get_json()
    assert len(entries) == 1
    assert entries[0]['expression'] == '5 * 5'
    delete_response = client.delete(f"/api/history/{entries[0]['id']}")
    assert delete_response.status_code == 200
    assert client.get('/api/history').get_json() == []
