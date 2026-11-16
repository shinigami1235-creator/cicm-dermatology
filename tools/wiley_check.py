"""List Wiley papers by the permanent lecturers that are missing from data/publications.json.

Searches Crossref for each lecturer's family name in Wiley journals (Crossref member 311,
which also covers Hindawi) and keeps journal articles where that exact family name is an author.
Run on a computer with internet access:
    python tools/wiley_check.py            # list what is missing
    python tools/wiley_check.py --add      # add the missing papers to publications.json
Check each added paper's topic and design by hand afterwards, since Crossref has neither.
"""
import json, os, re, sys, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBS = os.path.join(ROOT, "data", "publications.json")
CONTENT = os.path.join(ROOT, "data", "content.json")


def crossref(family):
    q = urllib.parse.urlencode({"query.author": family, "filter": "member:311,type:journal-article", "rows": 200,
                                "select": "DOI,title,author,container-title,issued"})
    req = urllib.request.Request("https://api.crossref.org/works?" + q, headers={"User-Agent": "cicm-dermatology-site (mailto:derm.admission@gmail.com)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)["message"]["items"]


def main():
    pubs = json.load(open(PUBS, encoding="utf-8"))
    have = {(p.get("doi") or "").lower() for p in pubs["papers"]}
    keys = [f["pubmed"] for f in json.load(open(CONTENT, encoding="utf-8"))["faculty"] if f.get("pubmed")]
    found = {}
    for key in keys:
        family = key.rsplit(" ", 1)[0]
        for it in crossref(family):
            names = [(a.get("family") or "") + " " + "".join(w[0] for w in re.split(r"[\s.-]+", a.get("given") or "") if w) for a in it.get("author", [])]
            if not any(n.strip() == key for n in names):
                continue
            doi = it["DOI"].lower()
            if doi in have:
                continue
            p = found.setdefault(doi, {"pmid": "", "title": " ".join(it.get("title", [""])), "authors": [n.strip() for n in names],
                                       "journal": (it.get("container-title") or [""])[0], "iso": "",
                                       "year": it.get("issued", {}).get("date-parts", [[0]])[0][0], "doi": it["DOI"],
                                       "faculty": [], "topic": "Clinical dermatology", "design": "", "source": "Wiley"})
            p["faculty"].append(key)
    for p in found.values():
        print(p["year"], p["doi"], p["journal"], "|", p["title"], "|", ", ".join(p["faculty"]))
    print(len(found), "missing")
    if found and "--add" in sys.argv:
        pubs["papers"] += list(found.values())
        pubs["papers"].sort(key=lambda p: (-p["year"], p["title"]))
        json.dump(pubs, open(PUBS, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
        print("added; set topic and design by hand")


if __name__ == "__main__":
    main()
