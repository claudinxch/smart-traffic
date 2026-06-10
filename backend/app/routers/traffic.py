from fastapi import APIRouter, HTTPException
from ..schemas import TrafficEventIn, TrafficEventOut, ChangeScenarioRequest
from ..services.state_manager import state_manager
from ..engine import apply_event
from ..ws.manager import ws_manager

router = APIRouter(prefix="/traffic", tags=["traffic"])


@router.get("/state")
async def get_state():
    return state_manager.build_state_payload()


@router.get("/events", response_model=list[TrafficEventOut])
async def get_events(limit: int = 50):
    return state_manager.get_recent_events(limit)


@router.post("/events")
async def post_event(body: TrafficEventIn):
    if not state_manager.is_active:
        raise HTTPException(status_code=503, detail="This node is not the active primary.")

    current = await state_manager.get_state()
    new_state, engine_events = apply_event(current, body.event_type, body.direction)
    await state_manager.set_state(new_state)

    persisted = await state_manager.record_event(body.event_type, body.direction, body.payload)

    await ws_manager.broadcast({
        "type": "state_update",
        "data": state_manager.build_state_payload(),
    })

    await ws_manager.broadcast({
        "type": "event",
        "data": {
            "event_type": persisted.event_type,
            "direction": persisted.direction,
            "payload": persisted.payload,
            "id": persisted.id,
            "created_at": persisted.created_at.isoformat(),
        },
    })

    for ev in engine_events:
        await state_manager.record_event(ev.event_type, ev.direction, ev.payload)
        await ws_manager.broadcast({
            "type": "event",
            "data": {
                "event_type": ev.event_type,
                "direction": ev.direction,
                "payload": ev.payload,
            },
        })

    return {"ok": True}


@router.post("/scenario")
async def change_scenario(body: ChangeScenarioRequest):
    if not state_manager.is_active:
        raise HTTPException(status_code=503, detail="This node is not the active primary.")

    await state_manager.change_scenario(body.scenario)

    await ws_manager.broadcast({
        "type": "state_update",
        "data": state_manager.build_state_payload(),
    })
    await ws_manager.broadcast({
        "type": "event",
        "data": {
            "event_type": "scenario_changed",
            "direction": None,
            "payload": {"scenario": body.scenario},
        },
    })

    return {"ok": True}