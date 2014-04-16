//requirements
var c               = require("../config/constantes");
var world           = require("../world");
var addRenderSystem = require("../modules/render");
var EventEmitter    = require("../../lib/events-emitter.js");

var Decor = function Decor(params)
{
    this.id          = world.gameObjects.length;
    this.position    = params.position;
    this.size        = params.size       || { width : 10, height : 10 };
    this.speed       = params.speed      || 5;
    this.zIndex      = params.zIndex     || 0;
    this.context     = params.context    || world.context;
    this.direction   = { x : Math.cos(params.angle), y : Math.sin(params.angle) };
    this.spritesheet = params.spritesheet;
    this.spritePos   = { x : (Math.floor(Math.random()*10) - 1) * 500, y : 0 };
    this.spriteSize  = params.spriteSize || { width : 250, height : 250 };

    this.run = function()
    {
        this.move();
        this.drawFrame();
    }
}

Decor.prototype.move = function()
{
    this.position.x += this.direction.x * this.speed;
    this.position.y += this.direction.y * this.speed;
}

addRenderSystem(Decor.prototype);

module.exports = Decor;