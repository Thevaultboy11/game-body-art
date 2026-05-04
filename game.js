const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const dialogueBox = document.getElementById('dialogue');
const npcNameEl = document.getElementById('npc-name');
const dialogueTextEl = document.getElementById('dialogue-text');
const choicesEl = document.getElementById('choices');
const dashLines = document.getElementById('dash-lines');
const analytics = document.getElementById('analytics');
const analyticsList = document.getElementById('analytics-list');
const endingEl = document.getElementById('ending');

const worldWidth = 3000;
const groundY = 430;
const keys = {};
let cameraX = 0;
let activeInteraction = null;
let gameEnded = false;

const state = {
  trait: 'Empty',
  risk: '00.0%',
  classification: 'Unassigned',
  logs: [],
  colorShift: 0,
  i1: null,
  i2: null,
  locked: false,
};

const player = { x: 120, y: groundY - 48, w: 28, h: 48, vx: 0, vy: 0, speed: 3.4, jump: 11, onGround: false };

const npcs = [
  { id: 'collector', x: 760, label: 'Data Collector', prompt: 'Lovely day, isn\'t it? I\'m doing a small community survey. Completely voluntary. When you have free time, do you prefer walking through the crowded market, or taking the quiet path by the old canal?' },
  { id: 'scorer', x: 1560, label: 'The Scorer', prompt: 'Routine ticket check. We are optimizing our transit schedules. Are you planning to travel outside the district tonight, or will you remain within the perimeter until tomorrow?' },
  { id: 'gatekeeper', x: 2480, label: 'The Gatekeeper', prompt: 'Halt. Please step onto the scanner. Let the system read your profile.' },
];

function logEvent(text){ state.logs.push(text); const li=document.createElement('li'); li.textContent=text; analyticsList.appendChild(li); }

function updateDashboard(extra='') {
  dashLines.textContent = `SYSTEM STATUS: ONLINE\nSUBJECT ID: Pending...\nTRAITS: ${state.trait}\nRISK SCORE: ${state.risk}\nCLASSIFICATION: ${state.classification}${extra ? `\n\n${extra}` : ''}`;
}

function openDialogue(npc) {
  dialogueBox.classList.remove('hidden');
  npcNameEl.textContent = npc.label;
  dialogueTextEl.textContent = npc.prompt;
  choicesEl.innerHTML = '';
  activeInteraction = npc.id;

  const optionsByNpc = {
    collector: [
      ['The crowded market. I like the energy.', () => finishI1('crowd')],
      ['The quiet path. I prefer being alone.', () => finishI1('quiet')],
      ['Walk away without answering.', () => finishI1('away')],
    ],
    scorer: [
      ["I'm traveling tonight.", () => finishI2('travel')],
      ["I'll stay within the perimeter until tomorrow.", () => finishI2('stay')],
    ],
    gatekeeper: [
      ["Wait! Look at my ID, I have a flawless civic record. I've never committed a crime!", () => finishI3()],
      ["I'm a registered citizen with a valid exit permit right here!", () => finishI3()],
    ],
  };

  optionsByNpc[npc.id].forEach(([label, fn]) => {
    const b = document.createElement('button'); b.textContent = label; b.onclick = fn; choicesEl.appendChild(b);
  });
}

function closeDialogue(){ dialogueBox.classList.add('hidden'); activeInteraction = null; }

function finishI1(choice){
  state.i1 = choice;
  if (choice === 'crowd') state.trait = 'Drawn to chaotic environments. Potential for mob-mentality incitement.';
  if (choice === 'quiet') state.trait = 'Socially withdrawn. Exhibits evasive, anti-social tendencies.';
  if (choice === 'away') state.trait = 'Non-compliant. Refuses standard civic engagement.';
  logEvent(`Interaction 1 recorded as ${choice}. Trait reassigned.`);
  closeDialogue(); updateDashboard();
}

