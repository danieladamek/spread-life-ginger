import yaml, requests, re, time, sys
P="source/registry.yaml"; reg=yaml.safe_load(open(P,encoding="utf-8")); t0=time.time(); got=[]
for k,v in reg.items():
    if time.time()-t0>140: break
    if v.get("abstract") or not v.get("doi") or v.get("epmc_tried"): continue
    try:
        j=requests.get("https://www.ebi.ac.uk/europepmc/webservices/rest/search",params={"query":f'DOI:"{v["doi"]}"',"format":"json","resultType":"core","pageSize":1},timeout=25).json()
        res=j.get("resultList",{}).get("result",[])
        if res and res[0].get("abstractText"):
            v["abstract"]=re.sub(r"<[^>]+>"," ",res[0]["abstractText"]); v["read"]=v.get("read") or "abstract"; got.append(k)
        if res: v["pmid"]=res[0].get("pmid"); v["pmcid"]=v.get("pmcid") or res[0].get("pmcid")
        v["epmc_tried"]=True
    except Exception as e: print(k,"err",type(e).__name__)
yaml.safe_dump(reg,open(P,"w",encoding="utf-8"),sort_keys=False,allow_unicode=True,width=250)
print("got",got,"| still no abstract:",[k for k,v in reg.items() if not v.get("abstract")])
