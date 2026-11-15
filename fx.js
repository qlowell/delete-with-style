/* Delete With Style — effects engine */
const FONT='"Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif';
const KINDS=['fire','shred','plane','hole','shoot','chipper','hammer','car'];
const DONE_MSG={fire:'🔥 Reduced to ashes',shred:'🗂️ Shredded',plane:'✈️ Flew away',hole:'🕳️ Lost beyond the event horizon',shoot:'🎯 Shot full of holes',chipper:'🪵 Fed to the woodchipper',hammer:'🔨 Smashed to bits',car:'🚗 Flattened by a junker'};

const $=s=>document.querySelector(s);
const card=$('#card'), fx=$('#fx'), octx=fx.getContext('2d');
let busy=false, muted=false;
let dpr=1;

const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
const lerp=(a,b,k)=>a+(b-a)*k;
const easeInOut=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const easeOut=t=>1-Math.pow(1-t,3);
const easeIn=t=>t*t*t;
const easeOutBack=t=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)};

function sizeFx(){dpr=Math.min(window.devicePixelRatio||1,2);fx.width=Math.round(innerWidth*dpr);fx.height=Math.round(innerHeight*dpr);fx.style.width=innerWidth+'px';fx.style.height=innerHeight+'px';octx.setTransform(dpr,0,0,dpr,0,0);}

function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function initials(n){return n.replace(/[^A-Za-z ]/g,'').split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();}
function wrap(ctx,text,maxW){const out=[];for(const para of text.split('\n')){let line='';for(const w of para.split(' ')){const t=line?line+' '+w:w;if(ctx.measureText(t).width>maxW&&line){out.push(line);line=w}else line=t}out.push(line)}return out}

function layoutEmail(ctx,w,h,e,draw){
  const small=w<480,pad=small?20:30,inner=w-pad*2;let y=pad;
  if(draw){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
  ctx.font='600 '+(small?17:20)+'px '+FONT;const lh=small?23:27;
  for(const l of wrap(ctx,e.subj,inner)){y+=lh;if(draw){ctx.fillStyle='#1d2433';ctx.fillText(l,pad,y-6)}}
  y+=14;
  if(draw){
    const ax=pad+20,ay=y+20;
    ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(ax,ay,20,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='600 14px '+FONT;ctx.textAlign='center';ctx.fillText(initials(e.from),ax,ay+5);ctx.textAlign='left';
    ctx.fillStyle='#1d2433';ctx.font='600 14.5px '+FONT;ctx.fillText(e.from,pad+52,y+16);
    ctx.fillStyle='#667085';ctx.font='13px '+FONT;ctx.fillText(e.addr+'  →  you',pad+52,y+35);
    if(!small){ctx.textAlign='right';ctx.fillText(e.time,w-pad,y+16);ctx.textAlign='left';}
  }
  y+=52;
  if(draw){ctx.fillStyle='#e6e9ef';ctx.fillRect(pad,y,inner,1)}
  y+=30;
  ctx.font='15px '+FONT;
  for(const para of e.body){for(const l of wrap(ctx,para,inner)){if(draw){ctx.fillStyle='#2b3345';ctx.fillText(l,pad,y)}y+=23}y+=10}
  if(e.sig){y+=4;ctx.font='13.5px '+FONT;for(const l of e.sig.split('\n')){if(draw){ctx.fillStyle='#667085';ctx.fillText(l,pad,y)}y+=20}}
  return y+pad-12;
}

/* ---------------- sound (synthesized) ---------------- */
let AC=null;
function ac(){if(muted)return null;try{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume().catch(()=>{});}catch(e){return null}return AC}
function noise(at,dur,o={}){const a=ac();if(!a)return;const t0=a.currentTime+at;const len=Math.max(1,Math.floor(a.sampleRate*dur));const b=a.createBuffer(1,len,a.sampleRate);const d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type=o.type||'lowpass';f.frequency.setValueAtTime(o.freq||1000,t0);if(o.freqEnd)f.frequency.exponentialRampToValueAtTime(o.freqEnd,t0+dur);f.Q.value=o.q||0.8;
  const g=a.createGain();const atk=o.attack||0.005;g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(o.gain||0.3,t0+atk);if(o.hold)g.gain.setValueAtTime(o.gain||0.3,t0+dur-o.hold);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  s.connect(f).connect(g).connect(a.destination);s.start(t0);s.stop(t0+dur+0.05);}
function tone(at,dur,f0,f1,gain,type='sine'){const a=ac();if(!a)return;const t0=a.currentTime+at;const o=a.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(f1,t0+dur);const g=a.createGain();g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(gain,t0+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);o.connect(g).connect(a.destination);o.start(t0);o.stop(t0+dur+0.05);}
const SFX={
  fire(){noise(0,3.8,{freq:300,freqEnd:1400,gain:.22,attack:.5});for(let i=0;i<45;i++)noise(Math.random()*3.6,0.03,{type:'highpass',freq:1800+Math.random()*2500,gain:.12+Math.random()*.15});},
  shred(at,dur){noise(at,dur,{type:'bandpass',freq:650,q:1.4,gain:.35,attack:.05,hold:.1});tone(at,dur,58,52,.08,'sawtooth');},
  gun(at){noise(at,0.3,{freq:3500,freqEnd:250,gain:.5,attack:.002});tone(at,0.18,160,40,.3);},
  rocket(at){for(let i=0;i<5;i++)noise(at+i*0.07,0.06,{freq:1200,gain:.3,attack:.003});noise(at+0.2,2.2,{freq:220,freqEnd:900,gain:.45,attack:.25,hold:.2});noise(at+0.2,2.2,{type:'bandpass',freq:500,freqEnd:2600,q:1,gain:.18,attack:.3});},
  whoosh(at){noise(at,1.0,{type:'bandpass',freq:350,freqEnd:2200,q:1.2,gain:.35,attack:.35});},
  hole(dur){tone(0,dur,95,28,.35);noise(0,dur,{freq:180,gain:.18,attack:.6});},
  chipper(f0,fd,total){tone(0.3,total,46,42,.09,'sawtooth');noise(0.3,total,{freq:260,gain:.16,attack:.3,hold:.2});
    noise(f0,fd+0.2,{type:'bandpass',freq:950,q:.8,gain:.45,attack:.05,hold:.1});for(let i=0;i<30;i++)noise(f0+Math.random()*fd,0.04,{type:'highpass',freq:1500+Math.random()*2500,gain:.18});
    for(let i=0;i<4;i++)tone(f0+fd+0.25+i*0.12,0.08,60,40,.15,'sawtooth');},
  chop(at){noise(at-0.08,0.14,{type:'bandpass',freq:700,freqEnd:4000,q:2,gain:.4,attack:.03});tone(at,0.18,170,60,.45);noise(at,0.12,{freq:2500,freqEnd:200,gain:.35,attack:.002});tone(at+0.01,0.35,2600,2300,.05,'triangle');},
  slash(at){noise(at,0.2,{type:'bandpass',freq:900,freqEnd:5000,q:2,gain:.45,attack:.02});tone(at+0.1,0.5,2700,2300,.07,'triangle');tone(at+0.1,0.4,3900,3500,.04,'triangle');},
  thud(at,big){tone(at,0.4,big?100:120,30,.75);noise(at,0.35,{freq:1400,freqEnd:90,gain:.6,attack:.002});if(big){noise(at,0.3,{type:'highpass',freq:2500,gain:.25,attack:.002});for(let i=0;i<10;i++)noise(at+Math.random()*0.35,0.04,{type:'highpass',freq:2000+Math.random()*3000,gain:.15});}},
  crash(at){tone(0,at,1500,450,.05);noise(at,1.1,{freq:5000,freqEnd:150,gain:.85,attack:.002});tone(at,0.5,80,25,.75);for(let i=0;i<16;i++)noise(at+0.02+Math.random()*0.5,0.05,{type:'highpass',freq:4000+Math.random()*3500,gain:.14});},
  pop(at){tone(at,0.7,60,20,.5);noise(at,0.5,{freq:900,freqEnd:80,gain:.35,attack:.003});}
};

/* ---------------- animation helper ---------------- */
function animate(step){return new Promise(res=>{let t0=null;function f(now){if(t0===null)t0=now;const t=(now-t0)/1000;
  octx.setTransform(dpr,0,0,dpr,0,0);octx.globalAlpha=1;octx.globalCompositeOperation='source-over';octx.shadowColor='transparent';octx.clearRect(0,0,innerWidth,innerHeight);
  let go=true;try{go=step(t)!==false}catch(e){console.error(e);go=false}
  if(go&&t<12)requestAnimationFrame(f);else res();}requestAnimationFrame(f);});}

function makeNoise(cw,ch){const w=cw+2,a=new Float32Array(w*(ch+2));for(let i=0;i<a.length;i++)a[i]=Math.random();
  return (u,v)=>{const x=u*cw,y=v*ch,x0=x|0,y0=y|0,fx=x-x0,fy=y-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);const i=y0*w+x0;const a00=a[i],a10=a[i+1],a01=a[i+w],a11=a[i+w+1];return a00+(a10-a00)*sx+(a01-a00)*sy+(a00-a10-a01+a11)*sx*sy;}}

const FX={};

/* ---------------- 🔥 BURN ---------------- */
FX.fire=(r,src)=>{
  const W=src.width,H=src.height,sc=r.width/W;
  const sd=src.getContext('2d').getImageData(0,0,W,H).data;
  const tmp=document.createElement('canvas');tmp.width=W;tmp.height=H;const tctx=tmp.getContext('2d');
  const img=tctx.createImageData(W,H),d=img.data;
  const g=6,gw=Math.ceil(W/g)+2,gh=Math.ceil(H/g)+2,field=new Float32Array(gw*gh);
  const n1=makeNoise(5,4),n2=makeNoise(14,11),n3=makeNoise(40,30);
  const ix=gw*(0.2+Math.random()*0.6),iy=gh*0.97,maxd=Math.hypot(Math.max(ix,gw-ix),iy*1.2);
  let mn=1e9,mx=-1e9;
  for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){const u=x/gw,v=y/gh;const dd=Math.hypot(x-ix,(y-iy)*1.2)/maxd;
    const val=dd*0.6+n1(u,v)*0.25+n2(u,v)*0.11+n3(u,v)*0.04;field[y*gw+x]=val;if(val<mn)mn=val;if(val>mx)mx=val;}
  for(let i=0;i<field.length;i++)field[i]=(field[i]-mn)/(mx-mn);
  const T=new Float32Array(W*H);
  for(let y=0;y<H;y++){const fy=y/g,y0=fy|0,ty=fy-y0;for(let x=0;x<W;x++){const fxx=x/g,x0=fxx|0,tx=fxx-x0,i0=y0*gw+x0;
    const a=field[i0],b=field[i0+1],c=field[i0+gw],e=field[i0+gw+1];T[y*W+x]=(a+(b-a)*tx)*(1-ty)+(c+(e-c)*tx)*ty;}}
  const sprite=document.createElement('canvas');sprite.width=sprite.height=64;{const s=sprite.getContext('2d');const gr=s.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,'rgba(255,236,150,.95)');gr.addColorStop(.35,'rgba(255,150,30,.75)');gr.addColorStop(.7,'rgba(215,55,0,.28)');gr.addColorStop(1,'rgba(160,20,0,0)');s.fillStyle=gr;s.fillRect(0,0,64,64);}
  const parts=[],DUR=3.3,N=W*H;let lastT=0;
  SFX.fire();
  return animate(t=>{
    const dt=Math.min(0.05,t-lastT);lastT=t;
    const f=-0.03+(t/DUR)*1.12;
    for(let i=0,p=0;i<N;i++,p+=4){const th=T[i]-f;
      if(th>0.16){d[p]=sd[p];d[p+1]=sd[p+1];d[p+2]=sd[p+2];d[p+3]=255;continue}
      if(th<0){d[p+3]=0;continue}
      if(th<0.014){const k=th/0.014;d[p]=255;d[p+1]=110+130*k;d[p+2]=25+70*k;d[p+3]=255;continue}
      const br=sd[p]*.5+75,bg=sd[p+1]*.5+48,bb=sd[p+2]*.5+20;
      if(th<0.07){const m=Math.pow((th-0.014)/0.056,1.5);d[p]=25+(br-25)*m;d[p+1]=18+(bg-18)*m;d[p+2]=12+(bb-12)*m;}
      else{const m=(th-0.07)/0.09;d[p]=br+(sd[p]-br)*m;d[p+1]=bg+(sd[p+1]-bg)*m;d[p+2]=bb+(sd[p+2]-bb)*m;}
      d[p+3]=255;}
    tctx.putImageData(img,0,0);
    octx.drawImage(tmp,r.left,r.top,r.width,r.height);
    if(f<1.02){let spawned=0;for(let k=0;k<500&&spawned<28;k++){const gx=(Math.random()*(gw-2))|0,gy=(Math.random()*(gh-2))|0;const v=field[gy*gw+gx]-f;
      if(v>0&&v<0.02){spawned++;const x=r.left+gx*g*sc+(Math.random()-.5)*4,y=r.top+gy*g*sc;
        parts.push({k:'f',x,y,vx:(Math.random()-.5)*24,vy:-50-Math.random()*70,life:0,max:.45+Math.random()*.5,s:6+Math.random()*11});
        if(Math.random()<.12)parts.push({k:'e',x,y,vx:(Math.random()-.5)*50,vy:-70-Math.random()*90,life:0,max:1+Math.random()*1.2,s:1+Math.random()*1.6,ph:Math.random()*6});
        if(Math.random()<.07)parts.push({k:'s',x,y:y-10,vx:(Math.random()-.5)*15,vy:-35-Math.random()*25,life:0,max:1.4+Math.random(),s:8+Math.random()*8});}}}
    for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life+=dt;if(p.life>p.max){parts.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.k==='e')p.vx+=Math.sin(t*6+p.ph)*40*dt;}
    for(const p of parts)if(p.k==='s'){const q=p.life/p.max,s=p.s*(1+q*2.2);octx.globalAlpha=.07*(1-q);octx.fillStyle='#5b5b60';octx.beginPath();octx.arc(p.x,p.y,s,0,7);octx.fill();}
    for(const p of parts)if(p.k==='f'){const q=p.life/p.max,s=p.s*(1-q*.6);octx.globalAlpha=1-q;octx.drawImage(sprite,p.x-s,p.y-s*2.2,s*2,s*3.2);}
    for(const p of parts)if(p.k==='e'){const q=p.life/p.max;octx.globalAlpha=1-q;octx.fillStyle=q<.5?'#ffd43b':'#ff6b00';octx.fillRect(p.x,p.y,p.s,p.s);}
    octx.globalAlpha=1;
    return f<1.04||parts.length>0;
  });
};

