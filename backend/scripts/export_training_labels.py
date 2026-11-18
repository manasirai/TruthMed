"""
Export Claude's fact-check verdicts as training rows for the trained model (training/).

Only clear verdicts become labels:
  supported, mostly_supported  -> trustworthy
  false, mostly_false          -> misinformation
"misleading" and "insufficient_evidence" are skipped (no clean binary label).

Claude's verdicts are not ground truth. Review the file before training on it, and keep a
separate, human-labelled test set to judge the retrained model.

The output has the columns text,label,language,source, which training/scripts/export_training_data.py
accepts:
  python scripts/export_training_data.py --merge-with <PUBHEALTH> --add-labelled-csv <this file>

Usage (from backend/):
  python scripts/export_training_labels.py                    # -> exports/claude_labels.csv
  python scripts/export_training_labels.py --require-sources  # only verdicts backed by retrieved sources
  python scripts/export_training_labels.py --stats            # how often the model agrees with Claude
"""

from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy.orm import joinedload  # noqa: E402

from app.db.database import SessionLocal, create_tables  # noqa: E402
from app.models.fact_check import FactCheckRequest, FactCheckResult  # noqa: E402
from app.services.labels import agreement, label_for_verdict  # noqa: E402


def load_results(db, require_sources: bool):
    query = (
        db.query(FactCheckResult)
        .join(FactCheckResult.request)
        .options(joinedload(FactCheckResult.request), joinedload(FactCheckResult.model_prediction))
        .filter(FactCheckRequest.status == "completed")
        .order_by(FactCheckResult.created_at.desc())
    )
    if require_sources:
        query = query.filter(FactCheckResult.retrieval_status == "success")
    # The same claim is copied once per browser that asked it; keep the newest analysis per claim
    seen, unique = set(), []
    for r in query.all():
        key = r.request.claim_normalized or r.request.claim_text
        if key in seen:
            continue
        seen.add(key)
        unique.append(r)
    return unique


def print_stats(results) -> None:
    with_model = [r for r in results if r.model_prediction]
    print(f"Unique analysed claims: {len(results)} | with a model prediction: {len(with_model)}")
    print("Claude verdicts:", dict(Counter(r.verdict for r in results)))
    if not with_model:
        return
    print("Model classifications:", dict(Counter(r.model_prediction.classification for r in with_model)))
    outcomes = Counter(agreement(r.verdict, r.model_prediction.classification) for r in with_model)
    comparable = outcomes[True] + outcomes[False]
    print(f"Comparable (both gave a clear label): {comparable}")
    if comparable:
        print(f"  agree: {outcomes[True]} ({outcomes[True] / comparable:.0%}) | disagree: {outcomes[False]}")
    print(f"Not comparable (Suspicious, misleading or insufficient evidence): {outcomes[None]}")


def export(results, out: Path) -> None:
    rows = []
    for r in results:
        label = label_for_verdict(r.verdict)
        if label is None:
            continue
        mp = r.model_prediction
        rows.append({
            "text": r.request.claim_text,
            "label": label,
            # The model service detects English / Hindi / Hinglish; blank lets the notebook detect it
            "language": mp.language if mp and mp.language in ("English", "Hindi", "Hinglish") else "",
            "source": r.request.context_url or "",
        })
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=["text", "label", "language", "source"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} labelled rows to {out} (skipped {len(results) - len(rows)} unclear verdicts)")
    print(dict(Counter(row["label"] for row in rows)))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, default=BACKEND_DIR / "exports" / "claude_labels.csv")
    ap.add_argument("--require-sources", action="store_true",
                    help="only use verdicts where live evidence retrieval succeeded")
    ap.add_argument("--stats", action="store_true", help="print model-vs-Claude agreement instead of exporting")
    args = ap.parse_args()

    create_tables()  # makes sure model_predictions exists on an older database
    db = SessionLocal()
    try:
        results = load_results(db, args.require_sources)
        if args.stats:
            print_stats(results)
        else:
            export(results, args.out)
    finally:
        db.close()


if __name__ == "__main__":
    main()
