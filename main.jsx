import React, { useState, useEffect } from "react";
import ReactDOM from 'react-dom/client';

// ─────────────────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:"#0a0a0f",surface:"#12121a",card:"#1a1a26",border:"#2a2a3d",
  accent:"#00e5a0",accentDim:"#00e5a018",accentBorder:"#00e5a040",
  warn:"#ff6b35",blue:"#4d9fff",purple:"#9b6dff",
  text:"#f0f0f8",muted:"#6b6b8a",subtle:"#2e2e42",green2:"#a3e635",
  teal:"#06b6d4",amber:"#f59e0b",orange:"#f97316",
};
const fmt  = n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
const fmtD = n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─────────────────────────────────────────────────────────────────────────────
// ENGINES
// ─────────────────────────────────────────────────────────────────────────────
function calcPayoff(debts,extra,method="avalanche"){
  if(!debts.length)return{months:0,totalInterest:0};
  let bal=debts.map(d=>({...d}));let month=0,interest=0;
  while(bal.some(d=>d.balance>0)&&month<600){
    month++;
    bal=bal.map(d=>{if(d.balance<=0)return d;const i=(d.balance*(d.apr/100))/12;interest+=i;return{...d,balance:d.balance+i};});
    let rem=extra;
    bal=bal.map(d=>{if(d.balance<=0)return d;const p=Math.min(d.min,d.balance);rem-=p;return{...d,balance:Math.max(0,d.balance-p)};});
    [...bal].filter(d=>d.balance>0).sort((a,b)=>method==="snowball"?a.balance-b.balance:b.apr-a.apr).forEach(t=>{
      if(rem<=0)return;const i=bal.findIndex(d=>d.id===t.id);const p=Math.min(rem,bal[i].balance);bal[i]={...bal[i],balance:bal[i].balance-p};rem-=p;
    });
  }
  return{months:month,totalInterest:interest};
}

function buildAmort(debts,extra,method="avalanche"){
  if(!debts.length)return[];
  let bal=debts.map(d=>({...d}));
  const sch=debts.map(d=>({id:d.id,name:d.name,apr:d.apr,rows:[]}));
  let month=0;
  while(bal.some(d=>d.balance>0)&&month<600){
    month++;let rem=extra;
    bal=bal.map((d,i)=>{
      if(d.balance<=0)return d;
      const interest=(d.balance*(d.apr/100))/12;const bwi=d.balance+interest;const pay=Math.min(d.min,bwi);rem-=pay;
      const newBal=Math.max(0,bwi-pay);
      sch[i].rows.push({month,interest,principal:Math.max(0,pay-interest),payment:pay,balance:newBal,extra:0});
      return{...d,balance:newBal};
    });
    [...bal].filter(d=>d.balance>0).sort((a,b)=>method==="snowball"?a.balance-b.balance:b.apr-a.apr).forEach(t=>{
      if(rem<=0)return;
      const idx=bal.findIndex(d=>d.id===t.id);const si=sch.findIndex(s=>s.id===t.id);
      const ex=Math.min(rem,bal[idx].balance);bal[idx]={...bal[idx],balance:bal[idx].balance-ex};
      if(sch[si].rows.length){const lr=sch[si].rows[sch[si].rows.length-1];lr.extra+=ex;lr.payment+=ex;lr.balance=bal[idx].balance;}
      rem-=ex;
    });
  }
  return sch;
}

function allocate(income,debts,buckets,bills){
  const totalBills=bills.reduce((s,b)=>s+b.amount,0);
  const totalMins=debts.reduce((s,d)=>s+d.min,0);
  const leftover=income-totalBills-totalMins;
  const totalBucketTarget=buckets.reduce((s,b)=>s+b.monthly,0);
  const bucketFund=Math.min(Math.max(0,leftover)*0.4,totalBucketTarget);
  const extraDebt=Math.max(0,leftover-bucketFund);
  return{totalBills,totalMins,leftover,bucketFund,extraDebt};
}

function projectGrowth(monthly,years,r=0.10){
  const pts=[];let bal=0;const mr=r/12;
  for(let m=0;m<=years*12;m++){if(m>0)bal=bal*(1+mr)+monthly;if(m%12===0)pts.push({year:m/12,value:Math.round(bal)});}
  return pts;
}

