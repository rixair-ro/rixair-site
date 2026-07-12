var RX_CHECKOUT_URL='https://uyynocwfvwmgttckgvzu.supabase.co/functions/v1/stripe-checkout';

(function(){
var EMAIL='office@rixar.ro';
function qget(){try{return JSON.parse(localStorage.getItem('rx_cerere')||'[]')}catch(e){return[]}}
function qset(l){localStorage.setItem('rx_cerere',JSON.stringify(l));badge();}
function badge(){var n=qget().reduce(function(s,i){return s+(i.qty||1)},0);
 document.querySelectorAll('.cart-drop .count, ._showCartHeader .count').forEach(function(b){b.textContent=n;});}
function toast(m){var o=document.querySelector('.rx-toast');if(o)o.remove();var t=document.createElement('div');t.className='rx-toast';t.innerHTML=m;document.body.appendChild(t);setTimeout(function(){t.remove()},4000);}
function fmtL(p){if(p==null||isNaN(p))return 'la cerere';return p.toLocaleString('ro-RO',{minimumFractionDigits:2,maximumFractionDigits:2})+' Lei';}
function qadd(it){var l=qget(),k=null;for(var i=0;i<l.length;i++)if(l[i].sku===it.sku)k=l[i];
 var max=(it.stoc!=null)?it.stoc:(k&&k.stoc!=null?k.stoc:null);
 if(k){if(it.stoc!=null)k.stoc=it.stoc;var dorit=k.qty+it.qty;k.qty=(max!=null)?Math.min(dorit,max):dorit;
  if(max!=null&&dorit>max){qset(l);toast('&#9888; Stoc disponibil: doar '+max+' buc. &#8212; <a href="/cos-de-cumparaturi">vezi cererea</a>');return;}}
 else{if(max!=null&&it.qty>max){it.qty=max;l.push(it);qset(l);toast('&#9888; Stoc disponibil: doar '+max+' buc. &#8212; <a href="/cos-de-cumparaturi">vezi cererea</a>');return;}l.push(it);}
 qset(l);
 toast('&#10003; Ad&#259;ugat la cererea de ofert&#259; &#8212; <a href="/cos-de-cumparaturi">vezi cererea</a>');}
/* adauga in cos -> cerere */
document.addEventListener('click',function(e){
 var t=e.target.closest('[onclick*="addToCart"],[href*="addToCart"],.__productAddToCart');
 if(!t)return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 var it=null;
 if(window.RXPROD){it={sku:RXPROD.sku,nume:RXPROD.nume,pret:RXPROD.pret,img:RXPROD.img,qty:1};
  var q=document.querySelector('input[name="quantity"]');if(q)it.qty=Math.max(1,parseInt(q.value)||1);
  var s=document.querySelector('.rxVar');if(s){var o=s.options[s.selectedIndex];it.sku=o.getAttribute('data-sku')||it.sku;it.varianta=o.text;var pn=(o.getAttribute('data-pret')||'').replace(/\./g,'').replace(',','.');it.pret=pn?parseFloat(pn):null;var st=o.getAttribute('data-stoc');it.stoc=st?parseInt(st):null;if(it.stoc!=null&&it.qty>it.stoc)it.qty=it.stoc;}
 } else {
  var card=t.closest('.product-box');
  if(card){var nm=card.querySelector('[data-name]');var im=card.querySelector('img');
   it={sku:'produs-'+(card.getAttribute('data-product-id')||''),nume:(nm?nm.getAttribute('data-name'):(card.textContent.trim().slice(0,80))),pret:null,img:(im?im.getAttribute('src'):''),qty:1};}
 }
 if(it)qadd(it);
},true);
/* variante -> pret */
document.addEventListener('change',function(e){
 if(!e.target.classList.contains('rxVar'))return;
 var o=e.target.options[e.target.selectedIndex];
 var f=document.querySelector('.fPrice');if(f&&o.getAttribute('data-pret'))f.textContent=' '+o.getAttribute('data-pret')+' Lei ';
},true);
/* cautare */
function norm(s){return s.toLowerCase().replace(/[ăâ]/g,'a').replace(/î/g,'i').replace(/[șş]/g,'s').replace(/[țţ]/g,'t');}
function filt(q){if(!window.RXP)return[];q=norm(q).split(/\s+/).filter(Boolean);if(!q.length)return[];
 return RXP.filter(function(p){var h=norm(p.n+' '+p.u);return q.every(function(w){return h.indexOf(w)>=0});});}
function bindSearch(inp){
 if(!inp)return; inp.setAttribute('autocomplete','off');
 var w=inp.parentElement; w.style.position='relative';
 var d=document.createElement('div'); d.className='rx-sug'; d.style.display='none'; w.appendChild(d);
 inp.addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();ev.stopPropagation();location.href='/cauta/?q='+encodeURIComponent(inp.value);}},true);
 inp.addEventListener('input',function(){var r=filt(inp.value).slice(0,6);
  if(!inp.value||!r.length){d.style.display='none';return;}
  d.innerHTML=r.map(function(p){return '<a href="'+p.u+'"><img src="'+p.i+'">'+p.n+'</a>'}).join('');d.style.display='block';});
 document.addEventListener('click',function(ev){if(!w.contains(ev.target))d.style.display='none';});
}
/* pagina cerere */
function renderCerere(host){
 document.body.classList.add('rx-cos');
 var l=qget();
 if(!l.length){host.innerHTML='<h1 style="font-size:24px;margin:10px 0">Cererea mea de ofert&#259;</h1><p style="padding:20px 0">Lista e goal&#259;. Alege produse din <a href="/" style="font-weight:700">catalog</a>.</p>';return;}
 var t='<h1 style="font-size:24px;margin:10px 0">Cererea mea de ofert&#259;</h1><table class="rx-t"><tr><th></th><th>Produs</th><th>Variant&#259; / Cod</th><th>Pre&#539; orientativ</th><th>Cant.</th><th></th></tr>',tot=0,inc=true;
 l.forEach(function(i,x){if(i.pret)tot+=i.pret*i.qty;else inc=false;
  t+='<tr><td>'+(i.img?'<img src="'+i.img+'">':'')+'</td><td>'+i.nume+'</td><td>'+(i.varianta||'')+'<br><small>'+i.sku+'</small></td><td>'+fmtL(i.pret)+'</td>'+
  '<td><span class="rx-qty"><button class="rx-x" data-a="m" data-x="'+x+'">&#8722;</button><b>'+i.qty+'</b><button class="rx-x" style="color:#2e7d32" data-a="p" data-x="'+x+'">+</button></span>'+(i.stoc!=null?'<br><small style="color:#789">stoc: '+i.stoc+' buc.</small>':'')+'</td>'+
  '<td><button class="rx-x" data-a="d" data-x="'+x+'">&#10005;</button></td></tr>';});
 t+='</table><p style="font-size:16px"><b>Total orientativ'+(inc?'':' (par&#539;ial)')+': '+fmtL(tot)+'</b> <small>cu TVA &#183; pre&#539;ul final se confirm&#259; prin ofert&#259;</small></p>';
 var toate_cu_pret = l.length>0 && l.every(function(i){return i.pret;});
 t+='<p>';
 if(toate_cu_pret) t+='<button class="rx-b" id="rxPay" style="background:#f4c340">&#128179; Pl&#259;te&#537;te cu cardul</button>';
 if(!toate_cu_pret) t+='<button class="rx-b" id="rxSend">&#9993; Trimite cererea pe email</button>';
 t+='<button class="rx-b o" id="rxClear">Gole&#537;te</button></p>';
 if(!toate_cu_pret && l.some(function(i){return !i.pret;})) t+='<p style="font-size:13px;color:#888">Unele produse au pre&#539; la cerere &#8212; pentru ele trimite cererea pe email.</p>';
 if(!toate_cu_pret) t+='<p style="font-size:13px;color:#666">Se deschide emailul t&#259;u cu lista completat&#259; &#8212; adaug&#259; numele &#537;i telefonul. Sau sun&#259;-ne direct.</p>';
 host.innerHTML=t;
 host.querySelectorAll('.rx-x').forEach(function(b){b.addEventListener('click',function(){
  var l=qget(),x=+b.getAttribute('data-x'),a=b.getAttribute('data-a');
  if(a==='d')l.splice(x,1);
  else{var nou=Math.max(1,l[x].qty+(a==='p'?1:-1));
   if(a==='p'&&l[x].stoc!=null&&nou>l[x].stoc){nou=l[x].stoc;toast('&#9888; Stoc disponibil: doar '+l[x].stoc+' buc.');}
   l[x].qty=nou;}
  qset(l);renderCerere(host);});});
 var sb=host.querySelector('#rxSend');if(sb)sb.addEventListener('click',function(){
  var l=qget(),b='Buna ziua,\n\nDoresc o oferta pentru:\n\n';
  l.forEach(function(i){b+='- '+i.nume+(i.varianta?' | varianta: '+i.varianta:'')+' | cod: '+i.sku+' | cantitate: '+i.qty+'\n';});
  b+='\nNume:\nTelefon:\nLocalitate / judet:\n\nMultumesc!';
  location.href='mailto:'+EMAIL+'?subject='+encodeURIComponent('Cerere de oferta (rixair.ro)')+'&body='+encodeURIComponent(b);});
 var cb=host.querySelector('#rxClear');if(cb)cb.addEventListener('click',function(){qset([]);renderCerere(host);});
 var pb=host.querySelector('#rxPay');if(pb)pb.addEventListener('click',function(){location.href='/plata/';});
}
function renderCauta(host){
 document.body.classList.add('rx-cos');
 var q=new URLSearchParams(location.search).get('q')||'';
 var r=filt(q);
 var t='<h1 style="font-size:24px;margin:10px 0">'+(q?('Rezultate pentru „'+q+'” ('+r.length+')'):'C&#259;utare')+'</h1><div class="rx-grid">';
 t+=r.map(function(p){return '<a href="'+p.u+'"><img src="'+p.i+'"><div style="min-height:54px;font-size:13.5px;margin-top:8px">'+p.n+'</div><div style="font-weight:700;color:#1583ab;margin-top:6px">'+(p.p?'de la '+p.p+' Lei':'Pre&#539; la cerere')+'</div></a>'}).join('');
 t+='</div>'+(r.length?'':'<p>Niciun rezultat. &#206;ncearc&#259;: pompa, split, boiler, ventiloconvector.</p>');
 host.innerHTML=t;
}
/* formulare -> email */
document.addEventListener('submit',function(e){
 var f=e.target; if(f.closest('.rx-sug'))return;
 e.preventDefault();e.stopPropagation();
 var b='';f.querySelectorAll('input,select,textarea').forEach(function(i){
  if(i.type==='hidden'||i.type==='submit')return;
  if(i.type==='checkbox'){if(i.checked)b+=(i.name||'optiune')+': DA\n';}
  else if(i.value)b+=(i.name||i.placeholder||'camp')+': '+i.value+'\n';});
 location.href='mailto:'+EMAIL+'?subject='+encodeURIComponent('Mesaj de pe site (rixair.ro)')+'&body='+encodeURIComponent(b);
},true);
document.addEventListener('DOMContentLoaded',function(){
 badge();
 bindSearch(document.getElementById('_autocompleteSearchMainHeader'));
 bindSearch(document.getElementById('_autocompleteSearchMobileToggle'));
 var h1=document.getElementById('rxCerereHost');if(h1)renderCerere(h1);
 var h2=document.getElementById('rxCautaHost');if(h2)renderCauta(h2);
});
})();

