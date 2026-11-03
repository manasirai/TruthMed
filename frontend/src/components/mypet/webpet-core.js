/*!
 * WebPet — a tiny desktop-style pet that lives on your website.
 *
 * Drop-in:   add a script tag pointing to webpet.js (with defer) to your page
 * Optional:  set window.WebPetConfig = { ... } BEFORE the script loads.
 *
 * Control it from your app:
 *   WebPet.react('happy' | 'love' | 'sad' | 'surprised' | 'confused' | 'dizzy' | 'angry' | 'celebrate', 'optional text')
 *   WebPet.say('Hello!')          WebPet.jump()          WebPet.walkTo(400)
 *   WebPet.sleep() / wake()       WebPet.hide() / show() / toggle()       WebPet.destroy()
 *   window.dispatchEvent(new CustomEvent('webpet', { detail: { mood: 'happy', say: 'Saved!' } }))
 *
 * HTML attributes (no JS needed):
 *   <button data-pet-react="celebrate" data-pet-say="Order placed!">Buy</button>
 *   <div data-pet-ignore> … clicks in here won’t distract the pet … </div>
 *
 * Frameworks: set window.WebPetConfig = { autoStart: false } then call window.WebPetBoot(config).
 * Shortcut: Alt + Shift + P shows / hides the pet.
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.WebPetBoot) return;

  function boot() {
    if (window.WebPet) return;
    const cfg = Object.assign({
      name: 'Mochi',
      size: 80,              // px
      sleepAfter: 30000,     // ms of user inactivity before napping
      chatty: true,          // spontaneous speech bubbles
      persist: true,         // remember position across page loads (sessionStorage)
      watchRoutes: true,     // react to SPA route changes (history.pushState / popstate)
      zIndex: 2147483000,
      colors: {},
      phrases: {}
    }, window.WebPetConfig || {});

    const C = Object.assign({
      body: '#ffb8cb', shade: '#ef8eab', belly: '#fff0f3', ink: '#3b2a36',
      leaf: '#6cc46f', stem: '#3f9a4a', blush: '#ff7fa3'
    }, cfg.colors);

    const P = Object.assign({
      poke: ['Hehe!', 'That tickles!', 'Hi there!', 'Boop!', '♪'],
      dizzy: ['Too many clicks…', 'Whoa, I’m dizzy…', 'Okay, okay!'],
      idle: ['La la la…', 'Nice page you have.', 'Hmm…', 'Click something!', 'Is it snack time?'],
      wake: ['Huh? I’m up!', 'I wasn’t sleeping!'],
      grab: ['Whoa!', 'Where are we going?', 'Hey, put me down!'],
      thrown: ['Wheee!', 'Aaaah!'],
      land: ['Oof!', 'Ow…', 'I’m okay!'],
      password: ['I’m not looking!', 'Eyes closed, promise.'],
      typing: ['Ooh, typing…', 'What are you writing?'],
      submit: ['Sent!', 'Nice work!', 'Done and done!'],
      button: ['Ooh, a button!', 'What does that do?'],
      scroll: ['Whoa, slow down!', 'Wheee!'],
      error: ['Uh-oh… something broke.', 'That didn’t look right…'],
      offline: ['The internet went away…'],
      online: ['We’re back online!'],
      copy: ['Copied!'],
      welcome: ['Welcome back!', 'Missed you!'],
      navigate: ['Ooh, a new page!'],
      work: ['Checking the evidence…', 'Reading studies…', 'Searching the literature…', 'Crunching the data…', 'Hmm, interesting…', 'Cross-checking sources…'],
      workStart: ['On it! Let me check…', 'Give me a sec, analyzing…', 'To the lab computer!'],
      readStart: ['Ahem… mic check, 1, 2!', 'Ladies and gentlemen…', 'Ready? Here we go!']
    }, cfg.phrases);

    const S = cfg.size;
    const KEY = 'webpet:v1';
    const reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const now = () => performance.now();
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const pick = a => a[(Math.random() * a.length) | 0];
    const groundY = () => Math.max(0, window.innerHeight - S);
    const maxX = () => Math.max(0, window.innerWidth - S);

    /* ---------- DOM (Shadow DOM keeps your site’s CSS out) ---------- */
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = `position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:${cfg.zIndex};`;
    const root = host.attachShadow({ mode: 'open' });

    root.innerHTML = `<style>
:host{all:initial}
.pet{position:absolute;left:0;top:0;width:${S}px;height:${S}px;pointer-events:auto;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;will-change:transform}
.pet.is-drag{cursor:grabbing}
.flip{width:100%;height:100%}
svg{display:block;width:100%;height:100%;overflow:visible}
.bob,.foot,.sprout,.shadow{transform-box:view-box}
.bob{transform-origin:50px 94px}
.foot-l{transform-origin:36px 89px}.foot-r{transform-origin:64px 89px}
.sprout{transform-origin:50px 30px;animation:sway 3s ease-in-out infinite;transition:transform .4s}
.shadow{fill:rgba(0,0,0,.18);transform-origin:50px 96px;transition:opacity .2s}
.body{fill:${C.body};stroke:${C.shade};stroke-width:2}
.belly{fill:${C.belly}}
.foot{fill:${C.shade}}
.blush{fill:${C.blush};opacity:.55}
.ink{fill:${C.ink}}
.line{fill:none;stroke:${C.ink};stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.hl{fill:#fff}
.tear{fill:#7cc6ff}
.paws ellipse{fill:${C.body};stroke:${C.shade};stroke-width:2}
.leaf{fill:${C.leaf}}
.stem{fill:none;stroke:${C.stem};stroke-width:3;stroke-linecap:round}

.e,.m,.tear,.brows,.paws{display:none}
.pet[data-e=open] .e-open,.pet[data-e=closed] .e-closed,.pet[data-e=happy] .e-happy,.pet[data-e=x] .e-x{display:inline}
.pet[data-m=smile] .m-smile,.pet[data-m=open] .m-open,.pet[data-m=o] .m-o,.pet[data-m=frown] .m-frown,.pet[data-m=line] .m-line,.pet[data-m=wave] .m-wave{display:inline}
.pet.mood-sad .tear,.pet.mood-angry .brows,.pet.mood-peek .paws{display:inline}

.is-idle .bob{animation:breathe 2.6s ease-in-out infinite}
.is-sit .bob{animation:sit 2.6s ease-in-out infinite}
.is-sit .foot{transform:scaleY(.6)}
.is-sleep .bob{animation:sit 3.8s ease-in-out infinite}
.is-sleep .sprout{animation:none;transform:rotate(28deg)}
.is-walk .bob{animation:hop .3s ease-in-out infinite alternate}
.is-walk .foot-l{animation:step .3s ease-in-out infinite alternate}
.is-walk .foot-r{animation:step .3s ease-in-out infinite alternate-reverse}
.is-fast .bob,.is-fast .foot{animation-duration:.15s!important}
.is-air .foot{transform:translateY(3px)}
.is-air .shadow,.is-drag .shadow{opacity:0}

.pet.mood-happy .bob,.pet.mood-love .bob{animation:joy .35s ease-in-out infinite alternate}
.pet.mood-dizzy .bob{animation:wobble .6s ease-in-out infinite}
.pet.mood-angry .bob{animation:shake .12s linear infinite}
.pet.mood-sad .bob{animation:none;transform:translateY(2px) scale(1.03,.95)}
.pet.mood-sad .sprout{animation:none;transform:rotate(32deg)}
.pet.is-drag .bob{transform-origin:50px 30px;animation:dangle .9s ease-in-out infinite alternate}
.pet.is-drag .foot{transform:translateY(5px)}

@keyframes breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.03,.97)}}
@keyframes sit{0%,100%{transform:translateY(3px) scale(1.05,.93)}50%{transform:translateY(3px) scale(1.07,.91)}}
@keyframes hop{from{transform:translateY(0) rotate(-2deg)}to{transform:translateY(-5px) rotate(2deg)}}
@keyframes step{from{transform:translateY(0)}to{transform:translateY(-5px)}}
@keyframes sway{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
@keyframes dangle{from{transform:rotate(-10deg)}to{transform:rotate(10deg)}}
@keyframes joy{from{transform:scale(1,1)}to{transform:scale(1.07,.93)}}
@keyframes wobble{0%,100%{transform:rotate(0)}25%{transform:rotate(-9deg)}75%{transform:rotate(9deg)}}
@keyframes shake{0%,100%{transform:translateX(0)}50%{transform:translateX(1.5px)}}

.bubble{position:absolute;left:0;top:0;width:max-content;max-width:min(240px,calc(100vw - 16px));padding:8px 12px;border-radius:14px;background:#fffdf8;color:#2b2230;border:2px solid #2b2230;font:600 13px/1.35 ui-rounded,"SF Pro Rounded","Segoe UI",system-ui,-apple-system,sans-serif;box-shadow:3px 3px 0 rgba(0,0,0,.18);opacity:0;transform:scale(.85);transform-origin:var(--tail,50%) 100%;transition:opacity .15s ease,transform .15s ease;pointer-events:none}
.bubble.show{opacity:1;transform:scale(1)}
.bubble::after{content:"";position:absolute;left:var(--tail,50%);bottom:-7px;width:10px;height:10px;background:inherit;border-right:2px solid #2b2230;border-bottom:2px solid #2b2230;transform:translateX(-50%) rotate(45deg)}
.bubble.below{transform-origin:var(--tail,50%) 0}
.bubble.below::after{bottom:auto;top:-7px;transform:translateX(-50%) rotate(225deg)}

.fx{position:absolute;left:0;top:0;pointer-events:none;font:700 16px/1 system-ui,sans-serif;animation:fx var(--d,1s) ease-out both}
.confetti{width:7px;height:10px;border-radius:2px}
@keyframes fx{0%{opacity:0;transform:translate(var(--x0),var(--y0)) scale(.4)}15%{opacity:1}100%{opacity:0;transform:translate(var(--x1),var(--y1)) scale(1.1) rotate(var(--r,0deg))}}
/* ---------- Work mode: desk, monitor, server rack ---------- */
.desk{position:absolute;left:0;top:0;width:${Math.round(S * 1.4)}px;height:${S}px;pointer-events:none;opacity:0;transition:opacity .25s ease;will-change:transform}
.desk.show{opacity:1}
.desk *{transform-box:fill-box}
.d-wood{fill:#b07d56}.d-wood-dk{fill:#8a5d3b}
.d-frame{fill:#2b2f3a}.d-screen{fill:#14202e}
.d-scroll{animation:scrollcode 2.4s linear infinite}
.d-cursor{fill:#7ef0b1;animation:blinkc .8s steps(1) infinite}
.d-glow{fill:#5fd0ff;animation:glow 2.4s ease-in-out infinite}
.d-rack{fill:#262a33;stroke:#3b4150;stroke-width:1.2}
.d-unit{fill:#323846}
.d-led{animation:led 1s steps(1) infinite}
.d-mug{fill:#fff;stroke:#d8d2c8;stroke-width:1}
.d-steam{fill:none;stroke:#c9c3ba;stroke-width:1.4;stroke-linecap:round;opacity:0;animation:steam 2.6s ease-in-out infinite}
@keyframes scrollcode{from{transform:translateY(0)}to{transform:translateY(-29px)}}
@keyframes blinkc{0%{opacity:1}50%{opacity:0}}
@keyframes glow{0%,100%{opacity:.06}50%{opacity:.16}}
@keyframes led{0%{opacity:1}50%{opacity:.25}}
@keyframes steam{0%{opacity:0;transform:translateY(2px)}40%{opacity:.8}100%{opacity:0;transform:translateY(-6px)}}

.typing-paws{display:none}
.typing-paws ellipse{fill:${C.body};stroke:${C.shade};stroke-width:2;transform-box:fill-box;transform-origin:center}
.is-work .typing-paws{display:inline}
.is-work .bob{animation:focus 1.8s ease-in-out infinite}
.is-work .sprout{animation:sway 1.2s ease-in-out infinite}
.is-work .tp-l{animation:tap .22s ease-in-out infinite alternate}
.is-work .tp-r{animation:tap .22s ease-in-out infinite alternate-reverse}
@keyframes focus{0%,100%{transform:translateY(1px) scale(1.02,.98)}50%{transform:translateY(0) scale(1,1)}}
@keyframes tap{from{transform:translateY(0)}to{transform:translateY(-3px)}}
/* ---------- Read-aloud mode: shades, mic, script card ---------- */
.read-gear{display:none}
.is-read .read-gear{display:inline}
.pet.is-read .e{display:none!important}
.shades{fill:#141821}
.shades-glint{fill:#fff;opacity:.75}
.shades-bridge{fill:none;stroke:#141821;stroke-width:3;stroke-linecap:round}
.is-read .shades-g{animation:shadesOn .45s cubic-bezier(.3,1.6,.5,1) both;transform-box:view-box;transform-origin:50px 56px}
.mic-g{transform-box:view-box;transform-origin:80px 84px}
.is-read .mic-g{animation:micBob .5s ease-in-out infinite alternate}
.mic-head{fill:#b8bec9;stroke:#5b6170;stroke-width:1.4}
.mic-grille{fill:none;stroke:#5b6170;stroke-width:.9}
.mic-handle{fill:#1f2430}
.mic-band{fill:#e5484d}
.mic-cord{fill:none;stroke:#1f2430;stroke-width:1.6;stroke-linecap:round}
.card-g{transform-box:view-box;transform-origin:22px 84px}
.is-read .card-g{animation:cardTilt 1.6s ease-in-out infinite}
.card{fill:#fffdf6;stroke:#d9d2c3;stroke-width:1}
.card-line{fill:none;stroke:#9aa3b2;stroke-width:1.3;stroke-linecap:round}
.read-paw{fill:${C.body};stroke:${C.shade};stroke-width:2}
.is-read .bob{animation:groove .5s ease-in-out infinite alternate}
.is-read .sprout{animation:sway .5s ease-in-out infinite}
@keyframes shadesOn{from{transform:translateY(-16px) rotate(-12deg);opacity:0}to{transform:none;opacity:1}}
@keyframes micBob{from{transform:rotate(-3deg)}to{transform:rotate(3deg) translateY(-1px)}}
@keyframes cardTilt{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(3deg)}}
@keyframes groove{from{transform:rotate(-3deg) scale(1.02,.98)}to{transform:rotate(3deg) scale(.99,1.01)}}
@media (prefers-reduced-motion:reduce){.bob,.foot,.sprout,.desk *,.typing-paws ellipse,.read-gear *{animation:none!important}}
</style>
<div class="desk"><svg viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
 <defs><clipPath id="wp-screen"><rect x="30" y="12" width="46" height="31" rx="2"/></clipPath></defs>
 <path d="M60 50C70 68 94 72 104 68" fill="none" stroke="#3b4150" stroke-width="1.6"/>
 <rect class="d-rack" x="104" y="22" width="32" height="76" rx="3"/>
 <rect class="d-unit" x="108" y="27" width="24" height="12" rx="1.5"/>
 <rect class="d-unit" x="108" y="43" width="24" height="12" rx="1.5"/>
 <rect class="d-unit" x="108" y="59" width="24" height="12" rx="1.5"/>
 <rect class="d-unit" x="108" y="75" width="24" height="12" rx="1.5"/>
 <rect x="122" y="32" width="7" height="1.4" rx=".7" fill="#4b5263"/><rect x="122" y="48" width="7" height="1.4" rx=".7" fill="#4b5263"/>
 <rect x="122" y="64" width="7" height="1.4" rx=".7" fill="#4b5263"/><rect x="122" y="80" width="7" height="1.4" rx=".7" fill="#4b5263"/>
  <circle class="d-led" cx="112" cy="33" r="1.6" fill="#4ade80" style="animation-delay:0.00s;animation-duration:1s"/>
  <circle class="d-led" cx="117" cy="33" r="1.6" fill="#60a5fa" style="animation-delay:0.37s;animation-duration:0.6s"/>
  <circle class="d-led" cx="112" cy="49" r="1.6" fill="#4ade80" style="animation-delay:0.74s;animation-duration:0.6s"/>
  <circle class="d-led" cx="117" cy="49" r="1.6" fill="#fbbf24" style="animation-delay:0.11s;animation-duration:0.8s"/>
  <circle class="d-led" cx="112" cy="65" r="1.6" fill="#4ade80" style="animation-delay:0.48s;animation-duration:0.8s"/>
  <circle class="d-led" cx="117" cy="65" r="1.6" fill="#60a5fa" style="animation-delay:0.85s;animation-duration:1.3s"/>
  <circle class="d-led" cx="112" cy="81" r="1.6" fill="#4ade80" style="animation-delay:0.22s;animation-duration:1.3s"/>
  <circle class="d-led" cx="117" cy="81" r="1.6" fill="#f87171" style="animation-delay:0.59s;animation-duration:1s"/>
 <rect class="d-wood-dk" x="6" y="58" width="5" height="40" rx="1.5"/>
 <rect class="d-wood-dk" x="89" y="58" width="5" height="40" rx="1.5"/>
 <rect class="d-wood" x="0" y="52" width="100" height="7" rx="2"/>
 <rect class="d-frame" x="50" y="44" width="6" height="8"/>
 <ellipse class="d-frame" cx="53" cy="52" rx="10" ry="1.8"/>
 <rect class="d-frame" x="27" y="9" width="52" height="37" rx="4"/>
 <rect class="d-screen" x="30" y="12" width="46" height="31" rx="2"/>
 <g clip-path="url(#wp-screen)">
  <rect class="d-glow" x="30" y="12" width="46" height="31"/>
  <g class="d-scroll">
   <rect x="33" y="15.0" width="18" height="2.4" rx="1.2" fill="#7ef0b1"/>
   <rect x="53" y="15.0" width="10" height="2.4" rx="1.2" fill="#5fd0ff"/>
   <rect x="36" y="19.8" width="24" height="2.4" rx="1.2" fill="#c4b5fd"/>
   <rect x="36" y="24.6" width="14" height="2.4" rx="1.2" fill="#5fd0ff"/>
   <rect x="52" y="24.6" width="16" height="2.4" rx="1.2" fill="#fde68a"/>
   <rect x="33" y="29.4" width="20" height="2.4" rx="1.2" fill="#7ef0b1"/>
   <rect x="36" y="34.2" width="28" height="2.4" rx="1.2" fill="#c4b5fd"/>
   <rect x="33" y="39.0" width="12" height="2.4" rx="1.2" fill="#5fd0ff"/>
   <rect x="47" y="39.0" width="18" height="2.4" rx="1.2" fill="#7ef0b1"/>
   <rect x="33" y="44.0" width="18" height="2.4" rx="1.2" fill="#7ef0b1"/>
   <rect x="53" y="44.0" width="10" height="2.4" rx="1.2" fill="#5fd0ff"/>
   <rect x="36" y="48.8" width="24" height="2.4" rx="1.2" fill="#c4b5fd"/>
   <rect x="36" y="53.6" width="14" height="2.4" rx="1.2" fill="#5fd0ff"/>
   <rect x="52" y="53.6" width="16" height="2.4" rx="1.2" fill="#fde68a"/>
   <rect x="33" y="58.4" width="20" height="2.4" rx="1.2" fill="#7ef0b1"/>
   <rect x="36" y="63.2" width="28" height="2.4" rx="1.2" fill="#c4b5fd"/>
   <rect x="33" y="68.0" width="12" height="2.4" rx="1.2" fill="#5fd0ff"/>
   <rect x="47" y="68.0" width="18" height="2.4" rx="1.2" fill="#7ef0b1"/>
   <rect x="33" y="73.0" width="18" height="2.4" rx="1.2" fill="#7ef0b1"/>
   <rect x="53" y="73.0" width="10" height="2.4" rx="1.2" fill="#5fd0ff"/>
   <rect x="36" y="77.8" width="24" height="2.4" rx="1.2" fill="#c4b5fd"/>
   <rect x="36" y="82.6" width="14" height="2.4" rx="1.2" fill="#5fd0ff"/>
   <rect x="52" y="82.6" width="16" height="2.4" rx="1.2" fill="#fde68a"/>
   <rect x="33" y="87.4" width="20" height="2.4" rx="1.2" fill="#7ef0b1"/>
   <rect x="36" y="92.2" width="28" height="2.4" rx="1.2" fill="#c4b5fd"/>
   <rect x="33" y="97.0" width="12" height="2.4" rx="1.2" fill="#5fd0ff"/>
   <rect x="47" y="97.0" width="18" height="2.4" rx="1.2" fill="#7ef0b1"/>
  </g>
  <rect class="d-cursor" x="68" y="38" width="5" height="2.6"/>
 </g>
 <rect x="2" y="49" width="24" height="3.4" rx="1.2" fill="#3b4150"/>
 <rect x="4" y="49.6" width="20" height="1" rx=".5" fill="#6b7280"/>
 <rect class="d-mug" x="84" y="43" width="8" height="9" rx="1.6"/>
 <path d="M92 45.5q3 0 3 2.5t-3 2.5" fill="none" stroke="#d8d2c8" stroke-width="1.2"/>
 <path class="d-steam" d="M86.5 41q-1.5-2 0-4t0-4"/>
 <path class="d-steam" d="M89.5 41q-1.5-2 0-4t0-4" style="animation-delay:1.3s"/>
</svg></div>
<div class="pet is-idle" data-e="open" data-m="smile">
 <div class="flip">
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
   <ellipse class="shadow" cx="50" cy="96" rx="27" ry="4"/>
   <g class="bob">
    <ellipse class="foot foot-l" cx="36" cy="89" rx="9" ry="6"/>
    <ellipse class="foot foot-r" cx="64" cy="89" rx="9" ry="6"/>
    <g class="sprout">
     <path class="stem" d="M50 31Q48 21 51 13"/>
     <path class="leaf" d="M51 15Q59 4 69 9Q62 19 51 15Z"/>
     <path class="leaf" d="M49.5 20Q41 11 33 16Q40 25 49.5 20Z"/>
    </g>
    <path class="body" d="M50 29C75 29 88 47 88 65C88 83 73 92 50 92C27 92 12 83 12 65C12 47 25 29 50 29Z"/>
    <ellipse class="belly" cx="50" cy="76" rx="21" ry="12"/>
    <ellipse class="blush" cx="27" cy="66" rx="6" ry="3.5"/>
    <ellipse class="blush" cx="73" cy="66" rx="6" ry="3.5"/>
    <g class="e e-open"><g class="pupils">
     <ellipse class="ink" cx="38" cy="56" rx="4.6" ry="6"/>
     <ellipse class="ink" cx="62" cy="56" rx="4.6" ry="6"/>
     <circle class="hl" cx="39.6" cy="53.6" r="1.7"/>
     <circle class="hl" cx="63.6" cy="53.6" r="1.7"/>
    </g></g>
    <g class="e e-closed line"><path d="M33 56Q38 60 43 56"/><path d="M57 56Q62 60 67 56"/></g>
    <g class="e e-happy line"><path d="M33 58Q38 51 43 58"/><path d="M57 58Q62 51 67 58"/></g>
    <g class="e e-x line"><path d="M34 52L42 60M42 52L34 60"/><path d="M58 52L66 60M66 52L58 60"/></g>
    <g class="brows line"><path d="M32 46L43 50"/><path d="M68 46L57 50"/></g>
    <path class="m m-smile line" d="M45 66Q50 71 55 66"/>
    <path class="m m-open ink" d="M43.5 65Q50 76 56.5 65Z"/>
    <ellipse class="m m-o ink" cx="50" cy="68" rx="3" ry="3.6"/>
    <path class="m m-frown line" d="M45 70Q50 65 55 70"/>
    <path class="m m-line line" d="M46.5 68L53.5 68"/>
    <path class="m m-wave line" d="M43 68Q46.5 65 50 68T57 68"/>
    <path class="tear" d="M68 59Q72 66 68 69Q64 66 68 59Z"/>
    <g class="typing-paws"><ellipse class="tp-l" cx="76" cy="70" rx="7" ry="5"/><ellipse class="tp-r" cx="86" cy="66" rx="6.5" ry="4.6"/></g>
    <g class="read-gear">
     <g class="shades-g">
      <path class="shades" d="M27 50.5H47Q48 50.5 47.6 52.5L46.4 58Q45.4 62.5 39.5 62.5H35.5Q29.5 62.5 28.4 58L26.6 52.5Q26.2 50.5 27 50.5Z"/>
      <path class="shades" d="M53 50.5H73Q73.8 50.5 73.4 52.5L71.6 58Q70.6 62.5 64.5 62.5H60.5Q54.6 62.5 53.6 58L52.4 52.5Q52 50.5 53 50.5Z"/>
      <path class="shades-bridge" d="M47 52.5Q50 50.5 53 52.5M27 51.5L19 49M73 51.5L81 49"/>
      <path class="shades-glint" d="M30 52.5h4l-3 6h-2.6Z"/>
      <path class="shades-glint" d="M56 52.5h4l-3 6h-2.6Z"/>
     </g>
     <g class="card-g">
      <rect class="card" x="9" y="63" width="20" height="25" rx="2" transform="rotate(-8 19 75)"/>
      <path class="card-line" d="M12.5 69.5l12-1.7M13 74l11-1.6M13.6 78.5l8-1.1M14.2 83l10.5-1.5" />
      <ellipse class="read-paw" cx="22" cy="84" rx="7" ry="5"/>
     </g>
     <g class="mic-g">
      <path class="mic-cord" d="M82 90Q86 97 94 96"/>
      <path class="mic-handle" d="M73.2 69.8L77.5 67.4L85 87.5Q85.6 89.6 83.5 90.4Q81.4 91.1 80.6 89Z"/>
      <rect class="mic-band" x="73.6" y="70.5" width="5.4" height="2.4" rx=".8" transform="rotate(-20 76.3 71.7)"/>
      <circle class="mic-head" cx="72.6" cy="65.4" r="6"/>
      <path class="mic-grille" d="M67 64.2q5.6-2.4 11.2 0M67.4 67.6q5.2-2.2 10.4 0M70.4 59.8l-1.3 11.2M74.6 59.9l-1.2 11.1"/>
      <ellipse class="read-paw" cx="80" cy="80" rx="7" ry="5.2"/>
     </g>
    </g>
    <g class="paws"><ellipse cx="38" cy="58" rx="9.5" ry="7.5"/><ellipse cx="62" cy="58" rx="9.5" ry="7.5"/></g>
   </g>
  </svg>
 </div>
</div>
<div class="bubble"></div>`;
    document.body.appendChild(host);

    const pet = root.querySelector('.pet');
    const flip = root.querySelector('.flip');
    const pupils = root.querySelector('.pupils');
    const bubble = root.querySelector('.bubble');
    const desk = root.querySelector('.desk');
    const DW = Math.round(S * 1.4);

    /* ---------- State ---------- */
    let x = 0, y = 0, vx = 0, vy = 0, facing = 1, onGround = true;
    let state = 'idle', fast = false, targetX = 0, arriveCb = null;
    let mood = null, moodUntil = 0, busyUntil = 0;
    let lastActivity = now(), nextThink = now() + 2500;
    let nextBlink = now() + 3000, blinkUntil = 0, nextZ = 0;
    let pointer = { x: -1, y: -1, t: -1e9 };
    let bubbleUntil = 0, bubbleW = 0, bubbleH = 0;
    let drag = null, pokes = [], thrown = false, impactSeen = false, firstImpact = 0;
    let hidden = false, intro = false, alive = true, lastOops = 0;
    let busy = null, deskSide = 1, nextWorkChat = 0, nextNote = 0; // busy: null | 'work' | 'read'

    let saved = null;
    if (cfg.persist) { try { saved = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (_) {} }
    if (saved && typeof saved.x === 'number') {
      x = clamp(saved.x, 0, maxX()); y = groundY(); facing = saved.f === -1 ? -1 : 1; hidden = !!saved.hidden;
      if (hidden) host.style.display = 'none';
    } else {
      x = clamp(window.innerWidth * 0.8 - S / 2, 0, maxX()); y = -S; intro = true;
      launch(0, 0, false);
    }

    function save() {
      if (!cfg.persist) return;
      try { sessionStorage.setItem(KEY, JSON.stringify({ x: Math.round(x), f: facing, hidden })); } catch (_) {}
    }

    function setState(s) { state = s; if (s !== 'walk') fast = false; }
    function setMood(m, ms) { mood = m; moodUntil = now() + ms; busyUntil = Math.max(busyUntil, moodUntil); }
    function chat(list, p) { if (cfg.chatty && Math.random() < (p == null ? 1 : p)) say(pick(list)); }

    /* ---------- Speech + effects ---------- */
    function say(text, ms) {
      if (!text || hidden) return;
      text = String(text);
      bubble.textContent = text;
      bubble.style.left = '0px';
      bubble.classList.add('show');
      bubbleW = bubble.offsetWidth; bubbleH = bubble.offsetHeight;
      bubbleUntil = now() + (ms || clamp(1400 + text.length * 60, 1800, 6500));
      positionBubble();
    }

    function positionBubble() {
      const cx = x + S / 2;
      const bx = clamp(cx - bubbleW / 2, 8, window.innerWidth - bubbleW - 8);
      let by = y + S * 0.05 - bubbleH - 8;
      const below = by < 8;
      if (below) by = y + S + 10;
      bubble.classList.toggle('below', below);
      bubble.style.left = bx + 'px';
      bubble.style.top = by + 'px';
      bubble.style.setProperty('--tail', clamp(cx - bx, 16, bubbleW - 16) + 'px');
    }

    function burst(ch, n, color, o) {
      o = o || {};
      if (hidden) return;
      const cx = x + S / 2, cy = y + S * 0.28;
      const count = reduced ? Math.min(n, 2) : n;
      for (let i = 0; i < count; i++) {
        const s = document.createElement('span');
        s.className = 'fx';
        s.textContent = ch;
        s.style.color = color;
        const sp = o.spread == null ? 40 : o.spread, up = o.up == null ? 70 : o.up;
        s.style.setProperty('--x0', (cx - 8) + 'px');
        s.style.setProperty('--y0', cy + 'px');
        s.style.setProperty('--x1', (cx - 8 + (o.dx || 0) + rand(-sp, sp)) + 'px');
        s.style.setProperty('--y1', (cy - rand(up * 0.6, up * 1.3)) + 'px');
        s.style.setProperty('--r', rand(-30, 30) + 'deg');
        s.style.setProperty('--d', (o.dur || rand(0.8, 1.2)) + 's');
        s.style.fontSize = (o.size || rand(14, 20)) + 'px';
        s.style.animationDelay = (i * 0.06) + 's';
        s.addEventListener('animationend', () => s.remove());
        root.appendChild(s);
      }
    }

    function confetti(n) {
      if (hidden) return;
      const colors = ['#ff5c8a', '#ffc93c', '#4cc9a6', '#6c8cff', '#c77dff'];
      const cx = x + S / 2, cy = y + S * 0.3;
      const count = reduced ? 6 : n;
      for (let i = 0; i < count; i++) {
        const s = document.createElement('span');
        s.className = 'fx confetti';
        s.style.background = pick(colors);
        s.style.setProperty('--x0', cx + 'px');
        s.style.setProperty('--y0', cy + 'px');
        s.style.setProperty('--x1', (cx + rand(-150, 150)) + 'px');
        s.style.setProperty('--y1', (cy - rand(40, 190)) + 'px');
        s.style.setProperty('--r', rand(-540, 540) + 'deg');
        s.style.setProperty('--d', rand(0.9, 1.5) + 's');
        s.addEventListener('animationend', () => s.remove());
        root.appendChild(s);
      }
    }

    /* ---------- Movement ---------- */
    function launch(vx0, vy0, isThrow) {
      vx = vx0; vy = vy0; onGround = false; thrown = isThrow; impactSeen = false; firstImpact = 0;
      arriveCb = null; setState('air');
    }

    function hop(v) {
      if (!onGround || state === 'drag' || state === 'sleep') return;
      launch(0, -(v || 360), false);
    }

    function walkTo(tx, isFast, cb) {
      if (!onGround || state === 'drag' || busy) return;
      if (state === 'sleep') wake(true);
      targetX = clamp(tx, 0, maxX());
      if (Math.abs(targetX - x) < 4) { setState('idle'); if (cb) cb(); return; }
      arriveCb = cb || null;
      setState('walk'); fast = !!isFast;
      facing = targetX > x ? 1 : -1;
    }

    function land() {
      if (busy) { thrown = false; intro = false; enterBusy(); return; }
      setState('idle');
      nextThink = now() + rand(1200, 3000);
      const hard = firstImpact > 1100;
      thrown = false;
      if (intro) { intro = false; react('happy', `Hi! I’m ${cfg.name}.`); }
      else if (hard) { react('dizzy'); chat(P.land); }
    }

    function sleep() {
      if (!onGround || state === 'drag' || busy) return;
      setState('sleep'); mood = null; bubble.classList.remove('show');
    }

    function wake(quiet) {
      if (state !== 'sleep') return;
      setState('idle'); lastActivity = now(); nextThink = now() + 1500;
      if (!quiet) { setMood('surprised', 900); chat(P.wake, 0.6); }
    }

    function activity() { lastActivity = now(); if (state === 'sleep') wake(); }

    function lookAround() {
      const f = facing; facing = -f;
      setTimeout(() => { if (state === 'idle') facing = f; }, 700);
      setTimeout(() => { if (state === 'idle' && Math.random() < 0.4) burst('?', 1, C.ink, { spread: 4, up: 40 }); }, 1100);
    }

    /* ---------- Busy modes: 'work' (desk + computer) and 'read' (shades + mic) ---------- */
    function enterBusy() {
      if (busy === 'work') {
        // Put the desk on whichever side has room, and face it.
        deskSide = x + S * 0.7 + DW <= window.innerWidth ? 1 : -1;
        facing = deskSide;
      }
      setState(busy);
    }

    function startBusy(kind, text, openers) {
      if (state === 'sleep') wake(true);
      busy = kind; activity();
      mood = null; moodUntil = 0; busyUntil = 0; arriveCb = null;
      nextWorkChat = now() + 3500; nextNote = now() + 900;
      if (onGround && state !== 'drag') enterBusy();
      if (text !== null && (text || cfg.chatty)) say(text || pick(openers));
    }

    function stopBusy(kind, m, text) {
      if (busy !== kind) return;
      busy = null; activity();
      if (state === kind) setState('idle');
      nextThink = now() + rand(1500, 3000);
      if (m) react(m, text); else if (text) say(text);
    }

    const work = text => startBusy('work', text, P.workStart);
    const stopWork = (m, text) => stopBusy('work', m, text);
    const readAloud = text => startBusy('read', text, P.readStart);
    const stopReading = (m, text) => stopBusy('read', m, text);

    function positionDesk() {
      const show = busy === 'work' && state === 'work';
      desk.classList.toggle('show', show);
      if (!show) return;
      const left = deskSide === 1 ? x + S * 0.7 : x + S * 0.3 - DW;
      desk.style.transform = `translate3d(${left.toFixed(1)}px,${y.toFixed(1)}px,0) scaleX(${deskSide})`;
    }

    /* ---------- Reactions (public) ---------- */
    function react(m, text) {
      if (hidden) return;
      activity();
      if (state === 'walk') setState('idle');
      switch (m) {
        case 'love': setMood('love', 1800); hop(300); burst('♥', 7, '#ff5c8a'); break;
        case 'sad': setMood('sad', 2800); break;
        case 'surprised': setMood('surprised', 1100); hop(240); burst('!', 1, C.ink, { spread: 6, up: 50, size: 22 }); break;
        case 'confused': setMood('confused', 1800); burst('?', 2, C.ink, { spread: 18, up: 50 }); break;
        case 'dizzy': setMood('dizzy', 2200); burst('★', 5, '#f5b400'); break;
        case 'angry': setMood('angry', 1600); burst('#', 2, '#e5484d', { spread: 14, up: 45 }); break;
        case 'celebrate': setMood('happy', 2200); hop(440); confetti(24); break;
        case 'sleep': sleep(); break;
        case 'happy':
        default: setMood('happy', 1400); hop(320); burst('♥', 3, '#ff5c8a');
      }
      if (text) say(text);
    }

    function oops() {
      const t = now(); if (t - lastOops < 4000) return; lastOops = t;
      react('sad', cfg.chatty ? pick(P.error) : null);
    }

    /* ---------- Brain ---------- */
    function think(t) {
      nextThink = t + rand(2500, 7000);
      const r = Math.random();
      if (state === 'sit') { setState('idle'); if (r < 0.5) return; }
      if (r < 0.40) walkTo(rand(0, maxX()));
      else if (r < 0.52) { setState('sit'); nextThink = t + rand(4000, 9000); }
      else if (r < 0.64) lookAround();
      else if (r < 0.74 && t - pointer.t < 3000) walkTo(pointer.x - S / 2, true, () => react('happy'));
      else if (r < 0.82) chat(P.idle);
      else if (r < 0.88 && !reduced) hop(300);
    }

    function update(dt, t) {
      const G = groundY(), MX = maxX();
      if (mood && t > moodUntil) mood = null;
      if (t > bubbleUntil && bubble.classList.contains('show')) bubble.classList.remove('show');
      if (t > nextBlink) { blinkUntil = t + 140; nextBlink = t + rand(2200, 5200); }

      if (state === 'drag') return;

      if (!onGround) {
        vy += 2300 * dt; x += vx * dt; y += vy * dt;
        if (x < 0) { x = 0; vx = Math.abs(vx) * 0.5; } else if (x > MX) { x = MX; vx = -Math.abs(vx) * 0.5; }
        if (y < 0 && vy < 0) { y = 0; vy = -vy * 0.3; }
        if (vx > 40) facing = 1; else if (vx < -40) facing = -1;
        if (y >= G) {
          y = G;
          if (!impactSeen) { impactSeen = true; firstImpact = vy; }
          if (vy > 700) { vy = -vy * 0.36; vx *= 0.6; }
          else { vy = 0; vx = 0; onGround = true; land(); }
        }
        return;
      }

      y = G;
      if (state === 'walk') {
        const d = targetX - x, step = (fast ? 240 : 72) * dt;
        if (Math.abs(d) <= step) {
          x = targetX; setState('idle'); nextThink = t + rand(1500, 4000);
          const cb = arriveCb; arriveCb = null; if (cb) cb();
        } else { x += Math.sign(d) * step; facing = Math.sign(d); }
      }
      x = clamp(x, 0, MX);

      if (state === 'work') {
        facing = deskSide;
        if (cfg.chatty && t > nextWorkChat && t > bubbleUntil) { nextWorkChat = t + rand(3500, 6000); say(pick(P.work)); }
        return;
      }
      if (state === 'read') {
        if (t > nextNote) {
          nextNote = t + rand(1100, 1900);
          burst(pick(['♪', '♫']), 1, pick(['#6c8cff', '#ff5c8a', '#4cc9a6']), { spread: 10, dx: 26 * facing, up: 55, size: rand(14, 19), dur: 1.6 });
        }
        return;
      }

      if (state === 'sleep' && t > nextZ) {
        nextZ = t + 1300;
        burst('z', 1, C.ink, { spread: 4, dx: 22 * facing, up: 45, size: rand(11, 17), dur: 2.2 });
      }
      if ((state === 'idle' || state === 'sit') && t > busyUntil && mood !== 'peek') {
        if (!mood && t - lastActivity > cfg.sleepAfter) sleep();
        else if (t > nextThink) think(t);
      }
    }

    function face(t) {
      if (state === 'sleep') return ['closed', 'line'];
      if (state === 'work' && !mood) return [t < blinkUntil ? 'closed' : 'open', 'line'];
      if (state === 'read' && !mood) return ['open', ['open', 'o', 'open', 'smile', 'o', 'line'][Math.floor(t / 130) % 6]];
      const e = t < blinkUntil ? 'closed' : 'open';
      switch (mood) {
        case 'happy': case 'love': return ['happy', 'open'];
        case 'peek': return ['closed', 'smile'];
        case 'sad': case 'angry': return [e, 'frown'];
        case 'surprised': return ['open', 'o'];
        case 'dizzy': return ['x', 'wave'];
        case 'confused': return [e, 'wave'];
      }
      if (state === 'drag' || (state === 'air' && thrown)) return ['open', 'o'];
      return [e, 'smile'];
    }

    let lastCls = '', lastE = '', lastM = '';
    function render(t) {
      pet.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      flip.style.transform = `scaleX(${facing})`;
      const cls = 'pet is-' + state + (fast ? ' is-fast' : '') + (mood ? ' mood-' + mood : '');
      if (cls !== lastCls) { pet.className = cls; lastCls = cls; }
      const f = face(t);
      if (f[0] !== lastE) { pet.setAttribute('data-e', f[0]); lastE = f[0]; }
      if (f[1] !== lastM) { pet.setAttribute('data-m', f[1]); lastM = f[1]; }

      let dx = 0, dy = 0;
      if (state === 'work') { dx = 2.2 + Math.sin(t / 260) * 1.3; dy = -1.2 + (Math.sin(t / 1300) > 0.6 ? 1.4 : 0); }
      else if (t - pointer.t < 4000) {
        const ax = pointer.x - (x + S / 2), ay = pointer.y - (y + S * 0.56);
        const d = Math.hypot(ax, ay) || 1, k = Math.min(1, d / 120);
        dx = (ax / d) * 3.2 * k * facing; dy = (ay / d) * 2.4 * k;
      } else if (state === 'walk') dx = 2.4;
      pupils.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);

      positionDesk();
      if (bubble.classList.contains('show')) positionBubble();
    }

    let last = now();
    function frame(t) {
      if (!alive) return;
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (!hidden) { update(dt, t); render(t); }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    const saveTimer = setInterval(save, 5000);

    /* ---------- Pet interactions: poke, drag, throw ---------- */
    function poke() {
      const t = now();
      pokes = pokes.filter(p => t - p < 2000); pokes.push(t);
      if (state === 'sleep') { wake(true); react('surprised', pick(P.wake)); return; }
      if (pokes.length >= 5) { pokes = []; react('dizzy', pick(P.dizzy)); return; }
      react(Math.random() < 0.6 ? 'happy' : 'love');
      chat(P.poke, 0.6);
    }

    function startDrag() {
      activity(); wake(true);
      mood = null; arriveCb = null; onGround = false; thrown = false;
      setState('drag');
      chat(P.grab, 0.5);
    }

    pet.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault(); e.stopPropagation();
      try { pet.setPointerCapture(e.pointerId); } catch (_) {}
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: e.clientX - x, oy: e.clientY - y, moved: false, samples: [{ x: e.clientX, y: e.clientY, t: now() }] };
    });
    pet.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) { drag.moved = true; startDrag(); }
      if (drag.moved) {
        x = clamp(e.clientX - drag.ox, 0, maxX());
        y = clamp(e.clientY - drag.oy, 0, groundY());
        drag.samples.push({ x: e.clientX, y: e.clientY, t: now() });
        if (drag.samples.length > 8) drag.samples.shift();
      }
    });
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      if (!d.moved) { poke(); return; }
      const t = now(), s = d.samples.filter(p => t - p.t < 100);
      let tvx = 0, tvy = 0;
      if (s.length >= 2) {
        const a = s[0], b = s[s.length - 1], dts = Math.max(0.016, (b.t - a.t) / 1000);
        tvx = clamp((b.x - a.x) / dts, -1600, 1600); tvy = clamp((b.y - a.y) / dts, -1600, 1600);
      }
      launch(tvx, tvy, Math.hypot(tvx, tvy) > 500);
      if (thrown) chat(P.thrown, 0.7);
    }
    pet.addEventListener('pointerup', endDrag);
    pet.addEventListener('pointercancel', endDrag);

    /* ---------- Page / app events ---------- */
    const listeners = [];
    const on = (tgt, ev, fn, opt) => { tgt.addEventListener(ev, fn, opt); listeners.push([tgt, ev, fn, opt]); };
    const fromPet = e => (e.composedPath ? e.composedPath() : []).indexOf(host) !== -1;
    const closest = (el, sel) => (el && el.closest ? el.closest(sel) : null);
    const isField = el => !!el && (el.tagName === 'TEXTAREA' || el.isContentEditable ||
      (el.tagName === 'INPUT' && !/^(button|submit|reset|checkbox|radio|range|color|file|image|hidden)$/i.test(el.type)));

    on(document, 'pointermove', e => {
      pointer = { x: e.clientX, y: e.clientY, t: now() };
      lastActivity = pointer.t;
      if (state === 'sleep' && Math.hypot(e.clientX - (x + S / 2), e.clientY - (y + S / 2)) < 120) wake();
    }, { passive: true });

    on(document, 'pointerdown', e => {
      if (fromPet(e)) return;
      activity();
      if (hidden || state === 'drag') return;
      const t = e.target;
      if (closest(t, '[data-pet-ignore]')) return;
      const tagged = closest(t, '[data-pet-say],[data-pet-react]');
      if (tagged) {
        const m = tagged.getAttribute('data-pet-react'), s = tagged.getAttribute('data-pet-say');
        if (m) react(m); if (s) say(s);
        return;
      }
      if (state === 'walk' || !onGround) return;
      facing = e.clientX > x + S / 2 ? 1 : -1;
      if (closest(t, 'button,a[href],[role="button"],input[type="submit"],input[type="button"],summary')) {
        if (Math.random() < 0.35) { react('surprised'); chat(P.button, 0.4); }
        return;
      }
      if (closest(t, 'input,textarea,select,[contenteditable]')) return;
      if (Math.random() < 0.3) walkTo(e.clientX - S / 2, true, () => (Math.random() < 0.5 ? react('confused') : lookAround()));
    }, true);

    on(document, 'keydown', e => {
      if (e.altKey && e.shiftKey && e.code === 'KeyP') { e.preventDefault(); toggle(); return; }
      activity();
    }, true);

    on(document, 'focusin', e => {
      const el = e.target;
      if (!isField(el) || hidden) return;
      activity();
      if (el.type === 'password') {
        if (state === 'walk') setState('idle');
        mood = 'peek'; moodUntil = Infinity;
        chat(P.password, 0.8);
        return;
      }
      if (closest(el, '[data-pet-ignore]')) return;
      const r = el.getBoundingClientRect(), tx = r.left + r.width / 2 - S / 2;
      if (Math.abs(tx - x) > S) walkTo(tx, false);
    }, true);

    on(document, 'focusout', () => { if (mood === 'peek') { mood = null; moodUntil = 0; busyUntil = 0; } }, true);

    let lastTypeReact = 0;
    on(document, 'input', e => {
      if (!isField(e.target) || e.target.type === 'password') return;
      activity();
      const t = now();
      if (t - lastTypeReact > 6000) {
        lastTypeReact = t;
        if (Math.random() < 0.35) chat(P.typing);
        else if (Math.random() < 0.3) hop(200);
      }
    }, true);

    // Deferred so an app that puts the pet to work on submit can skip the celebration.
    on(document, 'submit', () => setTimeout(() => { if (!busy) react('celebrate', cfg.chatty ? pick(P.submit) : null); }, 0), true);
    on(document, 'copy', () => react('happy', cfg.chatty ? pick(P.copy) : null), true);

    let lastSY = window.scrollY, lastST = now(), lastScrollReact = 0;
    on(window, 'scroll', () => {
      const t = now(), sy = window.scrollY;
      const v = Math.abs(sy - lastSY) / Math.max(1, t - lastST) * 1000;
      lastSY = sy; lastST = t; lastActivity = t;
      if (v > 4000 && t - lastScrollReact > 5000 && onGround && state !== 'sleep' && state !== 'drag') {
        lastScrollReact = t; react('surprised'); chat(P.scroll, 0.6);
      }
    }, { passive: true });

    on(window, 'error', oops);
    on(window, 'unhandledrejection', oops);
    on(window, 'offline', () => react('sad', pick(P.offline)));
    on(window, 'online', () => react('happy', pick(P.online)));

    let hiddenAt = 0;
    on(document, 'visibilitychange', () => {
      if (document.hidden) { hiddenAt = now(); save(); }
      else if (hiddenAt && now() - hiddenAt > 15000) react('love', cfg.chatty ? pick(P.welcome) : null);
    });

    on(window, 'resize', () => { x = clamp(x, 0, maxX()); if (onGround) y = groundY(); });
    on(window, 'pagehide', save);

    on(window, 'webpet', e => {
      const d = e.detail;
      if (typeof d === 'string') { react(d); return; }
      if (!d) return;
      if (d.action && typeof api[d.action] === 'function') api[d.action](d.value);
      if (d.mood) react(d.mood);
      if (d.say) say(d.say, d.duration);
    });

    let origPush = null;
    if (cfg.watchRoutes && window.history && history.pushState) {
      const onNav = () => setTimeout(() => {
        if (onGround && state !== 'sleep' && state !== 'drag') { hop(260); chat(P.navigate, 0.25); }
      }, 50);
      origPush = history.pushState;
      history.pushState = function () { const r = origPush.apply(this, arguments); onNav(); return r; };
      on(window, 'popstate', onNav);
    }

    /* ---------- Public API ---------- */
    function hide() { hidden = true; host.style.display = 'none'; bubble.classList.remove('show'); save(); }
    function show() { hidden = false; host.style.display = ''; save(); react('happy'); }
    function toggle() { hidden ? show() : hide(); }
    function destroy() {
      alive = false; clearInterval(saveTimer);
      listeners.forEach(([t, ev, fn, opt]) => t.removeEventListener(ev, fn, opt));
      if (origPush) history.pushState = origPush;
      host.remove(); delete window.WebPet;
    }

    const api = {
      say, react, hide, show, toggle, destroy, work, stopWork, readAloud, stopReading,
      get working() { return busy === 'work'; },
      get reading() { return busy === 'read'; },
      jump: h => hop(h || 380),
      walkTo: px => walkTo(px, false),
      runTo: px => walkTo(px, true),
      sleep: () => sleep(),
      wake: () => wake(),
      celebrate: text => react('celebrate', text),
      get state() { return state; },
      get mood() { return mood; },
      get element() { return host; }
    };
    window.WebPet = api;
  }

  // Manual start for frameworks (React, Vue…): WebPetBoot(config)
  window.WebPetBoot = function (config) {
    if (config) window.WebPetConfig = config;
    if (document.body) boot();
    return window.WebPet || null;
  };

  if (window.WebPetConfig && window.WebPetConfig.autoStart === false) return;
  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
