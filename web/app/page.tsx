"use client";
import {useEffect,useState} from 'react';
import Workspace from './workspace';
import MobileApp from './mobile/page';
export default function Home(){const [mobile,M]=useState<boolean|null>(null);useEffect(()=>{const query=window.matchMedia('(max-width:800px)');const update=()=>M(query.matches&&!new URLSearchParams(location.search).has('desktop'));update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[]);if(mobile===null)return <div style={{padding:24,color:'#345562',background:'#faf8f3',minHeight:'100vh'}}>回望 · 正在打开研究空间…</div>;return mobile?<MobileApp/>:<Workspace name="演示访客"/>}
