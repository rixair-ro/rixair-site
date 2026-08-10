# Editor local pentru site (nu necesita nicio instalare - foloseste PowerShell din Windows)
# Pornire: EDITEAZA_SITE.bat  ->  http://localhost:8090
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'docs'
$port = 8090

$editorJs = @'
<script id="rx-editor">
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
'@

$mime = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='application/javascript; charset=utf-8';
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.svg'='image/svg+xml'; '.gif'='image/gif';
  '.woff'='font/woff'; '.woff2'='font/woff2'; '.ico'='image/x-icon'; '.json'='application/json'; '.xml'='application/xml'; '.webp'='image/webp' }

$utf8 = New-Object System.Text.UTF8Encoding($false)
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Editor pornit: http://localhost:$port"
Write-Host "Deschide site-ul, apasa 'Editare', modifica texte, apoi 'Salveaza'."
Write-Host "Fisierele originale primesc copie .bak la prima salvare."
try { Start-Process "http://localhost:$port/" } catch {}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)

    if ($req.HttpMethod -eq 'POST' -and $path -eq '/__upload') {
      $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
      $body = $reader.ReadToEnd() | ConvertFrom-Json
      $name = $body.name -replace '[^A-Za-z0-9._-]', '-'
      $rel = 'poze-rx/up-' + [DateTimeOffset]::Now.ToUnixTimeSeconds() + '-' + $name
      $fs = Join-Path $root $rel
      [System.IO.File]::WriteAllBytes($fs, [System.Convert]::FromBase64String($body.data))
      Write-Host "IMAGINE: $rel"
      $out = $utf8.GetBytes('{"ok":true,"url":"/' + $rel + '"}')
      $res.ContentType = 'application/json'
      $res.OutputStream.Write($out, 0, $out.Length); $res.Close()
      continue
    }

    if ($req.HttpMethod -eq 'POST' -and $path -eq '/__save') {
      $reader = New-Object System.IO.StreamReader($req.InputStream, $req.ContentEncoding)
      $body = $reader.ReadToEnd() | ConvertFrom-Json
      $rel = [System.Uri]::UnescapeDataString($body.path).TrimStart('/')
      if ($rel -eq '' -or $rel.EndsWith('/')) { $rel = $rel + 'index.html' }
      $fs = Join-Path $root $rel
      if (-not (Test-Path $fs) -and (Test-Path "$fs.html")) { $fs = "$fs.html" }
      if (-not (Test-Path $fs) -and (Test-Path (Join-Path $fs 'index.html'))) { $fs = Join-Path $fs 'index.html' }
      $full = [System.IO.Path]::GetFullPath($fs)
      if (-not $full.StartsWith([System.IO.Path]::GetFullPath($root))) { throw 'cale invalida' }
      if (-not (Test-Path $full)) { throw "fisier inexistent: $rel" }
      $html = $body.html -replace '(?s)<script id="rx-editor">.*?</script>\s*', ''
      if (-not (Test-Path "$full.bak")) { Copy-Item $full "$full.bak" }
      [System.IO.File]::WriteAllText($full, $html, $utf8)
      Write-Host "SALVAT: $rel"
      $out = $utf8.GetBytes('{"ok":true}')
      $res.ContentType = 'application/json'
      $res.OutputStream.Write($out, 0, $out.Length); $res.Close()
      continue
    }

    $fs = Join-Path $root $path.TrimStart('/')
    if (Test-Path $fs -PathType Container) { $fs = Join-Path $fs 'index.html' }
    if (-not (Test-Path $fs) -and (Test-Path "$fs.html")) { $fs = "$fs.html" }
    if (-not (Test-Path $fs)) {
      $res.StatusCode = 404
      $out = $utf8.GetBytes('Not found')
      $res.OutputStream.Write($out, 0, $out.Length); $res.Close()
      continue
    }
    $ext = [System.IO.Path]::GetExtension($fs).ToLower()
    if ($ext -eq '.html') {
      $html = [System.IO.File]::ReadAllText($fs, [System.Text.Encoding]::UTF8)
      if ($html.Contains('</body>')) {
        $idx = $html.LastIndexOf('</body>')
        $html = $html.Substring(0, $idx) + $editorJs + $html.Substring($idx)
      }
      $out = $utf8.GetBytes($html)
    } else {
      $out = [System.IO.File]::ReadAllBytes($fs)
    }
    if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] } else { $res.ContentType = 'application/octet-stream' }
    $res.OutputStream.Write($out, 0, $out.Length)
    $res.Close()
  } catch {
    try { $res.StatusCode = 500; $res.Close() } catch {}
    Write-Host "Eroare: $_"
  }
}
