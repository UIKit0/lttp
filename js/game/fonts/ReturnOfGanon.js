define([
], function() {
    var map = {
        //TODO: Colon, semicolon, pipe, mudora symbols, heart symbols
        ':': 'colon',
        ';': 'semicolon',

        "'": 'comma',
        ',': 'comma',
        '-': 'dash',
        '!': 'exclamation',
        '.': 'period',
        '?': 'question',
        '<': 'arrow-left',
        '>': 'arrow-right',
        '(': 'open-parenthesis',
        ')': 'close-parenthesis',
    };
    'abcdefghijklmnopqrstuvwxyz'.split('').forEach(function(c) {
        map[c] = '_' + c;
    });

    'gjpqy,'.split('').forEach(function(c) {
        map[c] = {
            yoffset: 4,
            name: map[c]
        };
    });

    '<>'.split('').forEach(function(c) {
        map[c] = {
            yoffset: -4,
            name: map[c]
        };
    });

    map["'"] = {
        yoffset: -16,
        name: map["'"]
    };

    var ReturnOfGanon = function() {
        gf.TextureFont.call(this, 'font_retofganon', { ext: '.png', map: map });
        this.lineWidth = 1;
        this.lineHeight = 1.25;
        this.spaceSize = 10;
    };

    gf.inherits(ReturnOfGanon, gf.TextureFont);

    return ReturnOfGanon;
});