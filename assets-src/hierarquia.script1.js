
(function(){
  try{
    var c=document.createElement('canvas');c.id='stars';document.body.insertBefore(c,document.body.firstChild);
    var x=c.getContext('2d'),W,H,S=[],L=[];
    var calm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    function init(){W=c.width=innerWidth;H=c.height=innerHeight;
      var n=Math.min(220,Math.round(W*H/9500));S=[];L=[];
      for(var i=0;i<n;i++)S.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.2+.25,p:Math.random()*6.28,s:.4+Math.random()*1.1});
      for(var a=0;a<Math.min(70,n);a++)for(var b=a+1;b<Math.min(70,n);b++){var dx=S[a].x-S[b].x,dy=S[a].y-S[b].y;if(dx*dx+dy*dy<9000&&L.length<45)L.push([a,b]);}}
    function draw(t){x.clearRect(0,0,W,H);
      x.strokeStyle='rgba(141,162,232,.10)';x.lineWidth=.6;
      L.forEach(function(l){x.beginPath();x.moveTo(S[l[0]].x,S[l[0]].y);x.lineTo(S[l[1]].x,S[l[1]].y);x.stroke();});
      S.forEach(function(s){var a=calm?.6:.35+.45*Math.sin(t/1000*s.s+s.p);x.fillStyle='rgba(222,230,255,'+a+')';x.beginPath();x.arc(s.x,s.y,s.r,0,6.283);x.fill();});
      if(!calm)requestAnimationFrame(draw);}
    init();addEventListener('resize',function(){init();if(calm)draw(0);});requestAnimationFrame(draw);
  }catch(e){}
})();
(function(){
  try{
    var links=[].slice.call(document.querySelectorAll('.hier-toc a[href^="#"]'));
    var map=links.map(function(a){return{a:a,el:document.getElementById(a.getAttribute('href').slice(1))};}).filter(function(m){return m.el;});
    function spy(){var cur=null;map.forEach(function(m){if(m.el.getBoundingClientRect().top<=140)cur=m;});
      links.forEach(function(l){l.classList.remove('active');});if(cur)cur.a.classList.add('active');}
    addEventListener('scroll',spy,{passive:true});spy();
  }catch(e){}
})();