/* ---------------- 🗂️ SHRED ---------------- */
function drawShredderHead(x,y,w,h,t,running){
  octx.save();
  octx.shadowColor='rgba(0,0,0,.25)';octx.shadowBlur=16;octx.shadowOffsetY=6;
  const gr=octx.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'#525a6b');gr.addColorStop(1,'#1f232b');octx.fillStyle=gr;rr(octx,x,y,w,h,12);octx.fill();
  octx.shadowColor='transparent';
  octx.fillStyle='#08090c';rr(octx,x+16,y+h/2-3.5,w-32,7,3.5);octx.fill();
  octx.fillStyle='rgba(255,255,255,.75)';octx.font='700 10px '+FONT;octx.textAlign='left';octx.fillText('SHRED-O-MATIC 3000',x+16,y+15);
  octx.fillStyle=running&&((t*8|0)%2)?'#51cf66':'#2b8a3e';octx.beginPath();octx.arc(x+w-20,y+12,4,0,7);octx.fill();
  octx.fillStyle='#14171d';for(let i=x+14;i<x+w-14;i+=7)octx.fillRect(i,y+h-5,4,5);
  octx.restore();
}
FX.shred=(r,src)=>{
  const headH=56,slotY=Math.round(Math.max(r.top+170,Math.min(innerHeight*0.62,r.top+r.height+60))),headTop=slotY-headH/2,headBot=slotY+headH/2;
  const ph=Math.max(110,Math.min(r.height,headTop-12-64)),s=ph/r.height,pw=r.width*s,px=r.left+(r.width-pw)/2,py0=headTop-12-ph;
  const Ns=Math.max(24,Math.round(pw/8)),sw=pw/Ns,chunk=10,FALL=360;
  const v=Math.max(260,ph/1.8),D=12+headH/2+ph+FALL,INTRO=0.65;
  const srcSW=src.width/Ns,srcChunk=src.height*chunk/ph;
  const bits=[];
  SFX.shred(INTRO+0.05,(12+headH/2+ph)/v);
  return animate(t=>{
    const k=easeInOut(clamp(t/INTRO));
    const feed=Math.max(0,t-INTRO),off=feed*v,outro=Math.max(0,feed-D/v);
    let headOff=(1-easeOut(clamp(t/INTRO)))*(innerHeight-headTop+40)+easeIn(clamp(outro/0.45))*(innerHeight-headTop+40);
    const running=feed>0&&off<12+headH/2+ph;
    if(running)headOff+=(Math.random()-.5)*1.6;
    const x=lerp(r.left,px,k)+(running?(Math.random()-.5)*1.2:0),y=lerp(r.top,py0,k)+off,w=lerp(r.width,pw,k),h=lerp(r.height,ph,k);
    // strips
    const vStart=Math.max(0,slotY-y);
    if(vStart<ph){
      for(let vv=ph-chunk;vv>=vStart-chunk;vv-=chunk){const depth=y+vv+chunk-slotY;if(depth<0)continue;if(depth>FALL)continue;
        const a=clamp(1-(depth-FALL*0.45)/(FALL*0.55));if(a<=0)continue;octx.globalAlpha=a;
        const dy=headBot-4+depth+depth*depth*0.002;
        for(let i=0;i<Ns;i++){const xo=Math.sin(depth*0.035+i*2.1)*Math.min(depth,220)*0.05+(i-Ns/2)*depth*0.004;
          octx.drawImage(src,i*srcSW,vv/ph*src.height,srcSW,srcChunk,x+i*sw+xo,dy-chunk,sw-1.4,chunk+0.6);}}
      octx.globalAlpha=1;
      if(running&&Math.random()<.6)bits.push({x:x+Math.random()*w,y:headBot,vx:(Math.random()-.5)*80,vy:Math.random()*60,rot:Math.random()*6,vr:(Math.random()-.5)*10,life:0});
    }
    for(let i=bits.length-1;i>=0;i--){const b=bits[i];b.life+=1/60;b.vy+=900/60;b.x+=b.vx/60;b.y+=b.vy/60;b.rot+=b.vr/60;if(b.y>innerHeight+20){bits.splice(i,1);continue}
      octx.save();octx.translate(b.x,b.y);octx.rotate(b.rot);octx.fillStyle='#fff';octx.strokeStyle='#c9ced8';octx.fillRect(-3,-2,6,4);octx.strokeRect(-3,-2,6,4);octx.restore();}
    // paper above slot
    if(y<slotY){octx.save();octx.beginPath();octx.rect(0,0,innerWidth,slotY);octx.clip();
      octx.shadowColor='rgba(20,30,60,.12)';octx.shadowBlur=14;octx.shadowOffsetY=4;octx.drawImage(src,x,y,w,h);octx.restore();}
    drawShredderHead(px-34,headTop+headOff,pw+68,headH,t,running);
    return outro<0.5;
  });
};

