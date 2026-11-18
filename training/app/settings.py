"""Runtime settings, read from environment variables or a .env file."""
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_prefix="MISINFO_", extra="ignore")

    artifacts_dir: Path = BACKEND_DIR / "artifacts"
    device: str = "auto"                 # "auto" | "cpu" | "cuda"
    kb_top_k: int = 3                    # KB matches returned per claim
    explain_top_n: int = 12              # word contributions computed per claim
    max_text_length: int = 5000          # characters accepted per claim
    max_batch_size: int = 64             # claims accepted per batch request
    cors_origins: list[str] = ["*"]      # e.g. ["http://localhost:3000"] for a Node/React frontend
    data_dir: Path = BACKEND_DIR / "data"  # where inputs and feedback are saved for retraining
    store_inputs: bool = True            # save every analysed post to data_dir/predictions.jsonl

    @field_validator("artifacts_dir", "data_dir")
    @classmethod
    def _relative_to_backend(cls, v: Path) -> Path:
        return v if v.is_absolute() else BACKEND_DIR / v


settings = Settings()
