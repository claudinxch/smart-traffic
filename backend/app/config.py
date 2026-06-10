from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    ROLE: Literal["primary", "backup"] = "primary"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    PRIMARY_URL: str = "http://localhost:8000"
    BACKUP_URL: str = "http://localhost:8001"

    REPLICATION_INTERVAL: float = 2.0
    HEALTH_CHECK_INTERVAL: float = 3.0
    HEALTH_FAIL_THRESHOLD: int = 3

    DB_PATH: str = "traffic.db"

    TICK_INTERVAL: float = 1.0

    MIN_GREEN_DURATION: int = 15
    MAX_GREEN_DURATION: int = 60
    YELLOW_DURATION: int = 3
    QUEUE_OVERFLOW_THRESHOLD: int = 8
    QUEUE_OVERFLOW_CAP: int = 30
    ANTI_OSCILLATION_COOLDOWN: int = 5

    class Config:
        env_file = ".env"


settings = Settings()