function finishI2(choice){
  state.i2 = choice;
  let alert = 'SYSTEM ALERT: PATTERN DETECTED';
  if (state.i1 === 'quiet' && choice === 'travel') alert = 'Flag: Smuggling/Covert Action.';
  else if (state.i1 === 'crowd' && choice === 'stay') alert = 'Flag: Radicalization/Agitation.';
  else if (state.i1 === 'away') alert = 'Flag: Flight Risk.';
  else alert = 'Flag: Behavioral anomaly.';
  state.risk = '87.4%';
  state.classification = 'High Severity';
  logEvent(`Interaction 2 linked with prior inputs. ${alert}`);
  closeDialogue(); updateDashboard(alert);
}

function finishI3(){
  state.classification = 'CRIMINALIZED'; state.locked = true; state.colorShift = 1;
  logEvent('Contradictory evidence submitted. Outlier ignored. Inputs locked.');
  closeDialogue();
  updateDashboard('CONTRADICTION DETECTED: Valid record / permit. ACTION: Ignored. INPUTS: LOCKED.');
  setTimeout(() => {
    endingEl.classList.remove('hidden');
    endingEl.textContent = 'Data collection complete. No further action required. Classification remains.';
    gameEnded = true;
  }, 1500);
}

function drawScene(){
  const t = state.colorShift;
  const sky = Math.floor(125 - 70*t);
  const g = Math.floor(215 - 140*t);
  const b = Math.floor(255 - 180*t);
  ctx.fillStyle = `rgb(${sky},${g},${b})`; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = `rgb(${70-20*t},${160-90*t},${70-40*t})`;
  ctx.fillRect(0, groundY, canvas.width, canvas.height-groundY);

  const objs=[{x:500,w:120,h:80,c:'#b78f62'},{x:1150,w:140,h:100,c:'#8f9bbd'},{x:2100,w:180,h:120,c:'#7f6c6c'}];
  objs.forEach(o=>{const sx=o.x-cameraX;if(sx>-200&&sx<canvas.width+200){ctx.fillStyle=o.c;ctx.fillRect(sx,groundY-o.h,o.w,o.h);}});

  npcs.forEach(n=>{const sx=n.x-cameraX;if(sx>-40&&sx<canvas.width+40){ctx.fillStyle='#ffd76f';ctx.fillRect(sx,groundY-44,20,44);ctx.fillStyle='#000';ctx.fillText('E',sx+6,groundY-52);}});
  ctx.fillStyle = '#fff'; ctx.fillRect(player.x-cameraX, player.y, player.w, player.h);
}

function tick(){
  if (!gameEnded && !activeInteraction) {
    const left = keys['a'] || keys['ArrowLeft']; const right = keys['d'] || keys['ArrowRight'];
    player.vx = left ? -player.speed : right ? player.speed : 0;
    if ((keys['w'] || keys['ArrowUp'] || keys[' ']) && player.onGround) { player.vy = -player.jump; player.onGround = false; }
    player.vy += 0.5;
    player.x = Math.max(0, Math.min(worldWidth-player.w, player.x + player.vx));
    player.y += player.vy;
    if (player.y + player.h >= groundY) { player.y = groundY-player.h; player.vy = 0; player.onGround = true; }
    cameraX = Math.max(0, Math.min(worldWidth-canvas.width, player.x - canvas.width/2));

    if (state.locked) state.colorShift = Math.min(1, state.colorShift + 0.0025);
  }

  drawScene();
  requestAnimationFrame(tick);
}

window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === 'Tab') { e.preventDefault(); analytics.classList.toggle('hidden'); }
  if (e.key.toLowerCase() === 'e' && !activeInteraction && !gameEnded) {
    const hit = npcs.find(n => Math.abs((player.x+player.w/2)-n.x) < 70);
    if (hit) openDialogue(hit);
  }
});
window.addEventListener('keyup', e => keys[e.key] = false);

updateDashboard();
logEvent('System initialized. Subject not yet classified.');
tick();
