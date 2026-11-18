"""
Saves analysed posts and user feedback as JSON Lines, so they can be reviewed and used to retrain.

  data/predictions.jsonl  one line per analysed post (input + what the model said)
  data/feedback.jsonl     one line per correction ("this post is actually misinformation / trustworthy")

scripts/export_training_data.py turns the labelled ones into a CSV the training notebook reads.
"""
import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path


def _now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Store:
    def __init__(self, data_dir: Path, enabled: bool = True):
        self.dir = Path(data_dir)
        self.enabled = enabled
        self.predictions_path = self.dir / "predictions.jsonl"
        self.feedback_path = self.dir / "feedback.jsonl"
        self._lock = threading.Lock()

    def _append(self, path: Path, record: dict):
        with self._lock:
            self.dir.mkdir(parents=True, exist_ok=True)
            with path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")

    @staticmethod
    def _read(path: Path):
        if not path.exists():
            return
        with path.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    yield json.loads(line)

    def save_prediction(self, source, result, model_name):
        """Stores one analysed post and returns its prediction_id (None when storage is off)."""
        if not self.enabled:
            return None
        prediction_id = uuid.uuid4().hex
        self._append(self.predictions_path, {
            "prediction_id": prediction_id,
            "timestamp": _now(),
            "text": result["input"],
            "source": source,
            "language": result["language"],
            "category": result["category"],
            "classification": result["classification"],
            "misinformation_score": result["misinformation_score"],
            "classifier_probability": result["classifier"]["misinformation_probability"],
            "fact_status": result["fact_verification"]["status_code"],
            "model": model_name,
        })
        return prediction_id

    def find_prediction(self, prediction_id):
        for record in self._read(self.predictions_path):
            if record["prediction_id"] == prediction_id:
                return record
        return None

    def save_feedback(self, *, label, prediction_id=None, text=None, source=None, language=None, comment=None):
        record = {
            "feedback_id": uuid.uuid4().hex,
            "timestamp": _now(),
            "prediction_id": prediction_id,
            "text": text,
            "source": source,
            "language": language,
            "label": label,
            "comment": comment,
        }
        self._append(self.feedback_path, record)
        return record

    def stats(self):
        predictions = list(self._read(self.predictions_path))
        feedback = list(self._read(self.feedback_path))
        by_label = {}
        for fb in feedback:
            by_label[fb["label"]] = by_label.get(fb["label"], 0) + 1
        by_class = {}
        for p in predictions:
            by_class[p["classification"]] = by_class.get(p["classification"], 0) + 1
        return {
            "storing_inputs": self.enabled,
            "data_dir": str(self.dir),
            "predictions_saved": len(predictions),
            "predictions_by_classification": by_class,
            "feedback_saved": len(feedback),
            "feedback_by_label": by_label,
        }
