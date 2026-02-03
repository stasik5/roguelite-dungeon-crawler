// Game Configuration
const CONFIG = {
    DUNGEON_WIDTH: 40,
    DUNGEON_HEIGHT: 25,
    MIN_ROOMS: 6,
    MAX_ROOMS: 12,
    MIN_ROOM_SIZE: 5,
    MAX_ROOM_SIZE: 10,
    ENEMIES_PER_ROOM: 2,
    ITEMS_PER_ROOM: 2,
    VIEW_DISTANCE: 6
};

// Tile Types
const TILES = {
    WALL: { symbol: '▓', name: 'wall', type: 'wall' },
    FLOOR: { symbol: '░', name: 'floor', type: 'floor' },
    PLAYER: { symbol: '@', name: 'player', type: 'player' },
    STAIRS: { symbol: '⬇', name: 'stairs', type: 'stairs' }
};

// Enemy Types
const ENEMY_TYPES = [
    { name: 'Rat', symbol: '🐀', hp: 15, attack: 5, defense: 2, xp: 10 },
    { name: 'Goblin', symbol: '👺', hp: 25, attack: 8, defense: 4, xp: 20 },
    { name: 'Skeleton', symbol: '💀', hp: 35, attack: 12, defense: 6, xp: 35 },
    { name: 'Orc', symbol: '👹', hp: 50, attack: 15, defense: 8, xp: 50 },
    { name: 'Dragon', symbol: '🐉', hp: 80, attack: 20, defense: 12, xp: 100 }
];

// Item Types
const ITEM_TYPES = {
    WEAPONS: [
        { name: 'Dagger', symbol: '🗡️', attack: 3, type: 'weapon' },
        { name: 'Sword', symbol: '⚔️', attack: 5, type: 'weapon' },
        { name: 'Axe', symbol: '🪓', attack: 7, type: 'weapon' },
        { name: 'Mace', symbol: '🔨', attack: 10, type: 'weapon' }
    ],
    POTIONS: [
        { name: 'Small Potion', symbol: '🧪', heal: 20, type: 'potion' },
        { name: 'Large Potion', symbol: '🧴', heal: 50, type: 'potion' },
        { name: 'Elixir', symbol: '⚗️', heal: 100, type: 'potion' }
    ],
    ARMOR: [
        { name: 'Leather Armor', symbol: '🛡️', defense: 3, type: 'armor' },
        { name: 'Chainmail', symbol: '🛡️', defense: 6, type: 'armor' },
        { name: 'Plate Armor', symbol: '🛡️', defense: 10, type: 'armor' }
    ]
};

// Game State
let gameState = {
    player: null,
    dungeon: [],
    enemies: [],
    items: [],
    level: 1,
    gold: 0,
    explored: [],
    gameOver: false
};

// Room Class
class Room {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.centerX = Math.floor(x + width / 2);
        this.centerY = Math.floor(y + height / 2);
    }

    overlaps(other) {
        return this.x < other.x + other.width &&
               this.x + this.width > other.x &&
               this.y < other.y + other.height &&
               this.y + this.height > other.y;
    }

    contains(x, y) {
        return x >= this.x && x < this.x + this.width &&
               y >= this.y && y < this.y + this.height;
    }
}

