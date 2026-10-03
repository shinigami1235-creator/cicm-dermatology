import json,re
raw=json.load(open('/mnt/user-data/uploads/CICM/research/pubmed-raw.json'))
ids,recs=raw['ids'],raw['recs']
fac={'Meephansan J':'Meephansan','Juntongjin P':'Juntongjin','Sirithanabadeekul P':'Sirithanabadeekul','Nitayavardhana S':'Nitayavardhana','Phadungsaksawasdi P':'Phadungsaksawasdi'}
derm=re.compile(r'skin|derm|psoria|acne|melasma|hair|alopecia|nail|keratinocyte|laser|vitiligo|eczema|wound|botulinum|filler|pigment|melano|cutaneous|aging|ageing|urticaria|photo|pruritus|hyperhidrosis|scar|keloid|tattoo|rosacea|wrinkle|transdermal|topical|collagen|fibroblast|exosome|microneedle|lupus|pemphig|lymphoma|melanoma|contact|UVB|sebac|axillary|facial|cellulite|naevus|nevus|hypomelanosis|panniculitis|eruption|bullous|sunscreen|moistur|Malassezia',re.I)
papers={}
for k,f in fac.items():
    for i in ids[k]:
        p=recs.get(i)
        if not p: continue
        au=next((a for a in p['authors'] if a['n'].lower().startswith(f.lower())),None)
        aff=(au['aff'] if au else '').lower()
        if f=='Nitayavardhana' and not (derm.search(p['title']) and (re.search('thammasat|chulabhorn|dermatolog|siriraj|ramathibodi',aff) or not aff)): continue
        papers.setdefault(i,{**p,'faculty':[]})['faculty'].append(k)
for i in ids['_aff']:
    p=recs.get(i)
    if p: papers.setdefault(i,{**p,'faculty':[]})['program']=True
L=[p for p in papers.values() if not re.match(r'(Author )?Correction|Erratum',p['title'],re.I)]
L=[p for p in L if p['faculty'] or derm.search(p['title'])]
L=[p for p in L if p['faculty'] or not (re.search(r'\brats?\b|rabbit|myoblast|neural|alzheimer|vancomycin|Polyquaternium',p['title'],re.I) and not re.search('skin|wound|hair|derm|psoria',p['title'],re.I))]
T=[('AI & digital dermatology',re.compile(r'artificial intelligence|deep learning|machine learning|neural network|convolutional',re.I)),
('Lasers & light',re.compile(r'laser|radiofrequency|ultrasound|energy-based|\bLED\b|light therapy|light-guiding|photodynamic|picosecond|fractional|\bIPL\b|NB-UVB|narrowband|phototherapy|excimer|ultraviolet B')),
('Injectables & aesthetics',re.compile(r'botulinum|filler|hyaluronic|toxin|aesthetic|cosmetic|rejuvenation|thread|exosome|platelet-rich|polynucleotide|hyperhidrosis|nasolabial',re.I)),
('Pigment & melasma',re.compile(r'melasma|pigment|vitiligo|melanin|melanogen|whitening|lentig|hypomelanosis',re.I)),
('Hair & nails',re.compile(r'hair|alopecia|nail|onycho|dermal papilla',re.I)),
('Acne',re.compile(r'acne',re.I)),
('Psoriasis & inflammatory skin disease',re.compile(r'psoria|atopic|eczema|dermatitis|urticaria|lichen|hidradenitis|rosacea|pruritus|drug eruption|bullous|pemphig',re.I)),
('Skin aging',re.compile(r'aging|ageing|wrinkle|photoaging',re.I)),
('Wound healing',re.compile(r'wound|scar|keloid|burn',re.I)),
('Skin biology & immunology',re.compile(r'keratinocyte|cytokine|immun|interleukin|gene|expression|microbio|lymphoma|T cell|antimicrobial|peptide|inflamm|transcript|proteom|fibroblast|barrier|Malassezia',re.I))]
out=[]
for p in L:
    t=next((n for n,r in T if r.search(p['title'])),'Clinical dermatology')
    if re.search('GLP-1|COVID',p['title']): t='Other medicine'
    j=re.sub(r'\s*[:(].*$','',p['journal']).strip()
    j=' '.join(w if w.lower() in('of','and','the','in','for','&') else (w[0].upper()+w[1:]) for w in j.split())
    j=j[0].upper()+j[1:]
    out.append({'pmid':p['pmid'],'title':p['title'].rstrip('.'),'authors':[a['n'] for a in p['authors']],'journal':j,'iso':p['iso'],'year':p['year'],'doi':p['doi'],'faculty':p['faculty'],'topic':t,
      'design':next((x for x in ['Meta-Analysis','Systematic Review','Randomized Controlled Trial','Clinical Trial','Review','Case Reports'] if x in p['types']),'')})
out.sort(key=lambda p:(-p['year'],p['title']))
json.dump({'generated':'2026-10-03','source':'PubMed (NCBI E-utilities)','papers':out},open('site/data/publications.json','w'),ensure_ascii=False,indent=0)
from collections import Counter
print(len(out), Counter(p['topic'] for p in out).most_common(), {k:sum(k in p['faculty'] for p in out) for k in fac})
print(Counter(p['journal'] for p in out).most_common(8)); print(Counter(p['design'] for p in out)); print(min(p['year'] for p in out))
print('RCT+',sum(p['design'] in('Randomized Controlled Trial','Meta-Analysis','Systematic Review','Clinical Trial') for p in out), 'journals',len(set(p['journal'] for p in out)))
