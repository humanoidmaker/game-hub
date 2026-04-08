import { useState, useMemo } from "react";

function genPuzzle(size:number):{grid:boolean[][],rowClues:number[][],colClues:number[][]}{
  const grid=Array.from({length:size},()=>Array.from({length:size},()=>Math.random()<0.5));
  const getClues=(line:boolean[]):number[]=>{
    const clues:number[]=[];let count=0;
    for(const c of line){if(c)count++;else if(count>0){clues.push(count);count=0;}}
    if(count>0)clues.push(count);
    return clues.length?clues:[0];
  };
  const rowClues=grid.map(r=>getClues(r));
  const colClues=Array.from({length:size},(_,c)=>getClues(grid.map(r=>r[c])));
  return{grid,rowClues,colClues};
}

export default function Nonogram(){
  const[size,setSize]=useState(5);
  const puzzle=useMemo(()=>genPuzzle(size),[size]);
  const[player,setPlayer]=useState<(boolean|null)[][]>(()=>Array.from({length:size},()=>Array(size).fill(null)));
  const[mistakes,setMistakes]=useState(0);

  const reset=(s:number)=>{setSize(s);setPlayer(Array.from({length:s},()=>Array(s).fill(null)));setMistakes(0);};

  const click=(r:number,c:number)=>{
    const np=player.map(row=>[...row]);
    if(np[r][c]===null){np[r][c]=true;if(!puzzle.grid[r][c])setMistakes(m=>m+1);}
    else if(np[r][c]===true)np[r][c]=false;
    else np[r][c]=null;
    setPlayer(np);
  };

  const solved=player.every((row,r)=>row.every((cell,c)=>(cell===true)===puzzle.grid[r][c]));
  const CS=Math.min(36,280/size);

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:20}}>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {[5,7,10].map(s=><button key={s} onClick={()=>reset(s)} style={{padding:"6px 12px",borderRadius:6,border:"none",background:size===s?"#10b981":"#222",color:size===s?"#000":"#aaa",cursor:"pointer",fontSize:12}}>{s}x{s}</button>)}
      </div>
      <p style={{color:"#888",fontSize:12,marginBottom:8}}>Mistakes: {mistakes}</p>
      {solved&&mistakes===0&&<p style={{color:"#10b981",fontWeight:700,marginBottom:8}}>Perfect!</p>}

      <div style={{display:"flex"}}>
        {/* Row clues */}
        <div style={{display:"flex",flexDirection:"column",marginRight:4,marginTop:size*6+4}}>
          {puzzle.rowClues.map((clue,r)=>(
            <div key={r} style={{height:CS,display:"flex",alignItems:"center",justifyContent:"flex-end",gap:2,paddingRight:4}}>
              {clue.map((n,i)=><span key={i} style={{fontSize:10,color:"#888",fontWeight:600}}>{n}</span>)}
            </div>
          ))}
        </div>
        <div>
          {/* Col clues */}
          <div style={{display:"flex",marginBottom:2}}>
            {puzzle.colClues.map((clue,c)=>(
              <div key={c} style={{width:CS,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end"}}>
                {clue.map((n,i)=><span key={i} style={{fontSize:10,color:"#888",fontWeight:600}}>{n}</span>)}
              </div>
            ))}
          </div>
          {/* Grid */}
          <div style={{display:"inline-grid",gridTemplateColumns:`repeat(${size},${CS}px)`,gap:1}}>
            {player.map((row,r)=>row.map((cell,c)=>(
              <div key={`${r},${c}`} onClick={()=>click(r,c)} style={{
                width:CS,height:CS,borderRadius:3,cursor:"pointer",
                background:cell===true?(puzzle.grid[r][c]?"#3b82f6":"#ef4444"):cell===false?"#111":"#222",
                border:"1px solid #333",display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:CS*0.4,color:"#666",
              }}>{cell===false?"\u2715":""}</div>
            )))}
          </div>
        </div>
      </div>
    </div>
  );
}
