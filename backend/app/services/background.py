import asyncio
import httpx
from ..config import settings
from ..engine import tick
from ..services.state_manager import state_manager
from ..ws.manager import ws_manager


async def run_tick_loop():
    while True:
        await asyncio.sleep(settings.TICK_INTERVAL)
        if not state_manager.is_active:
            continue
        current = await state_manager.get_state()
        new_state, events = tick(current, dt=settings.TICK_INTERVAL)
        await state_manager.set_state(new_state)

        await ws_manager.broadcast({
            "type": "state_update",
            "data": state_manager.build_state_payload(),
        })

        for event in events:
            await state_manager.record_event(event.event_type, event.direction, event.payload)
            await ws_manager.broadcast({
                "type": "event",
                "data": {
                    "event_type": event.event_type,
                    "direction": event.direction,
                    "payload": event.payload,
                },
            })


async def run_replication_loop():
    async with httpx.AsyncClient() as client:
        while True:
            await asyncio.sleep(settings.REPLICATION_INTERVAL)
            if not state_manager.is_active:
                continue
            payload = state_manager.build_state_payload(include_internals=True)
            try:
                await client.post(
                    f"{settings.BACKUP_URL}/internal/replicate",
                    json=payload,
                    timeout=2.0,
                )
            except Exception:
                pass


async def run_health_check_loop():
    fail_count = 0
    async with httpx.AsyncClient() as client:
        while True:
            await asyncio.sleep(settings.HEALTH_CHECK_INTERVAL)
            if state_manager.is_active:
                break
            try:
                resp = await client.get(
                    f"{settings.PRIMARY_URL}/health",
                    timeout=2.0,
                )
                if resp.status_code == 200:
                    fail_count = 0
                    state_manager.mark_primary_alive()
                else:
                    raise Exception("non-200")
            except Exception:
                fail_count += 1
                state_manager.mark_primary_down()
                await ws_manager.broadcast({
                    "type": "system_status",
                    "data": {
                        **state_manager.get_system_status(),
                        "health_fail_count": fail_count,
                        "health_fail_threshold": settings.HEALTH_FAIL_THRESHOLD,
                    },
                })
                if fail_count >= settings.HEALTH_FAIL_THRESHOLD:
                    await _promote_to_primary()
                    break


async def _promote_to_primary():
    state_manager.promote_to_primary()
    await ws_manager.broadcast({
        "type": "system_status",
        "data": {
            **state_manager.get_system_status(),
            "failover": True,
        },
    })
    asyncio.create_task(run_tick_loop())