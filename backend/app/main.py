import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import engine, Base
from .services.state_manager import state_manager
from .services.background import run_tick_loop, run_replication_loop, run_health_check_loop
from .ws.manager import ws_manager
from .routers import traffic, system, internal


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    state_manager.initialize()

    if settings.ROLE == "primary":
        asyncio.create_task(run_tick_loop())
        asyncio.create_task(run_replication_loop())
    else:
        asyncio.create_task(run_health_check_loop())

    yield


app = FastAPI(title="Smart Traffic API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(traffic.router)
app.include_router(system.router)
app.include_router(internal.router)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    await websocket.send_json({
        "type": "state_update",
        "data": state_manager.build_state_payload(),
    })
    await websocket.send_json({
        "type": "system_status",
        "data": state_manager.get_system_status(),
    })
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)