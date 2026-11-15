export const GACHA_STYLES = `
  * { box-sizing: border-box; }
  .overlay { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; background: rgba(26,20,25,.73); font-family: system-ui, 'Malgun Gothic', sans-serif; }
  .panel { width: min(420px, calc(100vw - 28px)); padding: 26px 24px 21px; border: 3px solid #705140; border-radius: 22px; background: #fff2db; color: #4e332b; text-align: center; box-shadow: 0 18px 0 #3c2928, 0 25px 60px rgba(0,0,0,.4); }
  .heading { font-size: 25px; font-weight: 900; letter-spacing: -.6px; }
  .subtitle { margin: 9px 0 5px; font-size: 14px; }
  .stage { height: 250px; display: grid; place-items: center; position: relative; isolation: isolate; }
  .box-art { width: 225px; height: 200px; object-fit: contain; image-rendering: pixelated; transform-origin: 50% 85%; filter: drop-shadow(0 12px 3px #7d5c4e48); }
  .pet-art { display: none; width: 180px; height: 180px; object-fit: contain; image-rendering: pixelated; position: absolute; bottom: 20px; }
  .dust { position: absolute; font-size: 30px; opacity: 0; color: #c49a64; }
  .dust-left { left: 10%; top: 45%; } .dust-right { right: 11%; top: 30%; }
  .poof { position: absolute; font-weight: 1000; font-size: 48px; color: #ffb544; text-shadow: 3px 3px #6a3d2b; opacity: 0; transform: scale(.1) rotate(-20deg); }
  .draw { font: inherit; font-weight: 900; font-size: 17px; padding: 12px 29px; border: 3px solid #8a5335; border-radius: 14px; background: #ffcb75; color: #52352a; cursor: pointer; box-shadow: 0 5px 0 #8a5335; }
  .draw:hover:enabled { background: #ffdb9c; } .draw:active:enabled { transform: translateY(3px); box-shadow: 0 2px 0 #8a5335; }
  .draw:disabled { opacity: .7; cursor: default; }
  .result { min-height: 33px; font-size: 22px; font-weight: 900; color: #ba693b; }
  .odds { margin-top: 15px; font-size: 10px; line-height: 1.6; opacity: .7; }
  .shaking .box-art { animation: box-shake 160ms infinite; }
  .shaking .dust { animation: dust-pulse 500ms infinite alternate; }
  .bursting .box-art { animation: box-exit 440ms forwards; }
  .bursting .poof { animation: pop 460ms both; }
  .revealed .poof { opacity: 0; }
  .revealed .pet-art { display: block; animation: pet-appear 550ms cubic-bezier(.2,1.5,.2,1) both; }
  @keyframes box-shake { 0% {transform:translateX(-5px) rotate(-5deg)} 50% {transform:translateX(6px) translateY(-7px) rotate(6deg)} 100% {transform:translateX(-3px) rotate(-4deg)} }
  @keyframes dust-pulse { 0% {opacity:.1; transform:translateY(12px)} 100% {opacity:1; transform:translateY(-9px)} }
  @keyframes box-exit { 0% {transform:scale(1)} 40% {transform:scale(1.2)} 100% {transform:translateY(-70px) scale(.1); opacity:0} }
  @keyframes pop { 0% {opacity:0;transform:scale(.1) rotate(-20deg)} 50% {opacity:1;transform:scale(1.4) rotate(5deg)} 100% {opacity:0;transform:scale(1.8)} }
  @keyframes pet-appear { 0% {opacity:0; transform:translateY(40px) scale(.2)} 70% {opacity:1;transform:translateY(-10px) scale(1.12)} 100% {opacity:1;transform:scale(1)} }
  @media (prefers-reduced-motion: reduce) { .shaking .box-art, .shaking .dust, .bursting .box-art, .bursting .poof, .revealed .pet-art { animation-duration: .01ms; animation-iteration-count: 1; } }
`;