// Player Class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.attack = 10;
        this.defense = 5;
        this.inventory = [];
        this.equippedWeapon = null;
        this.equippedArmor = null;
        this.xp = 0;
        this.level = 1;
        this.xpToLevel = 50;
    }

    getTotalAttack() {
        return this.attack + (this.equippedWeapon ? this.equippedWeapon.attack : 0);
    }

    getTotalDefense() {
        return this.defense + (this.equippedArmor ? this.equippedArmor.defense : 0);
    }

    move(dx, dy) {
        const newX = this.x + dx;
        const newY = this.y + dy;

        if (this.canMoveTo(newX, newY)) {
            // Check for enemy
            const enemy = gameState.enemies.find(e => e.x === newX && e.y === newY);
            if (enemy) {
                this.attackEnemy(enemy);
            } else {
                this.x = newX;
                this.y = newY;
                this.pickupItems();
                this.checkStairs();
            }
            return true;
        }
        return false;
    }

    canMoveTo(x, y) {
        if (x < 0 || x >= CONFIG.DUNGEON_WIDTH || y < 0 || y >= CONFIG.DUNGEON_HEIGHT) {
            return false;
        }
        return gameState.dungeon[y][x] !== TILES.WALL.type;
    }

    attackEnemy(enemy) {
        const damage = Math.max(1, this.getTotalAttack() - enemy.defense + Math.floor(Math.random() * 5) - 2);
        enemy.health -= damage;
        addLog(`You hit ${enemy.name} for ${damage} damage!`, 'info');

        if (enemy.health <= 0) {
            this.killEnemy(enemy);
        } else {
            // Enemy counter-attacks
            const enemyDamage = Math.max(1, enemy.attack - this.getTotalDefense() + Math.floor(Math.random() * 3) - 1);
            this.health -= enemyDamage;
            addLog(`${enemy.name} hits you for ${enemyDamage} damage!`, 'damage');
            updateStats();

            if (this.health <= 0) {
                this.health = 0;
                gameOver();
            }
        }
    }

    killEnemy(enemy) {
        addLog(`You defeated ${enemy.name}! +${enemy.xp} XP`, 'success');
        this.xp += enemy.xp;
        gameState.gold += Math.floor(Math.random() * 10) + 5;

        // Check for level up
        if (this.xp >= this.xpToLevel) {
            this.levelUp();
        }

        // Remove enemy
        const index = gameState.enemies.indexOf(enemy);
        if (index > -1) {
            gameState.enemies.splice(index, 1);
        }

        renderDungeon();
        updateStats();
    }

    levelUp() {
        this.level++;
        this.xp -= this.xpToLevel;
        this.xpToLevel = Math.floor(this.xpToLevel * 1.5);
        this.maxHealth += 10;
        this.health = this.maxHealth;
        this.attack += 2;
        this.defense += 1;

        addLog(`Level up! You are now level ${this.level}!`, 'success');
        addLog(`HP: ${this.health}/${this.maxHealth}, ATK: ${this.attack}, DEF: ${this.defense}`, 'info');
        updateStats();
    }

    pickupItems() {
        const itemsAtPosition = gameState.items.filter(i => i.x === this.x && i.y === this.y);

        itemsAtPosition.forEach(item => {
            this.inventory.push(item);
            addLog(`Picked up ${item.name}!`, 'success');
        });

        // Remove picked up items
        gameState.items = gameState.items.filter(i => i.x !== this.x || i.y !== this.y);

        if (itemsAtPosition.length > 0) {
            renderInventory();
        }
    }

    checkStairs() {
        if (gameState.dungeon[this.y][this.x] === TILES.STAIRS.type) {
            nextLevel();
        }
    }

    heal(amount) {
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        addLog(`Healed ${this.health - oldHealth} HP!`, 'heal');
        updateStats();
    }
}

// Enemy Class
class Enemy {
    constructor(type, x, y, level) {
        this.name = type.name;
        this.symbol = type.symbol;
        this.x = x;
        this.y = y;
        // Scale stats with level
        const levelMultiplier = 1 + (level - 1) * 0.2;
        this.maxHealth = Math.floor(type.hp * levelMultiplier);
        this.health = this.maxHealth;
        this.attack = Math.floor(type.attack * levelMultiplier);
        this.defense = Math.floor(type.defense * levelMultiplier);
        this.xp = Math.floor(type.xp * levelMultiplier);
        this.level = level;
    }
}

