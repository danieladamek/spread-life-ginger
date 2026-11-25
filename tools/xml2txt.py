import re, glob, html, sys
from xml.etree import ElementTree as ET
def txt(e): return re.sub(r"\s+"," ","".join(e.itertext())).strip()
for f in sorted(glob.glob("source/fulltext/*.xml")):
    try: root=ET.parse(f).getroot()
    except Exception as ex: print("bad",f,ex); continue
    out=[]
    t=root.find(".//article-title"); out.append("# "+(txt(t) if t is not None else f))
    a=root.find(".//abstract")
    if a is not None: out.append("## Abstract\n"+txt(a))
    body=root.find(".//body")
    if body is not None:
        for sec in body.iter("sec"):
            ti=sec.find("title"); paras=[txt(p) for p in sec.findall("p")]
            if paras: out.append("## "+(txt(ti) if ti is not None else "")+"\n"+"\n".join(paras))
        for tw in body.iter("table-wrap"):
            cap=tw.find(".//caption"); rows=[" | ".join(txt(c) for c in tr) for tr in tw.iter("tr")]
            out.append("## TABLE "+(txt(cap) if cap is not None else "")+"\n"+"\n".join(rows[:60]))
    open(f.replace(".xml",".txt"),"w",encoding="utf-8").write("\n\n".join(out))
    print(f[-7:-4], len(" ".join(out).split()), "words")
