class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: "GameScene" });
    }

    preload() {
        this.load.image("car", "assets/images/car.png");
        this.load.image("enemy", "assets/images/enemy.png");
        this.load.image("tree", "assets/images/tree.png");

        this.load.image("crash_img", "assets/images/crash.png"); // 💥 FULL SCREEN CRASH IMAGE

        this.load.audio("bg_music", "assets/audio/bg_music.mp3");
        this.load.audio("crash", "assets/audio/crash.mp3");
    }

    create() {

        this.state = "menu";

        this.width = this.scale.width;
        this.height = this.scale.height;

        this.music = this.sound.add("bg_music", {
            loop: true,
            volume: 0.4
        });

        this.crashSound = this.sound.add("crash", {
            volume: 0.6
        });

        this.crashSprite = null;

        this.showMenu();
    }

    // ================= MENU =================
    showMenu() {

        this.clearAll();
        this.state = "menu";

        this.add.text(this.width / 2, this.height / 2 - 150, "ROAD RACER", {
            fontSize: "48px",
            fill: "#fff"
        }).setOrigin(0.5);

        let play = this.add.text(this.width / 2, this.height / 2, "PLAY", {
            fontSize: "34px",
            backgroundColor: "#00aa00",
            padding: { x: 20, y: 10 },
            fill: "#fff"
        }).setOrigin(0.5).setInteractive();

        let exit = this.add.text(this.width / 2, this.height / 2 + 70, "EXIT", {
            fontSize: "34px",
            backgroundColor: "#aa0000",
            padding: { x: 20, y: 10 },
            fill: "#fff"
        }).setOrigin(0.5).setInteractive();

        play.on("pointerdown", () => this.startGame());
        exit.on("pointerdown", () => navigator.app?.exitApp?.());
    }

    // ================= START GAME =================
    startGame() {

        this.clearAll();
        this.state = "play";

        this.roadWidth = this.width * 0.6;
        this.roadLeft = (this.width - this.roadWidth) / 2;
        this.laneWidth = this.roadWidth / 3;

        this.lanes = [
            this.roadLeft + this.laneWidth / 2,
            this.roadLeft + this.laneWidth + this.laneWidth / 2,
            this.roadLeft + 2 * this.laneWidth + this.laneWidth / 2
        ];

        // ROAD
        this.add.rectangle(this.width / 2, this.height / 2, this.roadWidth, this.height, 0x2b2b2b);
        this.add.rectangle(this.roadLeft / 2, this.height / 2, this.roadLeft, this.height, 0x1f7a1f);
        this.add.rectangle(this.roadLeft + this.roadWidth + this.roadLeft / 2, this.height / 2, this.roadLeft, this.height, 0x1f7a1f);

        for (let i = 0; i < this.height; i += 80) {
            this.add.rectangle(this.roadLeft + this.laneWidth, i, 5, 40, 0xffffff);
            this.add.rectangle(this.roadLeft + 2 * this.laneWidth, i, 5, 40, 0xffffff);
        }

        // PLAYER
        this.lane = 1;
        this.playerY = this.height - 150;
        this.player = this.add.image(this.lanes[this.lane], this.playerY, "car").setScale(0.5);

        this.playerW = 70;
        this.playerH = 110;

        this.enemies = [];

        // TREES
        this.trees = [];
        for (let i = 0; i < 10; i++) {
            let x = Math.random() < 0.5
                ? Math.random() * this.roadLeft
                : this.roadLeft + this.roadWidth + Math.random() * this.roadLeft;

            let y = Math.random() * this.height;

            this.trees.push(this.add.image(x, y, "tree").setScale(0.4));
        }

        // INPUT
        this.input.on("pointerdown", (p) => {
            if (this.state !== "play") return;

            if (p.x < this.width / 3) this.lane = 0;
            else if (p.x < this.width * 2 / 3) this.lane = 1;
            else this.lane = 2;
        });

        this.score = 0;
        this.speed = 3;

        this.spawnTimer = 0;

        this.baseSpawnDelay = 90;

        this.laneCooldown = [0, 0, 0];

        this.scoreText = this.add.text(20, 20, "Score: 0", {
            fontSize: "28px",
            fill: "#fff"
        });

        if (!this.music.isPlaying) this.music.play();
    }

    // ================= SPAWN =================
    spawnEnemy() {

        let availableLanes = [0,1,2].filter(l => this.laneCooldown[l] <= 0);
        if (availableLanes.length === 0) return;

        let lane = Phaser.Utils.Array.GetRandom(availableLanes);

        let enemy = this.add.image(this.lanes[lane], -120, "enemy").setScale(0.5);

        enemy.w = 70;
        enemy.h = 110;

        this.enemies.push(enemy);

        this.laneCooldown[lane] = 40;
    }

    // ================= UPDATE =================
    update() {

        if (this.state !== "play") return;

        this.score++;
        this.scoreText.setText("Score: " + this.score);

        this.spawnTimer++;

        if (this.spawnTimer > Math.max(90 - this.score / 120, 25)) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }

        for (let i = 0; i < 3; i++) {
            if (this.laneCooldown[i] > 0) this.laneCooldown[i]--;
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {

            let e = this.enemies[i];
            e.y += this.speed;

            // 💥 COLLISION
            if (
                this.player.x < e.x + e.w &&
                this.player.x + this.playerW > e.x &&
                this.playerY < e.y + e.h &&
                this.playerY + this.playerH > e.y
            ) {
                this.crashSound.play();

                // 💥 FULL SCREEN CRASH IMAGE
                this.crashSprite = this.add.image(
                    this.width / 2,
                    this.height / 2,
                    "crash_img"
                )
                .setDisplaySize(this.width, this.height) // 🔥 FULL SCREEN
                .setDepth(999);

                this.player.setVisible(false);

                this.endGame();
            }

            if (e.y > this.height + 120) {
                e.destroy();
                this.enemies.splice(i, 1);
            }
        }

        this.player.x = this.lanes[this.lane];

        for (let t of this.trees) {
            t.y += this.speed * 0.25;
            if (t.y > this.height) t.y = -50;
        }
    }

    // ================= GAME OVER =================
    endGame() {

        this.state = "gameover";
        this.music.stop();

        this.add.text(this.width / 2, this.height / 2 - 100, "GAME OVER", {
            fontSize: "40px",
            fill: "#fff"
        }).setOrigin(0.5);

        let restart = this.add.text(this.width / 2, this.height / 2, "RESTART", {
            fontSize: "32px",
            backgroundColor: "#00aa00",
            padding: { x: 20, y: 10 },
            fill: "#fff"
        }).setOrigin(0.5).setInteractive();

        let menu = this.add.text(this.width / 2, this.height / 2 + 70, "MENU", {
            fontSize: "32px",
            backgroundColor: "#4444ff",
            padding: { x: 20, y: 10 },
            fill: "#fff"
        }).setOrigin(0.5).setInteractive();

        restart.on("pointerdown", () => this.startGame());
        menu.on("pointerdown", () => this.showMenu());
    }

    // ================= CLEAN =================
    clearAll() {

        this.children.removeAll();

        if (this.music && this.music.isPlaying) {
            this.music.stop();
        }

        if (this.crashSprite) {
            this.crashSprite.destroy();
            this.crashSprite = null;
        }

        this.enemies = [];
        this.trees = [];
    }
}

new Phaser.Game({
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: [GameScene]
});