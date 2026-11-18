"""
Shared, model-free logic for the Healthcare Misinformation Detection System.

This exact file is used in two places, so training and serving always behave the same:
  * embedded in the training notebook (Section 2b), and
  * imported by the FastAPI backend (app/misinfo_rules.py).

It contains: text cleaning, language detection, the healthcare-category check, red-flag
detection, source-credibility rating, knowledge-base evidence scoring, score combination,
the three-way label (Reliable / Suspicious / Healthcare Misinformation) and the
human-readable explanation builder.
"""
import re
import unicodedata
from urllib.parse import urlparse

LABEL_RELIABLE = "Reliable"
LABEL_SUSPICIOUS = "Suspicious"
LABEL_MISINFO = "Healthcare Misinformation"

DISCLAIMER = ("Automated research output, not medical advice. "
              "Verify important health information with a doctor or an official source.")


# --------------------------------------------------------------------------- text cleaning
def preprocess_text(text):
    text = unicodedata.normalize("NFC", str(text))
    text = re.sub(r"<[^>]+>", " ", text)                 # HTML tags
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)    # URLs
    text = re.sub(r"@\w+", " ", text)                     # @mentions
    text = re.sub(r"#(\w+)", r"\1", text)                 # #hashtag -> hashtag
    return re.sub(r"\s+", " ", text).strip()


# --------------------------------------------------------------------------- language
HINGLISH_WORDS = {
    "hai", "hain", "hota", "hoti", "hote", "lene", "se", "ko", "mein", "me", "kar", "karta",
    "karti", "karte", "har", "sab", "nahi", "nahin", "jaata", "jaati", "jata", "jati",
    "ki", "ka", "ke", "ho", "hi", "bhi", "aur", "ya", "toh", "to", "kya", "kyun", "kaise",
    "wala", "wali", "sakta", "sakti", "sakte", "deti", "deta", "dete", "raha", "rahi",
    "kuch", "bahut", "yeh", "ye", "woh", "wo", "agar", "lekin", "pe", "par", "hua", "hui",
}
_HINGLISH_WEAK = {"to", "me", "hi", "pe", "par", "ya"}   # also common English words


def detect_language(text):
    """Returns 'English', 'Hindi', 'Hinglish' or another language code."""
    if re.search(r"[\u0900-\u097F]", text):
        devanagari = len(re.findall(r"[\u0900-\u097F]", text))
        latin = len(re.findall(r"[A-Za-z]", text))
        return "Hindi" if devanagari >= latin else "Hinglish"
    words = re.findall(r"[a-z]+", text.lower())
    hits = sum(1 for w in words if w in HINGLISH_WORDS - _HINGLISH_WEAK)
    if hits >= 2 or (words and hits / len(words) >= 0.2):
        return "Hinglish"
    if words:
        return "English"     # this system targets English for Roman-script, non-Hinglish text
    try:
        from langdetect import detect
        code = detect(text)
    except Exception:
        return "Unknown"
    return {"en": "English", "hi": "Hindi"}.get(code, code)


