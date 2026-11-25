import json, os, time, requests
D="source/fulltext/"; idx=json.load(open(D+"index.json")); t0=time.time()
for k,e in idx.items():
    if time.time()-t0>110: break
    if not e.get("pmcid") or e.get("status")=="fulltext": continue
    try:
        x=requests.get(f"https://www.ebi.ac.uk/europepmc/webservices/rest/{e['pmcid']}/fullTextXML",timeout=25)
        if x.status_code==200 and len(x.content)>5000:
            open(D+f"{int(k):03d}.xml","wb").write(x.content); e["status"]="fulltext"
        else: e["status"]=f"none {x.status_code}"
    except Exception as ex: e["status"]="err "+type(ex).__name__
    json.dump(idx,open(D+"index.json","w"),indent=0)
from collections import Counter
print(Counter(v.get("status") for v in idx.values() if v.get("pmcid")))
