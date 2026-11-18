"""
Loads the artifacts exported by Section 17 of final_real_data.ipynb and serves predictions.

Each function here mirrors its notebook counterpart, so the API returns what
run_healthcare_misinformation_poc() returns in the notebook:
  indicbert_predict_proba / baseline_predict_proba  (Section 9)
  semantic_fact_check -> kb_search                  (Sections 10-11)
  explain_claim                                     (Section 12)
"""
import json
import logging
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch

from . import misinfo_rules as rules

log = logging.getLogger("misinfo.model")


class ModelService:
    def __init__(self, artifacts_dir: Path, device: str = "auto", kb_top_k: int = 3, explain_top_n: int = 12):
        self.dir = Path(artifacts_dir)
        self.kb_top_k = kb_top_k
        self.explain_top_n = explain_top_n
        if device == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = torch.device(device)
        self.loaded = False
        self.load_seconds = None

    # ------------------------------------------------------------------ loading
    def load(self):
        start = time.perf_counter()
        config_path = self.dir / "pipeline_config.json"
        if not config_path.exists():
            raise FileNotFoundError(
                f"{config_path} not found. Unzip healthcare_misinfo_artifacts.zip into {self.dir}.")
        self.bundle = json.loads(config_path.read_text(encoding="utf-8"))
        self.cfg = {**rules.DEFAULT_CONFIG, **self.bundle["cfg"]}
        self.primary = self.bundle["primary_classifier"]
        self.primary_name = self.bundle["primary_name"]

        if self.primary == "indicbert":
            self._load_indicbert()
        else:
            log.info("Loading baseline classifier %s", self.bundle["baseline_file"])
            self.baseline = joblib.load(self.dir / self.bundle["baseline_file"])

        self._load_explainer()
        self._load_knowledge_base()
        self.loaded = True
        self.load_seconds = round(time.perf_counter() - start, 1)
        log.info("Artifacts loaded in %.1fs (classifier: %s, device: %s, KB entries: %d)",
                 self.load_seconds, self.primary_name, self.device, len(self.kb))

    def _load_indicbert(self):
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        path = self.dir / self.bundle["indicbert_dir"]
        log.info("Loading IndicBERT from %s", path)
        self.max_length = int(self.bundle.get("indicbert_max_length", 128))
        self.tokenizer = AutoTokenizer.from_pretrained(path)
        self.indic_model = AutoModelForSequenceClassification.from_pretrained(path).to(self.device).eval()

    def _load_explainer(self):
        log.info("Loading explainer %s", self.bundle["explainer_file"])
        logistic_model = joblib.load(self.dir / self.bundle["explainer_file"])
        self.tfidf = logistic_model.named_steps["tfidf"]
        self.coefficients = logistic_model.named_steps["clf"].coef_[0]
        self.feature_names = np.array(self.tfidf.get_feature_names_out()).astype(str)
        self.is_word_feature = np.char.startswith(self.feature_names, "word__")
        self.bg_mean = np.load(self.dir / self.bundle["explainer_background_mean"])

    def _load_knowledge_base(self):
        from sentence_transformers import SentenceTransformer
        self.kb = pd.read_csv(self.dir / self.bundle["kb_file"], encoding="utf-8-sig",
                              keep_default_na=False, dtype=str)
        emb = np.load(self.dir / self.bundle["kb_embeddings"]).astype(np.float32)
        if len(emb) != len(self.kb):
            raise ValueError(f"Knowledge base has {len(self.kb)} rows but {len(emb)} embeddings.")
        self.kb_embeddings = torch.from_numpy(emb).to(self.device)
        log.info("Loading sentence transformer %s", self.bundle["sbert_model"])
        self.sentence_model = SentenceTransformer(self.bundle["sbert_model"], device=str(self.device))

    # ------------------------------------------------------------------ model calls
    @torch.no_grad()
    def predict_misinfo_proba(self, texts, batch_size=64):
        """P(misinformation) for each text, from the primary classifier."""
        texts = [texts] if isinstance(texts, str) else list(texts)
        if self.primary != "indicbert":
            return self.baseline.predict_proba(texts)[:, 1]
        probs = []
        for i in range(0, len(texts), batch_size):
            inputs = self.tokenizer(texts[i:i + batch_size], return_tensors="pt", truncation=True,
                                    padding=True, max_length=self.max_length).to(self.device)
            logits = self.indic_model(**inputs).logits
            probs.append(torch.softmax(logits, dim=-1)[:, 1].float().cpu().numpy())
        return np.concatenate(probs)

    def kb_search(self, clean_text, top_k=None):
        """Top-k knowledge-base entries by cosine similarity, best first."""
        top_k = top_k or self.kb_top_k
        claim = self.sentence_model.encode(clean_text, convert_to_tensor=True, normalize_embeddings=True)
        scores = (self.kb_embeddings @ claim.to(self.kb_embeddings.dtype)).cpu().numpy()
        ranked = np.argsort(scores)[::-1][:top_k]
        rows = self.kb.iloc[ranked][["statement", "type", "source", "id"]].to_dict("records")
        for row, i in zip(rows, ranked):
            row["similarity"] = float(scores[i])
        return rows

    def explain(self, clean_claim, top_n=None):
        """Word contributions (+ towards misinformation, - towards reliable), linear-SHAP formula."""
        top_n = top_n or self.explain_top_n
        x = self.tfidf.transform([clean_claim]).tocsr()
        idx, vals = x.indices, x.data
        contrib = self.coefficients[idx] * (vals - self.bg_mean[idx])
        words = self.is_word_feature[idx]
        pool = np.where(words)[0] if words.any() else np.arange(len(idx))
        order = pool[np.argsort(-np.abs(contrib[pool]))][:top_n]
        return [(self.feature_names[idx[i]].split("__", 1)[-1], float(contrib[i])) for i in order]

    # ------------------------------------------------------------------ pipeline
    def analyze(self, text, source=None, explain=True):
        return self.analyze_many([(text, source)], explain=explain)[0]

    def analyze_many(self, items, explain=True):
        """items: list of (text, source). Classifier probabilities are computed in one batch."""
        cleaned = [rules.preprocess_text(t) for t, _ in items]
        if any(not c for c in cleaned):
            raise ValueError("The text is empty after cleaning.")
        probs = dict(zip(cleaned, self.predict_misinfo_proba(cleaned)))
        return [
            rules.analyze_claim(
                text,
                classifier_proba=lambda t: probs[t],
                kb_search=self.kb_search,
                cfg=self.cfg,
                explain=self.explain if explain else None,
                source=source,
                classifier_name=self.primary_name,
            )
            for text, source in items
        ]

    def info(self):
        b = self.bundle
        return {
            "classifier": self.primary_name,
            "device": str(self.device),
            "created": b.get("created"),
            "config": self.cfg,
            "sbert_model": b.get("sbert_model"),
            "knowledge_base_entries": len(self.kb),
            "knowledge_base_types": self.kb["type"].value_counts().to_dict(),
            "languages": b.get("data", {}).get("languages", []),
            "training_data": b.get("data", {}),
            "test_metrics": b.get("test_metrics", {}),
            "training_versions": b.get("versions", {}),
            "load_seconds": self.load_seconds,
        }
