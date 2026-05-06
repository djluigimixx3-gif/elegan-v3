const express = require('express');
const { Server } = require('colyseus');
const { createServer } = require('http');
const { Room, Schema, type, MapSchema, ArraySchema } = require('@colyseus/schema');
const cors = require('cors');
const path = require('path');

// ===== SCHEMAS =====
class Player extends Schema {
    constructor() {
        super();
        this.x = 400;
        this.y = 300;
        this.class = "mago_etereo";
        this.level = 1;
        this.exp = 0;
        this.hp = 100;
        this.maxHp = 100;
        this.mp = 100;
        this.maxMp = 100;
        this.gold = 0;
    }
}
type("number")(Player.prototype, "x");
type("number")(Player.prototype, "y");
type("string")(Player.prototype, "class");
type("number")(Player.prototype, "level");
type("number")(Player.prototype, "exp");
type("number")(Player.prototype, "hp");
type("number")(Player.prototype, "maxHp");
type("number")(Player.prototype, "mp");
type("number")(Player.prototype, "maxMp");
type("number")(Player.prototype, "gold");

class Mob extends Schema {
    constructor() {
        super();
        this.x = Math.random() * 800;
        this.y = Math.random() * 600;
        this.hp = 50;
        this.maxHp = 50;
        this.type = "slime";
    }
}
type("number")(Mob.prototype, "x");
type("number")(Mob.prototype, "y");
type("number")(Mob.prototype, "hp");
type("number")(Mob.prototype, "maxHp");
type("string")(Mob.prototype, "type");

class GameState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        this.mobs = new MapSchema();
    }
}
type({ map: Player })(GameState.prototype, "players");
type({ map: Mob })(GameState.prototype, "mobs");

// ===== ROOM =====
class GameRoom extends Room {
    onCreate() {
        this.setState(new GameState());
        this.maxClients = 100;
        
        // Spawn 5 slimes
        for (let i = 0; i < 5; i++) {
            const mob = new Mob();
            mob.id = `mob_${i}`;
            this.state.mobs.set(mob.id, mob);
        }

        this.onMessage("move", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.x = data.x;
                player.y = data.y;
            }
        });

        this.onMessage("attack", (client, mobId) => {
            const player = this.state.players.get(client.sessionId);
            const mob = this.state.mobs.get(mobId);
            if (player && mob) {
                mob.hp -= 25;
                if (mob.hp <= 0) {
                    player.exp += 15;
                    player.gold += 5;
                    if (player.exp >= player.level * 100) {
                        player.level++;
                        player.exp = 0;
                        player.maxHp += 20;
                        player.hp = player.maxHp;
                    }
                    // Respawn mob
                    mob.hp = mob.maxHp;
                    mob.x = Math.random() * 800;
                    mob.y = Math.random() * 600;
                }
            }
        });

        this.onMessage("chat", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            this.broadcast("chat", {
                sender: client.sessionId.substring(0, 5),
                message: message,
                class: player.class
            });
        });
    }

    onJoin(client, options) {
        console.log(client.sessionId, "joined!");
        const player = new Player();
        player.class = options.class || "mago_etereo";
        this.state.players.set(client.sessionId, player);
    }

    onLeave(client) {
        this.state.players.delete(client.sessionId);
        console.log(client.sessionId, "left!