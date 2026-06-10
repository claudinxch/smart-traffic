from dataclasses import dataclass, field
from typing import Optional
from ..config import settings


SCENARIO_DIRECTIONS: dict[str, list[str]] = {
    "cross": ["north", "south", "east", "west"],
    "t_intersection": ["north", "east", "west"],
    "main_road_priority": ["north", "south", "east", "west"],
    "heavy_traffic": ["north", "south", "east", "west"],
}

NS_DIRECTIONS = {"north", "south"}
EW_DIRECTIONS = {"east", "west"}

PHASE_SIGNALS: dict[str, dict[str, str]] = {
    "NS_GREEN":  {"north": "green",  "south": "green",  "east": "red",    "west": "red"},
    "NS_YELLOW": {"north": "yellow", "south": "yellow", "east": "red",    "west": "red"},
    "EW_GREEN":  {"north": "red",    "south": "red",    "east": "green",  "west": "green"},
    "EW_YELLOW": {"north": "red",    "south": "red",    "east": "yellow", "west": "yellow"},
    "ALL_RED":   {"north": "red",    "south": "red",    "east": "red",    "west": "red"},
}

YELLOW_TRANSITIONS: dict[str, str] = {
    "NS_YELLOW": "EW_GREEN",
    "EW_YELLOW": "NS_GREEN",
}

GREEN_TO_YELLOW: dict[str, str] = {
    "NS_GREEN": "NS_YELLOW",
    "EW_GREEN": "EW_YELLOW",
}

PHASE_AXIS: dict[str, str] = {
    "NS_GREEN": "NS",
    "NS_YELLOW": "NS",
    "EW_GREEN": "EW",
    "EW_YELLOW": "EW",
    "ALL_RED": "ALL",
}


@dataclass
class EngineState:
    scenario: str
    phase: str
    phase_elapsed: float
    queues: dict[str, int]
    pedestrian_active: bool = False
    pedestrian_direction: Optional[str] = None
    phase_cooldowns: dict[str, float] = field(default_factory=dict)


@dataclass
class EngineEvent:
    event_type: str
    direction: Optional[str] = None
    payload: dict = field(default_factory=dict)


def _active_directions(scenario: str, phase: str) -> list[str]:
    directions = SCENARIO_DIRECTIONS.get(scenario, [])
    signals = PHASE_SIGNALS.get(phase, {})
    return [d for d in directions if signals.get(d) == "green"]


def _queue_for_axis(queues: dict[str, int], axis: str) -> int:
    if axis == "NS":
        return queues.get("north", 0) + queues.get("south", 0)
    if axis == "EW":
        return queues.get("east", 0) + queues.get("west", 0)
    return 0


def _current_green_axis(phase: str) -> Optional[str]:
    if phase == "NS_GREEN":
        return "NS"
    if phase == "EW_GREEN":
        return "EW"
    return None


def _waiting_green_phase(current_phase: str) -> str:
    if current_phase in ("NS_GREEN", "NS_YELLOW"):
        return "EW_GREEN"
    return "NS_GREEN"


def _effective_max_green(state: EngineState) -> int:
    axis = _current_green_axis(state.phase)
    if axis is None:
        return settings.MAX_GREEN_DURATION

    waiting_axis = "EW" if axis == "NS" else "NS"
    waiting_queue = _queue_for_axis(state.queues, waiting_axis)

    if state.scenario == "main_road_priority" and axis == "NS":
        return settings.MAX_GREEN_DURATION

    if waiting_queue >= settings.QUEUE_OVERFLOW_THRESHOLD:
        return settings.QUEUE_OVERFLOW_CAP

    return settings.MAX_GREEN_DURATION


