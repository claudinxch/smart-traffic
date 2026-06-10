from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


ScenarioType = Literal["cross", "t_intersection", "main_road_priority", "heavy_traffic"]
DirectionType = Literal["north", "south", "east", "west"]
PhaseType = Literal["NS_GREEN", "NS_YELLOW", "EW_GREEN", "EW_YELLOW", "ALL_RED"]
EventType = Literal[
    "vehicle_arrived",
    "vehicle_removed",
    "pedestrian_request",
    "pedestrian_cleared",
    "phase_changed",
    "scenario_changed",
    "failover",
    "server_promoted",
]


class TrafficLightState(BaseModel):
    direction: str
    signal: Literal["green", "yellow", "red"]
    queue: int


class IntersectionStateSchema(BaseModel):
    scenario: ScenarioType
    phase: PhaseType
    phase_elapsed: float
    lights: list[TrafficLightState]
    pedestrian_active: bool
    pedestrian_direction: Optional[str]
    active_directions: list[str]


class TrafficEventIn(BaseModel):
    event_type: EventType
    direction: Optional[DirectionType] = None
    payload: dict = {}


class TrafficEventOut(BaseModel):
    id: int
    event_type: str
    direction: Optional[str]
    payload: dict
    created_at: datetime

    class Config:
        from_attributes = True


class SystemStatusSchema(BaseModel):
    role: str
    is_active: bool
    primary_alive: bool
    failover_occurred: bool


class ChangeScenarioRequest(BaseModel):
    scenario: ScenarioType


class WsMessage(BaseModel):
    type: Literal["state_update", "event", "system_status", "failover"]
    data: dict