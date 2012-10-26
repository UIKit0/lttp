require([
    //Modules:
    'game/lib/utils/util',
    'game/lib/utils/AssetLoader',
    'game/lib/core/Engine',
    //Scripts that modify global:
    'game/vendor/three/three',
    'game/vendor/three/Stats',
    'game/vendor/three/Detector',
], function(util, AssetLoader, Engine) {
    $(function() {
        //Detect if webgl is supported, and if not exit
        if (!Detector.webgl) {
            $('#game').append(Detector.getWebGLErrorMessage());
            return;
        }

        //Load assets
        var resources;
        $('#btnDownload').on('click', function(e) {
            e.preventDefault();
            
            $(this).attr('disabled', true);
            
            var loader = new AssetLoader();
            loader.loadResources(
                [
                    { name: 'tilemap', type: 'texture', src: 'assets/maps/lightworld/tilemap.png' },
                    { name: 'tileset', type: 'texture', src: 'assets/maps/lightworld/tileset.png' },
                    { name: 'link_texture', type: 'texture', src: 'assets/characters/link/sprite.png' },
                    { name: 'link_json', type: 'json', src: 'assets/characters/link/sprite.json' }
                ],
                function(rsrcs) {
                    resources = rsrcs;

                    $('#btnDownload').hide();
                    $('#btnStart').show();
                }
            );
        });

        //Initialize engine when startup button is clicked
        var engine;
        $('#btnStart').on('click', function(e) {
            e.preventDefault();
            
            if(!engine) {
                engine = new Engine('#game', resources);
                engine.start();
                
                //$('#btnStart').text('Show Game');
            } else {
                //engine.viewport.requestFullScreen();
            }
        });
    });
});