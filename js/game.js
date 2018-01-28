define(function(require){

    var phaser = require("phaser");

    var scaleF = 1;
    var targetWidth = 2736*scaleF;
    var targetHeight = 1680*scaleF;

    var root = null;
    var lights = null;
    var lever = null;
    var black = null;
    var textOut = null;

    var bopLen = 90;
    var beepLen = 180;
    var beepBopPause = 40;
    var beepPause = 20;
    var beepPauseVar = 20;

    var gameTime = 0;
    var gameStartTime = 0;

    var playerBeep = null;
    var strangerBeep = null;
    var music = null;
    var static = null;
    var playerBeeps = [];
    var pbidx = 0 ;

    var lastBeepBop = -1;
    var ghostIsBeeping = false;
    var ghostIsBeepBopPaused = false;
    var ghostIsBeepPaused = false;
    var ghostIsTalking = false;
    var ghostBeepStart, ghostBeepEnd = 0;
    var ghostPhrase = [];
    var ghostPhrases = [];

    var textPhrases = [
        "What is this?",
        "WHAT is this?",
        "What is this place?",
        "Who's there?",
        "Who is talking to me?",
        "Can nobody hear me?",
        "What are you saying?",
        "What do I do?",
        "Is this a game?",
        "I don't want to play \nthis anymore...",
        "I don't understand \nthat...",
        "I can't understand \nyou...",
        "That makes no sense...",
        "No.",
        "It's cold here.",
        "Wake up?",
        "Does this thing even \nwork?"
    ];

    var showingText = false;

    var gameText = null;
     
    var ghostVol = 1;

    var clickPatterns = [];

    var game = new Phaser.Game(targetWidth, targetHeight, Phaser.AUTO_DETECT, 'phaser-example', { preload: preload, create: create });

    var gameController = {};

    function preload()
    {
        game.load.image('bg', 'assets/img/bg2x.jpg');
        game.load.image('fg', 'assets/img/fg2x.png');
        game.load.image('vignette', 'assets/img/vignette.png');
        game.load.image('lights', 'assets/img/lights2x.png');
        game.load.image('mcodelever', 'assets/img/mcodelever2x.png');
        game.load.image('mcodetop', 'assets/img/mcodetop2x.png');
        
        game.load.audio('music', 'assets/audio/music.mp3');
        game.load.audio('static', 'assets/audio/static.mp3');
        game.load.audio('playerbeep', 'assets/audio/playerbeep.mp3');
        game.load.audio('strangerbeep', 'assets/audio/strangerbeep.mp3');

        game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    }
    

    function initScene()
    {
        root = game.add.sprite(0, 0, 'bg');
        root.inputEnabled = true;

        lights = root.addChild(game.make.sprite(1928*scaleF, 160*scaleF, 'lights'));
        lights.anchor.set(0.5);

        var fg = root.addChild(game.make.sprite(0, 0, 'fg'));
        var vignette = root.addChild(game.make.sprite(0, 0, 'vignette'));

        lever = root.addChild(game.make.sprite(970*scaleF, 995*scaleF, 'mcodelever'));
        lever.anchor.set(0.5);

        var mcodetop = root.addChild(game.make.sprite(1365*scaleF, 849*scaleF, 'mcodetop'));
        mcodetop.anchor.set(0.5);

        var style = { font: "60px Courier", fill: "#ffffff", align: "center", style: "bold" };
        gameText = game.make.text(1750,1100, "", style);
        gameText.alpha = 0 ;
        root.addChild(gameText);
        
        black = game.add.graphics(0,0);
        black.beginFill(0x000000);
        black.drawRect(0, 0, targetWidth, targetHeight);
        black.endFill();
        root.addChild(black);

        var style = { font: "90px Courier", fill: "#ffffff", align: "center" };
        var text = game.make.text(130,130, "Begin transmission", style);
        black.addChild(text);
    }

    function initAudio()
    {
        playerBeep = game.add.audio('playerbeep');
        strangerBeep = game.add.audio('strangerbeep');
        music = game.add.audio('music');
        static = game.add.audio('static');
    }

    function create() 
    {

        addGhostPhrase(".-- .- -.- . / ..- .--.");
        addGhostPhrase("-.-- --- ..- / .- .-. . / - .... . / --. --- -.. .... . .- -..");
        addGhostPhrase("... - --- .--. / -.. .-. . .- -- .. -. --.");
        addGhostPhrase("- .- - / - ...- .- -- / .- ... ..");
        addGhostPhrase("-- ..-");
        addGhostPhrase(".- .-.. .-.. / .. ... / -- .. -. -..");
        addGhostPhrase("-- .- -.-- .- / .. ... / .. .-.. .-.. ..- ... .. --- -.");
        addGhostPhrase("... - --- .--. / -.. .-. . .- -- .. -. --. / .- -. -.. / .-- .- -.- . / ..- .--.");
        addGhostPhrase(".. - ... / .--- ..- ... - / .- / --. .- -- .");
        addGhostPhrase("-.-- --- ..- / .- .-. . / .. -");
        addGhostPhrase("-. --- / - .... .. -. --.");

        initScene();
        initAudio();        

        music.loopFull(0.7);

        root.events.onInputDown.add(gameController.beginGame,this);
    }

    function addGhostPhrase(str)
    {
        var p = [];
        var idx = 0;
        var escape = false;
        while(!escape)
        {
            var c = null;
            if(idx >= str.length) escape = true;
            else 
            {
                c = str[idx];
                idx++;
                switch(c)
                {
                    case ".":
                        p.push(0);
                    break;
                    case " ":
                        p.push(2);
                    break;
                    case "-":
                        p.push(1);
                    break;
                    case "/":
                        p.push(2);
                        p.push(2);
                        p.push(2);
                    break;
                }
            }            
        }
        ghostPhrases.push(p);
    }

    gameController.addClickPattern = function(start,end)
    {
        var cp = { start:start, end:end };
        this.clickPatterns.push(cp);
    }

    gameController.ghostTick = function()
    {
        if( ghostIsTalking ) return;
        else 
        {
            var rPhrase = null;
            if( playerBeeps.length )
            {
                var start = Math.floor(Math.random()*playerBeeps.length);
                var end = Math.round(Math.random()*(playerBeeps.length-start));
                rPhrase = playerBeeps.splice(start,end);
                playerBeeps = [];
            }
            else
            {
                var ridx = Math.floor(Math.random()*ghostPhrases.length);
                rPhrase = ghostPhrases[ridx];
            }
            gameController.playGhostPhrase( rPhrase );
        }
    }

    gameController.showText = function(msg)
    {
        gameText.alpha = 0;
        gameText.text = msg;
        var i = game.add.tween(gameText).to( { alpha: 0.8 }, 5000, "Quart.easeIn", true);
        var o = game.add.tween(gameText).to( { alpha: 0 }, 10000, "Quart.easeOut", false, 1000 );
        o.onComplete.add(gameController.cancelText);
        i.chain(o);
        showingText = true;
    }
    gameController.cancelText = function()
    {
        console.log("cancelText");

        showingText = false;
    }.bind(gameController);

    function getRandomPhrase()
    {
        return textPhrases[Math.floor(Math.random()*textPhrases.length)];
    }
    gameController.update = function()
    {
        gameController.ghostUpdate();

        gameTime = Date.now() - gameStartTime;
        if( (gameTime > 10000) && !showingText ) gameController.showText(getRandomPhrase());

        requestAnimationFrame(gameController.update);

    }

    gameController.playGhostPhrase = function(phrase)
    {
        ghostPhrase = phrase.concat();
        ghostIsTalking = true;
        ghostVol = Math.random();
    }  
    gameController.endGhostPhrase = function()
    {
        gameController.strangerBeepOff();
        ghostIsTalking = false;
    }   
    gameController.ghostUpdate = function()
    {
        var now = Date.now();  
        if( !ghostIsBeeping && (ghostPhrase.length>0) && !ghostIsBeepPaused ) // start a phrase
        {
            //console.log("start");

            var nBeep = ghostPhrase.shift();

            var beepDuration = 0;
            switch( nBeep ){
                case 0:
                    beepDuration = bopLen;
                break;
                case 1:
                    beepDuration = beepLen;
                break;
                case 2:
                    beepDuration = -1;
                break;
            } 

            if( beepDuration == -1 )
            {
                //console.log("do pause");
                beepDuration = beepBopPause; 
                ghostIsBeeping = true;
            }
            else
            {
                //console.log("beep");
                gameController.ghostEcho(beepDuration,ghostVol);  
            }

            ghostBeepStart = now;
            ghostBeepEnd = ghostBeepStart+beepDuration;            
        }
        else if( ghostIsBeeping && (now>ghostBeepEnd) ) // end a beep
        {
            //console.log("end");
            gameController.ghostBeepOff();
            if( ghostPhrase.length > 0 ) 
            {
                ghostIsBeepPaused = true;
                ghostResumeAt = now + beepPause + (beepPauseVar*Math.random());
            }
            else 
            {
                ghostIsTalking = false; //finished phrase
            }
        }
        else if( ghostIsBeepPaused && (now>ghostResumeAt) )
        {
            ghostIsBeepPaused = false;
        }

    }.bind(gameController);

    gameController.ghostEcho = function(duration,vol)
    {
        strangerBeep.loopFull(vol);
        ghostIsBeeping = true;
    }
    gameController.ghostNextBeep = function()
    {
        if( ghostPhrase.length ) gameController.ghostEcho(ghostPhrase.shift());
        else ghostIsTalking = false;
    }.bind(gameController);
    gameController.ghostBeepOff = function(duration)
    {
        strangerBeep.stop();
        ghostIsBeeping = false;
    }.bind(gameController);


    gameController.beginGame = function()
    {
        gameStartTime = Date.now();
        var fadeInTime = 10000;

        root.events.onInputDown.remove(gameController.beginGame,this);

        game.add.tween(black).to( { alpha: 0 }, fadeInTime, "Linear", true);        

        initLightsController();
        initLeverController();

        static.fadeIn(fadeInTime,true);

        requestAnimationFrame(gameController.update);
        game.time.events.loop(8000, gameController.ghostTick, this);
    }

    gameController.toggleLights = function()
    {
        lights.visible = !lights.visible;
    }
    function initLightsController()
    {
        var flashRate = 2.5 * 1000;
        game.time.events.loop(flashRate, gameController.toggleLights, this);
    }
    
    gameController.onLeverDown = function()
    {
        lever.rotation = 0.06;
        playerBeep.loopFull(1);

        playerBeepStart = Date.now();

        // todo: record player, interpret as beep or bop or pause and accumulate, after long player pause, write to player phrases
    }
    gameController.onLeverUp = function()
    {
        lever.rotation = 0;
        playerBeep.stop();

        //playerBeepEnd = Date.now();
        //var isBeep = false;
        //if((playerBeepEnd-playerBeepStart) > bopLen) isBeep = true;
       // playerBeeps.push();
    }
    function initLeverController()
    {
        root.events.onInputDown.add(gameController.onLeverDown,this);
        root.events.onInputUp.add(gameController.onLeverUp,this);
    }

    return gameController;
    

});