// Dungeon Generation
function generateDungeon() {
    // Initialize dungeon with walls
    gameState.dungeon = [];
    for (let y = 0; y < CONFIG.DUNGEON_HEIGHT; y++) {
        gameState.dungeon[y] = [];
        for (let x = 0; x < CONFIG.DUNGEON_WIDTH; x++) {
            gameState.dungeon[y][x] = TILES.WALL.type;
        }
    }

    // Generate rooms
    const rooms = [];
    const numRooms = Math.floor(Math.random() * (CONFIG.MAX_ROOMS - CONFIG.MIN_ROOMS + 1)) + CONFIG.MIN_ROOMS;

    for (let i = 0; i < numRooms * 3; i++) {
        const width = Math.floor(Math.random() * (CONFIG.MAX_ROOM_SIZE - CONFIG.MIN_ROOM_SIZE + 1)) + CONFIG.MIN_ROOM_SIZE;
        const height = Math.floor(Math.random() * (CONFIG.MAX_ROOM_SIZE - CONFIG.MIN_ROOM_SIZE + 1)) + CONFIG.MIN_ROOM_SIZE;
        const x = Math.floor(Math.random() * (CONFIG.DUNGEON_WIDTH - width - 2)) + 1;
        const y = Math.floor(Math.random() * (CONFIG.DUNGEON_HEIGHT - height - 2)) + 1;

        const newRoom = new Room(x, y, width, height);

        let overlaps = false;
        for (const room of rooms) {
            if (newRoom.overlaps(room)) {
                overlaps = true;
                break;
            }
        }

        if (!overlaps) {
            carveRoom(newRoom);

            if (rooms.length > 0) {
                connectRooms(rooms[rooms.length - 1], newRoom);
            }

            rooms.push(newRoom);

            if (rooms.length >= numRooms) {
                break;
            }
        }
    }

    return rooms;
}

function carveRoom(room) {
    for (let y = room.y; y < room.y + room.height; y++) {
        for (let x = room.x; x < room.x + room.width; x++) {
            gameState.dungeon[y][x] = TILES.FLOOR.type;
        }
    }
}

function connectRooms(room1, room2) {
    // Horizontal corridor
    let startX = Math.min(room1.centerX, room2.centerX);
    let endX = Math.max(room1.centerX, room2.centerX);

    for (let x = startX; x <= endX; x++) {
        gameState.dungeon[room1.centerY][x] = TILES.FLOOR.type;
    }

    // Vertical corridor
    let startY = Math.min(room1.centerY, room2.centerY);
    let endY = Math.max(room1.centerY, room2.centerY);

    for (let y = startY; y <= endY; y++) {
        gameState.dungeon[y][room2.centerX] = TILES.FLOOR.type;
    }
}

function populateDungeon(rooms) {
    gameState.enemies = [];
    gameState.items = [];

    // Place player in first room
    gameState.player = new Player(rooms[0].centerX, rooms[0].centerY);

    // Place stairs in last room
    const lastRoom = rooms[rooms.length - 1];
    gameState.dungeon[lastRoom.centerY][lastRoom.centerX] = TILES.STAIRS.type;

    // Populate other rooms
    for (let i = 1; i < rooms.length; i++) {
        const room = rooms[i];

        // Add enemies
        const numEnemies = Math.floor(Math.random() * CONFIG.ENEMIES_PER_ROOM) + 1;
        for (let j = 0; j < numEnemies; j++) {
            const enemyTypeIndex = Math.min(
                Math.floor(Math.random() * ENEMY_TYPES.length),
                Math.floor(gameState.level / 2)
            );
            const enemyType = ENEMY_TYPES[enemyTypeIndex];
            const pos = getRandomFloorPosition(room);
            if (pos) {
                gameState.enemies.push(new Enemy(enemyType, pos.x, pos.y, gameState.level));
            }
        }

        // Add items
        const numItems = Math.floor(Math.random() * CONFIG.ITEMS_PER_ROOM) + 1;
        for (let j = 0; j < numItems; j++) {
            const itemType = getRandomItemType();
            const pos = getRandomFloorPosition(room);
            if (pos) {
                gameState.items.push({
                    ...itemType,
                    x: pos.x,
                    y: pos.y
                });
            }
        }
    }
}

