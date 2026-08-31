#!/usr/bin/env python3
"""把 HLF2 打包成一个可独立运行的单文件 HTML（dist/hlf2.html）。
   所有 CSS / JS 内联，双击即可玩，也可直接丢到任意静态托管。"""
import re, os, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
html = (ROOT / 'index.html').read_text(encoding='utf-8')

def inline_css(m):
    p = ROOT / m.group(1)
    return '<style>\n' + p.read_text(encoding='utf-8') + '\n</style>'

def inline_js(m):
    p = ROOT / m.group(1)
    code = p.read_text(encoding='utf-8').replace('</script>', '<\\/script>')
    return '<script>\n' + code + '\n</script>'

html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_css, html)
html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)

stamp = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')
html = html.replace('</head>', f'<!-- HLF2 单文件构建 · {stamp} -->\n</head>')

out = ROOT / 'dist'
out.mkdir(exist_ok=True)
(out / 'hlf2.html').write_text(html, encoding='utf-8')
(out / 'index.html').write_text(html, encoding='utf-8')
(out / '.nojekyll').write_text('', encoding='utf-8')
size = len(html.encode('utf-8')) / 1024
print(f'✔ dist/hlf2.html  ({size:.1f} KB, 单文件, 零外部请求)')
print(f'✔ dist/index.html (同上，供静态托管作为站点根)')
