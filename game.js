const dom = {
  dash: document.getElementById('dash-lines'),
  dialogue: document.getElementById('dialogue'),
  npcName: document.getElementById('npc-name'),
  text: document.getElementById('dialogue-text'),
  choices: document.getElementById('choices'),
  analytics: document.getElementById('analytics'),
  analyticsList: document.getElementById('analytics-list'),
};

const state = { trait: 'Empty', risk: '00.0%', classification: 'Unassigned', i1: null, i2: null, logs: [], locked: false };

function updateDashboard(extra = '') {
  dom.dash.textContent = `SYSTEM STATUS: ONLINE\nSUBJECT ID: Pending...\nTRAITS: ${state.trait}\nRISK SCORE: ${state.risk}\nCLASSIFICATION: ${state.classification}${extra ? `\n\n${extra}` : ''}`;
}
function logEvent(msg) {
  state.logs.push(msg);
  const li = document.createElement('li');
  li.textContent = msg;
  dom.analyticsList.appendChild(li);
}
function showDialogue(name, text, choices) {
  dom.dialogue.classList.remove('hidden');
  dom.npcName.textContent = name;
  dom.text.textContent = text;
  dom.choices.innerHTML = '';
  choices.forEach(({ label, onPick }) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = onPick;
    dom.choices.appendChild(b);
  });
}
function closeDialogue() { dom.dialogue.classList.add('hidden'); dom.choices.innerHTML = ''; }

class MainScene extends Phaser.Scene {
  constructor() { super('main'); }

  preload() {
    this.load.setPath('assets/sprites');
    this.load.image('bg1', 'background_layer1.png');
    this.load.image('bg2', 'background_layer2.png');
    this.load.image('tiles', 'ground_tiles.png');
    this.load.spritesheet('player', 'player_sheet.png', { frameWidth: 32, frameHeight: 48 });
    this.load.spritesheet('collector', 'data_collector_sheet.png', { frameWidth: 32, frameHeight: 48 });
    this.load.spritesheet('scorer', 'scorer_sheet.png', { frameWidth: 32, frameHeight: 48 });
    this.load.spritesheet('gatekeeper', 'gatekeeper_sheet.png', { frameWidth: 32, frameHeight: 48 });
  }

