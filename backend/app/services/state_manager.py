import asyncio
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import IntersectionState, TrafficEvent, SystemStatus
from ..schemas import ScenarioType
from ..engine import EngineState, build_initial_state, get_light_signals, SCENARIO_DIRECTIONS
from ..config import settings


class StateManager:
    def __init__(self):
        self._state: Optional[EngineState] = None
        self._lock = asyncio.Lock()
        self._role = settings.ROLE
        self._is_active = self._role == "primary"
        self._primary_alive = True
        self._failover_occurred = False

    def initialize(self):
        db = SessionLocal()
        try:
            row = db.query(IntersectionState).filter_by(id=1).first()
            if row:
                self._state = EngineState(
                    scenario=row.scenario,
                    phase=row.phase,
                    phase_elapsed=row.phase_elapsed,
                    queues=row.queues,
                    pedestrian_active=row.pedestrian_active,
                    pedestrian_direction=row.pedestrian_direction,
                    phase_cooldowns=row.phase_cooldowns or {},
                )
            else:
                self._state = build_initial_state("cross")
                self._persist_state(db)

            status_row = db.query(SystemStatus).filter_by(id=1).first()
            if not status_row:
                db.add(SystemStatus(
                    id=1,
                    role=self._role,
                    is_active=self._is_active,
                    primary_alive=True,
                    failover_occurred=False,
                ))
                db.commit()
        finally:
            db.close()

    def _persist_state(self, db: Session):
        if self._state is None:
            return
        row = db.query(IntersectionState).filter_by(id=1).first()
        if row:
            row.scenario = self._state.scenario
            row.phase = self._state.phase
            row.phase_elapsed = self._state.phase_elapsed
            row.queues = self._state.queues
            row.pedestrian_active = self._state.pedestrian_active
            row.pedestrian_direction = self._state.pedestrian_direction
            row.phase_cooldowns = self._state.phase_cooldowns
        else:
            db.add(IntersectionState(
                id=1,
                scenario=self._state.scenario,
                phase=self._state.phase,
                phase_elapsed=self._state.phase_elapsed,
                queues=self._state.queues,
                pedestrian_active=self._state.pedestrian_active,
                pedestrian_direction=self._state.pedestrian_direction,
                phase_cooldowns=self._state.phase_cooldowns,
            ))
        db.commit()

    def _persist_event(self, db: Session, event_type: str, direction: Optional[str], payload: dict) -> TrafficEvent:
        ev = TrafficEvent(event_type=event_type, direction=direction, payload=payload)
        db.add(ev)
        db.commit()
        db.refresh(ev)
        return ev

    async def get_state(self) -> EngineState:
        async with self._lock:
            return self._state

    async def set_state(self, state: EngineState):
        async with self._lock:
            self._state = state
            db = SessionLocal()
            try:
                self._persist_state(db)
            finally:
                db.close()

    async def record_event(self, event_type: str, direction: Optional[str], payload: dict) -> TrafficEvent:
        db = SessionLocal()
        try:
            return self._persist_event(db, event_type, direction, payload)
        finally:
            db.close()

    async def change_scenario(self, scenario: ScenarioType):
        async with self._lock:
            self._state = build_initial_state(scenario)
            db = SessionLocal()
            try:
                self._persist_state(db)
                self._persist_event(db, "scenario_changed", None, {"scenario": scenario})
            finally:
                db.close()

    def get_recent_events(self, limit: int = 50) -> list[TrafficEvent]:
        db = SessionLocal()
        try:
            return (
                db.query(TrafficEvent)
                .order_by(TrafficEvent.created_at.desc())
                .limit(limit)
                .all()
            )
        finally:
            db.close()

    def build_state_payload(self, include_internals: bool = False) -> dict:
        from ..engine.traffic_engine import get_light_signals
        s = self._state
        if s is None:
            return {}
        lights = get_light_signals(s)
        payload = {
            "scenario": s.scenario,
            "phase": s.phase,
            "phase_elapsed": s.phase_elapsed,
            "lights": lights,
            "pedestrian_active": s.pedestrian_active,
            "pedestrian_direction": s.pedestrian_direction,
            "active_directions": [l["direction"] for l in lights if l["signal"] == "green"],
            "queues": s.queues,
        }
        if include_internals:
            payload["phase_cooldowns"] = s.phase_cooldowns
        return payload

    def apply_replicated_state(self, data: dict):
        self._state = EngineState(
            scenario=data["scenario"],
            phase=data["phase"],
            phase_elapsed=data["phase_elapsed"],
            queues=data["queues"],
            pedestrian_active=data["pedestrian_active"],
            pedestrian_direction=data.get("pedestrian_direction"),
            phase_cooldowns=data.get("phase_cooldowns", {}),
        )
        db = SessionLocal()
        try:
            self._persist_state(db)
        finally:
            db.close()

    @property
    def is_active(self) -> bool:
        return self._is_active

    @property
    def role(self) -> str:
        return self._role

    @property
    def primary_alive(self) -> bool:
        return self._primary_alive

    @property
    def failover_occurred(self) -> bool:
        return self._failover_occurred

    def promote_to_primary(self):
        self._role = "primary"
        self._is_active = True
        self._primary_alive = False
        self._failover_occurred = True
        db = SessionLocal()
        try:
            row = db.query(SystemStatus).filter_by(id=1).first()
            if row:
                row.role = "primary"
                row.is_active = True
                row.primary_alive = False
                row.failover_occurred = True
                db.commit()
        finally:
            db.close()

    def mark_primary_down(self):
        self._primary_alive = False

    def mark_primary_alive(self):
        self._primary_alive = True

    def get_system_status(self) -> dict:
        return {
            "role": self._role,
            "is_active": self._is_active,
            "primary_alive": self._primary_alive,
            "failover_occurred": self._failover_occurred,
        }


state_manager = StateManager()