# --------------------------------------------------------------------------- healthcare category
_HEALTH_EN = r"""
health\w* medic\w* disease\w* illness\w* sick\w* virus\w* viral vaccin\w* immuni[sz]\w* covid\w*
coronavirus\w* corona pandemic\w* epidemic\w* outbreak\w* infect\w* contagious bacteri\w* germs?
cancer\w* tumou?r\w* chemo\w* diabet\w* insulin obes\w* cholesterol blood heart cardi\w* stroke\w*
hypertension kidney\w* liver lungs? brain alzheimer\w* dementia autism autistic asthma allerg\w*
arthritis fever cough\w* flu influenza measles polio malaria dengue tuberculosis tb hiv aids zika
ebola rabies hepatitis jaundice cholera typhoid sars mers pneumonia diarrh\w* symptom\w*
diagnos\w* treatment\w* treat\w* therap\w* cure[sd]? curing remed\w* drugs? pharm\w* prescri\w*
pills? tablets? antibiotic\w* antiviral\w* painkiller\w* opioid\w* overdos\w* doctors? physicians?
nurses? hospital\w* clinic\w* surger\w* surgeon\w* patients? icu ambulance doses? dosage
pregnan\w* abortion\w* fertil\w* infertil\w* contracep\w* birth\w* newborn\w* breastfe\w*
menstrua\w* periods? hormon\w* nutrition\w* nutrient\w* diet\w* vitamin\w* supplement\w* protein\w*
calori\w* obesity weight\w* exercis\w* fitness sleep\w* mental depress\w* anxiety suicid\w*
psychiatr\w* stress addict\w* alcohol\w* smok\w* tobacco cigarett\w* vap\w* e-cigarett\w* nicotine
detox\w* toxin\w* toxic poison\w* radiation hygien\w* sanitiz\w* masks? quarantin\w* lockdown\w*
fda cdc icmr mohfw aiims nih nhs medicare medicaid obamacare ayurved\w* homeopath\w* herbal
gene\w* genetic\w* stem dental teeth tooth skin eyes? vision cells? immune organ\w* transplant\w*
pain\w* injur\w* wounds? bite[sn]? snakebite mosquito\w* hiv/aids std sti condoms? sexual
mammogra\w* screening\w* breast prostate cervical colonoscop\w* mri x-rays? scans? salmonella listeria
foodborne e\.\s?coli life-expectancy longevity ageing aging epilep\w* seizur\w* infant\w* botulism
paralys\w* disabilit\w* migraine\w* thyroid anaemi\w* anemi\w* leprosy
""".split()
_HEALTH_HINGLISH = r"""
ilaaj ilaj dawa dawai dawaai dava davai dawaiyan bimari bimaari bimariyon rog rogi tika teeka
tike sehat swasthya svasthya bukhar bukhaar khansi khaansi dard mareez marij mariz khoon dil
peeliya piliya sardi zukaam zukam jukam garbh garbhvati banjhpan motapa vajan kamzori nuskha
nuskhe kadha kaadha aayurved ayurved sankraman chikitsa upchar aushadhi davakhana aspatal
machhar machchhar dast ulti mirgi shishu
""".split()
_HEALTH_HI = """
स्वास्थ्य सेहत बीमारी बीमारियों रोग रोगी इलाज उपचार चिकित्सा दवा दवाई दवाओं दवाएं औषधि टीका टीके टीकाकरण
वैक्सीन कैंसर डायबिटीज मधुमेह डॉक्टर अस्पताल संक्रमण वायरस बुखार खांसी खाँसी दर्द मरीज गर्भ गर्भवती
खून रक्त रक्तचाप हृदय दिल किडनी गुर्दे लीवर फेफड़ फेफड़ों आयुर्वेद पोषण विटामिन कोविड कोरोना टीबी
मलेरिया डेंगू पीलिया बीपी शुगर मोटापा लक्षण एलर्जी मानसिक डिप्रेशन कोलेस्ट्रॉल सर्दी जुकाम खसरा
पोलियो एचआईवी रेबीज बांझपन प्रजनन मास्क मच्छर दस्त काढ़ा नुस्खा नुस्खे दिमाग त्वचा मिर्गी शिशु
""".split()

_HEALTH_LATIN_RE = re.compile(r"\b(?:" + "|".join(_HEALTH_EN + _HEALTH_HINGLISH) + r")\b", re.IGNORECASE)
_HEALTH_WHO_RE = re.compile(r"\bWHO\b")      # upper-case only: 'who' is a common English word


def health_relevance(text):
    """Returns (is_healthcare, matched_terms). Keyword-based, works for English/Hindi/Hinglish."""
    terms = [m.group(0).lower() for m in _HEALTH_LATIN_RE.finditer(text)]
    if _HEALTH_WHO_RE.search(text):
        terms.append("WHO")
    terms += [w for w in _HEALTH_HI if w in text]
    seen, unique = set(), []
    for t in terms:
        if t not in seen:
            seen.add(t)
            unique.append(t)
    return bool(unique), unique[:8]


