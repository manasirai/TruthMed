"""
Build a training file for final_real_data.ipynb from the data the API has collected.

Only posts with a confirmed label are exported as training data, meaning posts corrected through
POST /api/v1/feedback or labelled by hand in a CSV. The model's own predictions are never used as
labels, because training on them would teach the model its own mistakes.

Usage (from the backend folder):
  # 1. Labelled feedback -> data/new_training_data.csv
  .venv\\Scripts\\python scripts\\export_training_data.py

  # 2. Same, plus the original dataset -> one combined file for the notebook
  .venv\\Scripts\\python scripts\\export_training_data.py --merge-with ..\\PUBHEALTH\\PUBHEALTH

  # 3. Also include a CSV you labelled by hand (columns: text,label[,language,source])
  .venv\\Scripts\\python scripts\\export_training_data.py --add-labelled-csv my_claims.csv

  # 4. Write the saved posts that nobody has labelled yet to data/to_label.csv,
  #    fill in the label column, then pass the file back with --add-labelled-csv
  .venv\\Scripts\\python scripts\\export_training_data.py --unlabelled
"""
import argparse
import json
import sys
from pathlib import Path

import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
from app.misinfo_rules import preprocess_text  # noqa: E402

MISINFO = {"1", "misinformation", "misinfo", "fake", "false", "myth", "misleading"}
TRUSTWORTHY = {"0", "trustworthy", "true", "real", "reliable", "fact", "correct"}
COLUMNS = ["claim", "label", "language", "source"]


def read_jsonl(path):
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def normalise_label(value):
    s = str(value).strip().lower()
    if s in MISINFO:
        return "misinformation"
    if s in TRUSTWORTHY:
        return "trustworthy"
    return None


def feedback_rows(data_dir):
    rows = [{"claim": fb["text"], "label": fb["label"], "language": fb.get("language") or "",
             "source": fb.get("source") or "", "timestamp": fb["timestamp"]}
            for fb in read_jsonl(data_dir / "feedback.jsonl") if fb.get("text")]
    return pd.DataFrame(rows, columns=COLUMNS + ["timestamp"])


def csv_rows(path):
    df = pd.read_csv(path, encoding="utf-8-sig", keep_default_na=False, dtype=str)
    text_col = "text" if "text" in df.columns else "claim"
    if text_col not in df.columns or "label" not in df.columns:
        raise SystemExit(f"{path}: needs a 'text' (or 'claim') column and a 'label' column.")
    out = pd.DataFrame({
        "claim": df[text_col],
        "label": df["label"].map(normalise_label),
        "language": df["language"] if "language" in df.columns else "",
        "source": df["source"] if "source" in df.columns else "",
    })
    skipped = out["label"].isna().sum()
    if skipped:
        print(f"  {path}: skipped {skipped} rows with an empty or unknown label")
    return out.dropna(subset=["label"])


def read_base(path):
    """The original dataset: a CSV, or a folder of PUBHEALTH .tsv files (merged as in notebook cell 10)."""
    if path.is_dir():
        files = sorted(path.glob("*.tsv"))
        if not files:
            raise SystemExit(f"{path}: no .tsv files found.")
        frames = [pd.read_csv(f, sep="\t", on_bad_lines="skip", dtype=str)[["claim", "label"]] for f in files]
        base = pd.concat(frames, ignore_index=True).dropna().drop_duplicates("claim")
        print(f"Merged {len(files)} TSV files from {path}: {len(base)} rows")
        return base
    return pd.read_csv(path, encoding="utf-8-sig", keep_default_na=False, dtype=str)


def export_unlabelled(data_dir):
    labelled = {preprocess_text(fb["text"]) for fb in read_jsonl(data_dir / "feedback.jsonl") if fb.get("text")}
    rows, seen = [], set()
    for p in read_jsonl(data_dir / "predictions.jsonl"):
        key = preprocess_text(p["text"])
        if key in labelled or key in seen:
            continue
        seen.add(key)
        rows.append({"text": p["text"], "label": "", "language": p["language"], "source": p.get("source") or "",
                     "model_said": p["classification"], "model_score": p["misinformation_score"]})
    out = data_dir / "to_label.csv"
    pd.DataFrame(rows, columns=["text", "label", "language", "source", "model_said", "model_score"]) \
        .to_csv(out, index=False, encoding="utf-8-sig")
    print(f"Wrote {len(rows)} unlabelled posts to {out}")
    print("Fill the 'label' column with misinformation / trustworthy, then run:")
    print(f"  python scripts/export_training_data.py --add-labelled-csv {out}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data-dir", type=Path, default=BACKEND_DIR / "data")
    ap.add_argument("--add-labelled-csv", type=Path, action="append", default=[],
                    help="extra hand-labelled CSV (text,label[,language,source]); can be repeated")
    ap.add_argument("--merge-with", type=Path,
                    help="original dataset to combine with the new rows: a CSV (e.g. pubhealth_all.csv) "
                         "or the PUBHEALTH folder of .tsv files")
    ap.add_argument("--out", type=Path, help="output CSV (default: data/new_training_data.csv)")
    ap.add_argument("--unlabelled", action="store_true",
                    help="write saved posts that have no label yet to data/to_label.csv instead")
    args = ap.parse_args()

    if args.unlabelled:
        export_unlabelled(args.data_dir)
        return

    parts = [feedback_rows(args.data_dir)]
    print(f"Feedback labels: {len(parts[0])}")
    for path in args.add_labelled_csv:
        parts.append(csv_rows(path))
        print(f"From {path}: {len(parts[-1])}")
    new = pd.concat(parts, ignore_index=True)
    if new.empty:
        raise SystemExit("No labelled data yet. Send corrections to POST /api/v1/feedback "
                         "or pass a labelled CSV with --add-labelled-csv.")

    # One row per claim; the most recent label wins
    new["key"] = new["claim"].map(preprocess_text)
    new = new[new["key"].str.len() > 0]
    if "timestamp" in new.columns:
        new = new.sort_values("timestamp", na_position="first")
    new = new.drop_duplicates("key", keep="last")

    if args.merge_with:
        base = read_base(args.merge_with)
        if "claim" not in base.columns or "label" not in base.columns:
            raise SystemExit(f"{args.merge_with}: needs 'claim' and 'label' columns.")
        base = base.assign(language=base.get("language", ""), source=base.get("source", ""))[COLUMNS]
        base["key"] = base["claim"].map(preprocess_text)
        replaced = base["key"].isin(new["key"]).sum()
        combined = pd.concat([base[~base["key"].isin(new["key"])], new], ignore_index=True)
        print(f"Original rows: {len(base)} | new rows: {len(new)} | original rows relabelled: {replaced}")
        result = combined
        out = args.out or args.data_dir / "combined_training_data.csv"
    else:
        result = new
        out = args.out or args.data_dir / "new_training_data.csv"

    out.parent.mkdir(parents=True, exist_ok=True)
    result[COLUMNS].to_csv(out, index=False, encoding="utf-8-sig")
    print(f"Wrote {len(result)} rows to {out}")
    print(result["label"].value_counts().to_string())


if __name__ == "__main__":
    main()