/* ---------------- ✈️ PAPER AIRPLANE ---------------- */
function drawPlane(x,y,ang,L,a,power=0,rocket=0){
  const poly=(pts,fill)=>{octx.beginPath();octx.moveTo(pts[0][0],pts[0][1]);for(const p of pts.slice(1))octx.lineTo(p[0],p[1]);octx.closePath();octx.fillStyle=fill;octx.fill();octx.stroke();};
  octx.save();octx.translate(x,y);octx.rotate(ang);octx.globalAlpha=a;octx.lineJoin='round';octx.lineWidth=1.2;octx.strokeStyle='#97a1b3';
  if(rocket>0){
    // exhaust flame
    if(power>0){const fl=L*(0.45+0.3*Math.random())*power,fy=L*0.02,fx=-L*0.32;
      const fg=octx.createLinearGradient(fx,0,fx-fl,0);fg.addColorStop(0,'rgba(255,250,210,1)');fg.addColorStop(.25,'rgba(255,190,50,.95)');fg.addColorStop(.6,'rgba(255,90,10,.7)');fg.addColorStop(1,'rgba(220,40,0,0)');
      octx.fillStyle=fg;octx.beginPath();octx.moveTo(fx,fy-L*0.055);octx.quadraticCurveTo(fx-fl*0.5,fy-L*0.09*power,fx-fl,fy);octx.quadraticCurveTo(fx-fl*0.5,fy+L*0.09*power,fx,fy+L*0.055);octx.closePath();octx.fill();}
  }
  octx.shadowColor='rgba(20,30,60,.22)';octx.shadowBlur=14;octx.shadowOffsetY=10;
  poly([[L/2,0],[-L/2,-L*0.32],[-L*0.3,0]],'#ffffff');
  octx.shadowColor='transparent';
  poly([[L/2,0],[-L*0.3,0],[-L*0.48,L*0.2]],'#cfd6e2');
  poly([[L/2,0],[-L/2,-L*0.12],[-L*0.3,0]],'#e9edf3');
  octx.restore();
}
FX.plane=(r,src)=>{
  const w=r.width,h=r.height,cx=r.left+w/2,cy=r.top+h/2;
  const L=Math.min(130,Math.max(80,w*0.18)),sy0=cy-12,R=Math.min(110,Math.max(60,h*0.28));
  const smoke=[];let px=null,py=null,head=0,lastT=0;
  SFX.rocket(1.35);
  function folded(k,alpha){
    const s=1-0.7*k;
    octx.save();octx.globalAlpha=alpha;octx.translate(cx,cy-k*12);octx.rotate(-0.05*k);octx.scale(s,s);
    const P=[[0,-h/2],[lerp(w/2,w*0.05,k),lerp(-h/2,-h*0.16,k)],[lerp(w/2,w*0.13,k),h/2],[lerp(-w/2,-w*0.13,k),h/2],[lerp(-w/2,-w*0.05,k),lerp(-h/2,-h*0.16,k)]];
    octx.beginPath();P.forEach((p,i)=>i?octx.lineTo(p[0],p[1]):octx.moveTo(p[0],p[1]));octx.closePath();
    octx.shadowColor='rgba(20,30,60,.15)';octx.shadowBlur=18;octx.shadowOffsetY=6;octx.fillStyle='#fff';octx.fill();octx.shadowColor='transparent';
    octx.save();octx.clip();const iw=w*lerp(1,0.26,k);octx.drawImage(src,-iw/2,-h/2,iw,h);
    octx.fillStyle=`rgba(40,50,80,${0.16*k})`;octx.fillRect(-iw/2,-h/2,iw/2,h);
    octx.strokeStyle=`rgba(30,40,60,${0.35*k})`;octx.lineWidth=1.5/s;octx.beginPath();octx.moveTo(0,-h/2);octx.lineTo(0,h/2);octx.moveTo(0,-h/2);octx.lineTo(-iw*0.3,h/2);octx.moveTo(0,-h/2);octx.lineTo(iw*0.3,h/2);octx.stroke();
    octx.restore();octx.strokeStyle='#c4cbd6';octx.lineWidth=1/s;octx.stroke();octx.restore();
  }
  return animate(t=>{
    if(t<1.0){folded(easeInOut(t/1.0),1);return true}
    const dt=Math.min(0.05,t-lastT);lastT=t;
    if(t<1.35){const q=easeOut((t-1.0)/0.35);folded(1,1-q);drawPlane(cx,sy0,lerp(-Math.PI/2,0,q),L*lerp(0.6,1,q),q,0,q);px=cx;py=sy0;return true}
    let x,y,power;
    if(t<1.8){ // ignition: sputter and shake on the pad
      const q=(t-1.35)/0.45;power=q<0.35?(Math.random()<0.5?0.35:0):0.4+q*0.6;
      x=cx+(Math.random()-.5)*3*q-q*6;y=sy0+(Math.random()-.5)*3*q;
    }else if(t<2.55){const T=(t-1.8)/0.75,th=Math.PI*2*T;power=1;x=cx+260*T+R*Math.sin(th);y=sy0-R*(1-Math.cos(th));}
    else{const u=clamp((t-2.55)/0.6),e=u*u;power=1.25;const x1=cx+260,ex=innerWidth+260,ey=sy0-Math.min(320,sy0+120);x=x1+(ex-x1)*e;y=sy0+(ey-sy0)*e*e;}
    if(t>=1.8){const ang=Math.atan2(y-py,x-px);if(Math.hypot(y-py,x-px)>0.3)head=ang;}
    px=x;py=y;
    // smoke puffs from the nozzle
    if(power>0){const nx=x+Math.cos(head)*(-L*0.6)-Math.sin(head)*L*0.02,ny=y+Math.sin(head)*(-L*0.6)+Math.cos(head)*L*0.02;
      for(let i=0;i<3;i++)smoke.push({x:nx+(Math.random()-.5)*6,y:ny+(Math.random()-.5)*6,vx:-Math.cos(head)*60+(Math.random()-.5)*40,vy:-Math.sin(head)*60+(Math.random()-.5)*40-10,life:0,max:0.9+Math.random()*0.8,s:5+Math.random()*5});}
    for(let i=smoke.length-1;i>=0;i--){const p=smoke[i];p.life+=dt;if(p.life>p.max){smoke.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.96;p.vy*=0.96;
      const q=p.life/p.max;octx.globalAlpha=0.35*(1-q);octx.fillStyle=q<0.08?'#ffb347':'#9aa1ad';octx.beginPath();octx.arc(p.x,p.y,p.s*(1+q*2.5),0,7);octx.fill();}
    octx.globalAlpha=1;
    drawPlane(x,y,head,L,1,power,1);
    return t<3.2||(smoke.length>0&&t<4.6);
  });
};

/* ---------------- 🕳️ BLACK HOLE ---------------- */
FX.hole=(r,src)=>{
  const cx=r.left+r.width/2,cy=r.top+r.height/2,k=src.width/r.width;
  const ts=Math.max(14,Math.round(Math.min(r.width,r.height)/26)),maxR=Math.hypot(r.width/2,r.height/2),DUR=1.0;
  const tiles=[];
  for(let y=0;y<r.height;y+=ts)for(let x=0;x<r.width;x+=ts){const w=Math.min(ts,r.width-x),h=Math.min(ts,r.height-y);const dx=r.left+x+w/2-cx,dy=r.top+y+h/2-cy,d=Math.hypot(dx,dy);
    tiles.push({x,y,w,h,r0:d,a0:Math.atan2(dy,dx),delay:0.55+(d/maxR)*1.5+Math.random()*0.25,spin:(Math.random()-.5)*5});}
  const end=Math.max(...tiles.map(t=>t.delay))+DUR;
  const disk=[];for(let i=0;i<320;i++){const rr_=1.2+Math.random()*1.7;disk.push({rr:rr_,a:Math.random()*Math.PI*2,sp:2.6/Math.sqrt(rr_)});}
  SFX.hole(end+0.3);SFX.pop(end+0.35);
  const RMAX=Math.max(26,Math.min(40,r.width*0.05)),tilt=-0.35,ct=Math.cos(tilt),st=Math.sin(tilt);
  function drawDisk(R,t,front){for(const p of disk){const a=p.a+p.sp*t*2;const s=Math.sin(a);if(front!==(s>0))continue;
      const lx=Math.cos(a)*p.rr*R,ly=s*p.rr*R*0.3;const x=cx+lx*ct-ly*st,y=cy+lx*st+ly*ct;
      octx.fillStyle=p.rr<1.6?'#fff3bf':p.rr<2.2?'#ffa94d':'#b197fc';octx.globalAlpha=0.9;octx.fillRect(x-1,y-1,2.2,2.2);}octx.globalAlpha=1;}
  return animate(t=>{
    const tc=t-end;
    let R=RMAX*easeOut(clamp(t/0.6));if(tc>0)R=RMAX*(1-easeIn(clamp(tc/0.4)));
    R*=1+Math.sin(t*9)*0.03;
    const dark=0.62*clamp(t/0.7)*(tc>0?1-clamp((tc-0.35)/0.6):1);
    octx.fillStyle=`rgba(6,8,22,${dark})`;octx.fillRect(0,0,innerWidth,innerHeight);
    if(R>0.5){const hg=octx.createRadialGradient(cx,cy,R*0.8,cx,cy,R*4.5);hg.addColorStop(0,'rgba(140,90,255,.45)');hg.addColorStop(.4,'rgba(255,120,40,.16)');hg.addColorStop(1,'rgba(255,120,40,0)');
      octx.fillStyle=hg;octx.beginPath();octx.arc(cx,cy,R*4.5,0,7);octx.fill();drawDisk(R,t,false);}
    for(const tl of tiles){const p=(t-tl.delay)/DUR;if(p>=1)continue;
      if(p<=0){const pre=clamp((t-(tl.delay-0.7))/0.7),pull=pre*pre*7;
        octx.drawImage(src,tl.x*k,tl.y*k,tl.w*k,tl.h*k,r.left+tl.x-Math.cos(tl.a0)*pull,r.top+tl.y-Math.sin(tl.a0)*pull,tl.w,tl.h);continue;}
      const e=p*p,rad=tl.r0*(1-e),ang=tl.a0+e*4.5,X=cx+Math.cos(ang)*rad,Y=cy+Math.sin(ang)*rad,sc=Math.max(0.03,1-e),rot=e*(3+tl.spin);
      const c=Math.cos(rot)*sc,s=Math.sin(rot)*sc;octx.setTransform(dpr*c,dpr*s,-dpr*s,dpr*c,dpr*X,dpr*Y);
      octx.globalAlpha=p>0.85?(1-p)/0.15:1;octx.drawImage(src,tl.x*k,tl.y*k,tl.w*k,tl.h*k,-tl.w/2,-tl.h/2,tl.w,tl.h);}
    octx.setTransform(dpr,0,0,dpr,0,0);octx.globalAlpha=1;
    if(R>0.5){drawDisk(R,t,true);
      octx.save();octx.shadowColor='rgba(255,170,70,.9)';octx.shadowBlur=18;octx.strokeStyle='rgba(255,200,120,.95)';octx.lineWidth=2.5;octx.beginPath();octx.arc(cx,cy,R*1.06,0,7);octx.stroke();octx.restore();
      octx.fillStyle='#000';octx.beginPath();octx.arc(cx,cy,R,0,7);octx.fill();}
    if(tc>0.38){const q=clamp((tc-0.38)/0.55);const fg=octx.createRadialGradient(cx,cy,0,cx,cy,12+q*260);fg.addColorStop(0,`rgba(255,255,255,${(1-q)*0.9})`);fg.addColorStop(.3,`rgba(190,160,255,${(1-q)*0.45})`);fg.addColorStop(1,'rgba(190,160,255,0)');
      octx.fillStyle=fg;octx.beginPath();octx.arc(cx,cy,12+q*260,0,7);octx.fill();}
    return tc<1.0;
  });
};

/* ---------------- 🎯 SHOOT IT UP ---------------- */
function punch(p,x,y){
  p.save();p.globalCompositeOperation='source-atop';
  const g=p.createRadialGradient(x,y,3,x,y,26);g.addColorStop(0,'rgba(35,22,10,.9)');g.addColorStop(.35,'rgba(70,45,20,.45)');g.addColorStop(1,'rgba(70,45,20,0)');
  p.fillStyle=g;p.beginPath();p.arc(x,y,26,0,7);p.fill();
  p.strokeStyle='rgba(55,55,65,.55)';p.lineWidth=1;
  for(let c=0;c<6;c++){let a=Math.random()*Math.PI*2;const len=18+Math.random()*32;let px=x+Math.cos(a)*7,py=y+Math.sin(a)*7;p.beginPath();p.moveTo(px,py);
    for(let s=0;s<4;s++){a+=(Math.random()-.5)*0.7;px+=Math.cos(a)*len/4;py+=Math.sin(a)*len/4;p.lineTo(px,py);}p.stroke();}
  p.globalCompositeOperation='destination-out';p.beginPath();
  for(let j=0;j<16;j++){const a=j/16*Math.PI*2,rad=5.5+Math.random()*4;j?p.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad):p.moveTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);}
  p.closePath();p.fill();p.restore();
}
function crosshair(x,y){octx.save();octx.strokeStyle='#e03131';octx.lineWidth=2;octx.beginPath();octx.arc(x,y,16,0,7);
  octx.moveTo(x-27,y);octx.lineTo(x-7,y);octx.moveTo(x+7,y);octx.lineTo(x+27,y);octx.moveTo(x,y-27);octx.lineTo(x,y-7);octx.moveTo(x,y+7);octx.lineTo(x,y+27);octx.stroke();
  octx.fillStyle='#e03131';octx.beginPath();octx.arc(x,y,1.8,0,7);octx.fill();octx.restore();}