/* rxLazyFix: incarca imaginile lazy daca lazysizes nu a pornit */
setTimeout(function(){document.querySelectorAll('img[data-src]').forEach(function(i){
 if(!i.getAttribute('src')||i.naturalWidth===0){var d=i.getAttribute('data-src');if(d)i.setAttribute('src',d);}
 var ds=i.getAttribute('data-srcset');if(ds)i.setAttribute('srcset',ds);});},800);

/* rxHero */
(function(){var w=document.querySelector('.rx-hero');if(!w)return;var im=[...w.querySelectorAll('img')],x=0;
function go(d){im[x].style.display='none';x=(x+d+im.length)%im.length;im[x].style.display='block';}
w.querySelector('.rx-ha.l').addEventListener('click',function(){go(-1)});
w.querySelector('.rx-ha.r').addEventListener('click',function(){go(1)});
setInterval(function(){go(1)},6000);})();

/* rxCalcSize: iframe calculator fara scroll intern */
(function(){var f=document.getElementById('rxCalcF');if(!f)return;
function sz(){try{var d=f.contentDocument;if(d&&d.body){var h=d.body.scrollHeight;if(h>200)f.style.height=h+'px';}}catch(e){}}
f.addEventListener('load',function(){sz();setInterval(sz,600);});setTimeout(sz,1500);})();

