import { useRef, useEffect, useState } from "react";

export default function NeonTrail(){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const[scores,setScores]=useState({player:0,bot:0});

  useEffect(()=>{
    const canvas=canvasRef.current!;
    const ctx=canvas.getContext("2d")!;
    const W=400,H=400,CS=4;
    let anim=0,frame=0;

    let p={x:100,y:H/2,dx:1,dy:0,trail:[[100,H/2]]as number[][],color:"#3b82f6"};
    let b={x:300,y:H/2,dx:-1,dy:0,trail:[[300,H/2]]as number[][],color:"#ef4444"};
    let dead="",started=false,pScore=0,bScore=0;

    const occupied=new Set<string>();

    const reset=()=>{
      p={x:100,y:H/2,dx:1,dy:0,trail:[[100,H/2]],color:"#3b82f6"};
      b={x:300,y:H/2,dx:-1,dy:0,trail:[[300,H/2]],color:"#ef4444"};
      dead="";occupied.clear();started=true;
    };

    const loop=()=>{
      ctx.fillStyle="#0a0a0a";ctx.fillRect(0,0,W,H);
      // Grid
      ctx.strokeStyle="#111";ctx.lineWidth=0.5;
      for(let x=0;x<W;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=0;y<H;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

      if(started&&!dead){
        frame++;
        if(frame%2===0){
          // Move
          p.x+=p.dx*CS;p.y+=p.dy*CS;
          b.x+=b.dx*CS;b.y+=b.dy*CS;

          // Bot AI: avoid walls and trails
          if(frame%6===0){
            const dirs=[[0,-1],[0,1],[-1,0],[1,0]].filter(([dx,dy])=>!(dx===-b.dx&&dy===-b.dy));
            let best=dirs[0],bestDist=0;
            for(const[dx,dy]of dirs){
              let dist=0;let tx=b.x,ty=b.y;
              for(let i=0;i<20;i++){tx+=dx*CS;ty+=dy*CS;if(tx<0||tx>=W||ty<0||ty>=H||occupied.has(`${tx},${ty}`))break;dist++;}
              if(dist>bestDist){bestDist=dist;best=[dx,dy];}
            }
            if(best){b.dx=best[0];b.dy=best[1];}
          }

          // Check death
          const pk=`${p.x},${p.y}`,bk=`${b.x},${b.y}`;
          if(p.x<0||p.x>=W||p.y<0||p.y>=H||occupied.has(pk)){dead="bot";bScore++;setScores({player:pScore,bot:bScore});}
          if(b.x<0||b.x>=W||b.y<0||b.y>=H||occupied.has(bk)){dead=dead?"draw":"player";if(dead==="player"){pScore++;setScores({player:pScore,bot:bScore});}}

          occupied.add(pk);occupied.add(bk);
          p.trail.push([p.x,p.y]);b.trail.push([b.x,b.y]);
        }
      }

      // Draw trails
      ctx.fillStyle=p.color+"88";for(const[x,y]of p.trail)ctx.fillRect(x,y,CS,CS);
      ctx.fillStyle=b.color+"88";for(const[x,y]of b.trail)ctx.fillRect(x,y,CS,CS);
      // Heads
      ctx.fillStyle=p.color;ctx.fillRect(p.x-1,p.y-1,CS+2,CS+2);
      ctx.fillStyle=b.color;ctx.fillRect(b.x-1,b.y-1,CS+2,CS+2);

      if(!started){ctx.fillStyle="#888";ctx.font="16px system-ui";ctx.textAlign="center";ctx.fillText("Press Space to start",W/2,H/2);}
      if(dead){ctx.fillStyle="#fff";ctx.font="bold 20px system-ui";ctx.textAlign="center";ctx.fillText(dead==="draw"?"Draw!":dead==="player"?"You win!":"Bot wins!",W/2,H/2);ctx.font="14px system-ui";ctx.fillStyle="#888";ctx.fillText("Space to restart",W/2,H/2+25);}

      ctx.fillStyle="#888";ctx.font="12px system-ui";ctx.textAlign="left";
      ctx.fillText("You: "+pScore+" | Bot: "+bScore,10,16);

      anim=requestAnimationFrame(loop);
    };

    const onKey=(e:KeyboardEvent)=>{
      if(e.code==="Space"){e.preventDefault();reset();return;}
      if(e.code==="ArrowUp"&&p.dy!==1){p.dx=0;p.dy=-1;}
      if(e.code==="ArrowDown"&&p.dy!==-1){p.dx=0;p.dy=1;}
      if(e.code==="ArrowLeft"&&p.dx!==1){p.dx=-1;p.dy=0;}
      if(e.code==="ArrowRight"&&p.dx!==-1){p.dx=1;p.dy=0;}
    };

    window.addEventListener("keydown",onKey);
    anim=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(anim);window.removeEventListener("keydown",onKey);};
  },[]);

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:20}}>
      <p style={{color:"#888",marginBottom:8,fontSize:13}}>Arrow keys to steer. Don't crash!</p>
      <canvas ref={canvasRef} width={400} height={400} style={{borderRadius:8}} />
    </div>
  );
}