function getRandomFloorPosition(room) {
    for (let attempt = 0; attempt < 50; attempt++) {
        const x = Math.floor(Math.random() * (room.width - 2)) + room.x + 1;
        const y = Math.floor(Math.random() * (room.height - 2)) + room.y + 1;

        // Check if position is free
        const occupied = gameState.enemies.some(e => e.x === x && e.y === y) ||
                         gameState.items.some(i => i.x === x && i.y === y) ||
                         (gameState.player.x === x && gameState.player.y === y) ||
                         gameState.dungeon[y][x] === TILES.STAIRS.type;

        if (!occupied) {
            return { x, y };
        }
    }
    return null;
}

function getRandomItemType() {
    const rand = Math.random();
    if (rand < 0.4) {
        return ITEM_TYPES.WEAPONS[Math.floor(Math.random() * ITEM_TYPES.WEAPONS.length)];
    } else if (rand < 0.7) {
        return ITEM_TYPES.POTIONS[Math.floor(Math.random() * ITEM_TYPES.POTIONS.length)];
    } else {
        return ITEM_TYPES.ARMOR[Math.floor(Math.random() * ITEM_TYPES.ARMOR.length)];
    }
}

// Fog of War
function updateExplored() {
    const playerX = gameState.player.x;
    const playerY = gameState.player.y;

    for (let y = 0; y < CONFIG.DUNGEON_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.DUNGEON_WIDTH; x++) {
            if (!gameState.explored[y]) {
                gameState.explored[y] = [];
            }

            const distance = Math.sqrt(Math.pow(x - playerX, 2) + Math.pow(y - playerY, 2));
            if (distance <= CONFIG.VIEW_DISTANCE) {
                gameState.explored[y][x] = true;
            }
        }
    }
}

// Rendering
function renderDungeon() {
    const dungeonElement = document.getElementById('dungeon');
    dungeonElement.style.gridTemplateColumns = `repeat(${CONFIG.DUNGEON_WIDTH}, 24px)`;
    dungeonElement.innerHTML = '';

    updateExplored();

    for (let y = 0; y < CONFIG.DUNGEON_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.DUNGEON_WIDTH; x++) {
            const tile = document.createElement('div');
            tile.className = 'tile';

            if (!gameState.explored[y] || !gameState.explored[y][x]) {
                tile.classList.add('unexplored');
                tile.textContent = TILES.WALL.symbol;
            } else {
                tile.classList.add('explored');

                const distance = Math.sqrt(Math.pow(x - gameState.player.x, 2) + Math.pow(y - gameState.player.y, 2));
                const inView = distance <= CONFIG.VIEW_DISTANCE;

                if (x === gameState.player.x && y === gameState.player.y) {
                    tile.classList.add('player');
                    tile.textContent = TILES.PLAYER.symbol;
                } else {
                    const enemy = gameState.enemies.find(e => e.x === x && e.y === y);
                    const item = gameState.items.find(i => i.x === x && i.y === y);

                    if (enemy && inView) {
                        tile.classList.add('enemy');
                        tile.textContent = enemy.symbol;
                    } else if (item && inView) {
                        tile.classList.add('item');
                        tile.textContent = item.symbol;
                    } else if (gameState.dungeon[y][x] === TILES.STAIRS.type) {
                        tile.classList.add('stairs');
                        tile.textContent = TILES.STAIRS.symbol;
                    } else if (gameState.dungeon[y][x] === TILES.FLOOR.type) {
                        tile.classList.add('floor');
                        tile.textContent = TILES.FLOOR.symbol;
                    } else {
                        tile.classList.add('wall');
                        tile.textContent = TILES.WALL.symbol;
                    }
                }
            }

            dungeonElement.appendChild(tile);
        }
    }

    renderMinimap();
}