FX.shoot=(r,src)=>{
  const pc=document.createElement('canvas');pc.width=src.width;pc.height=src.height;const pctx=pc.getContext('2d');pctx.drawImage(src,0,0);const k=src.width/r.width;pctx.setTransform(k,0,0,k,0,0);
  const shots=[];let tt=0.4;const n=26;
  for(let i=0;i<n;i++){shots.push({t:tt,x:24+Math.random()*(r.width-48),y:24+Math.random()*(r.height-48),done:false});tt+=0.045+Math.random()*0.04;}
  shots[n-1].x=r.width-28;shots[n-1].y=24; // the "nail" in the top-right corner
  const fallStart=tt+0.35,bits=[];let lastShot=-10,lastT=0;
  for(const s of shots)SFX.gun(s.t);
  return animate(t=>{
    const dt=Math.min(0.05,t-lastT);lastT=t;
    for(const s of shots)if(!s.done&&t>=s.t){s.done=true;lastShot=t;punch(pctx,s.x,s.y);
      for(let b=0;b<7;b++)bits.push({x:r.left+s.x,y:r.top+s.y,vx:(Math.random()-.5)*500,vy:-Math.random()*350-60,rot:Math.random()*6,vr:(Math.random()-.5)*14,c:Math.random()<.3?'#3b2a1a':'#fff'});}
    const amp=7*Math.max(0,1-(t-lastShot)/0.16);
    octx.save();octx.translate((Math.random()-.5)*2*amp,(Math.random()-.5)*2*amp);
    let ang=0,dy=0,dx=0;
    if(t>fallStart){const tf=t-fallStart;if(tf<0.6)ang=0.3*easeOutBack(tf/0.6);else{const u=tf-0.6;ang=0.3+u*1.3;dy=0.5*2400*u*u;dx=u*70;}}
    octx.save();octx.translate(r.left+dx,r.top+dy);octx.rotate(ang);octx.shadowColor='rgba(20,30,60,.12)';octx.shadowBlur=14;octx.shadowOffsetY=4;octx.drawImage(pc,0,0,r.width,r.height);octx.restore();
    for(const s of shots){const age=t-s.t;if(age>=0&&age<0.07){const X=r.left+s.x,Y=r.top+s.y,q=age/0.07;const fg=octx.createRadialGradient(X,Y,0,X,Y,50);
      fg.addColorStop(0,`rgba(255,255,230,${1-q})`);fg.addColorStop(.3,`rgba(255,190,60,${0.8*(1-q)})`);fg.addColorStop(1,'rgba(255,120,0,0)');octx.fillStyle=fg;octx.beginPath();octx.arc(X,Y,50,0,7);octx.fill();}}
    for(let i=bits.length-1;i>=0;i--){const b=bits[i];b.vy+=1500*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.rot+=b.vr*dt;if(b.y>innerHeight+20){bits.splice(i,1);continue}
      octx.save();octx.translate(b.x,b.y);octx.rotate(b.rot);octx.fillStyle=b.c;octx.strokeStyle='#b8bfcc';octx.fillRect(-2.5,-2,5,4);octx.strokeRect(-2.5,-2,5,4);octx.restore();}
    octx.restore();
    if(t<fallStart){let i=shots.findIndex(s=>!s.done);let X,Y;
      if(i<0){X=r.left+shots[n-1].x;Y=r.top+shots[n-1].y;}
      else{const a=i>0?shots[i-1]:{x:r.width/2,y:r.height/2,t:0},b=shots[i];const u=easeOut(clamp((t-a.t)/((b.t-a.t)*0.75)));X=r.left+lerp(a.x,b.x,u);Y=r.top+lerp(a.y,b.y,u);}
      crosshair(X,Y);}
    return dy<innerHeight+200||bits.length>0;
  });
};

