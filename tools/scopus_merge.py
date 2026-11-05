"""Merge Scopus CSV exports into data/publications.json.

Scopus Preview (free) hides each lecturer's paper list, so this needs an export
from someone signed in to Scopus through Thammasat:
  1. Open the lecturer's Scopus profile (links are in the research section of the site).
  2. Documents tab > Export all > CSV, with "Citation information" ticked.
  3. Save every CSV into one folder and run:
       python tools/scopus_merge.py path/to/folder
Papers already in the list (same DOI) gain a Scopus link and citation count.
Papers only in Scopus are added. Run it again whenever there is a new export.
"""
import csv, glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBS = os.path.join(ROOT, "data", "publications.json")
CONTENT = os.path.join(ROOT, "data", "content.json")

TOPICS = [
    ("AI & digital dermatology", r"artificial intelligence|deep learning|machine learning|neural network|convolutional", re.I),
    ("Lasers & light", r"laser|radiofrequency|ultrasound|energy-based|\bLED\b|light therapy|light-guiding|photodynamic|picosecond|fractional|\bIPL\b|NB-UVB|narrowband|phototherapy|excimer|ultraviolet B", 0),
    ("Injectables & aesthetics", r"botulinum|filler|hyaluronic|toxin|aesthetic|cosmetic|rejuvenation|thread|exosome|platelet-rich|polynucleotide|hyperhidrosis|nasolabial", re.I),
    ("Pigment & melasma", r"melasma|pigment|vitiligo|melanin|melanogen|whitening|lentig|hypomelanosis", re.I),
    ("Hair & nails", r"hair|alopecia|nail|onycho|dermal papilla", re.I),
    ("Acne", r"acne", re.I),
    ("Psoriasis & inflammatory skin disease", r"psoria|atopic|eczema|dermatitis|urticaria|lichen|hidradenitis|rosacea|pruritus|drug eruption|bullous|pemphig", re.I),
    ("Skin aging", r"aging|ageing|wrinkle|photoaging", re.I),
    ("Wound healing", r"wound|scar|keloid|burn", re.I),
    ("Skin biology & immunology", r"keratinocyte|cytokine|immun|interleukin|gene|expression|microbio|lymphoma|T cell|antimicrobial|peptide|inflamm|transcript|proteom|fibroblast|barrier|Malassezia", re.I),
]
TOPICS = [(n, re.compile(p, f)) for n, p, f in TOPICS]
DERM = re.compile(r"skin|derm|psoria|acne|melasma|hair|alopecia|nail|keratinocyte|laser|vitiligo|eczema|wound|botulinum|filler|pigment|melano|cutaneous|aging|ageing|urticaria|photo|pruritus|hyperhidrosis|scar|keloid|tattoo|rosacea|wrinkle|transdermal|topical|collagen|fibroblast|exosome|microneedle|lupus|pemphig|melanoma|sebac|facial|cellulite|nevus|naevus|sunscreen|moistur", re.I)
SKIP_TYPES = {"Erratum", "Retracted", "Note"}


def topic(title):
    if re.search("GLP-1|COVID", title):
        return "Other medicine"
    return next((n for n, r in TOPICS if r.search(title)), "Clinical dermatology" if DERM.search(title) else "Other medicine")


def short_name(a):
    # "Meephansan J." / "Meephansan, J." -> "Meephansan J"
    a = a.strip().rstrip(".")
    if "," in a:
        last, first = [x.strip() for x in a.split(",", 1)]
        return last + " " + re.sub(r"[^A-Z]", "", first)
    return re.sub(r"\.", "", a)


def main(folder):
    data = json.load(open(PUBS, encoding="utf-8"))
    content = json.load(open(CONTENT, encoding="utf-8"))
    by_scopus = {f["scopus"]["id"]: f.get("pubmed") for f in content["faculty"] if f.get("scopus") and f.get("pubmed")}
    papers = data["papers"]
    by_doi = {p["doi"].lower(): p for p in papers if p.get("doi")}
    by_eid = {p["eid"]: p for p in papers if p.get("eid")}
    files = sorted(glob.glob(os.path.join(folder, "*.csv")))
    if not files:
        sys.exit("No .csv files in " + folder)
    matched = added = 0
    for fn in files:
        with open(fn, encoding="utf-8-sig", newline="") as fh:
            for r in csv.DictReader(fh):
                if r.get("Document Type", "") in SKIP_TYPES or not r.get("Title"):
                    continue
                ids = [x.strip() for x in re.split(r"[;,]", r.get("Author(s) ID", "")) if x.strip()]
                fac = [by_scopus[i] for i in ids if i in by_scopus]
                doi, eid = r.get("DOI", "").strip(), r.get("EID", "").strip()
                cites = int(r.get("Cited by") or 0)
                p = by_eid.get(eid) or (by_doi.get(doi.lower()) if doi else None)
                if p:
                    matched += p.get("eid") is None
                    p["eid"], p["cites"] = eid, cites
                    for k in fac:
                        if k not in p["faculty"]:
                            p["faculty"].append(k)
                    continue
                if not fac:
                    continue
                title = r["Title"].strip().rstrip(".")
                p = {
                    "pmid": "", "eid": eid, "title": title,
                    "authors": [short_name(a) for a in r.get("Authors", "").split(";") if a.strip()],
                    "journal": r.get("Source title", "").strip(), "iso": "",
                    "year": int(r.get("Year") or 0), "doi": doi, "faculty": fac, "topic": topic(title),
                    "design": "Review" if r.get("Document Type") == "Review" else "", "cites": cites,
                }
                papers.append(p)
                by_eid[eid] = p
                if doi:
                    by_doi[doi.lower()] = p
                added += 1
    papers.sort(key=lambda p: (-p["year"], p["title"]))
    data["source"] = "PubMed (NCBI E-utilities) and Scopus exports"
    json.dump(data, open(PUBS, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"{len(files)} files. {matched} PubMed papers matched in Scopus, {added} Scopus-only papers added, {len(papers)} papers in total.")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