function renderMinimap() {
    const minimapElement = document.getElementById('minimap');
    minimapElement.style.gridTemplateColumns = `repeat(${CONFIG.DUNGEON_WIDTH}, 8px)`;
    minimapElement.innerHTML = '';

    for (let y = 0; y < CONFIG.DUNGEON_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.DUNGEON_WIDTH; x++) {
            const tile = document.createElement('div');
            tile.className = 'tile';

            if (!gameState.explored[y] || !gameState.explored[y][x]) {
                tile.textContent = ' ';
            } else {
                if (x === gameState.player.x && y === gameState.player.y) {
                    tile.style.color = '#ffd700';
                    tile.textContent = '@';
                } else if (gameState.dungeon[y][x] === TILES.STAIRS.type) {
                    tile.style.color = '#a55eea';
                    tile.textContent = '⬇';
                } else if (gameState.enemies.some(e => e.x === x && e.y === y)) {
                    tile.style.color = '#ff4757';
                    tile.textContent = 'E';
                } else if (gameState.dungeon[y][x] === TILES.FLOOR.type) {
                    tile.style.color = '#4a4a6a';
                    tile.textContent = '·';
                } else {
                    tile.style.color = '#2a2a4a';
                    tile.textContent = '█';
                }
            }

            minimapElement.appendChild(tile);
        }
    }
}

function renderInventory() {
    const inventoryElement = document.getElementById('inventory');
    inventoryElement.innerHTML = '';

    gameState.player.inventory.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'inventory-item';
        itemElement.innerHTML = `
            <span class="icon">${item.symbol}</span>
            <span class="name">${item.name}</span>
        `;

        itemElement.addEventListener('click', () => useItem(index));
        inventoryElement.appendChild(itemElement);
    });

    if (gameState.player.inventory.length === 0) {
        inventoryElement.innerHTML = '<p style="color: #666; text-align: center; width: 100%;">Empty</p>';
    }
}

function useItem(index) {
    const item = gameState.player.inventory[index];

    if (item.type === 'potion') {
        gameState.player.heal(item.heal);
        gameState.player.inventory.splice(index, 1);
        renderInventory();
    } else if (item.type === 'weapon') {
        if (gameState.player.equippedWeapon) {
            gameState.player.inventory.push(gameState.player.equippedWeapon);
        }
        gameState.player.equippedWeapon = item;
        gameState.player.inventory.splice(index, 1);
        addLog(`Equipped ${item.name}! (+${item.attack} ATK)`, 'success');
        updateStats();
        renderInventory();
    } else if (item.type === 'armor') {
        if (gameState.player.equippedArmor) {
            gameState.player.inventory.push(gameState.player.equippedArmor);
        }
        gameState.player.equippedArmor = item;
        gameState.player.inventory.splice(index, 1);
        addLog(`Equipped ${item.name}! (+${item.defense} DEF)`, 'success');
        updateStats();
        renderInventory();
    }
}

function updateStats() {
    document.getElementById('health').textContent = gameState.player.health;
    document.getElementById('max-health').textContent = gameState.player.maxHealth;
    document.getElementById('attack').textContent = gameState.player.getTotalAttack();
    document.getElementById('defense').textContent = gameState.player.getTotalDefense();
    document.getElementById('level').textContent = gameState.player.level;
    document.getElementById('gold').textContent = gameState.gold;
}