/* ---------------- shared: cutting the email into pieces ---------------- */
function clipHalf(poly,px,py,nx,ny){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];const da=(a[0]-px)*nx+(a[1]-py)*ny,db=(b[0]-px)*nx+(b[1]-py)*ny;
  if(da>=0)out.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}return out}
function polyArea(p){let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s/2)}
function splitPoly(poly,px,py,nx,ny){const a=clipHalf(poly,px,py,nx,ny),b=clipHalf(poly,px,py,-nx,-ny);return (a.length>=3&&b.length>=3&&polyArea(a)>6&&polyArea(b)>6)?[a,b]:null}
function makePiece(poly){let x=0,y=0;for(const q of poly){x+=q[0];y+=q[1]}return{poly,cx:x/poly.length,cy:y/poly.length,x:0,y:0,rot:0,vx:0,vy:0,vr:0}}
function drawPiece(pc,r,img){octx.save();octx.translate(r.left+pc.cx+pc.x,r.top+pc.cy+pc.y);octx.rotate(pc.rot);octx.translate(-pc.cx,-pc.cy);
  octx.beginPath();pc.poly.forEach((q,i)=>i?octx.lineTo(q[0],q[1]):octx.moveTo(q[0],q[1]));octx.closePath();
  octx.save();octx.clip();octx.drawImage(img,0,0,r.width,r.height);octx.restore();octx.strokeStyle='rgba(110,120,140,.45)';octx.lineWidth=1;octx.stroke();octx.restore();}
function cutAll(pieces,px,py,nx,ny,gap){const out=[];for(const pc of pieces){const s=splitPoly(pc.poly,px,py,nx,ny);if(!s){out.push(pc);continue}
  s.forEach((pp,j)=>{const q=makePiece(pp);const sg=j?-1:1;q.x=pc.x+sg*nx*gap;q.y=pc.y+sg*ny*gap;q.rot=pc.rot;out.push(q)});}return out}
function cracks(p,x,y,n,minL,maxL,alpha){p.save();p.globalCompositeOperation='source-atop';p.strokeStyle=`rgba(35,38,48,${alpha})`;p.lineCap='round';
  for(let c=0;c<n;c++){let a=Math.random()*Math.PI*2;const len=minL+Math.random()*(maxL-minL);let px=x,py=y;p.lineWidth=1.8;p.beginPath();p.moveTo(px,py);
    for(let s=0;s<6;s++){a+=(Math.random()-.5)*0.6;px+=Math.cos(a)*len/6;py+=Math.sin(a)*len/6;p.lineTo(px,py);
      if(Math.random()<.3){const b=a+(Math.random()<.5?-1:1)*(0.5+Math.random()*0.6);p.moveTo(px,py);p.lineTo(px+Math.cos(b)*len*0.2,py+Math.sin(b)*len*0.2);p.moveTo(px,py);}}
    p.stroke();}p.restore();}

