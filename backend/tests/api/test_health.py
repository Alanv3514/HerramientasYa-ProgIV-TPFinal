from fastapi.testclient import TestClient


def test_health_responde_ok(client: TestClient):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_permite_el_origen_del_frontend(client: TestClient):
    response = client.get("/health", headers={"Origin": "http://localhost:5174"})

    assert response.headers["access-control-allow-origin"] == "http://localhost:5174"


def test_cors_no_permite_otro_origen(client: TestClient):
    # RNF-05: el navegador bloquea la respuesta si no viene este header.
    response = client.get("/health", headers={"Origin": "http://sitio-malicioso.com"})

    assert "access-control-allow-origin" not in response.headers
