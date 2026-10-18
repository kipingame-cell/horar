"""Rebuild offline GeoNames index from RU.zip, cities500.zip and admin1CodesASCII.txt."""
import sys,json,gzip,zipfile,re,hashlib,datetime
from pathlib import Path
src=Path(sys.argv[1]);out=Path('dist/data');out.mkdir(exist_ok=True)
admins={r[0]:r[1] for line in (src/'admin1CodesASCII.txt').read_text().splitlines() if len(r:=line.split('\t'))>=2}
rows={}
for dataset in ['cities500','RU']:
 with zipfile.ZipFile(src/(dataset+'.zip')) as z:
  for line in z.read(dataset+'.txt').decode().splitlines():
   r=line.split('\t')
   if r[6]!='P' or r[7] in ['PPLQ','PPLH','PPLW'] or not r[17]:continue
   aliases=r[3].split(',');cyr=[a for a in aliases if re.search('[А-Яа-яЁё]',a) and not re.search('[^А-Яа-яЁё0-9 .()’\'-]',a)]
   name=cyr[0] if cyr else r[1]
   if r[0]=='524901':name='Москва'
   if r[0]=='498817':name='Санкт-Петербург'
   search=list(dict.fromkeys([r[1],r[2]]+cyr));search=[a for a in search if a and a!=name]
   rows[r[0]]=[int(r[0]),name,'|'.join(search),float(r[4]),float(r[5]),r[8]+'.'+r[10],r[17],int(r[14] or 0)]
regions={};zones={}
for r in rows.values():
 regions.setdefault(r[5],len(regions));zones.setdefault(r[6],len(zones))
region_list=[[k.split('.')[0],admins.get(k,k.split('.')[-1])] for k in regions]
for r in rows.values():r[5]=regions[r[5]];r[6]=zones[r[6]]
# Population order gives stable, relevant suggestions without sorting all hits each keystroke.
ordered=sorted(rows.values(),key=lambda r:(-r[7],r[0]))
files=[]
for start in range(0,len(ordered),10000):
 name=f'places-{start//10000:02d}.json.gz';files.append(name)
 raw=json.dumps(ordered[start:start+10000],ensure_ascii=False,separators=(',',':')).encode()
 (out/name).write_bytes(gzip.compress(raw,compresslevel=9,mtime=0))
print('Places:',len(ordered),'shards:',len(files))
meta={'source':'GeoNames','license':'CC BY 4.0','date':datetime.date.today().isoformat(),'count':len(ordered),'regions':region_list,'zones':list(zones),'files':files,'inputs':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [src/'RU.zip',src/'cities500.zip',src/'admin1CodesASCII.txt']}}
(out/'places-meta.json').write_text(json.dumps(meta,ensure_ascii=False,separators=(',',':')))
