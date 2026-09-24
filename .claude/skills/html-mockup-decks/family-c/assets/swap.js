/* ---- swap any picture for your own ----------------------------------
   Every <img data-img="key"> can be replaced by a file from your computer.
   The replacement is stored in this browser under that key, so it survives
   a reload of this file. Nothing is uploaded anywhere. ------------------ */
(function(){
 var KEY='mp-kit-img:', on=true, input=null;
 function store(k,v){try{localStorage.setItem(KEY+k,v);}catch(e){/* private window or full: the swap still shows, it just will not persist */}}
 function read(k){try{return localStorage.getItem(KEY+k);}catch(e){return null;}}
 function imgs(){return [].slice.call(document.querySelectorAll('img[data-img]'));}
 function restore(){imgs().forEach(function(im){var v=read(im.dataset.img);if(v)im.src=v;});}
 function pick(im){
  if(!input){input=document.createElement('input');input.type='file';input.accept='image/*';input.style.display='none';document.body.appendChild(input);}
  input.value='';
  input.onchange=function(){
   var f=input.files&&input.files[0];if(!f)return;
   load(im,f);
  };
  input.click();
 }
 function load(im,f){
  if(!f||!/^image\//.test(f.type)){alert('Choose an image file (JPG, PNG or WebP).');return;}
  var r=new FileReader();
  r.onload=function(){im.src=r.result;store(im.dataset.img,r.result);};
  r.onerror=function(){alert('That file could not be read.');};
  r.readAsDataURL(f);
 }
 function wrap(im){
  if(im.parentElement.classList.contains('swap-wrap'))return;
  var w=document.createElement('span');
  w.className='swap-wrap';
  im.parentNode.insertBefore(w,im);w.appendChild(im);
  var b=document.createElement('button');
  b.type='button';b.className='swap-btn';b.textContent='Click or drop to replace';
  b.onclick=function(e){e.preventDefault();e.stopPropagation();if(on)pick(im);};
  w.appendChild(b);
  // the picture itself is the target: click it, or drop a screenshot onto it
  im.addEventListener('click',function(){if(on)pick(im);});
  w.addEventListener('dragover',function(e){if(!on)return;e.preventDefault();w.classList.add('swap-over');});
  w.addEventListener('dragleave',function(){w.classList.remove('swap-over');});
  w.addEventListener('drop',function(e){if(!on)return;e.preventDefault();w.classList.remove('swap-over');
   var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)load(im,f);});
 }
 function resetAll(){
  imgs().forEach(function(im){
   try{localStorage.removeItem(KEY+im.dataset.img);}catch(e){}
   if(im.dataset.original)im.src=im.dataset.original;
  });
 }
 window.MPSwap={
  toggle:function(btn){on=!on;document.body.classList.toggle('swap-off',!on);
   if(btn)btn.textContent=on?'🖼 Replace images: ON':'🖼 Replace images: off';},
  reset:function(){if(confirm('Put every original picture back?'))resetAll();},
  count:function(){return imgs().filter(function(im){return !!read(im.dataset.img);}).length;}
 };
 document.addEventListener('DOMContentLoaded',function(){
  imgs().forEach(function(im){im.dataset.original=im.getAttribute('src');wrap(im);});
  restore();
 });
})();
