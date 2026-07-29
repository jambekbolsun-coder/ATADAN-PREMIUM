import os
os.environ["DATABASE_URL"] = "sqlite:///./test_atadan.db"
from fastapi.testclient import TestClient
from app.main import app


def test_health():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_tractors_and_lead():
    with TestClient(app) as client:
        tractors = client.get("/api/tractors")
        assert tractors.status_code == 200
        assert len(tractors.json()) >= 7
        lead = client.post("/api/leads", json={"name":"Тест","phone":"+996700000000","message":"CFF1204","source":"pytest"})
        assert lead.status_code == 201
        assert lead.json()["status"] == "created"
