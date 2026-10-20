"use client";
import { useCallback } from "react";
import { MengToSketchbookLandingPage } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";

const titles = ["Neem & Tulsi", "Rose & Clay", "Haldi & Honey", "Oat Milk", "Coconut Oil", "Shea Butter", "A daily ritual", "The soap dish", "A thoughtful gift"];
export default function Sketchbook() {
  const adapt = useCallback((frame: HTMLIFrameElement) => {
    const d = frame.contentDocument;
    if (!d?.getElementById("sbBook") || d.getElementById("maa-scene-adapter")) return;
    frame.title = "Maa Soaps — interactive botanical sketchbook";
    const style = d.createElement("style");
    style.textContent = `html,body{height:100%;overflow:hidden!important}.top,.hero-kicker,.hero-down,.page>.rule,.about,.plates,.foot{display:none!important}.hero{height:100svh;min-height:0;padding:0 12px!important;align-content:center}.sb-stage{height:calc(100svh - 140px)}.sb-3d{max-width:min(1000px,calc((100svh - 140px)*2.51))}.sb-wrap{gap:0}.sb-caption{font-size:16px!important;letter-spacing:0!important;text-transform:none!important;color:#2b2721!important}.sb-hint{font-size:13px!important;letter-spacing:0!important;text-transform:none!important;color:#61594c!important;margin-top:12px}.sb-tools{margin-top:12px}.tool{width:40px;height:40px}.zoom-read{font-size:13px!important}.sb-arrow{min-width:44px;min-height:44px}.sb-captions{margin-top:0}.hero .botany{opacity:.25}.wash{opacity:.6}button:focus-visible{outline:2px solid #4b5b39;outline-offset:4px}@media(max-width:640px){.hero{padding:0 8px!important}.sb-captions{margin-top:0}.sb-3d{max-width:660px}.sb-book{width:100%;margin-left:0}.sb-stage{overflow:hidden}.sb-wrap{width:100%;margin:0}.sb-hint{padding:0 12px}.sb-tools{margin-top:16px}.loupe{display:none}}`;
    d.head.appendChild(style);
    const script = d.createElement("script"); script.id = "maa-scene-adapter";
    script.textContent = `(()=>{const titles=${JSON.stringify(titles)};PAGES.forEach((p,i)=>{p.url='/maa-assets/plate-'+i+'.svg';p.title=titles[i];p.place='Maa Soaps';});document.title='Maa Soaps botanical notebook';document.querySelector('.name').textContent='Maa Soaps';document.querySelector('.bio').textContent='Familiar ingredients, a small everyday ritual of care.';document.querySelectorAll('.plate').forEach((b,i)=>b.querySelector('.t').textContent=titles[i]);document.getElementById('sbHint').textContent=matchMedia('(pointer:coarse)').matches?'Tap the arrows or swipe to turn a page':'Turn a page. Pick up the magnifying glass. Take a closer look.';paint();window.addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.type!=='maa-book-go')return;goTo(Math.max(0,Math.min(8,Number(e.data.index)||0)));});})();`;
    d.body.appendChild(script);
  }, []);
  return <div className="shader-frame"><MengToSketchbookLandingPage headingFont="instrument-serif" bodyFont="newsreader" headingWeight="400" bodyWeight="400" primaryColor="#2b2721" headingSize={30} bodySize={20} headingLetterSpacing={0.010} applyScene={adapt} /></div>;
}