/* rxGapKiller: elimina marginea alba dinaintea footerului pe orice pagina */
document.addEventListener('DOMContentLoaded',function(){
 var foot=document.querySelector('.footer-holder');
 if(!foot){var mf=document.querySelector('.main-footer');if(mf){foot=mf;
  while(foot.parentElement&&foot.parentElement.id!=='wrapper'&&foot.parentElement!==document.body)foot=foot.parentElement;}}
 if(!foot)return;
 var p=foot.previousElementSibling;
 while(p&&p.offsetHeight===0)p=p.previousElementSibling;
 if(p){p.style.marginBottom='0px';p.style.overflow='hidden';}
});

/* rx-price-guard: pretul si codul de produs raman mereu corecte, indiferent ce rescrie gomag.js */
(function(){
 var f=document.querySelector('.fPrice'); if(!f) return;
 var base=f.textContent;
 var sk=document.querySelector('.product-code .code strong');
 var bsku=sk?sk.textContent:null;
 function want(){
  var s=document.querySelector('.rxVar');
  if(s&&s.options&&s.options.length){
   var o=s.options[s.selectedIndex]||s.options[0];
   var p=o.getAttribute('data-pret');
   return {t:p?(' '+p+' Lei '):base, sku:o.getAttribute('data-sku')||bsku};
  }
  return {t:base, sku:bsku};
 }
 var stEl=document.querySelector('.stock-status');
 var stBase=stEl?stEl.textContent.trim():'';
 function stocSel(){var s=document.querySelector('.rxVar');if(!s||!s.options||!s.options.length)return null;
  var o=s.options[s.selectedIndex]||s.options[0];var v=o.getAttribute('data-stoc');return v?parseInt(v):null;}
 function apply(){
  var w=want();
  if(f.textContent!==w.t) f.textContent=w.t;
  if(sk&&w.sku&&sk.textContent!==w.sku) sk.textContent=w.sku;
  if(window.RXPROD&&w.sku) window.RXPROD.sku=w.sku;
  var n=stocSel();
  if(stEl){var vrut=(n!=null)?('In stoc: '+n+' buc.'):stBase;
   var ic=stEl.querySelector('i');var txt=(ic?ic.outerHTML:'')+vrut;
   if(stEl.innerHTML!==txt)stEl.innerHTML=txt;}
  var q=document.querySelector('input[name="quantity"]');
  if(q&&n!=null){q.setAttribute('max',n);if(parseInt(q.value)>n)q.value=n;}
 }
 apply();
 try{new MutationObserver(apply).observe(f,{childList:true,characterData:true,subtree:true});}catch(e){}
 document.addEventListener('change',function(e){if(e.target&&e.target.classList&&e.target.classList.contains('rxVar'))setTimeout(apply,0);},true);
 setTimeout(apply,400); setTimeout(apply,1500);
 document.addEventListener('click',function(e){
  if(e.target.closest&&(e.target.closest('#qtyplus')||e.target.closest('#qtyminus')))setTimeout(apply,30);
 },true);
})();

/* rx-buy-guard: butonul ADAUGA IN COS + selectorul de cantitate raman mereu prezente si vizibile */
(function(){
 var sec=document.querySelector('[class*="-g-product-add-section-"]'); if(!sec) return;
 var parent=sec.parentNode;
 var marker=document.createComment('rx-buy-anchor');
 parent.insertBefore(marker, sec);
 var html=sec.outerHTML;
 function ensure(){
  var s=document.querySelector('[class*="-g-product-add-section-"]');
  if(!s){
   var t=document.createElement('div'); t.innerHTML=html;
   parent.insertBefore(t.firstChild, marker.nextSibling);
   s=document.querySelector('[class*="-g-product-add-section-"]');
  }
  if(s){
   s.classList.remove('hide'); s.style.display='';
   s.querySelectorAll('.hide').forEach(function(e){e.classList.remove('hide');});
  }
  var st=document.querySelector('[class*="stock-status"]');
  if(st && st.className.indexOf('unavailable')>-1) st.className=st.className.replace('unavailable','available');
 }
 ensure();
 setInterval(ensure, 700);
})();
