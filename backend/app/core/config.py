from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"

    database_url: str = "sqlite:///./truthmed.db"

    app_env: str = "development"
    app_secret_key: str = "dev-secret-change-in-production"
    cors_origins: str = "http://localhost:5173,http://localhost:4173"

    rate_limit_per_minute: int = 10
    request_max_chars: int = 2000

    brave_search_api_key: str = ""

    # Trained misinformation model (the service in training/). Empty disables it.
    ml_service_url: str = ""
    ml_timeout_seconds: float = 20.0

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def has_anthropic_key(self) -> bool:
        return bool(self.anthropic_api_key and not self.anthropic_api_key.startswith("sk-ant-..."))

    @property
    def has_brave_key(self) -> bool:
        return bool(self.brave_search_api_key)

    @property
    def has_ml_service(self) -> bool:
        return bool(self.ml_service_url.strip())


settings = Settings()
