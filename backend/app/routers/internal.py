from fastapi import APIRouter, HTTPException
from ..services.state_manager import state_manager
from ..ws.manager import ws_manager
from ..config import settings

router = APIRouter(prefix="/internal", tags=["internal"])


@router.post("/replicate")
async def replicate(data: dict):
    if settings.ROLE != "backup":
        raise HTTPException(status_code=403, detail="Only backup nodes accept replication.")

    state_manager.apply_replicated_state(data)

    await ws_manager.broadcast({
        "type": "state_update",
        "data": state_manager.build_state_payload(),
    })

    return {"ok": True}