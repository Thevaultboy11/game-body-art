class WalkScene extends Phaser.Scene {
  preload() {
    this.load.setPath('assets');
    this.load.image('bgA', 'background1.png');
    this.load.image('bgB', 'background2.png');
  }

  create() {
    this.gameWidth = this.scale.width;
    this.gameHeight = this.scale.height;

    this.worldWidth = 9000;
    this.physics.world.setBounds(0, 0, this.worldWidth, this.gameHeight);

    // fallback textures if assets are missing
    this.ensureTexture('bgA', 0x1f9be0);
    this.ensureTexture('bgB', 0x666666);
    this.ensureGroundTexture();
    this.ensurePlayerTexture();

    this.bgA = this.add.tileSprite(0, 0, this.gameWidth, this.gameHeight, 'bgA').setOrigin(0).setScrollFactor(0);
    this.bgB = this.add.tileSprite(0, 0, this.gameWidth, this.gameHeight, 'bgB').setOrigin(0).setScrollFactor(0).setVisible(false);

    this.backgroundStep = 2600; // after this much walking, switch background

    this.ground = this.physics.add.staticImage(this.worldWidth / 2, this.gameHeight - 40, 'ground')
      .setDisplaySize(this.worldWidth, 80)
      .refreshBody();

    this.player = this.physics.add.sprite(120, this.gameHeight - 200, 'player');
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(38, 62);
    this.physics.add.collider(this.player, this.ground);

    this.cameras.main.setBounds(0, 0, this.worldWidth, this.gameHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,A,D,SPACE,UP,W');
  }

  ensureTexture(key, color) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color).fillRect(0, 0, 128, 72);
    g.generateTexture(key, 128, 72);
    g.destroy();
  }

  ensureGroundTexture() {
    if (this.textures.exists('ground')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x2f2f2f).fillRect(0, 0, 256, 32);
    g.fillStyle(0x3f3f3f).fillRect(0, 24, 256, 8);
    g.generateTexture('ground', 256, 32);
    g.destroy();
  }

  ensurePlayerTexture() {
    if (this.textures.exists('player')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000).fillRect(0, 0, 42, 64);
    g.generateTexture('player', 42, 64);
    g.destroy();
  }

  update() {
    const goLeft = this.keys.LEFT.isDown || this.keys.A.isDown;
    const goRight = this.keys.RIGHT.isDown || this.keys.D.isDown;
    const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.UP) || Phaser.Input.Keyboard.JustDown(this.keys.W);

    if (goLeft) this.player.setVelocityX(-220);
    else if (goRight) this.player.setVelocityX(220);
    else this.player.setVelocityX(0);

    if (jumpPressed && this.player.body.blocked.down) this.player.setVelocityY(-420);

    const distanceWalked = Math.max(0, this.player.x - 120);
    const useSecondBg = Math.floor(distanceWalked / this.backgroundStep) % 2 === 1;
    this.bgA.setVisible(!useSecondBg);
    this.bgB.setVisible(useSecondBg);

    const scrollX = this.cameras.main.scrollX;
    this.bgA.tilePositionX = scrollX * 0.2;
    this.bgB.tilePositionX = scrollX * 0.2;
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 1100 }, debug: false },
  },
  scene: [WalkScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
