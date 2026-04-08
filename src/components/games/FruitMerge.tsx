import { useRef, useEffect, useState } from "react";

const FRUITS=[
  {emoji:"\u{1F352}",r:12,next:1}, // Cherry
  {emoji:"\u{1F353}",r:16,next:2}, // Strawberry
  {emoji:"\u{1F347}",r:20,next:3}, // Grape
  {emoji:"\u{1F34A}",r:25,next:4}, // Orange
  {emoji:"\u{1F34E}",r:30,next:5}, // Apple
  {emoji:"\u{1F351}",r:35,next:6}, // Peach
  {emoji:"\u{1F34D}",r:40,next:7}, // Pineapple
  {emoji:"\u{1F349}",r:48,next:-1}, // Watermelon
];

export default function FruitMerge(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const[score,setScore]=useState(0);

  useEffect(()=>{
    const canvas=canvasRef.current!;
    const ctx=canvas.getContext("2d")!;
    const W=280,H=450;
    let anim=0;

    interface Ball{x:number;y:number;vx:number;vy:number;type:number;r:number;id:number;}
    let balls:Ball[]=[];
    let nextType=Math.floor(Math.random()*3);
    let dropX=W/2,canDrop=true,idCounter=0,sc=0,dead=false;

    const loop=()=>{
      ctx.fillStyle="#fdf2e9";ctx.fillRect(0,0,W,H);
      // Walls
      ctx.strokeStyle="#d2691e";ctx.lineWidth=4;
      ctx.strokeRect(2,50,W-4,H-52);

      // Dead line
      ctx.strokeStyle="#ef444444";ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(0,80);ctx.lineTo(W,80);ctx.stroke();ctx.setLineDash([]);

      // Physics
      const GRAVITY=0.2,FRICTION=0.99,BOUNCE=0.3;
      for(const b of balls){
        b.vy+=GRAVITY;b.x+=b.vx;b.y+=b.vy;
        b.vx*=FRICTION;b.vy*=FRICTION;
        // Wall collision
        if(b.x-b.r<4){b.x=4+b.r;b.vx*=-BOUNCE;}
        if(b.x+b.r>W-4){b.x=W-4-b.r;b.vx*=-BOUNCE;}
        if(b.y+b.r>H-4){b.y=H-4-b.r;b.vy*=-BOUNCE;}
      }

      // Ball-ball collision + merge
      for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){
        const a=balls[i],b=balls[j];
        const dx=b.x-a.x,dy=b.y-a.y,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<a.r+b.r){
          // Push apart
          const overlap=(a.r+b.r-dist)/2;
          const nx=dx/dist||0,ny=dy/dist||1;
          a.x-=overlap*nx;a.y-=overlap*ny;
          b.x+=overlap*nx;b.y+=overlap*ny;
          // Bounce
          const dvx=a.vx-b.vx,dvy=a.vy-b.vy;
          const dvn=dvx*nx+dvy*ny;
          if(dvn>0){a.vx-=dvn*nx*0.5;a.vy-=dvn*ny*0.5;b.vx+=dvn*nx*0.5;b.vy+=dvn*ny*0.5;}
          // Merge same type
          if(a.type===b.type&&FRUITS[a.type].next>=0){
            const newType=FRUITS[a.type].next;
            const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
            balls.splice(j,1);balls.splice(i,1);
            balls.push({x:mx,y:my,vx:0,vy:-2,type:newType,r:FRUITS[newType].r,id:idCounter++});
            sc+=(newType+1)*10;setScore(sc);
            i--;break;
          }
        }
      }

      // Draw balls
      for(const b of balls){
        ctx.font=`${b.r*1.2}px system-ui`;ctx.textAlign="center";
        ctx.fillText(FRUITS[b.type].emoji,b.x,b.y+b.r*0.4);
      }

      // Preview
      if(canDrop&&!dead){
        ctx.globalAlpha=0.4;ctx.font=`${FRUITS[nextType].r*1.2}px system-ui`;ctx.textAlign="center";
        ctx.fillText(FRUITS[nextType].emoji,dropX,30);ctx.globalAlpha=1;
        // Drop line
        ctx.strokeStyle="#00000011";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(dropX,40);ctx.lineTo(dropX,H);ctx.stroke();
      }

      // Check dead (any ball above line for too long)
      if(balls.some(b=>b.y-b.r<80&&Math.abs(b.vy)<0.5))dead=true;

      if(dead){ctx.fillStyle="#ef444488";ctx.fillRect(0,0,W,H);ctx.fillStyle="#ef4444";ctx.font="bold 20px system-ui";ctx.textAlign="center";ctx.fillText("Game Over!",W/2,H/2);ctx.fillStyle="#888";ctx.font="14px system-ui";ctx.fillText("Score: "+sc,W/2,H/2+25);}

      ctx.fillStyle="#333";ctx.font="bold 16px system-ui";ctx.textAlign="right";ctx.fillText(String(sc),W-10,20);

      anim=requestAnimationFrame(loop);
    };

    const onMove=(e:MouseEvent)=>{const r=canvas.getBoundingClientRect();dropX=Math.max(20,Math.min(W-20,e.clientX-r.left));};
    const onClick=()=>{
      if(dead||!canDrop)return;
      balls.push({x:dropX,y:50,vx:0,vy:1,type:nextType,r:FRUITS[nextType].r,id:idCounter++});
      nextType=Math.floor(Math.random()*3);
      canDrop=false;setTimeout(()=>{canDrop=true;},500);
    };

    canvas.addEventListener("mousemove",onMove);canvas.addEventListener("click",onClick);
    anim=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(anim);canvas.removeEventListener("mousemove",onMove);canvas.removeEventListener("click",onClick);};
  },[]);

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:20}}>
      <p style={{color:"#888",marginBottom:8,fontSize:13}}>Drop fruits — same fruits merge into bigger ones!</p>
      <canvas ref={canvasRef} width={280} height={450} style={{borderRadius:8,cursor:"pointer"}} />
    </div>
  );
}
