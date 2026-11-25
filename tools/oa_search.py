import sys, json, requests, yaml
def inv(i):
    pos={}
    for w,ps in (i or {}).items():
        for p in ps: pos[p]=w
    return " ".join(pos[k] for k in sorted(pos)) or None
qs=[l.strip() for l in open(sys.argv[1],encoding="utf-8") if l.strip()]
n=int(sys.argv[2]) if len(sys.argv)>2 else 4
out=[]
for q in qs:
    mode,_,text=q.partition("|")
    p={"per-page":n,"select":"id,doi,title,publication_year,cited_by_count,authorships,primary_location,abstract_inverted_index,open_access,ids"}
    if mode=="t": p["filter"]="title.search:"+text; p["sort"]="cited_by_count:desc"
    else: p["search"]=text
    try: j=requests.get("https://api.openalex.org/works",params=p,timeout=30).json()
    except Exception as e: print("ERR",text); continue
    print(f"\n## {text}  (hits {j['meta']['count']})")
    for x in j["results"]:
        au=[a["author"]["display_name"] for a in x.get("authorships",[])]
        a=inv(x.get("abstract_inverted_index"))
        rec={"q":text,"title":x["title"],"year":x["publication_year"],"authors":", ".join(au[:4]),"doi":(x.get("doi") or "").replace("https://doi.org/",""),"venue":((x.get("primary_location") or {}).get("source") or {}).get("display_name"),"cited":x["cited_by_count"],"oa":x["open_access"]["oa_status"],"pmcid":(x.get("ids") or {}).get("pmcid"),"abstract":a}
        out.append(rec)
        print(f"- {x['publication_year']} c{x['cited_by_count']} {(au[0] if au else '-')[:20]} | {(x['title'] or '')[:95]} | abs={'y' if a else 'n'}")
json.dump(out,open(sys.argv[1]+".json","w",encoding="utf-8"),ensure_ascii=False,indent=0)