function addLog(message, type = 'info') {
    const logElement = document.getElementById('log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = message;
    logElement.appendChild(entry);
    logElement.scrollTop = logElement.scrollHeight;
}

// Game Loop
function nextLevel() {
    gameState.level++;
    addLog(`Descending to level ${gameState.level}...`, 'info');
    addLog('Enemies are getting stronger!', 'warning');

    // Keep player stats but regenerate dungeon
    const player = gameState.player;
    const rooms = generateDungeon();
    populateDungeon(rooms);
    gameState.player.x = rooms[0].centerX;
    gameState.player.y = rooms[0].centerY;

    // Clear fog of war
    gameState.explored = [];

    addLog(`Level ${gameState.level} - Good luck!`, 'success');
    renderDungeon();
    renderInventory();
}

function gameOver() {
    gameState.gameOver = true;
    document.getElementById('final-level').textContent = gameState.level;
    document.getElementById('final-gold').textContent = gameState.gold;
    document.getElementById('game-over').classList.remove('hidden');
    addLog('💀 GAME OVER 💀', 'damage');
}

function initGame() {
    gameState = {
        player: null,
        dungeon: [],
        enemies: [],
        items: [],
        level: 1,
        gold: 0,
        explored: [],
        gameOver: false
    };

    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('log').innerHTML = '';

    addLog('Welcome to the Dungeon!', 'info');
    addLog('Use WASD or Arrow keys to move', 'info');
    addLog('Find the stairs (⬇) to descend deeper', 'info');
    addLog('Collect items and defeat enemies!', 'info');

    const rooms = generateDungeon();
    populateDungeon(rooms);

    updateStats();
    renderDungeon();
    renderInventory();
}

// Input Handling
document.addEventListener('keydown', (e) => {
    if (gameState.gameOver) return;

    let dx = 0;
    let dy = 0;

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            dy = -1;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            dy = 1;
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            dx = -1;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            dx = 1;
            break;
        default:
            return;
    }

    e.preventDefault();
    if (gameState.player && gameState.player.move(dx, dy)) {
        // Enemy turn
        enemyTurn();
        renderDungeon();
    }
});

function enemyTurn() {
    gameState.enemies.forEach(enemy => {
        const distance = Math.sqrt(
            Math.pow(enemy.x - gameState.player.x, 2) +
            Math.pow(enemy.y - gameState.player.y, 2)
        );

        if (distance <= CONFIG.VIEW_DISTANCE) {
            // Move towards player
            const dx = Math.sign(gameState.player.x - enemy.x);
            const dy = Math.sign(gameState.player.y - enemy.y);

            // Try to move
            let moved = false;

            // Try horizontal first
            if (dx !== 0 && canEnemyMoveTo(enemy, enemy.x + dx, enemy.y)) {
                enemy.x += dx;
                moved = true;
            }

            // Try vertical if horizontal didn't work
            if (!moved && dy !== 0 && canEnemyMoveTo(enemy, enemy.x, enemy.y + dy)) {
                enemy.y += dy;
                moved = true;
            }

            // Attack if adjacent
            const newX = enemy.x;
            const newY = enemy.y;
            if (Math.abs(newX - gameState.player.x) <= 1 && Math.abs(newY - gameState.player.y) <= 1) {
                if (newX === gameState.player.x && newY === gameState.player.y) {
                    const damage = Math.max(1, enemy.attack - gameState.player.getTotalDefense() + Math.floor(Math.random() * 3) - 1);
                    gameState.player.health -= damage;
                    addLog(`${enemy.name} hits you for ${damage} damage!`, 'damage');
                    updateStats();

                    if (gameState.player.health <= 0) {
                        gameState.player.health = 0;
                        gameOver();
                    }
                }
            }
        }
    });
}

function canEnemyMoveTo(enemy, x, y) {
    // Check bounds
    if (x < 0 || x >= CONFIG.DUNGEON_WIDTH || y < 0 || y >= CONFIG.DUNGEON_HEIGHT) {
        return false;
    }

    // Check walls
    if (gameState.dungeon[y][x] === TILES.WALL.type) {
        return false;
    }

    // Check other enemies
    if (gameState.enemies.some(e => e !== enemy && e.x === x && e.y === y)) {
        return false;
    }

    // Check player (will attack instead of moving)
    if (x === gameState.player.x && y === gameState.player.y) {
        return false;
    }

    return true;
}

// Button Controls
document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const event = { key, preventDefault: () => {} };
        document.dispatchEvent(new KeyboardEvent('keydown', event));
    });
});

document.getElementById('new-game').addEventListener('click', initGame);
document.getElementById('restart-btn').addEventListener('click', initGame);

// Start the game
initGame();
