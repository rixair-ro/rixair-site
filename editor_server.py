# -*- coding: utf-8 -*-
"""Editor vizual local: texte, mutare/stergere elemente, marire/inlocuire imagini.
Pornire: EDITEAZA_SITE.bat -> http://localhost:8090 . Salvarea scrie direct in docs/ (cu .bak)."""
import http.server, socketserver, os, json, shutil, urllib.parse, webbrowser, threading, base64, re, time

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs")
PORT = 8090
EDITOR_JS = r"""<script id="rx-editor">
(function(){
 var mode=null, sel=null, dirty=false;
 function mk(tag,css,txt){var e=document.createElement(tag);e.setAttribute('data-rxed','1');if(css)e.style.cssText=css;if(txt)e.textContent=txt;return e;}
 var BTN='padding:11px 16px;border:0;border-radius:22px;font-weight:700;font-size:13.5px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);color:#fff;font-family:sans-serif;';
 var bar=mk('div','position:fixed;bottom:18px;right:18px;z-index:2147483000;display:flex;gap:8px;font-family:sans-serif');
 var bText=mk('button',BTN+'background:#1583ab','✏️ Text');
 var bElem=mk('button',BTN+'background:#1583ab','🧰 Elemente');
 var bSave=mk('button',BTN+'background:#2e7d32;display:none','💾 Salvează');
 var bReload=mk('button',BTN+'background:#888','↩️ Anulează');
 bar.append(bText,bElem,bSave,bReload); document.body.appendChild(bar);

 var panel=mk('div','position:fixed;bottom:18px;left:18px;z-index:2147483000;display:none;flex-direction:column;gap:6px;background:#fff;border-radius:14px;box-shadow:0 6px 24px rgba(0,0,0,.3);padding:12px;font-family:sans-serif;max-width:240px');
 var pInfo=mk('div','font-size:12px;color:#456;font-weight:700;margin-bottom:2px','');
 var rows=mk('div','display:flex;flex-wrap:wrap;gap:6px');
 var SB='padding:9px 12px;border:0;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;background:#e8f4fa;color:#1583ab;font-family:sans-serif;';
 var aUp=mk('button',SB,'⬆️ Mută sus'), aDown=mk('button',SB,'⬇️ Mută jos');
 var aBig=mk('button',SB,'➕ Mărește'), aSmall=mk('button',SB,'➖ Micșorează');
 var aImg=mk('button',SB,'🖼️ Schimbă poza'), aDel=mk('button',SB+'background:#fdecea;color:#b3261e','🗑️ Șterge');
 var aX=mk('button',SB+'background:#eee;color:#555','✖️ Închide');
 rows.append(aUp,aDown,aBig,aSmall,aImg,aDel,aX);
 panel.append(pInfo,rows); document.body.appendChild(panel);
 var fileIn=mk('input','display:none'); fileIn.type='file'; fileIn.accept='image/*'; document.body.appendChild(fileIn);

 function isEd(e){return e.closest && e.closest('[data-rxed]');}
 function setSave(){bSave.style.display=dirty?'':'none';}
 function imgOf(el){return el.tagName==='IMG'?el:el.querySelector&&el.querySelector('img');}
 function select(el){
   if(sel) sel.style.outline='';
   sel=el; sel.style.outline='3px solid #c0392b'; sel.style.outlineOffset='2px';
   pInfo.textContent='Selectat: <'+el.tagName.toLowerCase()+'>'+(el.className&&typeof el.className==='string'?' .'+el.className.split(' ')[0]:'');
   var im=imgOf(el);
   aBig.style.display=im?'':'none'; aSmall.style.display=im?'':'none'; aImg.style.display=im?'':'none';
   panel.style.display='flex';
 }
 function deselect(){if(sel){sel.style.outline='';sel.style.outlineOffset='';}sel=null;panel.style.display='none';}

 function setMode(m){
   if(mode==='text') document.designMode='off';
   deselect();
   mode=(mode===m)?null:m;
   bText.style.background=mode==='text'?'#c0392b':'#1583ab';
   bElem.style.background=mode==='elem'?'#c0392b':'#1583ab';
   if(mode==='text'){document.designMode='on';}
 }
 bText.onclick=function(){setMode('text');};
 bElem.onclick=function(){setMode('elem');};
 bReload.onclick=function(){if(confirm('Renunți la modificările nesalvate?'))location.reload();};
 document.addEventListener('input',function(e){if(!isEd(e.target)){dirty=true;setSave();}},true);
 document.addEventListener('keydown',function(e){if(e.key==='Escape')deselect();},true);

 document.addEventListener('mouseover',function(e){if(mode!=='elem'||isEd(e.target)||e.target===sel)return;e.target.style.outline='2px dashed #1583ab';},true);
 document.addEventListener('mouseout',function(e){if(mode!=='elem'||isEd(e.target)||e.target===sel)return;e.target.style.outline='';},true);
 document.addEventListener('click',function(e){
   if(mode!=='elem'||isEd(e.target))return;
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
   e.target.style.outline='';select(e.target);
 },true);

 aUp.onclick=function(){if(!sel)return;var p=sel.previousElementSibling;if(p){sel.parentNode.insertBefore(sel,p);dirty=true;setSave();}};
 aDown.onclick=function(){if(!sel)return;var n=sel.nextElementSibling;if(n){sel.parentNode.insertBefore(n,sel);dirty=true;setSave();}};
 aBig.onclick=function(){var im=imgOf(sel);if(!im)return;var w=im.getBoundingClientRect().width;im.style.width=Math.round(w*1.15)+'px';im.style.height='auto';im.style.maxHeight='none';dirty=true;setSave();};
 aSmall.onclick=function(){var im=imgOf(sel);if(!im)return;var w=im.getBoundingClientRect().width;im.style.width=Math.round(w*0.85)+'px';im.style.height='auto';dirty=true;setSave();};
 aDel.onclick=function(){if(!sel)return;if(confirm('Ștergi elementul selectat?')){sel.remove();sel=null;panel.style.display='none';dirty=true;setSave();}};
 aX.onclick=deselect;
 aImg.onclick=function(){if(imgOf(sel))fileIn.click();};
 fileIn.onchange=function(){
   var f=fileIn.files[0];if(!f)return;
   var r=new FileReader();
   r.onload=function(){
     fetch('/__upload',{method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({name:f.name,data:r.result.split(',')[1]})})
     .then(x=>x.json()).then(d=>{
       if(!d.ok){alert('Eroare la încărcare: '+(d.err||''));return;}
       var im=imgOf(sel); im.removeAttribute('srcset'); im.removeAttribute('data-src'); im.src=d.url;
       dirty=true;setSave();
     });
   };
   r.readAsDataURL(f); fileIn.value='';
 };

 bSave.onclick=function(){
   if(mode==='text'){document.designMode='off';}
   deselect();
   document.querySelectorAll('[style*="outline"]').forEach(function(x){x.style.outline='';x.style.outlineOffset='';});
   var ui=[].slice.call(document.querySelectorAll('[data-rxed]'));
   var anchors=ui.map(function(u){var a=document.createComment('rxed');u.parentNode.insertBefore(a,u);u.remove();return a;});
   var html='<!DOCTYPE html>\n'+document.documentElement.outerHTML;
   anchors.forEach(function(a,i){a.parentNode.insertBefore(ui[i],a);a.remove();});
   html=html.replace(/<!--rxed-->/g,'');
   fetch('/__save',{method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({path:location.pathname,html:html})})
   .then(r=>r.json()).then(d=>{
     if(d.ok){dirty=false;setSave();bSave.textContent='✅ Salvat!';setTimeout(function(){bSave.textContent='💾 Salvează';},2500);bSave.style.display='';}
     else alert('Eroare la salvare: '+(d.err||'necunoscută'));
   }).catch(function(e){alert('Eroare: '+e);});
 };
})();
</script>
"""

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass
    def do_GET(self):
        fs = self.translate_path(self.path)
        if os.path.isdir(fs): fs = os.path.join(fs, 'index.html')
        if not os.path.exists(fs) and os.path.exists(fs + '.html'): fs = fs + '.html'
        if fs.endswith('.html') and os.path.exists(fs):
            html = open(fs, encoding='utf-8', errors='ignore').read()
            i = html.rfind('</body>')
            if i > -1: html = html[:i] + EDITOR_JS + html[i:]
            data = html.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers(); self.wfile.write(data); return
        super().do_GET()
    def do_POST(self):
        try:
            n = int(self.headers.get('Content-Length', 0))
            d = json.loads(self.rfile.read(n).decode('utf-8'))
            if self.path == '/__upload':
                name = re.sub(r'[^A-Za-z0-9._-]', '-', d.get('name', 'poza.png'))
                rel = 'poze-rx/up-%d-%s' % (int(time.time()), name)
                fs = os.path.join(ROOT, rel)
                open(fs, 'wb').write(base64.b64decode(d['data']))
                self._json({'ok': True, 'url': '/' + rel}); print('IMAGINE:', rel); return
            if self.path == '/__save':
                rel = urllib.parse.unquote(d['path']).lstrip('/')
                if not rel or rel.endswith('/'): rel += 'index.html'
                fs = os.path.normpath(os.path.join(ROOT, rel))
                if not os.path.exists(fs) and os.path.exists(fs + '.html'): fs += '.html'
                if os.path.isdir(fs): fs = os.path.join(fs, 'index.html')
                if not fs.startswith(os.path.normpath(ROOT)): raise Exception('cale invalida')
                if not os.path.exists(fs): raise Exception('fisier inexistent: ' + rel)
                html = re.sub(r'<script id="rx-editor">[\s\S]*?</script>\s*', '', d['html'])
                if not os.path.exists(fs + '.bak'): shutil.copy2(fs, fs + '.bak')
                open(fs, 'w', encoding='utf-8').write(html)
                self._json({'ok': True}); print('SALVAT:', rel); return
            self.send_error(404)
        except Exception as e:
            self._json({'ok': False, 'err': str(e)})
    def _json(self, obj):
        data = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers(); self.wfile.write(data)

class S(socketserver.ThreadingTCPServer): allow_reuse_address = True

if __name__ == '__main__':
    print('Editor pornit: http://localhost:%d' % PORT)
    threading.Timer(1.0, lambda: webbrowser.open('http://localhost:%d' % PORT)).start()
    S(('127.0.0.1', PORT), H).serve_forever()
