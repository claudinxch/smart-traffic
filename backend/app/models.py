from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, Boolean
from sqlalchemy.sql import func
from .database import Base


class IntersectionState(Base):
    __tablename__ = "intersection_state"

    id = Column(Integer, primary_key=True, default=1)
    scenario = Column(String, nullable=False)
    phase = Column(String, nullable=False)
    phase_elapsed = Column(Float, default=0.0)
    queues = Column(JSON, nullable=False)
    pedestrian_active = Column(Boolean, default=False)
    pedestrian_direction = Column(String, nullable=True)
    phase_cooldowns = Column(JSON, default=dict)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TrafficEvent(Base):
    __tablename__ = "traffic_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String, nullable=False)
    direction = Column(String, nullable=True)
    payload = Column(JSON, default=dict)
    created_at = Column(DateTime, server_default=func.now())


class SystemStatus(Base):
    __tablename__ = "system_status"

    id = Column(Integer, primary_key=True, default=1)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    primary_alive = Column(Boolean, default=True)
    failover_occurred = Column(Boolean, default=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())