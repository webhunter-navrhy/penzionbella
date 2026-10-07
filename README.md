# Rodinný penzion Bella – web + administrace

Web penzionu Bella v Desné (Petr Šilhán). Převzato 7. 10. 2026 z Ivova Next.js exportu
(`ivoskonarik-del/propozice-penzionbella-next`, větev gh-pages) a převedeno na šablony,
aby šel upravovat v administraci. Vzhled je 1:1 původní (stejné CSS a písma).

- Obsah: `_data/*.json` (site, texty, apartmany, cenik, fotky, okoli, recenze, faq, gdpr)
- Šablony: `src/*.html` (Jinja2), ikony `src/icons.json` (lucide)
- Sestavení: `python3 build.py` → `site/` (lokálně `python3 -m http.server -d ..` se složkou `penzionbella` → site, adresa /penzionbella/)
- Nasazení: GitHub Actions (`.github/workflows/deploy.yml`) po každém pushi do `main`
- Administrace: `/admin/` – backend webhunter-admin (`~/webhunter-admin`, web id `penzionbella`), heslo během realizace `admin`
- Poptávkový formulář: `POST https://webhunter-admin.webhunter.workers.dev/api/penzionbella/form` (KV `site:penzionbella` → formTo)
- Doména: penzion-bella.cz (Český hosting / THINline, držitel Petr Šilhán). Při spuštění: soubor `CNAME`
  s `penzion-bella.cz` (build pak používá základ `/`), `_data/site.json` → `indexovat: true`, DNS u Českého hostingu.