def tick(state: EngineState, dt: float = 1.0) -> tuple[EngineState, list[EngineEvent]]:
    import copy
    state = copy.deepcopy(state)
    events: list[EngineEvent] = []

    for axis in list(state.phase_cooldowns):
        state.phase_cooldowns[axis] = max(0.0, state.phase_cooldowns[axis] - dt)

    state.phase_elapsed += dt

    if state.phase in YELLOW_TRANSITIONS:
        if state.phase_elapsed >= settings.YELLOW_DURATION:
            next_phase = YELLOW_TRANSITIONS[state.phase]
            next_axis = PHASE_AXIS[next_phase]
            if state.phase_cooldowns.get(next_axis, 0) > 0:
                state.phase = "ALL_RED"
            else:
                state.phase = next_phase
            state.phase_elapsed = 0.0
            events.append(EngineEvent("phase_changed", payload={"phase": state.phase}))
        return state, events

    if state.phase == "ALL_RED":
        if state.phase_elapsed >= 1.0:
            ns_q = _queue_for_axis(state.queues, "NS")
            ew_q = _queue_for_axis(state.queues, "EW")
            next_phase = "NS_GREEN" if ns_q >= ew_q else "EW_GREEN"
            state.phase = next_phase
            state.phase_elapsed = 0.0
            events.append(EngineEvent("phase_changed", payload={"phase": state.phase}))
        return state, events

    if state.phase not in GREEN_TO_YELLOW:
        return state, events

    axis = _current_green_axis(state.phase)
    waiting_axis = "EW" if axis == "NS" else "NS"

    current_queue = _queue_for_axis(state.queues, axis)
    waiting_queue = _queue_for_axis(state.queues, waiting_axis)

    effective_max = _effective_max_green(state)

    should_switch = False

    if state.pedestrian_active:
        if state.phase_elapsed >= effective_max:
            should_switch = True
    else:
        if state.phase_elapsed >= effective_max:
            should_switch = True
        elif (
            state.phase_elapsed >= settings.MIN_GREEN_DURATION
            and current_queue == 0
            and waiting_queue > 0
            and state.phase_cooldowns.get(waiting_axis, 0) == 0
        ):
            should_switch = True

    if should_switch:
        yellow_phase = GREEN_TO_YELLOW[state.phase]
        state.phase_cooldowns[axis] = float(settings.ANTI_OSCILLATION_COOLDOWN)
        state.phase = yellow_phase
        state.phase_elapsed = 0.0
        events.append(EngineEvent("phase_changed", payload={"phase": state.phase}))

    return state, events


def apply_event(state: EngineState, event_type: str, direction: Optional[str] = None) -> tuple[EngineState, list[EngineEvent]]:
    import copy
    state = copy.deepcopy(state)
    events: list[EngineEvent] = []

    if event_type == "vehicle_arrived" and direction:
        state.queues[direction] = state.queues.get(direction, 0) + 1

    elif event_type == "vehicle_removed" and direction:
        state.queues[direction] = max(0, state.queues.get(direction, 0) - 1)

    elif event_type == "pedestrian_request" and direction:
        if not state.pedestrian_active:
            state.pedestrian_active = True
            state.pedestrian_direction = direction
            events.append(EngineEvent("pedestrian_request", direction=direction))

    elif event_type == "pedestrian_cleared":
        state.pedestrian_active = False
        state.pedestrian_direction = None
        events.append(EngineEvent("pedestrian_cleared"))

    return state, events


def build_initial_state(scenario: str) -> EngineState:
    directions = SCENARIO_DIRECTIONS.get(scenario, SCENARIO_DIRECTIONS["cross"])
    queues = {d: 0 for d in directions}

    if scenario == "heavy_traffic":
        queues["north"] = 6
        queues["south"] = 4

    return EngineState(
        scenario=scenario,
        phase="NS_GREEN",
        phase_elapsed=0.0,
        queues=queues,
    )


def get_light_signals(state: EngineState) -> list[dict]:
    directions = SCENARIO_DIRECTIONS.get(state.scenario, [])
    signals = PHASE_SIGNALS.get(state.phase, {})
    return [
        {
            "direction": d,
            "signal": signals.get(d, "red"),
            "queue": state.queues.get(d, 0),
        }
        for d in directions
    ]