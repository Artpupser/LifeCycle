"""Normalize a downloaded public CSV/HTML allocation extract; never queries a phone."""
import csv, json, re, sys
from pathlib import Path
from html.parser import HTMLParser
class Table(HTMLParser):
    def __init__(self): super().__init__();self.rows=[];self.row=[];self.cell=None
    def handle_starttag(self,tag,attrs):
        if tag.lower()=='tr': self.row=[]
        if tag.lower()=='td': self.cell=''
    def handle_data(self,data):
        if self.cell is not None:self.cell+=data
    def handle_endtag(self,tag):
        if tag.lower()=='td' and self.cell is not None:self.row.append(self.cell.strip());self.cell=None
        if tag.lower()=='tr' and self.row:self.rows.append(self.row)
source=Path(sys.argv[1]).read_text(encoding='utf-8-sig')
if '<table' in source.lower(): parser=Table();parser.feed(source);rows=parser.rows
else: rows=list(csv.reader(source.splitlines(),delimiter=';'))
operators=[];ranges=[]
for row in rows:
    if len(row)<5 or not re.fullmatch(r'9\d{2}',row[0].strip()):continue
    code=int(row[0]);start=int(row[1]);end=int(row[2]);name=row[4].strip()
    if not 0<=start<=end<=9999999:raise ValueError('Invalid allocation interval')
    if name not in operators:operators.append(name)
    ranges.append([code*10000000+start,code*10000000+end,operators.index(name)])
if not ranges:raise ValueError('No valid DEF allocations found')
ranges.sort();merged=[]
for previous,current in zip(ranges,ranges[1:]):
    if previous[1]>=current[0]:raise ValueError('Overlapping allocation intervals')
for item in ranges:
    if merged and merged[-1][1]+1==item[0] and merged[-1][2]==item[2]:merged[-1][1]=item[1]
    else:merged.append(item)
output={'source':sys.argv[2], 'snapshot':'archive; original publication date unspecified','operators':operators,'ranges':merged}
Path(__file__).resolve().parents[1].joinpath('src/systems/operators/ranges.json').write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')))
print(len(ranges),'allocations;',len(merged),'merged ranges')
