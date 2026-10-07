#!/usr/bin/env python3
"""Sestaví web Penzion Bella z _data/*.json + src/*.html do složky site/.

Spouští ho GitHub Action po každém uložení v administraci (webhunter-admin),
lokálně:  python3 build.py  a pak  python3 -m http.server -d site 8792
(adresa webu je /penzionbella/, dokud v repozitáři není soubor CNAME – pak /).
"""
import hashlib, html, json, os, re, shutil, datetime
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import Markup

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'site'
CNAME = (ROOT / 'CNAME').read_text().strip() if (ROOT / 'CNAME').exists() else ''
B = '/' if CNAME else '/penzionbella/'

def load(name):
    return json.loads((ROOT / '_data' / name).read_text(encoding='utf-8'))

SITE, T, AP, C, F, R, O, FAQ, G = (load(n + '.json') for n in
    ('site', 'texty', 'apartmany', 'cenik', 'fotky', 'recenze', 'okoli', 'faq', 'gdpr'))
ICONS = json.loads((ROOT / 'src' / 'icons.json').read_text(encoding='utf-8'))

# ---------------------------------------------------------------- pomocníci
def plural(n, one, few, many):
    n = abs(int(n)) if str(n).lstrip('-').isdigit() else 5
    return one if n == 1 else few if 2 <= n <= 4 else many

def nb(s):
    """nezlomitelná mezera po jednopísmenných předložkách a spojkách"""
    s = str(s or '')
    for _ in range(2):
        s = re.sub(r'(^|\s)([ksvzouaiKSVZOUAI])\s', '\\1\\2\u00a0', s)
    s = re.sub(r'(\d) (?=\d{3}\b)', '\\1\u00a0', s)            # 32 000
    s = re.sub(r'(\d) (?=(?:Kč|km|m)\b|%)', '\\1\u00a0', s)     # 300 Kč, 200 m
    return s

def kc(v):
    if v is None or v == '':
        return ''
    s = str(v).strip()
    if re.fullmatch(r'\d[\d\s ]*', s):
        s = f"{int(re.sub(r'[^0-9]', '', s)):,}".replace(',', ' ')
    return s if 'Kč' in s else s + ' Kč'

def des1(v):
    try:
        return f'{float(v):.1f}'.replace('.', ',')
    except (TypeError, ValueError):
        return str(v)

def odstavce(s):
    return [p.strip() for p in str(s or '').split('\n') if p.strip()]