  createFallbackTextures() {
    if (!this.textures.exists('bg1')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x7ad8ff).fillRect(0, 0, 256, 180); g.generateTexture('bg1', 256, 180);
      g.clear(); g.fillStyle(0xa6e8ff).fillRect(0, 0, 256, 180); g.generateTexture('bg2', 256, 180); g.destroy();
    }
    if (!this.textures.exists('tiles')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x5a8f47).fillRect(0, 0, 64, 64); g.generateTexture('tiles', 64, 64); g.destroy();
    }
    ['player', 'collector', 'scorer', 'gatekeeper'].forEach((key, i) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle([0xffffff,0xffdd77,0x99ccff,0xff9999][i]).fillRect(0, 0, 32, 48); g.generateTexture(key, 32, 48); g.destroy();
    });
  }

  create() {
    this.createFallbackTextures();
    this.physics.world.setBounds(0, 0, 5600, 540);

    this.bgFar = this.add.tileSprite(0, 0, 960, 540, 'bg1').setOrigin(0).setScrollFactor(0);
    this.bgNear = this.add.tileSprite(0, 0, 960, 540, 'bg2').setOrigin(0).setScrollFactor(0);

    this.ground = this.physics.add.staticGroup();
    for (let x = 0; x < 5600; x += 64) this.ground.create(x, 508, 'tiles').setOrigin(0, 0).refreshBody();

    this.player = this.physics.add.sprite(120, 420, 'player').setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.ground);

    this.createAnimations();
    this.player.play('player-idle');

    this.npcs = {
      collector: this.makeNpc(980, 'collector'),
      scorer: this.makeNpc(2300, 'scorer'),
      gatekeeper: this.makeNpc(4100, 'gatekeeper'),
    };

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,W,E,TAB,SPACE');
    this.canInteract = true;
    this.active = null;

    this.cameras.main.setBounds(0, 0, 5600, 540);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.input.keyboard.on('keydown-TAB', (e) => { e.preventDefault(); dom.analytics.classList.toggle('hidden'); });

    updateDashboard();
    logEvent('System initialized. Awaiting inputs.');
  }

  createAnimations() {
    const makeAnim = (key) => {
      const count = this.textures.get(key).frameTotal;
      if (count <= 1) return [{ key: `${key}-idle`, frames: [{ key, frame: 0 }], frameRate: 1, repeat: -1 }];
      return [
        { key: `${key}-idle`, frames: this.anims.generateFrameNumbers(key, { start: 0, end: Math.min(3, count - 1) }), frameRate: 5, repeat: -1 },
        { key: `${key}-walk`, frames: this.anims.generateFrameNumbers(key, { start: Math.min(4, count - 1), end: Math.min(9, count - 1) }), frameRate: 10, repeat: -1 },
      ];
    };
    ['player', 'collector', 'scorer', 'gatekeeper'].forEach((k) => makeAnim(k).forEach((cfg) => { if (!this.anims.exists(cfg.key)) this.anims.create(cfg); }));
  }

  makeNpc(x, key) {
    const sprite = this.physics.add.staticSprite(x, 460, key).setScale(1);
    sprite.play(`${key}-idle`);
    return sprite;
  }

  tryInteract() {
    if (!this.canInteract || state.locked) return;
    const p = this.player.x;
    const near = Object.entries(this.npcs).find(([, n]) => Math.abs(n.x - p) < 80);
    if (!near) return;
    const [id] = near;
    this.canInteract = false;
    if (id === 'collector') {
      showDialogue('Data Collector', 'Lovely day, isn\'t it?... crowded market, or the quiet canal path?', [
        { label: 'The crowded market. I like the energy.', onPick: () => this.finishI1('crowd') },
        { label: 'The quiet path. I prefer being alone.', onPick: () => this.finishI1('quiet') },
        { label: 'Walk away without answering.', onPick: () => this.finishI1('away') },
      ]);
    } else if (id === 'scorer') {
      showDialogue('The Scorer', 'Routine ticket check. Travel outside tonight, or remain in perimeter?', [
        { label: "I'm traveling tonight.", onPick: () => this.finishI2('travel') },
        { label: "I'll remain in the perimeter.", onPick: () => this.finishI2('stay') },
      ]);
    } else {
      showDialogue('The Gatekeeper', 'Halt. Step onto the scanner.', [
        { label: 'I have a flawless civic record!', onPick: () => this.finishI3() },
        { label: 'I have a valid exit permit!', onPick: () => this.finishI3() },
      ]);
    }
  }

  finishI1(choice) { state.i1 = choice; state.trait = choice === 'crowd' ? 'Drawn to chaotic environments.' : choice === 'quiet' ? 'Socially withdrawn tendencies.' : 'Non-compliant civic engagement.'; logEvent(`I1 mapped to ${choice}.`); this.endDialogue(); updateDashboard(); }
  finishI2(choice) {
    state.i2 = choice; state.risk = '87.4%'; state.classification = 'High Severity';
    const alert = state.i1 === 'quiet' && choice === 'travel' ? 'Flag: Smuggling/Covert Action.' : state.i1 === 'crowd' && choice === 'stay' ? 'Flag: Radicalization/Agitation.' : state.i1 === 'away' ? 'Flag: Flight Risk.' : 'Flag: Behavioral anomaly.';
    logEvent(`I2 correlated. ${alert}`); this.endDialogue(); updateDashboard(`SYSTEM ALERT\n${alert}`);
  }
  finishI3() { state.classification = 'CRIMINALIZED'; state.locked = true; logEvent('Contradiction ignored. Inputs locked.'); this.endDialogue(); updateDashboard('CONTRADICTION DETECTED\nACTION: Ignored (Outlier).'); this.time.delayedCall(1800, () => this.scene.pause()); }

  endDialogue() { closeDialogue(); this.time.delayedCall(150, () => { this.canInteract = true; }); }

  update() {
    if (!state.locked && dom.dialogue.classList.contains('hidden')) {
      const goLeft = this.keys.A.isDown || this.cursors.left.isDown;
      const goRight = this.keys.D.isDown || this.cursors.right.isDown;
      const jump = Phaser.Input.Keyboard.JustDown(this.keys.W) || Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
      if (goLeft) { this.player.setVelocityX(-170); this.player.setFlipX(true); this.player.play('player-walk', true); }
      else if (goRight) { this.player.setVelocityX(170); this.player.setFlipX(false); this.player.play('player-walk', true); }
      else { this.player.setVelocityX(0); this.player.play('player-idle', true); }
      if (jump && this.player.body.blocked.down) this.player.setVelocityY(-320);

      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.tryInteract();
    } else {
      this.player.setVelocityX(0);
    }

    this.bgFar.tilePositionX = this.cameras.main.scrollX * 0.15;
    this.bgNear.tilePositionX = this.cameras.main.scrollX * 0.35;

    if (state.locked) {
      const tint = Phaser.Display.Color.GetColor(180, 180, 180);
      this.player.setTint(tint);
      Object.values(this.npcs).forEach((n) => n.setTint(tint));
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: 'game-container',
  pixelArt: true,
  physics: { default: 'arcade', arcade: { gravity: { y: 700 }, debug: false } },
  scene: [MainScene],
});
