"""Assemble Spread Life: Ginger pack 0.2 from review-0.2/*.md, source/registry.yaml,
source/summaries/*.yaml and source/figures-0.2/. Keys [@key; @key2] become numbers by first
appearance (review, then recipes, then figures). Run from the app folder."""
import yaml, re, json, csv, glob, os
C = "content-pack/"; SRC = "source/"
PARTS = ["front", "part-i-plant-chem", "part-ii", "part-iii", "part-iv", "part-v"]
reg = yaml.safe_load(open(SRC + "registry.yaml", encoding="utf-8"))
summ = {}
for f in sorted(glob.glob(SRC + "summaries/*.yaml")): summ.update(yaml.safe_load(open(f, encoding="utf-8")))
review = "\n\n".join(open(f"{C}review-0.2/{p}.md", encoding="utf-8").read().strip() for p in PARTS) + "\n"
recipes = yaml.safe_load(open(SRC + "recipes-0.2.yaml", encoding="utf-8"))
figs = yaml.safe_load(open(SRC + "figures-0.2/figures.yaml", encoding="utf-8"))
KEY = r"@([A-Za-z][\w-]*)"
order = []
def see(text):
    for k in re.findall(KEY, text):
        if k not in reg: raise SystemExit(f"unknown key {k}")
        if k not in order: order.append(k)
see(review); see(yaml.safe_dump(recipes, allow_unicode=True))
for f in figs:
    see(" ".join("@" + r.lstrip("@") for r in f["refs"]))
gloss = yaml.safe_load(open(SRC + "glossary-0.2.yaml", encoding="utf-8"))
see(" ".join(s for t in gloss for s in t.get("sources") or []))
cfiles = sorted(glob.glob(SRC + "concepts-0.2/*.md"))
for cf in cfiles: see(open(cf, encoding="utf-8").read())
N = {k: i + 1 for i, k in enumerate(order)}
def group(m):
    ks = re.findall(KEY, m.group(1)); return "[" + ", ".join(str(n) for n in sorted({N[k] for k in ks})) + "]"
num = lambda s: re.sub(r"\[(@[^\]]+)\]", group, s)
# sections where each key is cited
secs = {}; cur = None
for line in review.split("\n"):
    m = re.match(r"<!-- section: ([\w-]+) -->", line)
    if m: cur = m.group(1)
    for k in re.findall(KEY, line): secs.setdefault(k, []); cur in secs[k] or secs[k].append(cur)
for r in recipes["recipes"]:
    for k in re.findall(KEY, yaml.safe_dump(r, allow_unicode=True)): secs.setdefault(k, []); "recipes" in secs[k] or secs[k].append("recipes")
for f in figs:
    for k in f["refs"]: k = k.lstrip("@"); secs.setdefault(k, []); ("figure:" + f["id"]) in secs[k] or secs[k].append("figure:" + f["id"])
# review.md + figure labels by marker order
review_n = num(review)
markers = list(dict.fromkeys(re.findall(r"<!-- figure: ([a-z0-9-]+) -->", review_n)))
lab = {fid: f"Figure {i + 1}" for i, fid in enumerate(markers)}
open(C + "review.md", "w", encoding="utf-8").write(review_n)
# recipes
for r in recipes["recipes"]:
    for fld in ("science_note", "safety_note", "gloss"):
        if r.get(fld): r[fld] = num(r[fld])
    if str(r.get("source_ref", "")).startswith("@"): r["source_ref"] = N[r["source_ref"][1:]]