def ic(name, size=24, style='', fill='none', sw='2', cls=''):
    inner = ICONS.get(name) or ICONS.get('check', '')
    st = f' style="{style}"' if style else ''
    extra = f' {cls}' if cls else ''
    return Markup(f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="{fill}" stroke="currentColor" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-{name}{extra}" aria-hidden="true"{st}>{inner}</svg>')

def tel_href(c):
    d = re.sub(r'[^\d+]', '', c)
    if not d.startswith('+'):
        d = '+420' + d.lstrip('0') if len(d) == 9 else d
    return 'tel:' + d

_dims = {}
def dims(src):
    """rozměry obrázku z disku (kvůli width/height a CLS)"""
    if src in _dims:
        return _dims[src]
    w = h = None
    p = ROOT / src
    try:
        from PIL import Image
        with Image.open(p) as im:
            w, h = im.size
    except Exception:
        pass
    _dims[src] = (w, h)
    return w, h

def fix_img(f, dw=1280, dh=853):
    if not f or not f.get('src'):
        return f
    if not f.get('w') or not f.get('h'):
        w, h = dims(f['src'])
        f['w'], f['h'] = w or dw, h or dh
    f.setdefault('alt', '')
    return f

def md5(p):
    return hashlib.md5(Path(p).read_bytes()).hexdigest()[:10]

# ---------------------------------------------------------------- odvozená data
for a in AP:
    a['luzka'] = int(a.get('luzka') or 0)
    a['loznice'] = int(a.get('loznice') or 0)
    a['fotky'] = [fix_img(f, 1600, 1200) for f in a.get('fotky', []) if f.get('src')]
    a['nazev_maly'] = a['nazev'][:1].lower() + a['nazev'][1:]
    a['param'] = [
        {'ikona': 'users', 'text': f"{a['luzka']} {plural(a['luzka'], 'lůžko', 'lůžka', 'lůžek')}"},
        {'ikona': 'bed-double', 'text': f"{a['loznice']} {plural(a['loznice'], 'ložnice', 'ložnice', 'ložnic')}"},
        {'ikona': 'bath', 'text': 'WC a sprchový kout'},
    ]
    if a.get('kuchynka'): a['param'].append({'ikona': 'utensils', 'text': 'kuchyňka'})
    if a.get('balkon'): a['param'].append({'ikona': 'sun', 'text': 'balkon'})
    if a.get('vlastni_vchod'): a['param'].append({'ikona': 'door-open', 'text': 'samostatný vchod'})
    a['nahledy'] = [f for f in a['fotky'] if not f.get('koupelna')][:2]
    a['pobyt_volba'] = 'Zájem o ' + a['nazev_maly']

for k in ('hero', 'kolaz', 'spolecne', 'dalsi', 'okoli'):
    F[k] = [fix_img(f) for f in F.get(k, []) if f.get('src')]
for l in O.get('leto', []):
    if l.get('foto', {}).get('src'):
        fix_img(l['foto'], 1280, 576)

def galerie_dum():
    seen, out = set(), []
    ap = [f for a in AP for f in a['fotky']]
    for f in F['spolecne'] + [f for f in ap if not f.get('koupelna')] + [f for f in ap if f.get('koupelna')] + F['dalsi']:
        if f['src'] not in seen:
            seen.add(f['src']); out.append(f)
    return out

tels = [{'jmeno': t.get('jmeno', ''), 'cislo': t['cislo'], 'href': tel_href(t['cislo'])} for t in SITE.get('telefony', []) if t.get('cislo')]
kap = SITE['kapacita']
kap_text = f"{kap['min']}–{kap['max']}" if kap.get('min') and kap['min'] != kap['max'] else str(kap['max'])
CISLOVKY = {1: 'jeden', 2: 'dva', 3: 'tři', 4: 'čtyři', 5: 'pět', 6: 'šest', 7: 'sedm', 8: 'osm'}
S = {
    'tel': tels,
    'tel_json': json.dumps([[t['jmeno'], t['cislo'], t['href']] for t in tels], ensure_ascii=False),
    'nav': [{'href': 'apartmany/', 't': 'Apartmány'}, {'href': 'cenik/', 't': 'Ceník'}, {'href': 'galerie/', 't': 'Galerie'},
            {'href': 'okoli/', 't': 'Okolí'}, {'href': 'recenze/', 't': 'Recenze'}, {'href': 'kontakt/', 't': 'Kontakt'}],
    'galerie_dum': galerie_dum(),
    'recenze_uvod': [r for r in R['recenze'] if r.get('na_uvod')][:6] or R['recenze'][:6],
    'kapacita_text': kap_text,
    'loznice_celkem': sum(a['loznice'] for a in AP),
    'luzka_celkem': sum(a['luzka'] for a in AP),
    'pocet_ap_slovem': CISLOVKY.get(len(AP), str(len(AP))),
    'rok': datetime.date.today().year,
    'pobyt_volby': [{'v': f'Celý penzion ({kap_text} osob)', 't': f'Celý penzion ({kap_text} osob)'},
                    {'v': 'Menší skupina — po dohodě', 't': 'Menší skupina — po dohodě'}] +
                   [{'v': a['pobyt_volba'], 't': f"Zajímá mě {a['nazev']} ({a['luzka']} {plural(a['luzka'], 'lůžko', 'lůžka', 'lůžek')})"} for a in AP],
}
T['galerie']['perex'] = T['galerie']['perex'].replace('{fotky}', str(len(S['galerie_dum']))).replace('{okoli}', str(len(F['okoli'])))

# ---------------------------------------------------------------- strukturovaná data (schema.org)
DOM = SITE['domena'].rstrip('/')
def jsonld(extra=None):
    biz = {
        '@type': 'LodgingBusiness', '@id': DOM + '/#penzion', 'name': SITE['nazev'], 'url': DOM + '/',
        'telephone': '+420 ' + tels[0]['cislo'] if tels else None,
        'contactPoint': [{'@type': 'ContactPoint', 'name': t['jmeno'], 'telephone': '+420 ' + t['cislo'], 'contactType': 'reservations', 'availableLanguage': 'cs'} for t in tels],
        'email': SITE['email'], 'image': f"{DOM}/{SITE['og_foto']}",
        'description': T['uvod'].get('seo_popis') or T['uvod']['description'],
        'address': {'@type': 'PostalAddress', 'streetAddress': SITE['ulice'], 'addressLocality': SITE['obec'], 'postalCode': SITE['psc'], 'addressRegion': SITE.get('kraj', ''), 'addressCountry': 'CZ'},
        'geo': {'@type': 'GeoCoordinates', 'latitude': SITE['gps']['lat'], 'longitude': SITE['gps']['lon']},
        'hasMap': SITE.get('mapy_url'),
        'priceRange': C.get('rozpeti') or f"od {C['od_ceny']} Kč / osoba / noc",
        'petsAllowed': bool(SITE.get('mazlicci')), 'smokingAllowed': not SITE.get('nekuracky', True),
        'numberOfRooms': len(AP),
        'aggregateRating': {'@type': 'AggregateRating', 'ratingValue': str(R['prumer']), 'bestRating': '5', 'worstRating': '1', 'ratingCount': R['pocet']},
        'amenityFeature': [{'@type': 'LocationFeatureSpecification', 'name': n, 'value': True} for n in SITE.get('vybaveni_seo', [])],
        'sameAs': [SITE['echalupy_url']] if SITE.get('echalupy_url') else [],
    }
    faq = {'@type': 'FAQPage', '@id': DOM + '/#faq', 'mainEntity': [{'@type': 'Question', 'name': f['q'], 'acceptedAnswer': {'@type': 'Answer', 'text': f['a']}} for f in FAQ]}
    g = [{k: v for k, v in biz.items() if v not in (None, [], '')}, faq] + (extra or [])
    return json.dumps({'@context': 'https://schema.org', '@graph': g}, ensure_ascii=False).replace('</', '<\\/')

def crumbs(*items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': f'{DOM}/{p}'} for i, (n, p) in enumerate((('Úvod', ''),) + items)]}

# ---------------------------------------------------------------- sestavení
def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    # statické soubory
    for d in ('images', 'img', 'assets/fonts'):
        if (ROOT / d).exists():
            shutil.copytree(ROOT / d, OUT / d)
    (OUT / 'assets/css').mkdir(parents=True)
    (OUT / 'assets/js').mkdir(parents=True)
    shutil.copy(ROOT / 'assets/css/web.css', OUT / 'assets/css/web.css')
    shutil.copy(ROOT / 'assets/js/web.js', OUT / 'assets/js/web.js')
    shutil.copy(ROOT / 'icon.svg', OUT / 'icon.svg')
    V = {'css': md5(ROOT / 'assets/css/web.css'), 'js': md5(ROOT / 'assets/js/web.js'), 'icon': md5(ROOT / 'icon.svg')}

    env = Environment(loader=FileSystemLoader(ROOT / 'src'), autoescape=select_autoescape(['html']), trim_blocks=True, lstrip_blocks=True)
    env.filters.update(nb=nb, kc=kc, des1=des1, odstavce=odstavce,
                       osob=lambda n: plural(n, 'osoba', 'osoby', 'osob'),
                       apartmany=lambda n: plural(n, 'apartmán', 'apartmány', 'apartmánů'),
                       loznic=lambda n: plural(n, 'ložnice', 'ložnice', 'ložnic'))
    env.globals.update(B=B, SITE=SITE, T=T, AP=AP, C=C, F=F, R=R, O=O, FAQ=FAQ, G=G, S=S, V=V, ic=ic)

    def page(tpl, path, **kw):
        out = OUT / path / 'index.html' if path else OUT / 'index.html'
        if tpl == '404.html':
            out = OUT / '404.html'
        out.parent.mkdir(parents=True, exist_ok=True)
        kw.setdefault('jsonld', jsonld())
        kw['path'] = path
        out.write_text(env.get_template(tpl).render(page=kw, **kw.pop('ctx', {})), encoding='utf-8')

    U = T['uvod']
    hero0 = F['hero'][0] if F['hero'] else None
    page('index.html', '', title=U['title'], description=U['description'], og_description=U.get('og_description'),
         preload=[hero0['src']] if hero0 else [])
    page('apartmany.html', 'apartmany/', title=T['apartmany']['title'], description=T['apartmany']['description'], aktivni='apartmany/',
         jsonld=jsonld([crumbs(('Apartmány', 'apartmany/'))]))
    for a in AP:
        desc = f"{a['popis']} Kapacita {a['luzka']} {plural(a['luzka'], 'lůžko', 'lůžka', 'lůžek')}, {a['loznice']} {plural(a['loznice'], 'ložnice', 'ložnice', 'ložnic')}, {a['patro']}. Od {C['od_ceny']} Kč za osobu a noc v rámci pronájmu celého objektu."
        page('apartman.html', f"apartmany/{a['id']}/", title=f"{a['nazev']} — {SITE['nazev']}, {SITE['obec']}", description=desc, aktivni='apartmany/',
             jsonld=jsonld([crumbs(('Apartmány', 'apartmany/'), (a['nazev'], f"apartmany/{a['id']}/"))]),
             ctx={'a': a, 'dalsi': [d for d in AP if d is not a]})
    for key, tpl in (('cenik', 'cenik.html'), ('galerie', 'galerie.html'), ('okoli', 'okoli.html'), ('recenze', 'recenze.html'),
                     ('kontakt', 'kontakt.html'), ('rezervace', 'rezervace.html')):
        P = T[key]
        if P.get('foto'):
            fix = fix_img({'src': P['foto']})
            P['foto_w'], P['foto_h'] = fix['w'], fix['h']
        page(tpl, key + '/', title=P['title'], description=P['description'], aktivni=key + '/',
             jsonld=jsonld([crumbs((P['h1'], key + '/'))]))
    page('gdpr.html', 'gdpr/', title=G['title'], description=G['description'])
    page('404.html', '404/', title=f"Stránka nenalezena — {SITE['nazev']}", description=T['uvod']['description'])

    # administrace (cache busting jako na webu)
    if (ROOT / 'admin').exists():
        shutil.copytree(ROOT / 'admin', OUT / 'admin')
        idx = (OUT / 'admin/index.html').read_text(encoding='utf-8')
        idx = idx.replace('__V_ACSS__', md5(ROOT / 'admin/admin.css')).replace('__V_AJS__', md5(ROOT / 'admin/admin.js'))
        (OUT / 'admin/index.html').write_text(idx, encoding='utf-8')
        imgs = sorted(str(p.relative_to(ROOT)) for d in ('images', 'img') if (ROOT / d).exists()
                      for p in (ROOT / d).rglob('*') if p.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp') and not re.search(r'-m\.webp$|mapa-', p.name))
        (OUT / 'admin/images.json').write_text(json.dumps(imgs, ensure_ascii=False), encoding='utf-8')

    # SEO soubory
    urls = [''] + ['apartmany/'] + [f"apartmany/{a['id']}/" for a in AP] + ['cenik/', 'galerie/', 'okoli/', 'recenze/', 'kontakt/', 'rezervace/', 'gdpr/']
    today = datetime.date.today().isoformat()
    (OUT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        ''.join(f'  <url><loc>{DOM}/{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + '</urlset>\n', encoding='utf-8')
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: {DOM}/sitemap.xml\n' if SITE.get('indexovat')
                                    else 'User-agent: *\nDisallow: /\n', encoding='utf-8')
    (OUT / 'llms.txt').write_text(
        f"# {SITE['nazev']}\n\n> {T['uvod'].get('seo_popis') or T['uvod']['description']}\n\n"
        f"- Adresa: {SITE['ulice']}, {SITE['psc']} {SITE['obec']} ({SITE.get('region', '')})\n"
        + ''.join(f"- Telefon {t['jmeno']}: {t['cislo']}\n" for t in tels)
        + f"- E-mail: {SITE['email']}\n- Kapacita: {kap_text} osob, {len(AP)} apartmány, {S['loznice_celkem']} ložnic\n"
        f"- Cena: od {C['od_ceny']} Kč za osobu a noc ({C.get('od_ceny_pozn', '')})\n\n## Stránky\n"
        + ''.join(f'- {DOM}/{u}\n' for u in urls), encoding='utf-8')
    (OUT / '.nojekyll').write_text('')
    if CNAME:
        (OUT / 'CNAME').write_text(CNAME + '\n')
    (OUT / 'version.json').write_text(json.dumps({'sha': os.environ.get('GITHUB_SHA', 'local'), 'built': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')}))
    print(f'Hotovo: {sum(1 for _ in OUT.rglob("*.html"))} stránek, základ {B}')

if __name__ == '__main__':
    build()
