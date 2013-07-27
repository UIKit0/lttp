define([
    'game/data/types'
], function(types) {
    var LttpEntity = function(spritesheet) {
        //can be lifted by another entity
        this.liftable = false;

        //can be effected by bombs
        this.explodable = true;

        //is cutable by a sword
        this.cutable = false;

        //is this sprite attacking?
        this.attacking = false;

        //is this sprite able to move?
        this.freeze = false;

        //will break the sprint of an entity that hits this one
        this.breakSprint = false;

        //maximum health of this entity
        this.maxHealth = 3;

        //current health of this entity
        this.health = 3;

        //maximum maxMagic of this entity
        this.maxMagic = 10;

        //current magic of this entity
        this.magic = 10;

        //current inventory of the entity
        this.inventory = {};

        //loot of the entity that is dropped when it dies
        this.loot = [];

        //moveSpeed the ent moves at
        this.moveSpeed = 50;

        gf.AnimatedSprite.call(this, spritesheet);
    };

    gf.inherits(LttpEntity, gf.AnimatedSprite, {
        _addDirectionalFrames: function(type, num, speed, loop) {
            this._addFrames([
                type + '_left',
                type + '_right',
                type + '_down',
                type + '_up'
            ], num, speed, loop);
        },
        _addFrames: function(types, num, speed, loop) {
            if(!(types instanceof Array))
                types = [types];

            for(var t = 0, tl = types.length; t < tl; ++t) {
                var frames = [],
                    type = types[t];

                for(var f = 1; f <= num; ++f) {
                    frames.push(type + '/' + type + '_' + f + '.png');
                }
                this.addAnimation(type, frames, speed, loop);
            }
        }
    });

    var Enemy = function(texture) {
        LttpEntity.call(this, texture);

        //enemy type
        this.type = gf.Sprite.TYPE.ENEMY;
    };

    gf.inherits(Enemy, LttpEntity);

    var Link = function(texture) {
        LttpEntity.call(this, texture);

        //player type
        this.type = gf.Sprite.TYPE.PLAYER;

        //set name of Link
        this.name = 'link';

        //size
        //this.width = 16;
        //this.height = 22;

        this.movement = new gf.Vector();

        this.bindKeys();
        this.bindGamepad();
        this.addAnimations();

        //make the camera track this entity
        window.link = this;
    };

    gf.inherits(Link, LttpEntity, {
        bindKeys: function() {
            //bind the keyboard
            lttp.game.input.keyboard.on(gf.input.KEY.W, this.onWalk.bind(this, 'up'));
            lttp.game.input.keyboard.on(gf.input.KEY.A, this.onWalk.bind(this, 'left'));
            lttp.game.input.keyboard.on(gf.input.KEY.S, this.onWalk.bind(this, 'down'));
            lttp.game.input.keyboard.on(gf.input.KEY.D, this.onWalk.bind(this, 'right'));

            lttp.game.input.keyboard.on(gf.input.KEY.E, this.onUseItem.bind(this));
            lttp.game.input.keyboard.on(gf.input.KEY.SPACE, this.onAttack.bind(this));
        },
        bindGamepad: function() {
            //bind the gamepad
            lttp.game.input.gamepad.sticks.on(gf.input.GP_AXIS.LEFT_ANALOGUE_HOR, this.onWalk.bind(this, 'left'));
            lttp.game.input.gamepad.sticks.on(gf.input.GP_AXIS.LEFT_ANALOGUE_HOR, this.onWalk.bind(this, 'right'));
            lttp.game.input.gamepad.sticks.on(gf.input.GP_AXIS.LEFT_ANALOGUE_VERT, this.onWalk.bind(this, 'up'));
            lttp.game.input.gamepad.sticks.on(gf.input.GP_AXIS.LEFT_ANALOGUE_VERT, this.onWalk.bind(this, 'down'));

            lttp.game.input.gamepad.buttons.on(gf.input.GP_BUTTON.FACE_1, this.onUseItem.bind(this));
            lttp.game.input.gamepad.buttons.on(gf.input.GP_BUTTON.FACE_2, this.onAttack.bind(this));
        },
        addAnimations: function() {
            //add walking animations
            this._addDirectionalFrames('walk', 8, 0.23, true);

            //add idle animations
            this.addAnimation('idle_left', ['walk_shield_left/walk_shield_left_1.png']);
            this.addAnimation('idle_right', ['walk_shield_right/walk_shield_right_1.png']);
            this.addAnimation('idle_down', ['walk_shield_down/walk_shield_down_1.png']);
            this.addAnimation('idle_up', ['walk_shield_up/walk_shield_up_1.png']);
            //this._addDirectionalFrames('idle', 1);

            //add attack animations
            this._addDirectionalFrames('attack', 9, 0.6);

            //add bow attack animations
            this._addDirectionalFrames('attack_bow', 3, 0.23);

            //add spin attack animations
            this._addDirectionalFrames('attack_spin', 12, 0.23);

            //add attack tap animations
            this._addDirectionalFrames('attack_tap', 3, 0.23);

            //add fall in hole animations
            this._addFrames('fall_in_hole', 4, 0.23);

            //add lifting animations
            this._addDirectionalFrames('lift', 4, 0.23);

            //add lifting walking animations
            this._addFrames(['lift_walk_left', 'lift_walk_right'], 3, 0.23);
            this._addFrames(['lift_walk_down', 'lift_walk_up'], 6, 0.23);

            //add pulling animations
            this._addDirectionalFrames('pull', 5, 0.23);

            //add walking-attacking animations
            this._addFrames(['walk_attack_left', 'walk_attack_right'], 3, 0.23, true);
            this._addFrames(['walk_attack_down', 'walk_attack_up'], 6, 0.23, true);

            //add walking with shield animations
            this._addDirectionalFrames('walk_shield', 8, 0.23, true);

            //set active
            this.gotoAndPlay('idle_down');
        },
        onWalk: function(dir, action, kpress) {
            //gamepad input
            if(dir === 'horz')
                dir = status.negative ? 'left' : 'right';
            else if(dir === 'vert')
                dir = status.negative ? 'down' : 'up';

            var p = dir === 'left' || dir === 'right' ? 'x' : 'y',
                amt = dir === 'right' || dir === 'down' ? this.moveSpeed : -this.moveSpeed;

            // .down is keypressed down, .value means the gp
            // axis is non-center
            if(status.down || status.value) {
                this.movement[p] = amt;
            } else {
                this.movement[p] = 0;
            }

            if(this.frozen) return;

            //this should be based on specified scale number
            if(p === 'x' && amt < 0) {
                //this.sprite.scale.x = -1;
                //this.anchor.x = 1;
            }
            else if(p === 'x' && amt > 0) {
                //this.sprite.scale.x = 1;
                //this.anchor.x = 0;
            }

            this._setMoveAnimation();
            this.setVelocity(this.movement);
        },
        _setMoveAnimation: function() {
            //set movement animations
            if(this.movement.x || this.movement.y) {
                if(this.inventory.sword && this.inventory.shield) {
                    if(this.currentAnimation.indexOf('walk_shield') !== -1) {
                        this._setDirAnimation('walk_shield');
                    }
                }
                else if(this.inventory.sword) {
                    if(this.currentAnimation.indexOf('walk_sword') !== -1) {
                        this._setDirAnimation('walk_sword');
                    }
                }
                else {
                    if(this.currentAnimation.indexOf('walk') !== -1) {
                        this._setDirAnimation('walk');
                    }
                }
            }
            //set idle animations
            else {
                if(this.currentAnimation.indexOf('idle') !== -1) {
                    this._setDirAnimation('idle');
                }
            }
        },
        _setDirAnimation: function(anim) {
            if(this.movement.x) {
                if(this.movement.x > 0) {
                    this.gotoAndPlay(anim + '_right');
                } else {
                    this.gotoAndPlay(anim + '_left');
                }
            }
            else if(this.movement.y) {
                if(this.movement.y > 0) {
                    this.gotoAndPlay(anim + '_down');
                } else {
                    this.gotoAndPlay(anim + '_up');
                }
            }
        },
        //on collision
        onCollision: function(ent) {
            LttpEntity.prototype.onCollision.call(this, ent);
            //console.log('Colliding with', ent);
        },
        //use equipted item
        onUseItem: function() {},
        //when attack key is pressed
        onAttack: function(action, kpress) {
            if(!kpress || this.currentAnim.name.indexOf('attack') !== -1)
                return;

            var name = this.currentAnim.name,
                oldVel = this.velocity.clone(),
                dir = name.split('_').pop(),
                self = this;

            this.velocity.set(0, 0);
            this.freeze = true;
            this.attacking = true;

            this.gotoAndPlay('attack_' + dir, function() {
                self.gotoAndPlay(name);
                self.velocity.copy(oldVel);
                self.freeze = false;
            });
        }
    });

    return {
        LttpEntity: LttpEntity,
        Enemy: Enemy,
        Link: Link
    };
});