yaml.safe_dump(recipes, open(C + "recipes.yaml", "w", encoding="utf-8"), sort_keys=False, allow_unicode=True, width=200)
# figures and data
os.makedirs(C + "figures/data", exist_ok=True)
for f in figs:
    f["refs"] = sorted({N[k.lstrip("@")] for k in f["refs"]}); f["label"] = lab.get(f["id"], f["label"])
    src = SRC + "figures-0.2/data/" + f["data"].split("/")[-1]
    if src.endswith(".csv"):
        rows = list(csv.DictReader(open(src, encoding="utf-8")))
        for row in rows: row["ref"] = N[row["ref"].lstrip("@")]
        with open(C + f["data"], "w", encoding="utf-8", newline="") as o:
            w = csv.DictWriter(o, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    else:
        j = json.load(open(src, encoding="utf-8"))
        for x in j["nodes"] + j["edges"]:
            if "refs" in x: x["refs"] = sorted({N[k.lstrip("@")] for k in x["refs"]})
        json.dump(j, open(C + f["data"], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for e in f.get("explain") or []:
        if e.get("text"): e["text"] = num(e["text"])
    f["caption"] = num(f["caption"])
figs.sort(key=lambda f: markers.index(f["id"]) if f["id"] in markers else 99)
yaml.safe_dump(figs, open(C + "figures.yaml", "w", encoding="utf-8"), sort_keys=False, allow_unicode=True, width=200)
# glossary and concepts
for t in gloss: t["sources"] = sorted({N[x.lstrip("@")] for x in t.get("sources") or []})
yaml.safe_dump(gloss, open(C + "glossary.yaml", "w", encoding="utf-8"), sort_keys=False, allow_unicode=True, width=200)
for cf in cfiles:
    open(C + "concepts/" + os.path.basename(cf), "w", encoding="utf-8").write(num(open(cf, encoding="utf-8").read()))
# references
REVIEWISH = re.compile(r"meta-analys|systematic review|umbrella|overview of|evidence scan|\breview\b|interventions for", re.I)
def role(k, v):
    if v.get("primary"): return "data-source"
    if k == "emamonograph2025": return "guideline"
    if v["tier"] == "background": return "background"
    if REVIEWISH.search(v["title"]) or k in ("chrubasik2005", "ali2007", "grzanna2005", "nam2014", "le2014", "spence2023", "petroianu2016", "sherman1999"): return "review"
    if k in ("schwertner2007", "torrecampo2026"): return "method"
    return "support"
def vlevel(v):
    rd = str(v.get("read") or "")
    if rd.startswith("full text"): return "full-text"
    if "abstract" in rd and "fragment" not in rd: return "abstract"
    return "partial"
out = []
for k in order:
    v = reg[k]; s = summ.get(k)
    if not s: raise SystemExit(f"no summary for {k}")
    yr = v.get("year"); acc = not yr
    cit = f'{v["authors"]}. {v["title"]}. {v.get("venue") or ""}{". " + str(yr) if yr else ". Accessed 2026"}.'.replace("..", ".")
    e = {"n": N[k], "key": k, "tier": v["tier"], "anchor": bool(v.get("anchor")), "citation": cit, "year": yr or 2026,
         "summary": s["s"].strip(), "role_here": role(k, v), "role_note": "Cited in: " + ", ".join(secs.get(k, [])),
         "cited_in": [x for x in secs.get(k, []) if not x.startswith("figure:") and x != "recipes"],
         "verified": True, "verified_level": vlevel(v), "read_note": v.get("read")}
    if v.get("primary"): e["primary_source"] = True
    if v.get("doi"): e["doi"] = v["doi"]
    if v.get("url") and not v.get("doi"): e["url"] = v["url"]
    if not v.get("doi") and not v.get("url"): raise SystemExit(f"no doi/url for {k}")
    if v["tier"] == "seminal": e["why_it_mattered"] = (s.get("w") or "").strip()
    if acc: e["year_note"] = "undated web page; year is the year accessed"
    out.append(e)
yaml.safe_dump(out, open(C + "references.yaml", "w", encoding="utf-8"), sort_keys=False, allow_unicode=True, width=220)
json.dump(N, open(SRC + "sweep/renumber-map-0.2.json", "w"), indent=0)
print(len(out), "references;", len(markers), "figure markers; words:", len(re.sub(r"<!--.*?-->|\[[\d, ]+\]", "", review_n).split()))