# --------------------------------------------------------------------------- red flags
_I = re.IGNORECASE
RED_FLAG_RULES = [
    ("absolute_cure", "Claims an absolute or permanent cure, which real treatments rarely offer",
     [re.compile(r"\b(cures?|heals?|eliminates?|reverses?|kills?|destroys?)\b[^.!?]{0,40}"
                 r"\b(all|every|completely|permanently|forever|any|100\s?%)", _I),
      re.compile(r"\b(completely|permanently|totally|fully)\s+(cures?|heals?|eliminates?|reverses?)\b", _I),
      re.compile(r"पूरी तरह (से )?(ठीक|खत्म)|जड़ से (खत्म|ठीक)|हमेशा के लिए (ठीक|खत्म)"),
      re.compile(r"\b(poori|puri) tarah (se )?(theek|thik|khatam)|\bjad se (khatam|theek|thik)", _I)]),
    ("miracle_language", "Uses exaggerated 'miracle' or guaranteed-result language",
     [re.compile(r"\b(miracle|magic(al)?|wonder (drug|cure)|secret (cure|remedy)|guaranteed|"
                 r"instant(ly)? (cure|relief)|overnight)\b|100\s?%", _I),
      re.compile(r"चमत्कार|रामबाण|गारंटी"),
      re.compile(r"\b(chamatkar\w*|ramban|guarantee)\b", _I)]),
    ("conspiracy", "Suggests a conspiracy or 'hidden truth' instead of evidence",
     [re.compile(r"\b(doctors|pharma\w*|big pharma|government|they|media)\b[^.!?]{0,20}\b(don'?t|do not|won'?t)"
                 r" want you to know|hidden truth|cover[- ]?up|they are hiding", _I),
      re.compile(r"छुपा रहे|छिपा रहे"),
      re.compile(r"\bchhupa rahe\b|\bchupa rahe\b", _I)]),
    ("share_pressure", "Pressures readers to share or forward the message",
     [re.compile(r"\b(share|forward)\b[^.!?]{0,30}\b(everyone|all|before|now|friends|family|groups?|maximum)\b|"
                 r"forwarded as received|forwarded many times", _I),
      re.compile(r"शेयर कर|आगे भेज|फॉरवर्ड कर|सबको भेज"),
      re.compile(r"\b(share|forward) (karo|karein|kare|kijiye)\b|\baage bhej\w*|\bsabko bhej\w*", _I)]),
    ("discourages_care", "Discourages proven medical care such as doctors, vaccines or prescribed medicine",
     [re.compile(r"\bno need (for|to see|to visit|of|to take)\b[^.!?]{0,15}\b(doctor|vaccine|medicine|"
                 r"medication|treatment|hospital)|\bstop (taking )?(your )?(medicine|medication|insulin|treatment)", _I),
      re.compile(r"डॉक्टर[^।]{0,25}(ज़रूरत|जरूरत) नहीं|दवा(ई)? बंद"),
      re.compile(r"\bdoctor\b[^.!?]{0,25}\b(zaroorat|jarurat|zarurat|jaroorat) (nahi|nahin)|\bdawa(i|ai)? band", _I)]),
    ("unverified_authority", "Cites an authority (e.g. 'WHO confirmed') without a verifiable reference",
     [re.compile(r"\b(WHO|CDC|ICMR|MoHFW|AIIMS|NASA|UNICEF)\b[^.!?]{0,25}\b(has |have )?(confirm|prove|announce|admit|declare)\w*"),
      re.compile(r"\b(doctors|scientists|experts|harvard|research(ers)?)\b[^.!?]{0,15}\b(have |has )?(confirmed|proved|proven|admitted)\b", _I)]),
]


def red_flags(text):
    """Returns a list of {'code', 'reason'} for misinformation warning signs in the text."""
    found = []
    for code, reason, patterns in RED_FLAG_RULES:
        if any(p.search(text) for p in patterns):
            found.append({"code": code, "reason": reason})
    return found


