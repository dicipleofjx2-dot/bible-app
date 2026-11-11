"""PPT 한 벌을 N장씩 잘라 여러 파일로. 사용: python3 split-pptx.py 원본.pptx 출력폴더 13
파일 이름: 성경맥잡기1-신약-01(1-13쪽).pptx … 구역(과)은 잘린 범위에 맞게 남긴다."""
import sys, os, zipfile, shutil
from pptx import Presentation

def fix_types(f):
    # python-pptx 가 jpg 기본 형식을 빼먹는 경우가 있어 [Content_Types].xml 에 다시 적는다
    z = zipfile.ZipFile(f)
    ct = z.read('[Content_Types].xml').decode()
    exts = {x.rsplit('.', 1)[1].lower() for x in z.namelist() if '.' in x.rsplit('/', 1)[-1]}
    add = ''.join(f'<Default Extension="{e}" ContentType="{t}"/>' for e, t in (('jpg', 'image/jpeg'), ('jpeg', 'image/jpeg'), ('png', 'image/png'))
                  if e in exts and f'Extension="{e}"' not in ct)
    if not add:
        return
    tmp = f + '.tmp'
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as o:
        for i in z.infolist():
            o.writestr(i, ct.replace('<Default ', add + '<Default ', 1).encode() if i.filename == '[Content_Types].xml' else z.read(i))
    z.close()
    shutil.move(tmp, f)


src, out, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
P14 = '{http://schemas.microsoft.com/office/powerpoint/2010/main}'
total = len(Presentation(src).slides)
parts = (total + n - 1) // n
for k in range(parts):
    lo, hi = k * n, min(total, (k + 1) * n)
    pres = Presentation(src)
    lst = pres.slides._sldIdLst
    ids = list(lst)
    keep = {int(e.get('id')) for e in ids[lo:hi]}
    for e in ids:
        if int(e.get('id')) not in keep:
            pres.part.drop_rel(e.rId)
            lst.remove(e)
    for sec in pres.part._element.iter(P14 + 'section'):
        sl = sec.find(P14 + 'sldIdLst')
        for e in list(sl):
            if int(e.get('id')) not in keep:
                sl.remove(e)
        if len(sl) == 0:
            sec.getparent().remove(sec)
    f = os.path.join(out, f'성경맥잡기1-신약-{k + 1:02d}({lo + 1}-{hi}쪽).pptx')
    pres.save(f)
    fix_types(f)
    print('wrote', os.path.basename(f), hi - lo, '장')
