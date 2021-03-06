//requirements
var c               = require("../config/constantes");
var utils           = require("../controllers/utils");
var scoreController = require("../controllers/scoreController");
var world           = require("../world");
var addRenderSystem = require("../modules/render");
var Bullet          = require("../models/bullet");
var EXPLOSION       = require("../models/explosion");
var EventEmitter    = require("../../lib/events-emitter.js");

var LightShip = function LightShip(params)
{
    this.id                = world.gameObjects.length;
    this.tag               = params.tag;
    this.layer             = "enemy";
    this.playerID          = -1;
    this.position          = params.position         || { x : 0, y : 0 };
    this.size              = params.size             || { width : 50, height : 50 };
    this.speed             = params.speed            || 8;
    this.zIndex            = params.zIndex           || 500;
    this.context           = params.context          || world.context;
    this.angle             = params.angle            || 0;
    this.moveDirection     = { x : Math.cos(this.angle), y : Math.sin(this.angle) };
    this.direction         = { x : Math.cos(this.angle), y : Math.sin(this.angle) };
    
    this.attackDelay       = params.attackDelay      || 5000;
    this.prevShot          = 0;
    this.hitPoints         = params.hitPoints        || 100;
    this.damageBullet      = params.damageBullet     || 20;
    this.damage            = params.damage           || 30;

    this.spritesheet       = params.spritesheet;
    this.spritesheetBullet = params.spritesheetBullet;
    this.spriteSize        = params.spriteSize       || { width : 128, height : 128 };
    this.anims             = params.anims;
    this.activeAnim        = this.anims[params.activeAnim] || this.anims['fly'];
    this.animY             = this.activeAnim["animY"];

    this.precision         = [ -10, -5, 0, 0, 0, 5, 10];
    this.colliderPadding   = 0;
    this.visible           = false;

    this.scoreValue        = params.scoreValue       || 50;

    var self = this;
    this.on("set animation", function(name) {
        if (self.activeAnim != self.anims[name])
        {
            self.activeAnim  = self.anims[name];
            self.animY       = self.activeAnim["animY"];
            self.frameNum    = 0;
            self.frameCount  = 0;
            self.isAnimating = true;
        }
    });

    this.run = function()
    {
        this.setFocus();
        this.move();
        this.limits();        
        this.shoot();
        this.collisions();
        this.animate();
    }
}

LightShip.prototype.move = function()
{
    this.position.x += this.moveDirection.x * this.speed;
    this.position.y += this.moveDirection.y * this.speed;
}

LightShip.prototype.limits = function()
{
    this.isVisible();

    if (this.visible)
    {
        if (this.position.x < 0 || this.position.x + this.size.width  > c.GAME_WIDTH ||
            this.position.y < 0 || this.position.y + this.size.height > c.GAME_HEIGHT)
        {
            var angle = utils.getAngle(this.position, this.targetPos);
            this.moveDirection = { x : Math.cos(angle), y : Math.sin(angle) };
        }        
    }
}

LightShip.prototype.isVisible = function()
{
    if (this.position.x > 0 && this.position.x + this.size.width  < c.CANVAS_WIDTH &&
        this.position.y > 0 && this.position.y + this.size.height < c.CANVAS_HEIGHT && !this.visible)
    {
        this.visible = true;
    }
}

LightShip.prototype.setFocus = function()
{    
    var players = world.find("tag", "player");
    for (var i = 0; i < players.length; i++)
    {
        var targetPos = 
        {
            x : players[i].position.x+15,
            y : players[i].position.y+15
        }

        if (i === 0)
        {
            this.targetPos = targetPos;
        }
        else
        {
            if (utils.getDistance(this.position, players[i].position) < utils.getDistance(this.position, this.targetPos))
            {
                this.targetPos = targetPos;
            }      
        }
    }

    this.angle = utils.getAngle(this.position, this.targetPos);    
    this.direction = { x : Math.cos(this.angle), y : Math.sin(this.angle) };
}

LightShip.prototype.shoot = function()
{
    var datTime = new Date().getTime();

    this.animY = this.activeAnim["animY"] + 128;

    if (datTime - this.prevShot > this.attackDelay)
    {

        if (this.moving)
        {
            var canonDistance = this.size.width / 2;
        }
        else
        {
            var canonDistance = this.size.width / 2;
        }

        var randomAim = this.precision[Math.floor(Math.random() * this.precision.length)] * Math.PI/180;

        world.create(new Bullet(
            {
                playerID : this.playerID,
                position : { 
                    x : (this.position.x + this.size.width / 2)  + this.direction.x * canonDistance - 32,
                    y : (this.position.y + this.size.height / 2) + this.direction.y * canonDistance - 5
                },
                size : { width : 28, height : 8 },
                startAngle : this.angle + randomAim,
                speed : 10,
                damage : this.damageBullet,
                layer : this.layer,
                spritesheet : this.spritesheetBullet,
                spriteSize : { width : 128, height : 18 },
                anims : c.ANIMATIONS["BULLET_ENEMY"],
            }));

        this.prevShot = new Date().getTime();
        this.attackLimit -= 10;
    }
}

LightShip.prototype.collisions = function()
{
    for (var i = 0; i < world.gameObjects.length; i++)
    {
        var other = world.gameObjects[i];

        if (other.layer === "player")
        {
            if (this.position.x + this.size.width > other.position.x + other.colliderPadding  && 
                this.position.x < other.position.x + other.size.width - other.colliderPadding &&
                this.position.y + this.size.height > other.position.y + other.colliderPadding && 
                this.position.y < other.position.y + other.size.height - other.colliderPadding)
            {
                if (other.tag === "bullet")
                {
                    this.hitPoints -= other.damage;

                    this.lastAttackerID = other.playerID;

                    other.dead = true;
                    world.create(new EXPLOSION({
                        position : { x : other.position.x, y : other.position.y },
                        size : { width  : other.size.width, height : other.size.width },
                        zIndex : this.zIndex+1,
                        spritesheet : world.manifest.images["dragon_explosion.png"],
                        anims  : c.ANIMATIONS["EXPLOSION"],
                        spriteSize : { width : 380, height : 380 }
                    }));                    
                }
            }
        }
    }

    if (this.isDead())
    {
        scoreController.addScoreTo(this.lastAttackerID, this.scoreValue);

        scoreController.substractScoreToIA(this.scoreValue);

        world.create(new EXPLOSION(
        {
            position : { x : this.position.x, y : this.position.y },
            size : { width  : this.size.width, height : this.size.width },
            zIndex : this.zIndex + 1,
            spritesheet : world.manifest.images["enemy_explosion.png"], //put enemy explosion image when fixed
            anims  : c.ANIMATIONS["EXPLOSION"],
            spriteSize : { width : 380, height : 380 }
        }));
        
        this.dead = true;
    }
}

LightShip.prototype.isDead = function()
{
    if (this.hitPoints <= 0)
        return true;
}

EventEmitter.mixins(LightShip.prototype);
addRenderSystem(LightShip.prototype);

module.exports = LightShip;