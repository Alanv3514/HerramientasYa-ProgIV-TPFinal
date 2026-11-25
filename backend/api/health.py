from fastapi import APIRouter

router = APIRouter(tags=["Estado"])


# Pública: la usan Docker Compose y el CI para saber si la API levantó.
@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