/* ---------------- 🪵 WOODCHIPPER ---------------- */
FX.chipper=(r,src)=>{
  const W=r.width,H=r.height,k=src.width/W;
  const M=Math.max(240,Math.min(400,innerHeight*0.48,innerWidth*0.55));
  const ang=0.3,dir=[Math.cos(ang),Math.sin(ang)],perp=[-Math.sin(ang),Math.cos(ang)],hw=0.2*M;
  const s=(hw*2*0.82)/H,pl=W*s;
  const tx0=Math.max(pl+40-0.06*M,Math.min(innerWidth-M-10,r.left+W*0.5)),ty0=innerHeight-6;
  const FEED0=0.8,FEED=1.5,FEED1=FEED0+FEED,OUT=FEED1+0.7;
  const bits=[],puffs=[];let lastT=0;
  SFX.chipper(FEED0,FEED,OUT+0.4);
  const P=(x0,y0,a,b)=>[x0+a*M,y0+b*M];
  return animate(t=>{
    const dt=Math.min(0.05,t-lastT);lastT=t;
    const running=t>FEED0-0.05&&t<FEED1+0.25;
    const slideIn=1-easeOut(clamp(t/0.55)),slideOut=easeIn(clamp((t-OUT)/0.45));
    const x0=tx0+(slideIn+slideOut)*(innerWidth-tx0+40)+(running?(Math.random()-.5)*2.4:0),y0=ty0+(running?(Math.random()-.5)*2:0);
    const C=P(x0,y0,0.06,-0.32),I=[C[0]+dir[0]*0.2*M,C[1]+dir[1]*0.2*M];
    const S=P(x0,y0,0.58,-1.05),sa=Math.atan2(-0.15,-0.16);
    // --- machine body (behind the paper)
    octx.save();
    octx.shadowColor='rgba(20,30,60,.25)';octx.shadowBlur=18;octx.shadowOffsetY=6;
    octx.fillStyle='#343a40';octx.fillRect(x0+0.82*M,y0-0.22*M,0.2*M,0.04*M);
    const bg=octx.createLinearGradient(0,y0-0.44*M,0,y0-0.16*M);bg.addColorStop(0,'#ffa94d');bg.addColorStop(1,'#d9480f');
    octx.fillStyle=bg;rr(octx,x0+0.22*M,y0-0.44*M,0.62*M,0.28*M,0.03*M);octx.fill();
    octx.shadowColor='transparent';
    octx.fillStyle='#868e96';rr(octx,x0+0.42*M,y0-0.58*M,0.36*M,0.15*M,0.02*M);octx.fill();
    octx.strokeStyle='#495057';octx.lineWidth=2;for(let i=0;i<5;i++){const vx=x0+(0.47+i*0.06)*M;octx.beginPath();octx.moveTo(vx,y0-0.55*M);octx.lineTo(vx,y0-0.47*M);octx.stroke();}
    octx.fillStyle='#fff';octx.font=`800 ${Math.round(0.045*M)}px ${FONT}`;octx.textAlign='left';octx.fillText('CHIP-O-MATIC',x0+0.36*M,y0-0.27*M);
    octx.fillStyle='#212529';octx.fillRect(x0+0.24*M,y0-0.17*M,0.03*M,0.17*M);
    octx.fillStyle='#1f1f1f';octx.beginPath();octx.arc(x0+0.6*M,y0-0.11*M,0.11*M,0,7);octx.fill();
    octx.fillStyle='#adb5bd';octx.beginPath();octx.arc(x0+0.6*M,y0-0.11*M,0.05*M,0,7);octx.fill();
    // discharge chute
    octx.lineCap='butt';
    for(const [lw,col] of [[0.1*M,'#a63c06'],[0.078*M,'#f76707']]){octx.strokeStyle=col;octx.lineWidth=lw;octx.beginPath();octx.moveTo(x0+0.68*M,y0-0.55*M);octx.quadraticCurveTo(x0+0.74*M,y0-0.92*M,S[0],S[1]);octx.stroke();}
    if(running&&Math.random()<.5)puffs.push({x:S[0],y:S[1],vx:Math.cos(sa)*120+(Math.random()-.5)*60,vy:Math.sin(sa)*120+(Math.random()-.5)*60,life:0,max:.8+Math.random()*.6,s:6+Math.random()*8});
    // engine exhaust while running
    if(running&&Math.random()<.35)puffs.push({x:x0+0.74*M,y:y0-0.6*M,vx:(Math.random()-.5)*20,vy:-60-Math.random()*40,life:0,max:1+Math.random(),s:5+Math.random()*5,dark:1});
    // funnel interior
    const m1=[C[0]+perp[0]*hw,C[1]+perp[1]*hw],m2=[C[0]-perp[0]*hw,C[1]-perp[1]*hw],i1=[I[0]+perp[0]*0.07*M,I[1]+perp[1]*0.07*M],i2=[I[0]-perp[0]*0.07*M,I[1]-perp[1]*0.07*M];
    octx.fillStyle='#141414';octx.beginPath();octx.moveTo(...m1);octx.lineTo(...i1);octx.lineTo(...i2);octx.lineTo(...m2);octx.closePath();octx.fill();
    octx.restore();
    // --- the email
    let cx,cy,sc,rot,clip=false;
    if(t<0.2){cx=r.left+W/2;cy=r.top+H/2;sc=1;rot=0;}
    else if(t<FEED0){const u=easeInOut((t-0.2)/(FEED0-0.2));const tx=C[0]-dir[0]*(pl/2+6),ty=C[1]-dir[1]*(pl/2+6);
      cx=lerp(r.left+W/2,tx,u);cy=lerp(r.top+H/2,ty,u)-Math.sin(u*Math.PI)*40;sc=lerp(1,s,u);rot=lerp(0,ang,u)+Math.sin(u*Math.PI)*0.15;}
    else{const u=clamp((t-FEED0)/FEED),f=(u*u*0.35+u*0.65)*(pl+12);cx=C[0]-dir[0]*(pl/2+6)+dir[0]*f;cy=C[1]-dir[1]*(pl/2+6)+dir[1]*f;sc=s;rot=ang+(t<FEED1?Math.sin(t*38)*0.035:0);clip=true;}
    if(t<FEED1+0.05){octx.save();
      if(clip){const B=5000;octx.beginPath();octx.moveTo(C[0]+perp[0]*B,C[1]+perp[1]*B);octx.lineTo(C[0]-perp[0]*B,C[1]-perp[1]*B);
        octx.lineTo(C[0]-perp[0]*B-dir[0]*B,C[1]-perp[1]*B-dir[1]*B);octx.lineTo(C[0]+perp[0]*B-dir[0]*B,C[1]+perp[1]*B-dir[1]*B);octx.closePath();octx.clip();}
      octx.translate(cx,cy);octx.rotate(rot);octx.scale(sc,sc);octx.shadowColor='rgba(20,30,60,.15)';octx.shadowBlur=14;octx.shadowOffsetY=4;
      octx.drawImage(src,-W/2,-H/2,W,H);octx.restore();}
    // --- funnel walls (in front of the paper)
    octx.save();octx.strokeStyle='#e8590c';octx.lineWidth=0.035*M;octx.lineCap='round';
    octx.beginPath();octx.moveTo(...m1);octx.lineTo(...i1);octx.moveTo(...m2);octx.lineTo(...i2);octx.stroke();
    octx.strokeStyle='#495057';octx.lineWidth=3;octx.beginPath();octx.moveTo(...m1);octx.lineTo(...m2);octx.stroke();octx.restore();
    // --- shredded bits spraying out of the chute
    if(t>FEED0+0.15&&t<FEED1+0.35){const n=t<FEED1?8:3;for(let i=0;i<n;i++){const a=sa+(Math.random()-.5)*0.55,sp=550+Math.random()*450,w=5+Math.random()*7,h=3+Math.random()*5;
      bits.push({x:S[0],y:S[1],vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,rot:Math.random()*6,vr:(Math.random()-.5)*18,w,h,sx:Math.random()*(src.width-40*k),sy:Math.random()*(src.height-30*k)});}}
    for(let i=bits.length-1;i>=0;i--){const b=bits[i];b.vy+=1000*dt;b.vx*=0.992;b.x+=b.vx*dt;b.y+=b.vy*dt;b.rot+=b.vr*dt;if(b.y>innerHeight+30||b.x<-30){bits.splice(i,1);continue}
      octx.save();octx.translate(b.x,b.y);octx.rotate(b.rot);octx.drawImage(src,b.sx,b.sy,b.w*k*2.5,b.h*k*2.5,-b.w/2,-b.h/2,b.w,b.h);octx.strokeStyle='rgba(150,158,172,.5)';octx.lineWidth=0.6;octx.strokeRect(-b.w/2,-b.h/2,b.w,b.h);octx.restore();}
    for(let i=puffs.length-1;i>=0;i--){const p=puffs[i];p.life+=dt;if(p.life>p.max){puffs.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;const q=p.life/p.max;
      octx.globalAlpha=(p.dark?0.25:0.3)*(1-q);octx.fillStyle=p.dark?'#5c5f66':'#d6cbb5';octx.beginPath();octx.arc(p.x,p.y,p.s*(1+q*2),0,7);octx.fill();}
    octx.globalAlpha=1;
    return t<OUT+0.5||bits.length>0||puffs.length>0;
  });
};

/* ---------------- 🔨 HAMMER ---------------- */
function drawHammer(px,py,th,HL,a){
  octx.save();octx.translate(px,py);octx.rotate(th);octx.globalAlpha=a;
  octx.shadowColor='rgba(20,30,60,.3)';octx.shadowBlur=18;octx.shadowOffsetY=10;
  const hg=octx.createLinearGradient(0,-9,0,9);hg.addColorStop(0,'#c98d52');hg.addColorStop(1,'#8a5a2b');octx.fillStyle=hg;rr(octx,-HL+10,-9,HL+60,18,7);octx.fill();
  octx.shadowColor='transparent';
  octx.fillStyle='#222';rr(octx,0,-10,62,20,7);octx.fill();octx.strokeStyle='#444';octx.lineWidth=2;for(let i=8;i<60;i+=9){octx.beginPath();octx.moveTo(i,-9);octx.lineTo(i,9);octx.stroke();}
  octx.shadowColor='rgba(20,30,60,.3)';octx.shadowBlur=18;octx.shadowOffsetY=10;
  const sg=octx.createLinearGradient(-HL-30,0,-HL+30,0);sg.addColorStop(0,'#5c636a');sg.addColorStop(.45,'#e9ecef');sg.addColorStop(1,'#495057');
  octx.fillStyle=sg;rr(octx,-HL-30,-76,60,112,7);octx.fill();octx.shadowColor='transparent';octx.strokeStyle='#343a40';octx.lineWidth=1.5;octx.stroke();
  octx.fillStyle='#343a40';octx.fillRect(-HL-32,26,64,10);octx.fillRect(-HL-32,-76,64,8);
  octx.restore();
}
FX.hammer=(r,src)=>{
  const W=r.width,H=r.height;
  const pc=document.createElement('canvas');pc.width=src.width;pc.height=src.height;const pctx=pc.getContext('2d');pctx.drawImage(src,0,0);const k=src.width/W;pctx.setTransform(k,0,0,k,0,0);
  const ix=W*(0.4+Math.random()*0.2),iy=H*(0.45+Math.random()*0.15),FACE=36;
  const HL=Math.max(260,innerWidth-(r.left+ix)+90);
  const pivX=r.left+ix+HL,pivY=r.top+iy-FACE;
  const UP=Math.min(1.45,Math.asin(clamp((pivY+160)/HL,0,0.99))+0.12);
  const hit1=0.55,hit2=1.3;let done1=false,done2=false,pieces=null,shakeT=-10,lastT=0;const bits=[],ghosts=[];
  SFX.thud(hit1,false);SFX.thud(hit2,true);
  function theta(t){
    if(t<0.3)return UP;
    if(t<hit1)return UP*(1-easeIn((t-0.3)/(hit1-0.3)));
    if(t<0.95)return UP*easeInOut((t-hit1)/(0.95-hit1));
    if(t<1.08)return UP;
    if(t<hit2)return UP*(1-easeIn((t-1.08)/(hit2-1.08)));
    if(t<hit2+0.15)return 0.12*Math.sin((t-hit2)/0.15*Math.PI);
    return UP*easeInOut(clamp((t-hit2-0.15)/0.45));
  }
  function burst(n){for(let b=0;b<n;b++){const a=-Math.PI*Math.random();bits.push({x:r.left+ix,y:r.top+iy,vx:Math.cos(a)*(100+Math.random()*350),vy:Math.sin(a)*(150+Math.random()*350),rot:Math.random()*6,vr:(Math.random()-.5)*14});}}
  return animate(t=>{
    const dt=Math.min(0.05,t-lastT);lastT=t;
    if(!done1&&t>=hit1){done1=true;shakeT=t;cracks(pctx,ix,iy,9,50,150,.75);
      pctx.save();pctx.globalCompositeOperation='source-atop';const g=pctx.createRadialGradient(ix,iy,0,ix,iy,60);g.addColorStop(0,'rgba(0,0,0,.28)');g.addColorStop(1,'rgba(0,0,0,0)');pctx.fillStyle=g;pctx.fillRect(ix-60,iy-60,120,120);pctx.restore();burst(14);}
    if(!done2&&t>=hit2){done2=true;shakeT=t;cracks(pctx,ix,iy,14,80,260,.8);burst(24);
      pieces=[makePiece([[0,0],[W,0],[W,H],[0,H]])];const base=Math.random()*Math.PI;
      for(let i=0;i<7;i++){const a=base+i*Math.PI/7+(Math.random()-.5)*0.25;pieces=cutAll(pieces,ix,iy,Math.cos(a),Math.sin(a),0);}
      const out=[];for(const p of pieces){const dx=p.cx-ix,dy=p.cy-iy,d=Math.hypot(dx,dy)||1,dist=50+Math.random()*90;const s=splitPoly(p.poly,ix+dx/d*dist,iy+dy/d*dist,dx/d,dy/d);if(s)s.forEach(pp=>out.push(makePiece(pp)));else out.push(p);}
      pieces=out;for(const p of pieces){const dx=p.cx-ix,dy=p.cy-iy,d=Math.hypot(dx,dy)||1,sp=(140+Math.random()*260)*Math.max(0.35,1-d/600);p.vx=dx/d*sp;p.vy=dy/d*sp-180-Math.random()*120;p.vr=(Math.random()-.5)*7;}}
    const amp=(t-shakeT<0.35)?(done2?16:10)*(1-(t-shakeT)/0.35):0;
    octx.save();octx.translate((Math.random()-.5)*2*amp,(Math.random()-.5)*2*amp);
    if(!pieces){octx.save();octx.shadowColor='rgba(20,30,60,.12)';octx.shadowBlur=14;octx.shadowOffsetY=4;octx.drawImage(pc,r.left,r.top,W,H);octx.restore();}
    else for(const p of pieces){p.vy+=2200*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;drawPiece(p,r,pc);}
    for(const h of [hit1,hit2]){const age=t-h;if(age>0&&age<0.3){const q=age/0.3;octx.strokeStyle=`rgba(120,125,140,${0.6*(1-q)})`;octx.lineWidth=3;octx.beginPath();octx.ellipse(r.left+ix,r.top+iy,20+q*120,8+q*40,0,0,7);octx.stroke();}}
    for(let i=bits.length-1;i>=0;i--){const b=bits[i];b.vy+=1600*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.rot+=b.vr*dt;if(b.y>innerHeight+20){bits.splice(i,1);continue}
      octx.save();octx.translate(b.x,b.y);octx.rotate(b.rot);octx.fillStyle='#fff';octx.strokeStyle='#adb5bd';octx.fillRect(-3,-2,6,4);octx.strokeRect(-3,-2,6,4);octx.restore();}
    const th=theta(t);ghosts.push(th);if(ghosts.length>4)ghosts.shift();
    ghosts.forEach((g,i)=>{if(Math.abs(g-th)>0.03)drawHammer(pivX,pivY,g,HL,0.12*(i+1));});
    drawHammer(pivX,pivY,th,HL,1);
    octx.restore();
    return !pieces||pieces.some(p=>r.top+p.cy+p.y<innerHeight+250)||bits.length>0;
  });
};

/* ---------------- 🚗 CAR DROP ---------------- */
function drawCar(x,yb,CW,rot,sq){
  octx.save();octx.translate(x,yb);octx.rotate(rot);octx.scale(CW*(1+(1-sq)*0.4),CW*sq);octx.translate(-0.5,-0.445);
  const lw=1.6/CW;octx.lineJoin='round';
  const poly=(pts)=>{octx.beginPath();pts.forEach((p,i)=>i?octx.lineTo(p[0],p[1]):octx.moveTo(p[0],p[1]));octx.closePath();};
  // shadow
  octx.fillStyle='rgba(0,0,0,.18)';octx.beginPath();octx.ellipse(0.5,0.44,0.5,0.025,0,0,7);octx.fill();
  // bumper hanging off the front
  octx.save();octx.translate(0.94,0.335);octx.rotate(0.55);octx.fillStyle='#868e96';octx.strokeStyle='#495057';octx.lineWidth=lw;octx.fillRect(0,-0.012,0.11,0.024);octx.strokeRect(0,-0.012,0.11,0.024);octx.restore();
  // body
  const body=[[0.02,0.33],[0.03,0.24],[0.08,0.205],[0.22,0.19],[0.30,0.17],[0.35,0.115],[0.41,0.07],[0.47,0.095],[0.53,0.06],[0.60,0.075],[0.66,0.12],[0.72,0.175],[0.80,0.17],[0.86,0.19],[0.95,0.2],[0.985,0.25],[0.975,0.33],[0.93,0.36],[0.07,0.36]];
  const bg=octx.createLinearGradient(0,0.06,0,0.36);bg.addColorStop(0,'#c0473a');bg.addColorStop(1,'#7d2a21');
  poly(body);octx.fillStyle=bg;octx.fill();octx.strokeStyle='#4a1611';octx.lineWidth=lw*1.3;octx.stroke();
  octx.save();poly(body);octx.clip();
  octx.fillStyle='rgba(107,58,31,.85)';for(const [ex,ey,rx,ry] of [[0.12,0.3,0.05,0.025],[0.6,0.31,0.045,0.02],[0.9,0.25,0.03,0.022],[0.45,0.2,0.02,0.012]]){octx.beginPath();octx.ellipse(ex,ey,rx,ry,0.3,0,7);octx.fill();}
  octx.strokeStyle='#5e1d16';octx.lineWidth=lw;
  for(const [a,b,c,d] of [[0.22,0.24,0.27,0.29],[0.7,0.22,0.76,0.27],[0.55,0.25,0.6,0.22],[0.84,0.29,0.9,0.28]]){octx.beginPath();octx.moveTo(a,b);octx.quadraticCurveTo((a+c)/2+0.01,(b+d)/2+0.02,c,d);octx.stroke();}
  octx.beginPath();octx.moveTo(0.335,0.175);octx.lineTo(0.325,0.345);octx.moveTo(0.5,0.17);octx.lineTo(0.505,0.345);octx.moveTo(0.69,0.175);octx.lineTo(0.68,0.34);octx.stroke();
  octx.fillStyle='#3d1410';octx.fillRect(0.42,0.215,0.035,0.01);octx.fillRect(0.6,0.215,0.035,0.01);
  octx.restore();
  // windows
  poly([[0.36,0.165],[0.415,0.095],[0.465,0.115],[0.49,0.165]]);octx.fillStyle='#1c2430';octx.fill();octx.strokeStyle='#4a1611';octx.lineWidth=lw;octx.stroke();
  octx.strokeStyle='rgba(220,230,240,.8)';octx.lineWidth=lw*0.8;octx.beginPath();octx.moveTo(0.375,0.15);octx.lineTo(0.39,0.135);octx.lineTo(0.385,0.12);octx.lineTo(0.4,0.11);octx.lineTo(0.395,0.1);octx.moveTo(0.48,0.16);octx.lineTo(0.465,0.14);octx.lineTo(0.47,0.125);octx.stroke();
  poly([[0.515,0.165],[0.535,0.09],[0.595,0.1],[0.65,0.135],[0.68,0.168]]);octx.fillStyle='#3a4a5e';octx.fill();octx.strokeStyle='#4a1611';octx.lineWidth=lw;octx.stroke();
  octx.strokeStyle='rgba(235,240,248,.9)';octx.lineWidth=lw*0.7;const cxw=0.585,cyw=0.13;
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;octx.beginPath();octx.moveTo(cxw,cyw);octx.lineTo(cxw+Math.cos(a)*0.05,cyw+Math.sin(a)*0.03);octx.stroke();}
  octx.beginPath();octx.ellipse(cxw,cyw,0.018,0.011,0,0,7);octx.stroke();
  // lights
  octx.fillStyle='#e03131';octx.fillRect(0.028,0.235,0.018,0.035);
  octx.fillStyle='#ffe066';octx.beginPath();octx.arc(0.966,0.255,0.014,0,7);octx.fill();octx.fillStyle='#495057';octx.beginPath();octx.moveTo(0.966,0.241);octx.lineTo(0.98,0.255);octx.lineTo(0.962,0.262);octx.closePath();octx.fill();
  // wheels
  octx.fillStyle='#14161a';octx.beginPath();octx.arc(0.2,0.34,0.088,Math.PI,0);octx.fill();octx.beginPath();octx.arc(0.79,0.345,0.082,Math.PI,0);octx.fill();
  octx.fillStyle='#212328';octx.beginPath();octx.arc(0.2,0.365,0.078,0,7);octx.fill();octx.fillStyle='#8d939b';octx.beginPath();octx.arc(0.2,0.365,0.036,0,7);octx.fill();
  octx.fillStyle='#212328';octx.beginPath();octx.ellipse(0.79,0.385,0.074,0.055,0.25,0,7);octx.fill();octx.fillStyle='#6c737b';octx.beginPath();octx.ellipse(0.795,0.382,0.032,0.024,0.25,0,7);octx.fill();
  octx.restore();
}
FX.car=(r,src)=>{
  const W=r.width,H=r.height,cx=r.left+W/2,bottom=r.top+H;
  const CW=Math.min(W*0.85,470),sh=Math.max(22,H*0.12),landY=bottom-sh,y0=-60,TL=0.5,FALL=TL+1.3;
  const smoke=[],dust=[],glass=[],stripes=Array.from({length:22},()=>Math.random());let landed=false,lastT=0;
  SFX.crash(TL);
  return animate(t=>{
    const dt=Math.min(0.05,t-lastT);lastT=t;
    let carB,rot,sq=1;
    if(t<TL){const u=t/TL;carB=y0+(landY-y0)*Math.pow(u,2.6);rot=0.07;}
    else{const b=t-TL;carB=landY-(b<0.35?Math.sin(b/0.35*Math.PI)*9*(1-b/0.35):0);rot=lerp(0.07,-0.02,clamp(b/0.12));sq=b<0.09?1-0.32*easeOut(b/0.09):lerp(0.68,0.78,easeOut(clamp((b-0.09)/0.25)));}
    if(!landed&&t>=TL){landed=true;
      for(let i=0;i<46;i++){const side=Math.random()<.5?-1:1;dust.push({x:cx+side*CW*(0.2+Math.random()*0.35),y:bottom-4,vx:side*(80+Math.random()*320),vy:-20-Math.random()*90,life:0,max:1+Math.random()*0.8,s:10+Math.random()*16});}
      for(let i=0;i<30;i++)glass.push({x:cx+(Math.random()-.3)*CW*0.3,y:landY-CW*0.32,vx:(Math.random()-.5)*500,vy:-150-Math.random()*350,rot:Math.random()*6,vr:(Math.random()-.5)*16});}
    const drop=t>FALL?0.5*2600*(t-FALL)*(t-FALL):0;
    const amp=landed&&t-TL<0.5?16*(1-(t-TL)/0.5):0;
    octx.save();octx.translate((Math.random()-.5)*2*amp,(Math.random()-.5)*2*amp);
    // paper, crushed in real time under the wheels
    const top=Math.max(r.top,Math.min(carB,landY)),curH=bottom-top,crush=1-curH/H,spread=crush*W*0.05;
    octx.save();octx.shadowColor='rgba(20,30,60,.12)';octx.shadowBlur=14;octx.shadowOffsetY=4;octx.drawImage(src,r.left-spread,top+drop,W+spread*2,curH);octx.restore();
    if(crush>0){stripes.forEach((s,i)=>{octx.fillStyle=`rgba(40,45,60,${0.18*crush*s})`;octx.fillRect(r.left-spread+(W+spread*2)*i/stripes.length,top+drop,(W+spread*2)/stripes.length*0.6,curH);});}
    if(t<TL){const u=t/TL;octx.fillStyle=`rgba(0,0,0,${0.28*u*u})`;octx.beginPath();octx.ellipse(cx,bottom-12,CW*0.5*(0.4+0.6*u),10+12*u,0,0,7);octx.fill();}
    drawCar(cx,carB+drop,CW,rot,sq);
    if(landed&&t<FALL+0.3&&Math.random()<0.7){const sx=cx+CW*0.38,sy=carB+drop-CW*0.2;smoke.push({x:sx+(Math.random()-.5)*20,y:sy,vx:(Math.random()-.5)*20,vy:-40-Math.random()*40,life:0,max:1.4+Math.random(),s:8+Math.random()*8});}
    for(let i=smoke.length-1;i>=0;i--){const p=smoke[i];p.life+=dt;if(p.life>p.max){smoke.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt+(t>FALL?2600*(t-FALL)*dt:0);const q=p.life/p.max;octx.globalAlpha=0.3*(1-q);octx.fillStyle='#6b6f78';octx.beginPath();octx.arc(p.x,p.y,p.s*(1+q*2),0,7);octx.fill();}
    for(let i=dust.length-1;i>=0;i--){const p=dust[i];p.life+=dt;if(p.life>p.max){dust.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.95;p.vy*=0.95;const q=p.life/p.max;octx.globalAlpha=0.35*(1-q);octx.fillStyle='#b8a888';octx.beginPath();octx.arc(p.x,p.y,p.s*(1+q*1.8),0,7);octx.fill();}
    octx.globalAlpha=1;
    for(let i=glass.length-1;i>=0;i--){const b=glass[i];b.vy+=1500*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.rot+=b.vr*dt;if(b.y>innerHeight+20){glass.splice(i,1);continue}
      octx.save();octx.translate(b.x,b.y);octx.rotate(b.rot);octx.fillStyle='rgba(190,220,245,.9)';octx.beginPath();octx.moveTo(-3,-2);octx.lineTo(3,-1);octx.lineTo(0,3);octx.closePath();octx.fill();octx.restore();}
    octx.restore();
    return !(t>FALL&&drop>innerHeight+CW*0.5)||dust.length>0;
  });
};