# --------------------------------------------------------------------------- source credibility
HIGH_CREDIBILITY_DOMAINS = {
    "who.int", "mohfw.gov.in", "cdc.gov", "icmr.gov.in", "icmr.nic.in", "pib.gov.in", "nih.gov",
    "nhs.uk", "aiims.edu", "nhp.gov.in", "mygov.in", "fda.gov", "ema.europa.eu", "unicef.org",
    "cochrane.org", "thelancet.com", "nejm.org", "bmj.com", "jamanetwork.com", "nature.com",
    "mayoclinic.org", "clevelandclinic.org", "hopkinsmedicine.org",
}
MEDIUM_CREDIBILITY_DOMAINS = {
    "thehindu.com", "indianexpress.com", "hindustantimes.com", "ndtv.com", "timesofindia.indiatimes.com",
    "indiatoday.in", "livemint.com", "bbc.com", "bbc.co.uk", "reuters.com", "apnews.com", "theguardian.com",
    "nytimes.com", "washingtonpost.com", "cnn.com", "boomlive.in", "altnews.in", "factly.in",
    "vishvasnews.com", "newschecker.in", "thequint.com", "healthfeedback.org", "snopes.com",
    "factcheck.org", "politifact.com", "webmd.com", "healthline.com", "medicalnewstoday.com",
}
SOCIAL_DOMAINS = {
    "whatsapp.com", "wa.me", "facebook.com", "fb.com", "instagram.com", "twitter.com", "x.com",
    "youtube.com", "youtu.be", "telegram.org", "t.me", "tiktok.com", "sharechat.com", "moj.app",
    "koo.in", "reddit.com", "quora.com",
}
BLOG_DOMAINS = {"blogspot.com", "wordpress.com", "medium.com", "substack.com", "wixsite.com", "weebly.com", "tumblr.com"}
SHORTENER_DOMAINS = {"bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "rb.gy", "cutt.ly", "is.gd"}
HIGH_CREDIBILITY_NAMES = {
    "who", "world health organization", "mohfw", "ministry of health", "ministry of health and family welfare",
    "cdc", "icmr", "pib", "pib fact check", "nhs", "aiims", "nih", "fda", "unicef",
}
SOCIAL_NAMES = {"whatsapp", "facebook", "instagram", "twitter", "x", "youtube", "telegram", "tiktok", "sharechat"}
_FORWARD_CUES = re.compile(r"forwarded as received|forwarded many times|whatsapp university|"
                           r"फॉरवर्ड|aage bhejo", re.IGNORECASE)


def _domain(source):
    s = source.strip().lower()
    if "://" not in s and ("." in s and " " not in s):
        s = "http://" + s
    host = urlparse(s).netloc if "://" in s else ""
    return host[4:] if host.startswith("www.") else host


def _matches(host, domains):
    return any(host == d or host.endswith("." + d) for d in domains)


def source_credibility(source=None, text=""):
    """Rates where the post came from. Returns (level, reason); level is High/Medium/Low/Unknown."""
    if source and source.strip():
        host = _domain(source)
        name = source.strip().lower()
        if host:
            if _matches(host, HIGH_CREDIBILITY_DOMAINS) or re.search(r"\.(gov|gov\.in|nic\.in|edu|ac\.in)$", host):
                return "High", f"{host} is an official health authority, government or academic source"
            if _matches(host, MEDIUM_CREDIBILITY_DOMAINS):
                return "Medium", f"{host} is an established news or fact-checking outlet; check its cited sources"
            if _matches(host, SOCIAL_DOMAINS):
                return "Low", f"{host} is a social-media platform, not an authoritative health source"
            if _matches(host, SHORTENER_DOMAINS):
                return "Low", "the link is shortened, which hides the original source"
            if _matches(host, BLOG_DOMAINS):
                return "Low", f"{host} hosts personal blogs without editorial or medical review"
            return "Unknown", f"{host} is not in the list of rated sources"
        if name in HIGH_CREDIBILITY_NAMES:
            return "High", f"{source.strip()} is an official health authority"
        if name in SOCIAL_NAMES:
            return "Low", f"{source.strip()} is a social-media platform, not an authoritative health source"
        return "Unknown", f"'{source.strip()}' is not in the list of rated sources"
    if text and _FORWARD_CUES.search(text):
        return "Low", "the message looks like a forwarded chain message with no original source"
    return "Unknown", "no source was provided"


# --------------------------------------------------------------------------- KB evidence
NEGATION_PATTERN = re.compile(
    r"\b(not|no|never|none|cannot|can't|doesn't|don't|isn't|aren't|won't|"
    r"nahi|nahin|nai|mat|na)\b|नहीं|नही|मत|न\s",
    flags=re.IGNORECASE,
)


def is_negated(text):
    return bool(NEGATION_PATTERN.search(text))


FACT_STATUS_TEXT = {
    "contradicts_fact": "Contradicts trusted sources",
    "matches_myth": "Matches known misinformation",
    "supports_fact": "Supported by trusted sources",
    "no_match": "Unverified - no matching trusted evidence",
}


def evidence_score(claim, kb_type, kb_statement, similarity, min_similarity=0.5):
    """Evidence in [0, 1]: 0.5 neutral, >0.5 points to misinformation. Returns (score, status_code)."""
    if similarity is None or similarity < min_similarity:
        return 0.5, "no_match"
    strength = (similarity - min_similarity) / (1 - min_similarity)
    if kb_type == "myth":
        return 0.5 + 0.5 * strength, "matches_myth"
    if is_negated(claim) != is_negated(kb_statement):
        return 0.5 + 0.5 * strength, "contradicts_fact"
    return 0.5 - 0.5 * strength, "supports_fact"


# --------------------------------------------------------------------------- scoring
DEFAULT_CONFIG = {
    "classifier_weight": 0.6,
    "decision_threshold": 0.5,
    "low_threshold": 0.4,
    "high_threshold": 0.6,
    "min_evidence_similarity": 0.5,
    "red_flag_weight": 0.03,
    "credibility_weight": 0.05,
}


def combine_scores(classifier_probability, evidence, n_red_flags, credibility_level, cfg):
    w = cfg["classifier_weight"]
    score = w * classifier_probability + (1 - w) * evidence
    score += min(n_red_flags, 3) * cfg.get("red_flag_weight", 0.0)
    score += cfg.get("credibility_weight", 0.0) * {"High": -1, "Low": 1}.get(credibility_level, 0)
    return float(min(1.0, max(0.0, score)))


def three_way_label(score, low_threshold, high_threshold):
    if score >= high_threshold:
        return LABEL_MISINFO
    if score < low_threshold:
        return LABEL_RELIABLE
    return LABEL_SUSPICIOUS


def calibrate_band(scores, labels, threshold, reliable_precision=0.90, misinfo_precision=0.85,
                   max_width=0.25, min_width=0.05, min_count=10):
    """Choose the Suspicious band [low, high) around the decision threshold on validation data:
    'Reliable' predictions should be >= reliable_precision trustworthy and 'Misinformation'
    predictions >= misinfo_precision misinformation. Returns (low, high)."""
    scores, labels = list(scores), list(labels)
    low, high = max(0.0, threshold - 0.1), min(1.0, threshold + 0.1)
    steps = [round(i / 100, 2) for i in range(1, 100)]
    for t in sorted((s for s in steps if s <= threshold), reverse=True):
        sel = [y for s, y in zip(scores, labels) if s < t]
        if len(sel) >= min_count and sel.count(0) / len(sel) >= reliable_precision:
            low = t
            break
    for t in sorted(s for s in steps if s >= threshold):
        sel = [y for s, y in zip(scores, labels) if s >= t]
        if len(sel) >= min_count and sel.count(1) / len(sel) >= misinfo_precision:
            high = t
            break
    low = min(max(low, threshold - max_width), threshold - min_width)
    high = max(min(high, threshold + max_width), threshold + min_width)
    return round(max(0.0, low), 2), round(min(1.0, high), 2)


# --------------------------------------------------------------------------- explanation
_FILLER_WORDS = set("""
a an the and or but if of to in on at by for with from as is are was were be been being has have had do does
did this that these those it its it's i you he she we they them his her our your their my me not no so than
then there here what which who whom when where why how all any some can could will would shall should may
might must also just only very about into over after before up down out more most such
hai hain ka ki ke ko se mein me par aur ya bhi to toh ho hota hoti hote kar karta karti karte deta deti dete
wala wali yeh ye woh wo is us
है हैं का की के को से में पर और या भी तो हो होता होती होते कर करता करती करते देता देती देते यह वह
""".split())


def informative_features(features, top_n=5):
    """Drop filler words and numbers from (feature, contribution) pairs used in explanations."""
    keep = []
    for f, v in features:
        tokens = str(f).lower().split()
        if not tokens or all(t in _FILLER_WORDS or t.isdigit() for t in tokens):
            continue
        keep.append((f, v))
    return keep[:top_n]


def _src_phrase(source):
    if not source or str(source).startswith("training data"):
        return ""
    return f" ({source})"


def build_reasons(*, label, score, classifier_probability, fact_status, top_match, flags,
                  credibility, is_healthcare, top_features):
    reasons = []
    if not is_healthcare:
        reasons.append("The post does not appear to be about health or medicine, so this assessment may not be meaningful.")
    if top_match is not None and fact_status != "no_match":
        stmt, src = top_match["statement"], _src_phrase(top_match.get("source"))
        if fact_status == "contradicts_fact":
            reasons.append(f"Contradicts trusted health information{src}: \u201c{stmt}\u201d")
        elif fact_status == "matches_myth":
            reasons.append(f"Closely matches a known false health claim{src}: \u201c{stmt}\u201d")
        else:
            reasons.append(f"Consistent with trusted health information{src}: \u201c{stmt}\u201d")
    else:
        reasons.append("No closely matching statement was found in the trusted knowledge base, so the claim is unverified.")
    reasons += [f["reason"] + "." for f in flags]
    p = round(classifier_probability * 100)
    if classifier_probability >= 0.7:
        reasons.append(f"The language model rates the wording as likely misinformation ({p}%).")
    elif classifier_probability <= 0.3:
        reasons.append(f"The language model rates the wording as likely reliable ({p}% misinformation probability).")
    else:
        reasons.append(f"The language model is uncertain ({p}% misinformation probability).")
    level, why = credibility
    if level != "Unknown":
        reasons.append(f"Source credibility is {level}: {why}.")
    if top_features:
        towards = [f"'{f}'" for f, v in top_features if v > 0][:3]
        away = [f"'{f}'" for f, v in top_features if v < 0][:3]
        parts = []
        if towards:
            parts.append("towards misinformation: " + ", ".join(towards))
        if away:
            parts.append("towards reliable: " + ", ".join(away))
        if parts:
            reasons.append("Most influential words (" + "; ".join(parts) + ").")
    return reasons


def analyze_claim(text, *, classifier_proba, kb_search, cfg, explain=None, source=None,
                  classifier_name="classifier"):
    """Full analysis of one post. The three callables are supplied by the notebook or the backend:
         classifier_proba(clean_text) -> P(misinformation)
         kb_search(clean_text)        -> list of {'statement','type','source','id','similarity'}, best first
         explain(clean_text)          -> list of (feature, contribution)"""
    clean = preprocess_text(text)
    if not clean:
        raise ValueError("The text is empty after cleaning.")
    language = detect_language(clean)
    is_healthcare, health_terms = health_relevance(clean)
    p = float(classifier_proba(clean))
    matches = kb_search(clean) or []
    top = matches[0] if matches else None
    if top is not None:
        ev, status = evidence_score(clean, top["type"], top["statement"], top["similarity"],
                                    cfg["min_evidence_similarity"])
    else:
        ev, status = 0.5, "no_match"
    flags = red_flags(clean)
    credibility = source_credibility(source, text)
    score = combine_scores(p, ev, len(flags), credibility[0], cfg)
    label = three_way_label(score, cfg["low_threshold"], cfg["high_threshold"])
    features = informative_features(explain(clean)) if explain else []
    reasons = build_reasons(label=label, score=score, classifier_probability=p, fact_status=status,
                            top_match=top, flags=flags, credibility=credibility,
                            is_healthcare=is_healthcare, top_features=features)
    summary = f"Classified as {label} with a misinformation score of {round(score * 100)}%."
    return {
        "input": text,
        "cleaned_input": clean,
        "language": language,
        "category": "Healthcare" if is_healthcare else "Non-healthcare",
        "health_terms": health_terms,
        "classification": label,
        "misinformation_score": round(score * 100, 1),
        "confidence": round(max(score, 1 - score) * 100, 1),
        "fact_verification": {
            "status": FACT_STATUS_TEXT[status],
            "status_code": status,
            "matched_statement": top["statement"] if top is not None and status != "no_match" else None,
            "matched_source": top.get("source") if top is not None and status != "no_match" else None,
            "similarity": round(float(top["similarity"]), 4) if top is not None else None,
        },
        "source_credibility": {"level": credibility[0], "reason": credibility[1]},
        "classifier": {"name": classifier_name, "misinformation_probability": round(p * 100, 1)},
        "red_flags": flags,
        "top_features": [{"feature": f, "contribution": round(float(v), 4)} for f, v in features],
        "reasons": reasons,
        "explanation": " ".join([summary] + reasons[:3]),
        "disclaimer": DISCLAIMER,
    }
