from fastapi import APIRouter
from ..services.state_manager import state_manager
from ..ws.manager import ws_manager

router = APIRouter(tags=["system"])

_simulating_failure = False


@router.get("/health")
async def health():
    if _simulating_failure:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Simulated failure")
    return {"status": "ok", "role": state_manager.role}


@router.get("/status")
async def status():
    return {
        **state_manager.get_system_status(),
        "active_connections": ws_manager.active_connections,
    }


@router.post("/simulate-failure")
async def simulate_failure():
    global _simulating_failure
    _simulating_failure = True
    await ws_manager.broadcast({
        "type": "system_status",
        "data": {**state_manager.get_system_status(), "simulated_failure": True},
    })
    return {"ok": True, "message": "Primary will appear down to health checks."}


@router.post("/restore")
async def restore():
    global _simulating_failure
    _simulating_failure = False
    await ws_manager.broadcast({
        "type": "system_status",
        "data": {**state_manager.get_system_status(), "simulated_failure": False},
    })
    return {"ok": True, "message": "Primary restored."}