"""Mapping between Claude's verdicts and the trained model's binary labels."""

from __future__ import annotations

# Claude verdicts that are clear enough to use as a training label. "misleading" (mixed) and
# "insufficient_evidence" have no clean binary label; the training notebook drops such rows too.
VERDICT_TO_LABEL = {
    "supported": "trustworthy",
    "mostly_supported": "trustworthy",
    "false": "misinformation",
    "mostly_false": "misinformation",
}

_MODEL_CLASS_TO_LABEL = {
    "Reliable": "trustworthy",
    "Healthcare Misinformation": "misinformation",
}


def label_for_verdict(verdict: str) -> str | None:
    return VERDICT_TO_LABEL.get(verdict)


def agreement(verdict: str, model_classification: str) -> bool | None:
    """True/False when both sides give a clear label, None when either is unclear (e.g. Suspicious)."""
    a = VERDICT_TO_LABEL.get(verdict)
    b = _MODEL_CLASS_TO_LABEL.get(model_classification)
    if a is None or b is None:
        return None
    return a == b
