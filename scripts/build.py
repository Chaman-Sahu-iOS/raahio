"""Build public/index.html from src/ (web/Netlify mode). Usage: python3 scripts/build.py"""
import json, datetime, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
css = (root / 'src/style.css').read_text()
js = (root / 'src/app.js').read_text()
assert '</script' not in js.lower(), 'app.js must not contain a closing script tag'
today = datetime.date.today()
blank = {"version": 1, "updatedAt": 0, "activeTripId": "t0", "trips": [{"id": "t0", "name": "New trip", "subtitle": "", "travellers": "",
  "start": str(today), "end": str(today + datetime.timedelta(days=2)), "dayTitles": {}, "events": [], "checklist": [], "reminders": [],
  "budget": [], "contacts": [{"id": "p0", "name": "Emergency", "phone": "112", "note": ""}], "guides": [], "places": [], "routes": [], "notes": "", "log": []}]}
head = ('<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Yatra Saathi</title>'
  '<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#1E2552"><meta name="apple-mobile-web-app-capable" content="yes">'
  '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Yatra Saathi">'
  '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2214%22 fill=%22%231E2552%22/%3E%3Cpath d=%22M32 14c6 9 10 14 10 21a10 10 0 0 1-20 0c0-7 4-12 10-21z%22 fill=%22%23F08A2A%22/%3E%3C/svg%3E">'
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
  '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">')
css += '\nheader.top{padding-top:calc(12px + env(safe-area-inset-top))}'
html = ('<!DOCTYPE html>\n<html lang="en">\n<head>' + head + '<style id="css">' + css + '</style></head>\n<body><div id="root"></div>\n'
  '<script>window.YATRA_MODE="web"</script>\n<script id="state" type="application/json">' + json.dumps(blank) + '</script>\n<script id="app">' + js + '</script>\n</body>\n</html>\n')
(root / 'public/index.html').write_text(html)
print('Built public/index.html', len(html), 'bytes')