function getBracket(income){
  const a=income*12;
  if(a<=11600)return{rate:10,label:"10%"};if(a<=47150)return{rate:12,label:"12%"};
  if(a<=100525)return{rate:22,label:"22%"};if(a<=191950)return{rate:24,label:"24%"};
  if(a<=243725)return{rate:32,label:"32%"};if(a<=609350)return{rate:35,label:"35%"};
  return{rate:37,label:"37%"};
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESETS
// ─────────────────────────────────────────────────────────────────────────────
const PD=[{id:1,name:"Credit Card A",balance:4200,apr:22.9,min:120},{id:2,name:"Auto Loan",balance:11500,apr:6.5,min:285},{id:3,name:"Personal Loan",balance:7800,apr:14.2,min:195}];
const PBL=[{id:7,name:"Rent / Mortgage",amount:1450,category:"Housing"},{id:8,name:"Utilities",amount:180,category:"Housing"},{id:9,name:"Subscriptions",amount:65,category:"Lifestyle"}];
const PBK=[{id:4,name:"Emergency Fund",monthly:300,color:C.blue},{id:5,name:"Vacation",monthly:150,color:C.purple},{id:6,name:"Home Repair",monthly:100,color:C.warn}];
const PA=[{id:11,name:"Checking / Savings",value:3200,category:"Cash"},{id:12,name:"401(k) / IRA",value:28000,category:"Retirement"},{id:13,name:"Home Equity",value:45000,category:"Real Estate"}];
let NID=20;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const S={
  app:{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif",overflowX:"hidden"},
  hero:{background:`radial-gradient(ellipse 80% 60% at 50% -10%,#00e5a015 0%,transparent 70%)`,borderBottom:`1px solid ${C.border}`,padding:"52px 24px 36px",textAlign:"center"},
  badge:{display:"inline-block",background:C.accentDim,border:`1px solid ${C.accentBorder}`,color:C.accent,fontSize:"11px",fontWeight:700,letterSpacing:"2px",textTransform:"uppercase",borderRadius:"100px",padding:"4px 14px",marginBottom:"16px"},
  h1:{fontSize:"clamp(30px,5vw,58px)",fontWeight:800,lineHeight:1.05,margin:"0 0 12px",letterSpacing:"-1.5px"},
  sub:{fontSize:"16px",color:C.muted,maxWidth:"480px",margin:"0 auto 24px",lineHeight:1.6},
  chips:{display:"flex",justifyContent:"center",gap:"5px",flexWrap:"wrap"},
  chip:(a,d)=>({padding:"5px 13px",borderRadius:"100px",fontSize:"12px",fontWeight:600,background:d?C.accent:a?C.accentDim:C.surface,border:`1px solid ${d?C.accent:a?C.accentBorder:C.border}`,color:d?C.bg:a?C.accent:C.muted,transition:"all 0.3s",cursor:d?"pointer":"default"}),
  main:{maxWidth:"860px",margin:"0 auto",padding:"32px 20px 80px"},
  card:{background:C.card,border:`1px solid ${C.border}`,borderRadius:"16px",padding:"22px",marginBottom:"18px"},
  cTitle:{fontSize:"11px",fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",color:C.muted,marginBottom:"14px"},
  label:{fontSize:"12px",color:C.muted,marginBottom:"5px",fontWeight:500},
  input:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"10px",padding:"10px 14px",color:C.text,fontSize:"14px",width:"100%",outline:"none",fontFamily:"inherit",boxSizing:"border-box"},
  inputSm:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"9px",padding:"7px 11px",color:C.text,fontSize:"13px",width:"100%",outline:"none",fontFamily:"inherit",boxSizing:"border-box"},
  btnP:{background:C.accent,color:C.bg,border:"none",borderRadius:"12px",padding:"12px 24px",fontSize:"14px",fontWeight:700,cursor:"pointer",width:"100%",fontFamily:"inherit"},
  btnS:{background:"transparent",color:C.accent,border:`1px solid ${C.accentBorder}`,borderRadius:"12px",padding:"10px 20px",fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  btnD:{background:"transparent",color:C.warn,border:`1px solid #ff6b3530`,borderRadius:"8px",padding:"4px 10px",fontSize:"12px",cursor:"pointer"},
  btnAdd:{background:C.accentDim,color:C.accent,border:`1px solid ${C.accentBorder}`,borderRadius:"9px",padding:"6px 14px",fontSize:"12px",fontWeight:600,cursor:"pointer",marginTop:"6px"},
  navRow:{display:"flex",gap:"10px",marginTop:"18px"},
  sg:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:"10px",marginBottom:"18px"},
  stat:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"12px",padding:"14px"},
  sLabel:{fontSize:"10px",color:C.muted,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"5px"},
  sVal:{fontSize:"22px",fontWeight:800,letterSpacing:"-0.5px"},
  bar:{height:"6px",borderRadius:"100px",background:C.subtle,overflow:"hidden",marginTop:"5px"},
  bFill:(w,c)=>({height:"100%",width:`${Math.min(100,w)}%`,background:c||C.accent,borderRadius:"100px",transition:"width 0.8s ease"}),
  allocBar:{borderRadius:"9px",overflow:"hidden",height:"34px",display:"flex",marginBottom:"9px"},
  allocSeg:(p,c)=>({width:`${p}%`,background:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:700,color:C.bg,overflow:"hidden",whiteSpace:"nowrap",padding:"0 3px",transition:"width 0.8s ease"}),
  pill:(c)=>({display:"inline-block",background:`${c}20`,border:`1px solid ${c}40`,color:c,borderRadius:"100px",padding:"2px 8px",fontSize:"10px",fontWeight:700}),
  debtRow:{display:"grid",gridTemplateColumns:"2fr 1.2fr 1fr 1fr auto",gap:"7px",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`},
  bRow4:{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:"7px",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`},
  bRow3:{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr auto",gap:"7px",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`},
  tog:(a)=>({padding:"6px 13px",fontSize:"12px",fontWeight:700,cursor:"pointer",border:"none",background:a?C.accent:C.surface,color:a?C.bg:C.muted,transition:"all 0.2s",fontFamily:"inherit"}),
  fooItem:{display:"flex",gap:"13px",position:"relative",zIndex:1},
  fooCircle:(done,color)=>({width:"38px",height:"38px",borderRadius:"50%",flexShrink:0,background:done?C.accent:C.surface,border:`2px solid ${done?C.accent:color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"14px"}),
  fooBody:(done)=>({flex:1,borderRadius:"10px",padding:"10px 12px",background:done?`${C.accent}08`:C.surface,border:`1px solid ${done?C.accentBorder:C.border}`}),
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFETTI
// ─────────────────────────────────────────────────────────────────────────────
function Confetti(){
  const pieces=Array.from({length:36},(_,i)=>({id:i,x:Math.random()*100,delay:Math.random()*1.5,color:[C.accent,C.blue,C.purple,C.warn,C.green2][i%5],size:5+Math.random()*7}));
  return(
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:999,overflow:"hidden"}}>
      {pieces.map(p=>(
        <div key={p.id} style={{position:"absolute",left:`${p.x}%`,top:"-20px",width:p.size,height:p.size,borderRadius:"2px",background:p.color,animation:`fall 2.5s ${p.delay}s ease-in forwards`}}/>
      ))}
      <style>{`@keyframes fall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(360deg);opacity:0}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYGATE
// ─────────────────────────────────────────────────────────────────────────────
function Paygate({children,feature,unlocked,onUnlock}){
  const [em,setEm]=useState("");
  if(unlocked)return children;
  return(
    <div style={{...S.card,border:`1px solid ${C.purple}50`,background:`linear-gradient(135deg,${C.card},#1a1a2e)`,textAlign:"center",padding:"28px"}}>
      <div style={{fontSize:"28px",marginBottom:"10px"}}>🔒</div>
      <div style={{fontSize:"15px",fontWeight:700,marginBottom:"7px"}}>{feature}</div>
      <p style={{fontSize:"12px",color:C.muted,margin:"0 0 18px",maxWidth:"340px",marginLeft:"auto",marginRight:"auto"}}>Enter your email to unlock this feature and all premium tools — free during early access.</p>
      <div style={{display:"flex",gap:"7px",maxWidth:"360px",margin:"0 auto"}}>
        <input style={{...S.input,flex:1,padding:"8px 11px",fontSize:"13px"}} type="email" placeholder="your@email.com" value={em} onChange={e=>setEm(e.target.value)} onKeyDown={e=>e.key==="Enter"&&em&&onUnlock()}/>
        <button style={{background:C.purple,color:"#fff",border:"none",borderRadius:"9px",padding:"8px 14px",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontSize:"13px",fontFamily:"inherit"}} onClick={()=>em&&onUnlock()}>Unlock Free</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App(){
  const [step,setStep]=useState(0);
  const [income,setIncome]=useState("5800");
  const [bills,setBills]=useState(PBL);
  const [debts,setDebts]=useState(PD);
  const [buckets,setBuckets]=useState(PBK);
  const [assets,setAssets]=useState(PA);
  const [email,setEmail]=useState("");
  const [subscribed,setSubscribed]=useState(false);
  const [animating,setAnimating]=useState(false);
  const [expandedDebt,setExpandedDebt]=useState(null);
  const [amortView,setAmortView]=useState("autopilot");
  const [debtMethod,setDebtMethod]=useState("avalanche");
  const [saveStatus,setSaveStatus]=useState("idle");
  const [confetti,setConfetti]=useState(false);
  const [unlocked,setUnlocked]=useState(false);
  const [showWI,setShowWI]=useState(false);
  const [wi,setWi]=useState({lumpSum:0,extraMonthly:0,extraIncome:0,rateReduction:0});
  const [projYears,setProjYears]=useState(20);
  const [biweekly,setBiweekly]=useState(false);
  const [legalOk,setLegalOk]=useState(false);

  // ── Persistence ─────────────────────────────────────────────────────────
  useEffect(()=>{
    try{const s=localStorage.getItem("apm_v2");if(s){const p=JSON.parse(s);if(p.income)setIncome(p.income);if(p.bills)setBills(p.bills);if(p.debts)setDebts(p.debts);if(p.buckets)setBuckets(p.buckets);if(p.assets)setAssets(p.assets);if(p.debtMethod)setDebtMethod(p.debtMethod);if(p.unlocked)setUnlocked(true);setSaveStatus("loaded");setTimeout(()=>setSaveStatus("idle"),3000);}}catch(e){}
  },[]);
  useEffect(()=>{
    const t=setTimeout(()=>{try{localStorage.setItem("apm_v2",JSON.stringify({income,bills,debts,buckets,assets,debtMethod,unlocked,savedAt:Date.now()}));setSaveStatus("saved");setTimeout(()=>setSaveStatus("idle"),2000);}catch(e){}},800);
    return()=>clearTimeout(t);
  },[income,bills,debts,buckets,assets,debtMethod,unlocked]);

  const go=n=>{setAnimating(true);setTimeout(()=>{setStep(n);setAnimating(false);window.scrollTo(0,0);},200);};
  const celebrate=()=>{setConfetti(true);setTimeout(()=>setConfetti(false),3000);};

  // ── Core calcs ──────────────────────────────────────────────────────────
  const incNum=parseFloat(income.replace(/[^0-9.]/g,""))||0;
  const {totalBills,totalMins,leftover,bucketFund,extraDebt}=allocate(incNum,debts,buckets,bills);
  const baseP=calcPayoff(debts,totalMins,debtMethod);
  const apP=calcPayoff(debts,totalMins+extraDebt,debtMethod);
  const avP=calcPayoff(debts,totalMins+extraDebt,"avalanche");
  const sbP=calcPayoff(debts,totalMins+extraDebt,"snowball");
  const mSaved=baseP.months-apP.months;
  const iSaved=baseP.totalInterest-apP.totalInterest;
  const totalDebt=debts.reduce((s,d)=>s+d.balance,0);
  const totalAssets=assets.reduce((s,a)=>s+a.value,0);
  const netWorth=totalAssets-totalDebt;
  const apSch=buildAmort(debts,totalMins+extraDebt,debtMethod);
  const minSch=buildAmort(debts,totalMins,debtMethod);
  const bracket=getBracket(incNum);
  const shouldRoth=bracket.rate<=22;
  const biInc=incNum/2;
  const dfDate=(()=>{const d=new Date();d.setMonth(d.getMonth()+apP.months);return d;})();
  const dfStr=`${MO[dfDate.getMonth()]} ${dfDate.getFullYear()}`;
  const freedCash=totalMins+extraDebt;
  const projPts=projectGrowth(freedCash,projYears);
  const iPct=incNum>0?{bills:(totalBills/incNum)*100,debt:(totalMins/incNum)*100,extra:(extraDebt/incNum)*100,bucket:(bucketFund/incNum)*100,free:((incNum-totalBills-totalMins-extraDebt-bucketFund)/incNum)*100}:{bills:0,debt:0,extra:0,bucket:0,free:0};

  // What-If
  const wiExtra=(wi.extraIncome||0)+(wi.extraMonthly||0);
  const wiDebts=(()=>{let rem=wi.lumpSum||0;return[...debts].sort((a,b)=>b.apr-a.apr).map(d=>{const ap=Math.min(rem,d.balance);rem-=ap;return{...d,apr:Math.max(0,d.apr-(wi.rateReduction||0)),balance:Math.max(0,d.balance-ap)};}).filter(d=>d.balance>0);})();
  const wiP=calcPayoff(wiDebts,totalMins+extraDebt+wiExtra,debtMethod);
  const wiMo=apP.months-wiP.months;
  const wiIn=apP.totalInterest-wiP.totalInterest;

  // Bill category targets
  const TGTS={Housing:{max:28,ideal:25,tip:"Rent/mortgage, HOA, insurance."},Transportation:{max:15,ideal:10,tip:"Car, gas, insurance, maintenance."},Food:{max:12,ideal:10,tip:"Groceries + dining."},Utilities:{max:8,ideal:5,tip:"Electric, gas, water, internet, phone."},Insurance:{max:8,ideal:5,tip:"Health, life, disability."},Lifestyle:{max:10,ideal:5,tip:"Subscriptions, entertainment, gym."},Healthcare:{max:8,ideal:4,tip:"Copays, prescriptions."},Other:{max:5,ideal:3,tip:"Everything else."}};
  const SC={good:C.accent,warn:"#f0c040",over:C.warn,neutral:C.muted};
  const SI={good:"✓",warn:"!",over:"↑",neutral:"·"};
  const getStatus=(cat,amt)=>{if(!incNum)return"neutral";const p=(amt/incNum)*100;const t=TGTS[cat]||TGTS.Other;return p<=t.max*0.85?"good":p<=t.max?"warn":"over";};

  // FOO data
  const me=totalBills+totalMins;
  const hiD=debts.filter(d=>d.apr>=7);const loD=debts.filter(d=>d.apr<7);
  const FOO=[
    {n:1,ic:"🛡️",c:C.accent,t:"1-Month Starter Emergency Fund",w:"Your financial airbag — without it, any surprise sends you back into debt.",tgt:incNum>0?`${fmt(me)} in HYSA`:"1× monthly expenses",act:`Build to ${fmt(me)} in a high-yield savings account first.`,aff:{n:"Marcus by Goldman Sachs",u:"https://www.marcus.com",note:"Top-rated HYSA rate"}},
    {n:2,ic:"🏢",c:C.blue,t:"Capture Full 401(k) Employer Match",w:"An instant 50–100% return. No investment competes with free money.",tgt:"Min contribution to unlock full match",act:"Set your 401(k) contribution to at least the match threshold today.",aff:{n:"Fidelity",u:"https://www.fidelity.com",note:"Low-cost index funds"}},
    {n:3,ic:"🔥",c:C.warn,t:"Pay Off High-Interest Debt (7%+ APR)",w:"Eliminating 22% credit card debt is a guaranteed 22% return.",tgt:hiD.length?hiD.map(d=>`${d.name} (${d.apr}%)`).join(", "):"No high-interest debt",act:hiD.length?`Attack ${hiD[0].name} first using ${debtMethod}.`:"You're clear — move to step 4.",done:!hiD.length},
    {n:4,ic:"☔",c:C.teal,t:"Fully Funded Rainy Day Fund (3–6 Months)",w:"Job loss, medical emergency — 3–6 months of expenses means you never have to panic.",tgt:incNum>0?`${fmt(me*3)}–${fmt(me*6)}`:"3–6× monthly expenses",act:"Keep building your HYSA. 3 months if stable; 6 months if variable income."},
    {n:5,ic:"📈",c:C.purple,t:"Max Roth IRA",w:"Tax-free growth forever — no taxes on gains, ever.",tgt:"$7,000/yr · $583/mo",act:"Open at Fidelity or Vanguard. Invest in FSKAX or VTI. Automate monthly.",aff:{n:"Fidelity Roth IRA",u:"https://www.fidelity.com/open-account/roth-ira",note:"Commission-free index funds"},tax:shouldRoth?null:`Your ${bracket.label} bracket may favor Traditional IRA — consult a tax professional.`},
    {n:6,ic:"🏥",c:C.amber,t:"Max HSA (if on HDHP)",w:"Triple tax advantage: deductible in, tax-free growth, tax-free out for medical.",tgt:"$4,150/yr individual · $8,300/yr family",act:"Invest your HSA — don't spend it. Pay medical out of pocket now.",aff:{n:"Fidelity HSA",u:"https://www.fidelity.com/go/hsa",note:"No fees, invest in index funds"}},
    {n:7,ic:"💳",c:C.orange,t:"Pay Off Remaining Debt",w:"Any debt is a guaranteed negative return. Clear it before investing more.",tgt:loD.length?loD.map(d=>`${d.name} (${d.apr}%)`).join(", "):"No remaining debt",act:loD.length?"Redirect freed minimums to accelerate the next debt.":"Debt-free! Move to step 8.",done:!loD.length},
    {n:8,ic:"🏦",c:C.blue,t:"Max 401(k) Contributions",w:"Fill the tank. Pre-tax contributions lower your taxable income today.",tgt:"$23,500/yr (2026 limit) · $1,958/mo",act:"Increase your 401(k) to the IRS annual limit. Low-cost index funds only.",tax:!shouldRoth?`At ${bracket.label}, maxing traditional 401(k) saves ${fmt(23500*(bracket.rate/100))}/yr in taxes.`:null},
    {n:9,ic:"🎓",c:C.green2,t:"529 College Savings (if applicable)",w:"Tax-free growth for education. State deductions may apply.",tgt:"Up to $18,000/yr per beneficiary",act:"Open at Utah my529 or your state's plan. Age-based index fund portfolios.",aff:{n:"Utah my529",u:"https://my529.org",note:"Top-rated, low-cost 529"}},
    {n:10,ic:"💼",c:C.accent,t:"Taxable Brokerage Account",w:"No limits, no restrictions. Build long-term wealth or leave a legacy.",tgt:"Whatever remains after steps 1–9",act:"Fidelity, Vanguard, or Schwab. VTI, SCHD, or VOO. Automate and ignore.",aff:{n:"Fidelity Brokerage",u:"https://www.fidelity.com",note:"Commission-free, no minimums"}},
  ];

  const SLABELS=["Overview","Income","Bills","Debts","Buckets","Net Worth","Results"];

  return(
    <div style={S.app}>
      {confetti&&<Confetti/>}

      {/* HERO */}
      <div style={S.hero}>
        <div style={S.badge}>Early Access Demo</div>
        <h1 style={S.h1}>Your money,<br/><span style={{color:C.accent}}>on autopilot.</span></h1>
        <p style={S.sub}>Enter your income, debts, and goals. AutoPilot Money builds your personalized financial roadmap and allocates every dollar automatically.</p>
        <div style={S.chips}>
          {SLABELS.map((s,i)=>(
            <div key={s} style={S.chip(step===i,step>i)} onClick={()=>step>i&&go(i)}>{step>i?"✓ ":""}{s}</div>
          ))}
          <div style={S.chip(step===7,false)}>Subscribe</div>
        </div>
        {saveStatus!=="idle"&&<div style={{marginTop:"8px",fontSize:"12px",color:saveStatus==="loaded"?C.blue:C.accent}}>{saveStatus==="saved"?"✓ Plan auto-saved":"↩ Previous plan restored"}</div>}
      </div>

      <div style={{...S.main,opacity:animating?0:1,transition:"opacity 0.2s"}}>

        {/* ═══ STEP 0: OVERVIEW ═══════════════════════════════════════════ */}
        {step===0&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:"12px",marginBottom:"18px"}}>
              {[{ic:"🗺️",t:"10-Step Roadmap",d:"Proven financial order of operations — personalized to your income and debts."},{ic:"⚡",t:"AutoPilot Allocation",d:"Every dollar routed automatically to bills, debt payoff, and savings."},{ic:"🔥",t:"Debt Payoff Engine",d:"Avalanche or snowball with exact payoff dates and amortization tables."},{ic:"✨",t:"What-If Modeler",d:"Model raises, lump sums, or balance transfers — instant impact analysis."},{ic:"📊",t:"Net Worth Tracker",d:"Assets minus liabilities. Watch your net worth climb as debt falls."},{ic:"🚀",t:"Investment Projection",d:"After debt-free, see your freed cash compound over 10–30 years."}].map(f=>(
                <div key={f.t} style={S.card}>
                  <div style={{fontSize:"24px",marginBottom:"7px"}}>{f.ic}</div>
                  <div style={{fontSize:"13px",fontWeight:700,marginBottom:"4px"}}>{f.t}</div>
                  <div style={{fontSize:"12px",color:C.muted,lineHeight:1.6}}>{f.d}</div>
                </div>
              ))}
            </div>
            <div style={{...S.card,display:"flex",gap:"20px",flexWrap:"wrap",justifyContent:"center",padding:"18px 20px"}}>
              {[{s:"10",l:"Steps to freedom"},{s:"2 min",l:"To build your plan"},{s:"$0",l:"To get started"},{s:"100%",l:"Personalized"}].map(s=>(
                <div key={s.l} style={{textAlign:"center"}}><div style={{fontSize:"20px",fontWeight:800,color:C.accent}}>{s.s}</div><div style={{fontSize:"11px",color:C.muted,marginTop:"2px"}}>{s.l}</div></div>
              ))}
            </div>
            <button style={S.btnP} onClick={()=>go(1)}>Build My Free Plan →</button>
            <p style={{textAlign:"center",fontSize:"11px",color:C.muted,marginTop:"8px"}}>2 minutes · No account required · Data stays in your browser</p>
          </div>
        )}

        {/* ═══ STEP 1: INCOME ═════════════════════════════════════════════ */}
        {step===1&&(
          <div>
            <div style={S.card}>
              <div style={S.cTitle}>Monthly Take-Home Income</div>
              <div style={S.label}>After-tax monthly income</div>
              <input style={S.input} value={income} onChange={e=>setIncome(e.target.value)} placeholder="e.g. 5800" type="number"/>
              <p style={{fontSize:"12px",color:C.muted,margin:"8px 0 0"}}>Include all sources: salary, pension, rental, side income.</p>
              {incNum>0&&(
                <div style={{marginTop:"14px",padding:"12px 14px",background:C.surface,borderRadius:"10px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                  <div><div style={{fontSize:"10px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px"}}>Est. Tax Bracket</div><div style={{fontSize:"15px",fontWeight:800,color:C.warn,marginTop:"2px"}}>{bracket.label}</div></div>
                  <div><div style={{fontSize:"10px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px"}}>Roth vs. Traditional</div><div style={{fontSize:"13px",fontWeight:700,color:shouldRoth?C.accent:C.blue,marginTop:"2px"}}>{shouldRoth?"✓ Roth Recommended":"Traditional Priority"}</div></div>
                  <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",gap:"8px"}}>
                    <div onClick={()=>setBiweekly(!biweekly)} style={{width:"34px",height:"19px",borderRadius:"100px",background:biweekly?C.accent:C.subtle,cursor:"pointer",position:"relative",transition:"background 0.2s"}}>
                      <div style={{position:"absolute",top:"2.5px",left:biweekly?"17px":"3px",width:"14px",height:"14px",borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
                    </div>
                    <span style={{fontSize:"12px",color:C.muted}}>I get paid biweekly {biweekly?`(${fmt(biInc)}/paycheck)`:""}</span>
                  </div>
                </div>
              )}
            </div>
            <button style={S.btnP} onClick={()=>go(2)}>Next: Add Your Bills →</button>
          </div>
        )}

        {/* ═══ STEP 2: BILLS ══════════════════════════════════════════════ */}
        {step===2&&(()=>{
          const tbn=bills.reduce((s,b)=>s+b.amount,0);
          const byCat={};bills.forEach(b=>{byCat[b.category]=(byCat[b.category]||0)+b.amount;});
          return(
            <div>
              <div style={S.card}>
                <div style={S.cTitle}>Monthly Bills</div>
                <p style={{fontSize:"12px",color:C.muted,margin:"0 0 12px"}}>Fixed expenses carved out before debt or savings. Benchmarked against proven financial targets.</p>
                <div style={{overflowX:"auto"}}>
                  <div style={{...S.bRow3,borderBottom:`1px solid ${C.subtle}`}}>{["Bill Name","Category","Amount",""].map(h=><div key={h} style={{fontSize:"10px",color:C.muted,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase"}}>{h}</div>)}</div>
                  {bills.map(b=>(
                    <div key={b.id} style={S.bRow3}>
                      <input style={S.inputSm} value={b.name} onChange={e=>setBills(bills.map(x=>x.id===b.id?{...x,name:e.target.value}:x))}/>
                      <select style={{...S.inputSm,cursor:"pointer"}} value={b.category} onChange={e=>setBills(bills.map(x=>x.id===b.id?{...x,category:e.target.value}:x))}>
                        {Object.keys(TGTS).map(c=><option key={c}>{c}</option>)}
                      </select>
                      <input style={S.inputSm} type="number" value={b.amount} onChange={e=>setBills(bills.map(x=>x.id===b.id?{...x,amount:parseFloat(e.target.value)||0}:x))}/>
                      <button style={S.btnD} onClick={()=>setBills(bills.filter(x=>x.id!==b.id))}>✕</button>
                    </div>
                  ))}
                </div>
                <button style={S.btnAdd} onClick={()=>setBills([...bills,{id:NID++,name:"New Bill",amount:0,category:"Other"}])}>+ Add Bill</button>
                <div style={{marginTop:"12px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                  <div style={{padding:"9px 12px",background:C.surface,borderRadius:"9px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"12px",color:C.muted}}>Total Bills</span><span style={{fontWeight:800,color:C.green2}}>{fmt(tbn)}</span></div>
                  <div style={{padding:"9px 12px",background:C.surface,borderRadius:"9px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"12px",color:C.muted}}>After Bills</span><span style={{fontWeight:800,color:C.accent}}>{fmt(Math.max(0,incNum-tbn))}</span></div>
                </div>
              </div>
              <div style={S.card}>
                <div style={S.cTitle}>Category Health Check</div>
                <p style={{fontSize:"11px",color:C.muted,margin:"0 0 14px"}}>Based on {fmt(incNum)}/mo · Green = on track · Yellow = caution · Red = over limit</p>
                {Object.entries(TGTS).map(([cat,t])=>{
                  const sp=byCat[cat]||0;const pct=incNum>0?(sp/incNum)*100:0;const fill=Math.min(100,(pct/(t.max||1))*100);const st=getStatus(cat,sp);const sc=SC[st];
                  return(
                    <div key={cat} style={{marginBottom:"12px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"3px",flexWrap:"wrap",gap:"3px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                          <span style={{width:"16px",height:"16px",borderRadius:"4px",background:`${sc}20`,border:`1px solid ${sc}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",fontWeight:800,color:sc,flexShrink:0}}>{SI[st]}</span>
                          <span style={{fontSize:"12px",fontWeight:600}}>{cat}</span>
                          <span style={{fontSize:"10px",color:C.muted}}>{t.tip}</span>
                        </div>
                        <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                          <span style={{fontSize:"10px",color:C.muted}}>Target: <strong style={{color:C.text}}>{t.ideal}–{t.max}%</strong></span>
                          <span style={{fontSize:"11px",fontWeight:700,color:sp>0?sc:C.muted}}>{sp>0?`${fmt(sp)} (${pct.toFixed(1)}%)`:"—"}</span>
                        </div>
                      </div>
                      <div style={S.bar}><div style={S.bFill(fill,sc)}/></div>
                    </div>
                  );
                })}
                {incNum>0&&(()=>{
                  const tp=(tbn/incNum)*100;const os=tp<=55?"good":tp<=65?"warn":"over";const oc=SC[os];
                  return<div style={{marginTop:"6px",padding:"10px 12px",background:`${oc}10`,border:`1px solid ${oc}30`,borderRadius:"9px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><div style={{fontSize:"11px",fontWeight:700,color:oc}}>{os==="good"?"✓ Healthy":os==="warn"?"! Spending is Tight":"↑ Too High"}</div><div style={{fontSize:"11px",color:C.muted}}>{tp.toFixed(1)}% of income · Target: under 55%</div></div>
                    <span style={{fontSize:"16px",fontWeight:800,color:oc}}>{fmt(tbn)}</span>
                  </div>;
                })()}
              </div>
              <div style={S.navRow}>
                <button style={S.btnS} onClick={()=>go(1)}>← Back</button>
                <button style={{...S.btnP,flex:1}} onClick={()=>go(3)}>Next: Add Your Debts →</button>
              </div>
            </div>
          );
        })()}

        {/* ═══ STEP 3: DEBTS ══════════════════════════════════════════════ */}
        {step===3&&(
          <div>
            <div style={S.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px",flexWrap:"wrap",gap:"7px"}}>
                <div style={S.cTitle}>Your Debts</div>
                <div style={{display:"flex",gap:0,borderRadius:"9px",overflow:"hidden",border:`1px solid ${C.border}`}}>
                  {[{v:"avalanche",l:"🔥 Avalanche"},{v:"snowball",l:"⛄ Snowball"}].map(m=><button key={m.v} onClick={()=>setDebtMethod(m.v)} style={S.tog(debtMethod===m.v)}>{m.l}</button>)}
                </div>
              </div>
              <div style={{marginBottom:"12px",padding:"10px 12px",borderRadius:"9px",background:debtMethod==="avalanche"?`${C.warn}10`:`${C.blue}10`,border:`1px solid ${debtMethod==="avalanche"?C.warn+"30":C.blue+"30"}`}}>
                <p style={{margin:0,fontSize:"12px",color:C.text,lineHeight:1.6}}>{debtMethod==="avalanche"?<><strong style={{color:C.warn}}>🔥 Avalanche:</strong> Highest APR first — minimizes total interest.</>:<><strong style={{color:C.blue}}>⛄ Snowball:</strong> Smallest balance first — builds momentum through quick wins.</>}</p>
              </div>
              <div style={{overflowX:"auto"}}>
                <div style={{...S.debtRow,borderBottom:`1px solid ${C.subtle}`}}>{["Name","Balance","APR %","Min Payment",""].map(h=><div key={h} style={{fontSize:"10px",color:C.muted,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase"}}>{h}</div>)}</div>
                {debts.map(d=>(
                  <div key={d.id} style={S.debtRow}>
                    <input style={S.inputSm} value={d.name} onChange={e=>setDebts(debts.map(x=>x.id===d.id?{...x,name:e.target.value}:x))}/>
                    <input style={S.inputSm} type="number" value={d.balance} onChange={e=>{const v=parseFloat(e.target.value)||0;if(v===0)celebrate();setDebts(debts.map(x=>x.id===d.id?{...x,balance:v}:x));}}/>
                    <input style={S.inputSm} type="number" value={d.apr} onChange={e=>setDebts(debts.map(x=>x.id===d.id?{...x,apr:parseFloat(e.target.value)||0}:x))}/>
                    <input style={S.inputSm} type="number" value={d.min} onChange={e=>setDebts(debts.map(x=>x.id===d.id?{...x,min:parseFloat(e.target.value)||0}:x))}/>
                    <button style={S.btnD} onClick={()=>{celebrate();setDebts(debts.filter(x=>x.id!==d.id));}}>✕</button>
                  </div>
                ))}
              </div>
              <button style={S.btnAdd} onClick={()=>setDebts([...debts,{id:NID++,name:"New Debt",balance:0,apr:0,min:0}])}>+ Add Debt</button>
              <div style={{marginTop:"12px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                <div style={{padding:"9px 12px",background:C.surface,borderRadius:"9px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"12px",color:C.muted}}>Total Debt</span><span style={{fontWeight:800,color:C.warn}}>{fmt(totalDebt)}</span></div>
                <div style={{padding:"9px 12px",background:C.surface,borderRadius:"9px",display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"12px",color:C.muted}}>Strategy</span><span style={{fontWeight:800,color:debtMethod==="avalanche"?C.warn:C.blue}}>{debtMethod==="avalanche"?"🔥 Avalanche":"⛄ Snowball"}</span></div>
              </div>
            </div>
            <div style={S.navRow}>
              <button style={S.btnS} onClick={()=>go(2)}>← Back</button>
              <button style={{...S.btnP,flex:1}} onClick={()=>go(4)}>Next: Savings Buckets →</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 4: BUCKETS ════════════════════════════════════════════ */}
        {step===4&&(
          <div>
            <div style={S.card}>
              <div style={S.cTitle}>Savings Buckets</div>
              <p style={{fontSize:"12px",color:C.muted,margin:"0 0 12px"}}>Monthly savings targets funded automatically from leftover income after bills and debt.</p>
              <div style={{overflowX:"auto"}}>
                <div style={{...S.bRow4,borderBottom:`1px solid ${C.subtle}`}}>{["Bucket","Monthly","Annual",""].map(h=><div key={h} style={{fontSize:"10px",color:C.muted,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase"}}>{h}</div>)}</div>
                {buckets.map(b=>(
                  <div key={b.id} style={S.bRow4}>
                    <input style={S.inputSm} value={b.name} onChange={e=>setBuckets(buckets.map(x=>x.id===b.id?{...x,name:e.target.value}:x))}/>
                    <input style={S.inputSm} type="number" value={b.monthly} onChange={e=>setBuckets(buckets.map(x=>x.id===b.id?{...x,monthly:parseFloat(e.target.value)||0}:x))}/>
                    <div style={{fontSize:"12px",color:C.muted}}>{fmt(b.monthly*12)}</div>
                    <button style={S.btnD} onClick={()=>setBuckets(buckets.filter(x=>x.id!==b.id))}>✕</button>
                  </div>
                ))}
              </div>
              <button style={S.btnAdd} onClick={()=>setBuckets([...buckets,{id:NID++,name:"New Bucket",monthly:0,color:C.purple}])}>+ Add Bucket</button>
            </div>
            <div style={S.navRow}>
              <button style={S.btnS} onClick={()=>go(3)}>← Back</button>
              <button style={{...S.btnP,flex:1}} onClick={()=>go(5)}>Next: Net Worth →</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 5: NET WORTH ══════════════════════════════════════════ */}
        {step===5&&(
          <div>
            <div style={S.card}>
              <div style={S.cTitle}>Your Assets</div>
              <p style={{fontSize:"12px",color:C.muted,margin:"0 0 12px"}}>What you own. Combined with your debts, this gives your net worth.</p>
              <div style={{overflowX:"auto"}}>
                <div style={{...S.bRow3,borderBottom:`1px solid ${C.subtle}`}}>{["Asset Name","Category","Value",""].map(h=><div key={h} style={{fontSize:"10px",color:C.muted,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase"}}>{h}</div>)}</div>
                {assets.map(a=>(
                  <div key={a.id} style={S.bRow3}>
                    <input style={S.inputSm} value={a.name} onChange={e=>setAssets(assets.map(x=>x.id===a.id?{...x,name:e.target.value}:x))}/>
                    <select style={{...S.inputSm,cursor:"pointer"}} value={a.category} onChange={e=>setAssets(assets.map(x=>x.id===a.id?{...x,category:e.target.value}:x))}>
                      {["Cash","Checking/Savings","Retirement","Brokerage","Real Estate","Vehicle","Other"].map(c=><option key={c}>{c}</option>)}
                    </select>
                    <input style={S.inputSm} type="number" value={a.value} onChange={e=>setAssets(assets.map(x=>x.id===a.id?{...x,value:parseFloat(e.target.value)||0}:x))}/>
                    <button style={S.btnD} onClick={()=>setAssets(assets.filter(x=>x.id!==a.id))}>✕</button>
                  </div>
                ))}
              </div>
              <button style={S.btnAdd} onClick={()=>setAssets([...assets,{id:NID++,name:"New Asset",value:0,category:"Other"}])}>+ Add Asset</button>
            </div>
            <div style={{...S.card,background:`linear-gradient(135deg,${C.card},#1a1a2e)`,border:`1px solid ${netWorth>=0?C.accentBorder:C.warn+"40"}`}}>
              <div style={S.cTitle}>Net Worth Snapshot</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:"10px",marginBottom:"14px"}}>
                {[{l:"Total Assets",v:fmt(totalAssets),c:C.accent},{l:"Total Debt",v:fmt(totalDebt),c:C.warn},{l:"Net Worth",v:fmt(netWorth),c:netWorth>=0?C.accent:C.warn}].map(s=>(
                  <div key={s.l} style={{background:C.surface,borderRadius:"9px",padding:"12px"}}>
                    <div style={{fontSize:"10px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"3px"}}>{s.l}</div>
                    <div style={{fontSize:"18px",fontWeight:800,color:s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div style={{height:"7px",borderRadius:"100px",background:C.subtle,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(100,totalAssets>0?(totalAssets/(totalAssets+totalDebt))*100:0)}%`,background:`linear-gradient(90deg,${C.accent},${C.blue})`,transition:"width 0.8s ease"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:"5px"}}>
                <span style={{fontSize:"10px",color:C.accent}}>Assets {fmt(totalAssets)}</span>
                <span style={{fontSize:"10px",color:C.warn}}>Debt {fmt(totalDebt)}</span>
              </div>
            </div>
            <div style={S.navRow}>
              <button style={S.btnS} onClick={()=>go(4)}>← Back</button>
              <button style={{...S.btnP,flex:1}} onClick={()=>go(6)}>Calculate My Plan →</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 6: RESULTS ════════════════════════════════════════════ */}
        {step===6&&(
          <div>
            {/* Allocation Bar */}
            <div style={S.card}>
              <div style={S.cTitle}>Your AutoPilot Paycheck Allocation</div>
              <div style={S.allocBar}>
                {iPct.bills>2&&<div style={S.allocSeg(iPct.bills,C.green2)}>{Math.round(iPct.bills)}% Bills</div>}
                {iPct.debt>2&&<div style={S.allocSeg(iPct.debt,"#ff6b35")}>{Math.round(iPct.debt)}% Debt Min</div>}
                {iPct.extra>2&&<div style={S.allocSeg(iPct.extra,"#ff9f35")}>{Math.round(iPct.extra)}% Extra Payoff</div>}
                {iPct.bucket>2&&<div style={S.allocSeg(iPct.bucket,C.blue)}>{Math.round(iPct.bucket)}% Buckets</div>}
                {iPct.free>2&&<div style={S.allocSeg(iPct.free,C.accent)}>{Math.round(iPct.free)}% Free</div>}
              </div>
              <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
                {[{l:"Bills",v:totalBills,c:C.green2},{l:"Debt Mins",v:totalMins,c:"#ff6b35"},{l:"Extra Payoff",v:extraDebt,c:"#ff9f35"},{l:"Buckets",v:bucketFund,c:C.blue},{l:"Remaining",v:Math.max(0,incNum-totalBills-totalMins-extraDebt-bucketFund),c:C.accent}].map(i=>(
                  <div key={i.l} style={{display:"flex",alignItems:"center",gap:"4px"}}>
                    <div style={{width:"8px",height:"8px",borderRadius:"2px",background:i.c,flexShrink:0}}/>
                    <span style={{fontSize:"11px",color:C.muted}}>{i.l}: </span>
                    <span style={{fontSize:"11px",fontWeight:700,color:i.c}}>{fmt(i.v)}</span>
                  </div>
                ))}
              </div>
              {biweekly&&incNum>0&&(
                <div style={{marginTop:"12px",padding:"10px 12px",background:C.surface,borderRadius:"9px"}}>
                  <div style={{fontSize:"10px",color:C.muted,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"8px"}}>⚡ Biweekly Paycheck Split ({fmt(biInc)}/paycheck)</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:"7px"}}>
                    {[{l:"Bills (split)",v:totalBills/2,c:C.green2},{l:"Debt Mins",v:totalMins/2,c:"#ff6b35"},{l:"Extra Payoff",v:extraDebt/2,c:"#ff9f35"},{l:"Buckets",v:bucketFund/2,c:C.blue}].map(i=>(
                      <div key={i.l} style={{textAlign:"center"}}><div style={{fontSize:"10px",color:C.muted,marginBottom:"2px"}}>{i.l}</div><div style={{fontSize:"13px",fontWeight:800,color:i.c}}>{fmt(i.v)}</div></div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div style={S.sg}>
              <div style={S.stat}><div style={S.sLabel}>Debt-Free In</div><div style={{...S.sVal,color:C.accent}}>{apP.months} mo</div><div style={{fontSize:"11px",color:C.muted,marginTop:"3px"}}>{dfStr}</div></div>
              <div style={S.stat}><div style={S.sLabel}>Months Saved</div><div style={{...S.sVal,color:C.blue}}>+{mSaved}</div><div style={{fontSize:"11px",color:C.muted,marginTop:"3px"}}>vs. minimums only</div></div>
              <div style={S.stat}><div style={S.sLabel}>Interest Saved</div><div style={{...S.sVal,color:C.warn}}>{fmt(iSaved)}</div><div style={{fontSize:"11px",color:C.muted,marginTop:"3px"}}>{debtMethod} method</div></div>
              <div style={S.stat}><div style={S.sLabel}>Net Worth</div><div style={{...S.sVal,color:netWorth>=0?C.accent:C.warn}}>{fmt(netWorth)}</div><div style={{fontSize:"11px",color:C.muted,marginTop:"3px"}}>assets − debt</div></div>
            </div>

            {/* Share Card */}
            <div style={{...S.card,background:`linear-gradient(135deg,${C.accentDim},#4d9fff08)`,border:`1px solid ${C.accentBorder}`,textAlign:"center",padding:"18px"}}>
              <div style={{fontSize:"11px",color:C.muted,marginBottom:"5px",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700}}>🎯 Your Debt-Free Date</div>
              <div style={{fontSize:"28px",fontWeight:800,color:C.accent,letterSpacing:"-0.5px",marginBottom:"3px"}}>{dfStr}</div>
              <div style={{fontSize:"12px",color:C.muted,marginBottom:"12px"}}>{apP.months} months · {fmt(totalDebt)} cleared · {fmt(iSaved)} saved in interest</div>
              <button onClick={()=>{
                const txt=`I'm using AutoPilot Money to pay off ${fmt(totalDebt)} in debt. My debt-free date is ${dfStr} — ${apP.months} months away, saving ${fmt(iSaved)} in interest. 💪 #DebtFree #PersonalFinance #AutoPilotMoney`;
                navigator.clipboard?.writeText(txt).then(()=>alert("Copied to clipboard! Paste anywhere to share your journey.")).catch(()=>alert(txt));
              }} style={{background:C.accentDim,color:C.accent,border:`1px solid ${C.accentBorder}`,borderRadius:"9px",padding:"7px 16px",fontSize:"12px",fontWeight:700,cursor:"pointer"}}>📋 Copy Share Card</button>
            </div>

            {/* FOO */}
            <div style={S.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"5px",flexWrap:"wrap",gap:"5px"}}>
                <div style={S.cTitle}>Your Financial Order of Operations</div>
                <span style={{fontSize:"10px",color:C.muted,padding:"2px 8px",border:`1px solid ${C.border}`,borderRadius:"100px"}}>Personalized to your data</span>
              </div>
              <p style={{fontSize:"11px",color:C.muted,margin:"0 0 16px"}}>Steps marked ✓ are complete. Follow in sequence — skipping ahead costs real money.</p>
              <div style={{position:"relative"}}>
                <div style={{position:"absolute",left:"18px",top:"22px",bottom:"22px",width:"2px",background:C.border,zIndex:0}}/>
                {FOO.map((s,i)=>{
                  const done=s.done===true;
                  return(
                    <div key={s.n} style={{...S.fooItem,marginBottom:i<FOO.length-1?"11px":"0"}}>
                      <div style={S.fooCircle(done,s.c)}>{done?"✓":s.ic}</div>
                      <div style={S.fooBody(done)}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"4px",marginBottom:"3px"}}>
                          <div style={{fontSize:"12px",fontWeight:700,color:done?C.accent:C.text}}>{s.t}</div>
                          <span style={{fontSize:"9px",fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",padding:"1px 6px",borderRadius:"100px",whiteSpace:"nowrap",background:done?`${C.accent}20`:`${s.c}15`,color:done?C.accent:s.c,border:`1px solid ${done?C.accentBorder:s.c+"40"}`}}>{done?"✓ Done":`Step ${s.n}`}</span>
                        </div>
                        <p style={{fontSize:"11px",color:C.muted,margin:"0 0 4px",lineHeight:1.5}}>{s.w}</p>
                        <div style={{fontSize:"10px",color:s.c,fontWeight:700,background:`${s.c}12`,padding:"1px 6px",borderRadius:"5px",display:"inline-block",marginBottom:"4px"}}>Target: {s.tgt}</div>
                        <div style={{fontSize:"11px",color:C.text,lineHeight:1.5,padding:"5px 8px",background:C.card,borderRadius:"7px",borderLeft:`3px solid ${done?C.accent:s.c}`}}>{s.act}</div>
                        {s.tax&&<div style={{marginTop:"5px",fontSize:"10px",color:C.amber,padding:"4px 8px",background:`${C.amber}10`,borderRadius:"6px",border:`1px solid ${C.amber}30`}}>💡 {s.tax}</div>}
                        {s.aff&&<div style={{marginTop:"5px",display:"flex",alignItems:"center",gap:"5px",flexWrap:"wrap"}}>
                          <span style={{fontSize:"10px",color:C.muted}}>Recommended:</span>
                          <a href={s.aff.u} target="_blank" rel="noopener noreferrer" style={{fontSize:"10px",color:C.blue,fontWeight:700,textDecoration:"none"}}>→ {s.aff.n}</a>
                          <span style={{fontSize:"10px",color:C.muted}}>{s.aff.note}</span>
                        </div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payoff Order */}
            <div style={S.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",flexWrap:"wrap",gap:"7px"}}>
                <div style={S.cTitle}>AutoPilot Payoff Order — {debtMethod==="avalanche"?"🔥 Avalanche":"⛄ Snowball"}</div>
                <div style={{display:"flex",gap:0,borderRadius:"8px",overflow:"hidden",border:`1px solid ${C.border}`}}>
                  {[{v:"avalanche",l:"🔥"},{v:"snowball",l:"⛄"}].map(m=><button key={m.v} onClick={()=>setDebtMethod(m.v)} style={S.tog(debtMethod===m.v)}>{m.l}</button>)}
                </div>
              </div>
              {debts.length>1&&(
                <div style={{marginBottom:"12px",padding:"10px 12px",borderRadius:"9px",background:C.surface,border:`1px solid ${C.border}`,display:"flex",gap:"12px",flexWrap:"wrap"}}>
                  {[{l:"🔥 Avalanche",p:avP,c:C.warn},{l:"⛄ Snowball",p:sbP,c:C.blue}].map(m=>(
                    <div key={m.l} style={{flex:1,minWidth:"110px"}}><div style={{fontSize:"10px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"2px"}}>{m.l}</div><div style={{fontSize:"13px",fontWeight:800,color:m.c}}>{fmt(m.p.totalInterest)}</div><div style={{fontSize:"11px",color:C.muted}}>{m.p.months} months</div></div>
                  ))}
                  <div style={{flex:1,minWidth:"110px",borderLeft:`1px solid ${C.border}`,paddingLeft:"12px"}}><div style={{fontSize:"10px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"2px"}}>Avalanche Saves</div><div style={{fontSize:"13px",fontWeight:800,color:C.accent}}>{fmt(Math.abs(sbP.totalInterest-avP.totalInterest))}</div><div style={{fontSize:"11px",color:C.muted}}>{Math.abs(sbP.months-avP.months)} months faster</div></div>
                </div>
              )}
              {[...debts].sort((a,b)=>debtMethod==="snowball"?a.balance-b.balance:b.apr-a.apr).map((d,i)=>{
                const pct=totalDebt>0?(d.balance/totalDebt)*100:0;
                return(
                  <div key={d.id} style={{marginBottom:"10px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"3px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                        <span style={S.pill(i===0?C.warn:i===1?C.blue:C.muted)}>#{i+1}</span>
                        <span style={{fontSize:"13px",fontWeight:600}}>{d.name}</span>
                        <span style={{fontSize:"11px",color:C.muted}}>{debtMethod==="snowball"?fmt(d.balance)+" bal":`${d.apr}% APR`}</span>
                      </div>
                      <span style={{fontSize:"12px",fontWeight:700}}>{fmt(d.balance)}</span>
                    </div>
                    <div style={S.bar}><div style={S.bFill(pct,i===0?C.warn:i===1?C.blue:C.accent)}/></div>
                  </div>
                );
              })}
            </div>

            {/* Amortization — PAYGATED */}
            <Paygate feature="Full Amortization Schedule" unlocked={unlocked} onUnlock={()=>setUnlocked(true)}>
              {(()=>{
                const scheds=amortView==="autopilot"?apSch:minSch;
                return(
                  <div style={S.card}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",flexWrap:"wrap",gap:"7px"}}>
                      <div style={S.cTitle}>Amortization Schedule</div>
                      <div style={{display:"flex",gap:0,borderRadius:"8px",overflow:"hidden",border:`1px solid ${C.border}`}}>
                        {[{v:"autopilot",l:"⚡ AutoPilot"},{v:"minimum",l:"Minimums"}].map(v=><button key={v.v} onClick={()=>setAmortView(v.v)} style={S.tog(amortView===v.v)}>{v.l}</button>)}
                      </div>
                    </div>
                    <p style={{fontSize:"11px",color:C.muted,margin:"0 0 14px"}}>{amortView==="autopilot"?`${debtMethod==="avalanche"?"🔥 Avalanche":"⛄ Snowball"} with ${fmt(extraDebt)}/mo extra.`:"Minimums only — no extra payments."}</p>
                    {scheds.map(sch=>{
                      const ti=sch.rows.reduce((s,r)=>s+r.interest,0);const tp=sch.rows.reduce((s,r)=>s+r.payment,0);
                      const isEx=expandedDebt===sch.id;const pd=sch.rows.length>0?new Date(new Date().getFullYear(),new Date().getMonth()+sch.rows.length,1):null;
                      return(
                        <div key={sch.id} style={{marginBottom:"9px",border:`1px solid ${C.border}`,borderRadius:"9px",overflow:"hidden"}}>
                          <div onClick={()=>setExpandedDebt(isEx?null:sch.id)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 13px",cursor:"pointer",background:C.surface,flexWrap:"wrap",gap:"5px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:"7px"}}><span>{isEx?"▾":"▸"}</span><div><div style={{fontSize:"12px",fontWeight:700}}>{sch.name}</div><div style={{fontSize:"10px",color:C.muted}}>{sch.apr}% APR · {sch.rows.length} months</div></div></div>
                            <div style={{display:"flex",gap:"14px",flexWrap:"wrap"}}>
                              {[{l:"Interest",v:fmt(ti),c:C.warn},{l:"Total Paid",v:fmt(tp),c:C.text},{l:"Payoff",v:pd?`${MO[pd.getMonth()]} ${pd.getFullYear()}`:"—",c:C.accent}].map(s=>(
                                <div key={s.l} style={{textAlign:"right"}}><div style={{fontSize:"10px",color:C.muted}}>{s.l}</div><div style={{fontSize:"12px",fontWeight:700,color:s.c}}>{s.v}</div></div>
                              ))}
                            </div>
                          </div>
                          {isEx&&(
                            <div style={{overflowX:"auto",maxHeight:"300px",overflowY:"auto"}}>
                              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"11px"}}>
                                <thead><tr style={{background:C.card,position:"sticky",top:0}}>{["Mo","Date","Payment","Principal","Interest","Extra","Balance"].map(h=><th key={h} style={{padding:"6px 9px",textAlign:"right",color:C.muted,fontWeight:700,fontSize:"9px",textTransform:"uppercase",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                                <tbody>{sch.rows.map((r,ri)=>{
                                  const rd=new Date(new Date().getFullYear(),new Date().getMonth()+ri+1,1);const last=r.balance<0.01;
                                  return<tr key={ri} style={{background:last?`${C.accent}10`:ri%2===0?C.surface:C.card}}>
                                    <td style={{padding:"5px 9px",textAlign:"right",color:C.muted}}>{r.month}</td>
                                    <td style={{padding:"5px 9px",textAlign:"right",whiteSpace:"nowrap",color:C.muted}}>{MO[rd.getMonth()]} {rd.getFullYear()}</td>
                                    <td style={{padding:"5px 9px",textAlign:"right",fontWeight:600}}>{fmtD(r.payment)}</td>
                                    <td style={{padding:"5px 9px",textAlign:"right",color:C.blue}}>{fmtD(r.principal)}</td>
                                    <td style={{padding:"5px 9px",textAlign:"right",color:C.warn}}>{fmtD(r.interest)}</td>
                                    <td style={{padding:"5px 9px",textAlign:"right",color:r.extra>0?C.accent:C.subtle}}>{r.extra>0?fmtD(r.extra):"—"}</td>
                                    <td style={{padding:"5px 9px",textAlign:"right",fontWeight:700,color:last?C.accent:C.text}}>{last?"PAID ✓":fmtD(r.balance)}</td>
                                  </tr>;
                                })}</tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div style={{marginTop:"10px",padding:"12px",background:C.surface,borderRadius:"9px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:"8px"}}>
                      {[{l:"Total Months",v:`${scheds[0]?.rows.length||0} mo`,c:C.text},{l:"Total Interest",v:fmt(scheds.reduce((s,sc)=>s+sc.rows.reduce((r,row)=>r+row.interest,0),0)),c:C.warn},{l:"Total Paid",v:fmt(scheds.reduce((s,sc)=>s+sc.rows.reduce((r,row)=>r+row.payment,0),0)),c:C.text},{l:"vs. Minimums",v:`${fmt(iSaved)} saved`,c:C.accent}].map(s=>(
                        <div key={s.l} style={{textAlign:"center"}}><div style={{fontSize:"9px",color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"2px"}}>{s.l}</div><div style={{fontSize:"12px",fontWeight:800,color:s.c}}>{s.v}</div></div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </Paygate>

            {/* What-If — PAYGATED */}
            <Paygate feature="What-If Scenario Modeler" unlocked={unlocked} onUnlock={()=>setUnlocked(true)}>
              {(()=>(
                <div style={{...S.card,border:`1px solid ${C.purple}40`,background:`linear-gradient(135deg,${C.card},#1a1a2e)`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:showWI?"14px":"0",flexWrap:"wrap",gap:"7px"}}>
                    <div><div style={S.cTitle}>✨ What-If Scenario Modeler</div>{!showWI&&<p style={{fontSize:"11px",color:C.muted,margin:"2px 0 0"}}>Model tax refunds, raises, rate reductions — instant impact.</p>}</div>
                    <button onClick={()=>setShowWI(!showWI)} style={{background:showWI?C.surface:C.purple,color:showWI?C.muted:"#fff",border:`1px solid ${showWI?C.border:C.purple}`,borderRadius:"9px",padding:"6px 14px",fontSize:"12px",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{showWI?"Hide":"Open →"}</button>
                  </div>
                  {showWI&&(()=>{
                    const hasWI=Object.values(wi).some(v=>v>0);
                    return(
                      <div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:"10px",marginBottom:"14px"}}>
                          {[{k:"lumpSum",l:"💰 Lump Sum",u:"$",d:"Tax refund, bonus, or windfall",p:"e.g. 3000"},{k:"extraMonthly",l:"📅 Extra Monthly",u:"$",d:"Side income or cut expense",p:"e.g. 200"},{k:"extraIncome",l:"💼 New Income",u:"$",d:"Raise or side hustle",p:"e.g. 500"},{k:"rateReduction",l:"📉 APR Reduction",u:"%",d:"Balance transfer or refinance",p:"e.g. 5"}].map(s=>(
                            <div key={s.k} style={{background:C.surface,borderRadius:"9px",padding:"11px"}}>
                              <div style={{fontSize:"12px",fontWeight:700,marginBottom:"2px"}}>{s.l}</div>
                              <div style={{fontSize:"10px",color:C.muted,marginBottom:"7px"}}>{s.d}</div>
                              <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                                <span style={{fontSize:"12px",color:C.muted,fontWeight:600}}>{s.u}</span>
                                <input style={{...S.inputSm,flex:1}} type="number" min="0" placeholder={s.p} value={wi[s.k]||""} onChange={e=>setWi({...wi,[s.k]:parseFloat(e.target.value)||0})}/>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{borderRadius:"9px",overflow:"hidden",border:`1px solid ${C.border}`}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",background:C.surface,padding:"8px 12px",gap:"5px"}}>
                            {["Metric","Current Plan","What-If"].map(h=><div key={h} style={{fontSize:"9px",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1px"}}>{h}</div>)}
                          </div>
                          {[{l:"Debt-Free Date",c:`${apP.months} months`,w:hasWI?`${wiP.months} months`:"—",imp:hasWI&&wiP.months<apP.months,d:hasWI&&wiMo>0?`${wiMo} mo faster`:null},{l:"Total Interest",c:fmt(apP.totalInterest),w:hasWI?fmt(wiP.totalInterest):"—",imp:hasWI&&wiP.totalInterest<apP.totalInterest,d:hasWI&&wiIn>0?`${fmt(wiIn)} saved`:null},{l:"Monthly Budget",c:fmt(totalMins+extraDebt),w:hasWI?fmt(totalMins+extraDebt+wiExtra):"—",imp:hasWI&&wiExtra>0,d:hasWI&&wiExtra>0?`+${fmt(wiExtra)}/mo`:null}].map((r,i)=>(
                            <div key={r.l} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"9px 12px",gap:"5px",background:i%2===0?C.card:C.surface,alignItems:"center"}}>
                              <span style={{fontSize:"11px",color:C.muted,fontWeight:600}}>{r.l}</span>
                              <span style={{fontSize:"11px",fontWeight:700}}>{r.c}</span>
                              <div style={{display:"flex",alignItems:"center",gap:"5px",flexWrap:"wrap"}}>
                                <span style={{fontSize:"11px",fontWeight:700,color:r.imp?C.accent:C.text}}>{r.w}</span>
                                {r.d&&<span style={{fontSize:"10px",fontWeight:700,color:C.accent,background:`${C.accent}15`,padding:"1px 5px",borderRadius:"100px",border:`1px solid ${C.accentBorder}`}}>{r.d}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                        {hasWI&&wiMo>0&&<div style={{marginTop:"10px",padding:"10px 12px",background:`${C.accent}10`,border:`1px solid ${C.accentBorder}`,borderRadius:"9px"}}><span style={{fontSize:"12px",color:C.accent,fontWeight:700}}>✓ {wiMo} months sooner · {fmt(wiIn)} less interest.{wi.lumpSum>0?` ${fmt(wi.lumpSum)} applied to highest-APR debt first.`:""}</span></div>}
                        <button onClick={()=>setWi({lumpSum:0,extraMonthly:0,extraIncome:0,rateReduction:0})} style={{background:"transparent",color:C.muted,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"6px 12px",fontSize:"11px",cursor:"pointer",marginTop:"10px",fontFamily:"inherit"}}>↺ Reset</button>
                      </div>
                    );
                  })()}
                </div>
              ))()}
            </Paygate>

            {/* Investment Projection */}
            <div style={S.card}>
              <div style={S.cTitle}>🚀 Post-Debt Investment Projection</div>
              <p style={{fontSize:"11px",color:C.muted,margin:"0 0 12px",lineHeight:1.6}}>After debt-free, redirect your {fmt(freedCash)}/mo payoff budget into investments. Assumes 10% avg annual return (S&P 500 historical average).</p>
              <div style={{display:"flex",gap:"7px",marginBottom:"14px",flexWrap:"wrap"}}>
                {[10,20,30].map(y=><button key={y} onClick={()=>setProjYears(y)} style={{...S.tog(projYears===y),borderRadius:"8px",padding:"5px 12px",fontSize:"12px"}}>{y} Years</button>)}
              </div>
              {(()=>{
                const maxV=projPts[projPts.length-1]?.value||1;
                return(
                  <div>
                    <div style={{height:"140px",display:"flex",alignItems:"flex-end",gap:"2px"}}>
                      {projPts.filter((_,i)=>i>0).map((p,i)=>(
                        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
                          <div style={{width:"100%",background:`linear-gradient(180deg,${C.accent},${C.blue})`,borderRadius:"3px 3px 0 0",height:`${(p.value/maxV)*100}%`,minHeight:"2px",transition:"height 0.5s ease"}}/>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:"4px"}}>
                      <span style={{fontSize:"10px",color:C.muted}}>Year 1</span>
                      <span style={{fontSize:"10px",color:C.muted}}>Year {projYears}</span>
                    </div>
                    <div style={{marginTop:"12px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:"8px"}}>
                      {[{l:`After ${projYears} Years`,v:fmt(projPts[projPts.length-1]?.value||0),c:C.accent},{l:"Total Contributed",v:fmt(freedCash*projYears*12),c:C.blue},{l:"Investment Gains",v:fmt((projPts[projPts.length-1]?.value||0)-(freedCash*projYears*12)),c:C.green2}].map(s=>(
                        <div key={s.l} style={{background:C.surface,borderRadius:"9px",padding:"11px",textAlign:"center"}}>
                          <div style={{fontSize:"10px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"3px"}}>{s.l}</div>
                          <div style={{fontSize:"16px",fontWeight:800,color:s.c}}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                    <p style={{fontSize:"10px",color:C.muted,margin:"10px 0 0",lineHeight:1.5}}>⚠️ For illustrative purposes only. Returns are variable and not guaranteed. Past performance does not predict future results. Consult a financial advisor.</p>
                  </div>
                );
              })()}
            </div>

            {/* Tax Awareness */}
            <div style={{...S.card,border:`1px solid ${C.amber}30`}}>
              <div style={S.cTitle}>💡 Tax Strategy Insight</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"10px",marginBottom:"12px"}}>
                {[{l:"Est. Tax Bracket",v:bracket.label,c:C.warn},{l:"Annual Income",v:fmt(incNum*12),c:C.text},{l:"Recommended",v:shouldRoth?"Roth IRA":"Traditional 401(k)",c:shouldRoth?C.accent:C.blue}].map(s=>(
                  <div key={s.l} style={{background:C.surface,borderRadius:"9px",padding:"11px"}}><div style={{fontSize:"10px",color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"2px"}}>{s.l}</div><div style={{fontSize:"14px",fontWeight:800,color:s.c}}>{s.v}</div></div>
                ))}
              </div>
              <div style={{padding:"10px 12px",background:`${C.amber}10`,border:`1px solid ${C.amber}30`,borderRadius:"9px"}}>
                <p style={{margin:0,fontSize:"12px",color:C.text,lineHeight:1.6}}>{shouldRoth?`At the ${bracket.label} bracket, you're likely in a lower tax bracket than you'll be in retirement. Roth IRA: pay taxes now, never on gains.`:`At the ${bracket.label} bracket, Traditional 401(k) pre-tax contributions save you ${fmt(23500*(bracket.rate/100))}/yr in current taxes. Consider maxing it before Roth.`}</p>
              </div>
              <p style={{fontSize:"10px",color:C.muted,margin:"8px 0 0"}}>General educational information only — not personalized tax advice. Consult a licensed CPA for your situation.</p>
            </div>

            {/* Buckets */}
            <div style={S.card}>
              <div style={S.cTitle}>Savings Buckets — Monthly Funding</div>
              {buckets.map(b=>{const tot=buckets.reduce((s,x)=>s+x.monthly,0);const pct=tot>0?(b.monthly/tot)*100:0;const funded=Math.min(b.monthly,bucketFund*(b.monthly/Math.max(1,tot)));return(
                <div key={b.id} style={{marginBottom:"10px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"2px"}}><span style={{fontSize:"12px",fontWeight:600}}>{b.name}</span><span style={{fontSize:"12px",fontWeight:700,color:C.accent}}>{fmtD(funded)}<span style={{color:C.muted,fontWeight:400}}>/mo</span></span></div>
                  <div style={S.bar}><div style={S.bFill(pct,b.color||C.blue)}/></div>
                </div>
              );})}
            </div>

            <div style={S.navRow}>
              <button style={S.btnS} onClick={()=>go(5)}>← Edit</button>
              <button style={{...S.btnP,flex:1}} onClick={()=>go(7)}>Save My Plan & Get Early Access →</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 7: SUBSCRIBE ══════════════════════════════════════════ */}
        {step===7&&(
          <div>
            <div style={{...S.card,background:`linear-gradient(135deg,${C.accentDim},#4d9fff08)`,border:`1px solid ${C.accentBorder}`,textAlign:"center",padding:"32px"}}>
              {!subscribed?(
                <>
                  <div style={{fontSize:"36px",marginBottom:"12px"}}>🚀</div>
                  <h2 style={{fontSize:"24px",fontWeight:800,margin:"0 0 8px",letterSpacing:"-0.5px"}}>Lock in your plan.</h2>
                  <p style={{fontSize:"14px",color:C.muted,margin:"0 0 22px",maxWidth:"380px",marginLeft:"auto",marginRight:"auto",lineHeight:1.6}}>AutoPilot Money is launching soon. Early subscribers get <strong style={{color:C.accent}}>50% off forever</strong> — full plan saving, real-time rebalancing, and unlimited what-if scenarios.</p>
                  <div style={{maxWidth:"380px",margin:"0 auto"}}>
                    <div style={{display:"flex",gap:"7px"}}>
                      <input style={{...S.input,flex:1,fontSize:"13px"}} type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&email&&setSubscribed(true)}/>
                      <button style={{background:C.accent,color:C.bg,border:"none",borderRadius:"10px",padding:"10px 14px",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontSize:"13px",fontFamily:"inherit"}} onClick={()=>email&&setSubscribed(true)}>Get Early Access</button>
                    </div>
                    <p style={{fontSize:"11px",color:C.muted,marginTop:"8px"}}>No spam. No credit card. Cancel anytime.</p>
                  </div>
                  <div style={{marginTop:"20px",padding:"14px",background:C.surface,borderRadius:"10px",textAlign:"left",maxWidth:"360px",margin:"20px auto 0"}}>
                    <div style={{fontSize:"10px",color:C.muted,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",marginBottom:"8px"}}>Your Plan Summary</div>
                    {[{l:"Total Debt",v:fmt(totalDebt),c:C.warn},{l:"Debt-Free Date",v:dfStr,c:C.accent},{l:"Interest Saved",v:fmt(iSaved),c:C.blue},{l:"Net Worth Today",v:fmt(netWorth),c:netWorth>=0?C.accent:C.warn}].map(s=>(
                      <div key={s.l} style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}><span style={{fontSize:"12px",color:C.muted}}>{s.l}</span><span style={{fontSize:"12px",fontWeight:700,color:s.c}}>{s.v}</span></div>
                    ))}
                  </div>
                  <p style={{fontSize:"10px",color:C.muted,marginTop:"14px"}}>By signing up, you acknowledge this tool provides general financial education only — not personalized financial advice. <button onClick={()=>go(8)} style={{background:"none",border:"none",color:C.blue,cursor:"pointer",fontSize:"10px",textDecoration:"underline",fontFamily:"inherit"}}>View full disclaimer</button></p>
                </>
              ):(
                <>
                  <div style={{fontSize:"48px",marginBottom:"12px"}}>✅</div>
                  <h2 style={{fontSize:"26px",fontWeight:800,margin:"0 0 8px",color:C.accent}}>You're in!</h2>
                  <p style={{fontSize:"14px",color:C.muted,margin:"0 0 5px"}}>We'll notify <strong style={{color:C.text}}>{email}</strong> the moment AutoPilot Money launches.</p>
                  <p style={{fontSize:"12px",color:C.muted}}>Early access pricing locked in — {dfStr} is your debt-free date. 💪</p>
                  <div style={{marginTop:"14px",display:"flex",gap:"9px",justifyContent:"center",flexWrap:"wrap"}}>
                    <button style={S.btnS} onClick={()=>go(0)}>← Start Over</button>
                    <button style={{...S.btnS,color:C.muted,borderColor:C.border}} onClick={()=>go(8)}>View Disclaimer →</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 8: LEGAL ══════════════════════════════════════════════ */}
        {step===8&&(
          <div>
            <div style={S.card}>
              <div style={S.cTitle}>Legal Disclaimer & Terms of Use</div>
              <div style={{fontSize:"13px",color:C.text,lineHeight:1.8}}>

                <p style={{fontWeight:700,color:C.warn,marginBottom:"5px"}}>⚠️ Not Financial Advice</p>
                <p style={{color:C.muted,marginBottom:"14px"}}>AutoPilot Money is an educational financial planning tool. All content, calculations, projections, and information provided are for general informational and educational purposes only. Nothing in this application constitutes personalized financial, investment, tax, or legal advice.</p>

                <p style={{fontWeight:700,color:C.text,marginBottom:"5px"}}>No Professional Relationship</p>
                <p style={{color:C.muted,marginBottom:"14px"}}>Use of this tool does not create a client relationship with any financial advisor, broker, tax professional, or attorney. Always consult qualified, licensed professionals before making financial decisions.</p>

                <p style={{fontWeight:700,color:C.text,marginBottom:"5px"}}>Investment Projections</p>
                <p style={{color:C.muted,marginBottom:"14px"}}>All investment growth projections assume a fixed annual return for illustrative purposes only. Actual returns are variable and not guaranteed. Past performance of any index, fund, or market does not predict future results. Investing involves risk, including possible loss of principal.</p>

                <p style={{fontWeight:700,color:C.text,marginBottom:"5px"}}>Tax Information</p>
                <p style={{color:C.muted,marginBottom:"14px"}}>Tax bracket estimates and IRS contribution limits are based on publicly available information and may not reflect your actual situation. Tax laws change frequently. Consult a licensed CPA or tax professional for advice specific to your circumstances.</p>

                <p style={{fontWeight:700,color:C.text,marginBottom:"5px"}}>Affiliate Disclosures</p>
                <p style={{color:C.muted,marginBottom:"14px"}}>This application may contain links to third-party financial institutions (including Fidelity, Vanguard, Marcus by Goldman Sachs, and Utah my529). These may be affiliate referral links — we may receive compensation if you open an account through them. This does not affect the objectivity of our educational content. We reference only widely recognized, low-cost institutions.</p>

                <p style={{fontWeight:700,color:C.text,marginBottom:"5px"}}>Data & Privacy</p>
                <p style={{color:C.muted,marginBottom:"14px"}}>All financial data you enter is stored locally in your browser (localStorage) and is never transmitted to any server. Your email address, if provided, is used only for product update notifications. We do not sell personal data to third parties.</p>

                <p style={{fontWeight:700,color:C.text,marginBottom:"5px"}}>No Warranty</p>
                <p style={{color:C.muted,marginBottom:"14px"}}>This tool is provided "as is" without warranty of any kind. Calculations may contain errors. Always verify important financial figures independently before acting on them.</p>

                <p style={{fontWeight:700,color:C.text,marginBottom:"5px"}}>Intellectual Property</p>
                <p style={{color:C.muted,marginBottom:"14px"}}>All content, design, and code in AutoPilot Money is original work. The financial methodologies referenced (debt avalanche, debt snowball, financial order of operations) are widely-used personal finance concepts in the public domain. No proprietary frameworks, copyrighted curricula, or trademarked programs have been reproduced.</p>

                <p style={{fontWeight:700,color:C.text,marginBottom:"5px"}}>Limitation of Liability</p>
                <p style={{color:C.muted,marginBottom:"14px"}}>AutoPilot Money and its creators are not liable for any financial losses or outcomes resulting from use of this tool. Users assume full responsibility for their financial decisions.</p>

                <div style={{padding:"12px 14px",background:`${C.accent}10`,border:`1px solid ${C.accentBorder}`,borderRadius:"9px",marginTop:"6px"}}>
                  <p style={{margin:0,fontSize:"12px",color:C.accent,fontWeight:700}}>By using AutoPilot Money, you acknowledge that this tool provides general financial education — not personalized financial advice.</p>
                </div>
              </div>
            </div>
            <div style={{...S.card,textAlign:"center",padding:"18px"}}>
              <p style={{fontSize:"12px",color:C.muted,marginBottom:"10px"}}>I have read and understand this disclaimer.</p>
              <div style={{display:"flex",gap:"9px",justifyContent:"center",flexWrap:"wrap"}}>
                <button style={{...S.btnP,width:"auto",padding:"10px 22px"}} onClick={()=>{setLegalOk(true);go(0);}}>✓ Accept & Continue</button>
                <button style={S.btnS} onClick={()=>go(7)}>← Back</button>
              </div>
              {legalOk&&<p style={{fontSize:"11px",color:C.accent,marginTop:"8px"}}>✓ Disclaimer accepted</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}ReactDOM.createRoot(document.getElementById('root')).render(<App />);
