define([
    'game/lib/bases/SceneObject'
], function(SceneObject) {
    var Sprite = SceneObject.extend({
        /*
            Notes:
            > Offsets are counted as if the bottom left was 0, 0 like in  a Cartesian plane.
                Positive Y moves UP the rows, and positive X moves to down the cols right -> left.
            > Frames must be evenly spaced between eachother (recommend atleast 1px of space)

            opts = {
                //sprite
                texture: THREE.Texture, //texture of the sprite
                size: THREE.Vector2,    //width, height of the sprite
                area: THREE.Vector2,    //number of frame cols and frame rows in the texture
                offset: THREE.Vector2,  //offset to first frame in texture (cols, rows), default: (0, 0)
                zindex: Number,         //default: 1
                filtered: Boolean,      //whether to use linear filtering, default: false
                segments: THREE.Vector2,//number of x/y segments for the mesh

                //animations
                animations: {
                    name: { //semantic name
                        offset: THREE.Vector2,  //offset to first frame in texture, default: (0, 0)
                        numFrames: Number,      //default: 1 (no animation)
                        area: THREE.Vector2,    //number of columns and rows the animation resides in, default: (frames, 1)
                        duration: Number,       //length of animation, default: 1000
                        loop: Boolean           //loop the animation, default: true
                    },
                    ...
                }
            }
        */
        init: function(opts, engine) {
            this._super(engine);

            //sprite info
            this.texture = opts.texture;
            this.size = opts.size; //[width, height] in pixels
            this.area = opts.area;
            this.offset = (opts.offset !== undefined) ? opts.offset : new THREE.Vector2(0, 0); //[x, y] in pixels
            this.zindex = (opts.zindex !== undefined) ? opts.zindex : 1;
            this.filtered = (opts.filtered !== undefined) ? opts.filtered : false;
            this.segments = (opts.segments !== undefined) ? opts.segments : new THREE.Vector2(1, 1);

            //convert array to Vector2
            if(this.size instanceof Array)
                this.size = new THREE.Vector2(this.size[0], this.size[1]);

            if(this.offset instanceof Array)
                this.offset = new THREE.Vector2(this.offset[0], this.offset[1]);

            if(this.area instanceof Array)
                this.area = new THREE.Vector2(this.area[0], this.area[1]);

            if(this.segments instanceof Array)
                this.segments = new THREE.Vector2(this.segments[0], this.segments[1]);

            //animations
            this.animations = {}, inverses = {};
            for(var a in opts.animations) {
                if(opts.animations[a].inverseX) {
                    inverses[a] = { anim: opts.animations[a].inverseX, axis: 'X' };
                    continue;
                }

                if(opts.animations[a].inverseY) {
                    inverses[a] = { anim: opts.animations[a].inverseY, axis: 'Y' };
                    continue;
                }

                this.animations[a] = {
                    area:       opts.animations[a].area,
                    offset:     (opts.animations[a].offset !== undefined) ? opts.animations[a].offset : new THREE.Vector2(0, 0),
                    numFrames:  (opts.animations[a].numFrames !== undefined) ? opts.animations[a].numFrames : 1, //number of frames
                    duration:   (opts.animations[a].duration !== undefined) ? opts.animations[a].duration : 1000, //duration of the animation
                    loop:       (opts.animations[a].loop !== undefined) ? opts.animations[a].loop : true
                };

                if(this.animations[a].area === undefined)
                    this.animations[a].area = new THREE.Vector2(this.animations[a].numFrames, 1);

                this.animations[a]._frameTime = (this.animations[a].duration / this.animations[a].numFrames);

                //convert array to Vector2
                if(this.animations[a].offset instanceof Array)
                    this.animations[a].offset = new THREE.Vector2(this.animations[a].offset[0], this.animations[a].offset[1]);

                if(this.animations[a].area instanceof Array)
                    this.animations[a].area = new THREE.Vector2(this.animations[a].area[0], this.animations[a].area[1]);
            }

            //set inverse animations
            for(var i in inverses) {
                var o = this.animations[inverses[i].anim];
                this.animations[i] = {
                    area: new THREE.Vector2(o.area.x, o.area.y),
                    offset: new THREE.Vector2(o.offset.x, o.offset.y),
                    numFrames: o.numFrames,
                    duration: o.duration,
                    loop: o.loop,
                    inverse: true,
                    _frameTime: (o.duration / o.numFrames)
                };

                this.animations[i]['inverse' + inverses[i].axis] = true;
            }

            //class vars
            this.currentFrameTime = 0;
            this.currentTile = 0;
            this.currentAnim = 0;

            if(this.texture) this.setTexture(this.texture);
        },
        setTexture: function(tex) {
            var pos = new THREE.Vector2(0, 0);
            if(this._mesh) {
                pos = this._mesh.position.clone();
                this.engine.destroyMesh(this._mesh);
                this.engine.destroyTexture(this.texture);
            }

            this.texture = tex;

            this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping;
            this.texture.repeat.set(
                1 / this.area.x,
                1 / this.area.y
            );
            
            if(this.filtered) {
                this.texture.magFilter = THREE.LinearFilter;
                this.texture.minFilter = THREE.LinearMipMapLinearFilter;
            } else {
                this.texture.magFilter = THREE.NearestFilter;
                this.texture.minFilter = THREE.NearestMipMapNearestFilter;
            }

            this.texture.offset.x = (this.offset.x / this.area.x);
            this.texture.offset.y = (this.offset.y / this.area.y);

            //actual sprite
            this._plane = new THREE.PlaneGeometry(this.size.x, this.size.y, this.segments.x, this.segments.y);
            this._material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true });
            this._mesh = new THREE.Mesh(this._plane, this._material);
            this._mesh.position.set(pos.x, pos.y, this.zindex);
            
            this.addToScene(this.scene);
        },
        setAnimation: function(name) {
            this.currentFrameTime = 0;
            this.currentTile = 0;

            if(!name) {
                this.currentAnim = null;

                this.texture.repeat.set(
                    1 / this.area.x,
                    1 / this.area.y
                );

                //reset to the default frame
                this.texture.offset.x = (this.offset.x / this.area.x);
                this.texture.offset.y = (this.offset.y / this.area.y);
            }
            else if(this.animations && this.animations[name]) {
                this.currentAnim = this.animations[name];
                this.currentAnim._done = false;

                this.texture.repeat.set(
                    (this.currentAnim.inverseX ? -1 : 1) / this.area.x,
                    (this.currentAnim.inverseY ? -1 : 1) / this.area.y
                );

                //dont need to set these, since the animate function should do it for us
                this._setOffset();
            }

            return this.currentAnim;
        },
        update: function(delta) {
            this._super(delta);

            if(this.currentAnim) {
                if(this.currentAnim._done) return;

                var ms = delta * 1000;

                this.currentFrameTime += ms;
                while(this.currentFrameTime > this.currentAnim._frameTime) {
                    this.currentFrameTime -= this.currentAnim._frameTime;
                    this.currentTile++;

                    if(this.currentTile == this.currentAnim.numFrames) {
                        if(this.currentAnim.loop) {
                            this.currentTile = 0;
                        }
                        else {
                            this.currentAnim._done = true;
                            this.emit('animDone', this.currentAnim);
                            return;
                        }
                    }

                    this._setOffset();
                }
            }
        },
        _setOffset: function() {
            //for some reason when inversed, the tiles need to start at 1 instead of 0
            var add =  this.currentAnim.inverse ? 1 : 0;

            var currColumn = (this.currentTile + add) % (this.currentAnim.area.x + add);
            this.texture.offset.x = (currColumn / this.currentAnim.area.x) + (this.offset.x / this.area.x) + (this.currentAnim.offset.x / this.area.x);

            var currRow = Math.floor((this.currentTile + add) / (this.currentAnim.area.x + add));
            this.texture.offset.y = (currRow / this.currentAnim.area.y) + (this.offset.y / this.area.y) + (this.currentAnim.offset.y / this.area.y);
        }
    });

    return Sprite;
});