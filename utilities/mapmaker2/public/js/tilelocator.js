(function($, window, undefined) {
    $(function() {
        var $tilemap = $('#locTilemap'),
            $tileset = $('#locTileset'),
            ctxMap = $tilemap[0].getContext('2d'),
            ctxSet = $tileset[0].getContext('2d'),
            tileSize = 16,
            tilemapData = null,
            maps = null,
            props = {},
            init = false;

        window.initLocator = function(tilesz, tm, ts) {
            maps = {
                tilemap: tm,
                tileset: ts
            };

            if(typeof tilesz == 'string')
                tileSize = parseInt(tilesz, 10);
            else
                tileSize = tilesz;

            //init tilemap
            $tilemap.attr({
                width: maps.tilemap.width,
                height: maps.tilemap.height
            });

            ctxMap.drawImage(maps.tilemap, 0, 0);
            tilemapData = ctxMap.getImageData(0, 0, maps.tilemap.width, maps.tilemap.height);

            //init tileset
            $tileset.attr({
                width: maps.tileset.width,
                height: maps.tileset.height
            });

            ctxSet.strokeStyle = 'rgba(0, 255, 0, 1)';
            ctxSet.drawImage(maps.tileset, 0, 0);
            ctxSet.save();

            $('#locEntity').children().each(function(i, child) {
                if(child.id && child.id.match(/^ent_.+$/)) {
                    var p = this.id.match(/^ent_(.+)$/)[1];

                    props[p] = this.value;
                }
            });

            init = true;
        };

        $('#btnUploadLocate').on('click', function() {
            $dlgUpload.dialog('option', 'buttons', {
                Upload: doUploadToLocator,
                Cancel: function() { $(this). dialog('close'); }
            });
            $dlgUpload.dialog('open');
        });

        $tileset.on('mousemove', function(e) {
            if(!init) return;

            var pos = $tileset.position(),
                x = Math.floor((e.pageX - pos.left) / tileSize) * tileSize,
                y = Math.floor((e.pageY - pos.top) / tileSize) * tileSize;

            //draw the tile sized tool
            ctxSet.drawImage(maps.tileset, 0, 0);
            ctxSet.strokeRect(x, y, tileSize, tileSize);
        });

        $tileset.on('click', function(e) {
            if(!init) return;

            var pos = $tileset.position(),
                x = Math.floor((e.pageX - pos.left) / tileSize),
                y = Math.floor((e.pageY - pos.top) / tileSize);

            findTile({ x: x, y: y });
        });

        $('#locEntity').children().each(function(i, child) {
            if(child.id && child.id.match(/^ent_.+$/)) {
                $(child).on('change', function() {
                    var p = this.id.match(/^ent_(.+)$/)[1];

                    props[p] = this.value;
                });
            }
        });

        function findTile(tile) {
            var locs = [];

            //iterate through each pizel of the tilemap and store the ones that match this tile
            for(var x = 0; x < maps.tilemap.width; ++x) {
                for(var y = 0; y < maps.tilemap.height; ++y) {
                    var px = getTilemapPixel(x, y);

                    //tile to replace
                    if(px.red == tile.x && px.green == tile.y) {
                        var obj = $.extend({}, props);

                        obj.location = [x, y];
                        obj.locationUnits = 'pixels';
                        locs.push(obj);
                    }
                }
            }

            ctxMap.putImageData(tilemapData, 0, 0);
            console.log('Success! Generated', locs.length, 'entities!');
            $('#locJson').html(pretify(locs));
        }

        function getTilemapPixel(x, y) {
            var index = (y * tilemapData.width + x) * 4,
                red = tilemapData.data[index],
                green = tilemapData.data[index + 1],
                blue = tilemapData.data[index + 2],
                alpha = tilemapData.data[index + 3],
                rgba = { red: red, green: green, blue: blue, alpha: alpha };

            //rgba.hex = this.rgbaToHex(rgba);
            return rgba;
        }

        function pretify(obj) {
            var json = stringify(obj);
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                var cls = 'number';
                if (/^"/.test(match)) {
                    if (/:$/.test(match)) {
                        cls = 'key';
                    } else {
                        cls = 'string';
                    }
                } else if (/true|false/.test(match)) {
                    cls = 'boolean';
                } else if (/null/.test(match)) {
                    cls = 'null';
                }

                return '<span class="' + cls + '">' + match + '</span>';
            });
        }

        //this stringify formats it in a certain way, and makes some
        //assumptions about the kind of data in there
        function stringify(obj) {
            var str = '[\n';

            for(var i = 0, il = obj.length; i < il; ++i) {
                str += '    {\n';

                for(var p in obj[i]) {
                    str += '        "' + p + '": ';

                    var type = typeof obj[i][p],
                        num;

                    if(type !== 'object')
                        num = parseInt(obj[i][p], 10) || false;

                    if(num) obj[i][p] = num;

                    switch(type) {
                        case 'string':
                            str += '"' + obj[i][p] + '",\n';
                            break;
                        case 'number':
                            str += obj[i][p] + ',\n';
                            break;
                        case 'object':
                            if(obj[i][p] instanceof Array) {
                                str += '[';
                                for(var y = 0, yl = obj[i][p].length; y < yl; ++y) {
                                    str += obj[i][p][y] + ', ';
                                }
                                str = str.slice(0, str.length - 2);
                                str += '],\n';
                            }
                            break;
                        default:
                            break;
                    }
                }
                str = str.slice(0, str.length - 2);
                str += '\n    },\n';
            }

            str += ']';

            return str;
        }

        function doUploadToLocator() {
            var $form = $('#upload'),
                formData = new FormData($form[0]);

            $.ajax({
                url: '/uploadmaps',
                type: 'POST',
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                success: function(data, textStatus, jqXHR) {
                    var imgTilemap = new Image(),
                        imgTileset = new Image(),
                        tsz = $('#upTilesize').val();

                    imgTilemap.addEventListener('load', function() {
                        imgTileset.addEventListener('load', function() {
                            initLocator(tsz, imgTilemap, imgTileset);
                            $dlgUpload.dialog('close');
                        }, false);
                        imgTileset.src = data.tileset;
                    }, false);
                    imgTilemap.src = data.tilemap;
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    alert('DERP!', errorThrown);
                }
            });
        }
    });
})(jQuery, window);