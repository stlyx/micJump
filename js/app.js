// fork getUserMedia for multiple browser versions, for those
// that need prefixes
navigator.getUserMedia = (navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia);

// set up forked web audio context, for multiple browsers
// window. is needed otherwise Safari explodes
window.AudioContext = (window.AudioContext || window.webkitAudioContext);

var audioCtx = new window.AudioContext();
var source;
var stream;

//set up the different audio nodes we will use for the app
var analyser = audioCtx.createAnalyser();
analyser.minDecibels = -$('#sensitivity').val();
$('#sensitivity').change(function () {
    analyser.minDecibels = -$('#sensitivity').val();
});
analyser.maxDecibels = -0;
analyser.smoothingTimeConstant = 0;

// set up canvas context for visualizer
var canvas = $('#canvas');
var canvasCtx = document.getElementById("canvas").getContext("2d");
var appWidth = canvas.parent().width();
canvas.attr('width', appWidth);
WIDTH = canvas.width();
HEIGHT = canvas.height();
var drawVisual;

//main block for doing the audio recording

if (navigator.getUserMedia) {
    console.log('getUserMedia supported.');
    navigator.getUserMedia(
        // constraints - only audio needed for this app
        {
            audio: true
        },

        // Success callback
        function (stream) {
            source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            $('#startBtn').show();
        },

        // Error callback
        function (err) {
            setTimeout(function () {
                window.alert('Please refresh and allow audio recording.');
            }, 0);
            console.error(err);
            $('#startBtn').attr('disabled', 'disabled');
            $('#stopBtn').attr('disabled', 'disabled');
        }
    );
} else {
    setTimeout(function () {
        window.alert('Your browser doesn\'t support audio recodering, please use newer browser instead. ');
    }, 0);
    console.error('getUserMedia not supported on your browser!');
    $('#startBtn').attr('disabled', 'disabled');
    $('#stopBtn').attr('disabled', 'disabled');
}

var player;
var isCentered = false;
var enemies = [];
var grounds = [];
var score;
var gameArea = {
    start: function () {
        this.frameNo = 0;
    },
    clear: function () {
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    }
};
analyser.fftSize = 32;
var bufferLength = analyser.frequencyBinCount;
var dataArray = new Uint8Array(bufferLength);

function updateGameArea() {
    drawVisual = requestAnimationFrame(updateGameArea);
    for (var e1 in enemies) {
        if (player.crashWith(enemies[e1]) || player.y > HEIGHT) {
            stopGame();
            return;
        }
    }
    gameArea.clear();
    gameArea.frameNo++;
    $('#score').text(gameArea.frameNo);

    analyser.getByteFrequencyData(dataArray);
    var avg = 0;
    for (var i = 0; i < bufferLength; i++) {
        avg += dataArray[i];
    }
    avg = avg / bufferLength;
    if (avg > 10) {
        player.speedX = 2;
    } else {
        player.speedX = 0;
    }
    if (avg > 30 && player.hitGround()) {
        player.speedY = Math.max(-avg / 7, -7);
        console.log('jump ' + player.speedY);
    }
    player.update();

    for (var g1 in grounds) {
        grounds[g1].update();
    }

    if (gameArea.frameNo % 300 === 1) {
        enemy = new component(40, 40, 'red', 1000, 0, 'enemy');
        enemy.speedX = -1;
        enemies.push(enemy);
    }
    for (var e2 in enemies) {
        enemies[e2].update();
    }

}

function component(width, height, color, x, y, type) {
    this.compType = type;
    this.width = width;
    this.height = height;
    this.speedX = 0;
    this.speedY = 0;
    this.gravity = 0.08;
    this.x = x;
    this.y = y;
    this.update = function () {
        this.speedY += this.gravity;
        this.y += this.speedY;
        this.hitGround();
        if ((!isCentered) &&
            (this.compType === 'player') &&
            (this.x >= (WIDTH - this.width) / 2)) {
            isCentered = !isCentered;
        }
        if (isCentered) {
            if (this.compType !== 'player') {
                this.x -= player.speedX;
            }
        } else {
            this.x += this.speedX;
        }
        canvasCtx.fillStyle = color;
        canvasCtx.fillRect(this.x, this.y, this.width, this.height);
    };
    this.hitGround = function () {
        var myleft = this.x;
        var myright = this.x + (this.width);
        var mytop = this.y;
        var mybottom = this.y + (this.height);
        var ghighest = 2 * HEIGHT;
        for (var g in grounds) {
            var gleft = grounds[g].x;
            var gright = grounds[g].x + grounds[g].width;
            var gtop = grounds[g].y;
            if ((gleft < myleft && gright > myleft) ||
                (gleft < myright && gright > myright)) {
                ghighest = Math.min(ghighest, gtop);
                if (mybottom > ghighest) {
                    this.y = ghighest - this.height;
                    this.speedY = 0;
                    mytop = this.y;
                    mybottom = this.y + (this.height);
                }
            }
            if ((this.speedX > 0 && mybottom > gtop && myright >= gleft) ||
                (this.speedX < 0 && mybottom > gtop && myleft <= gright)) {
                this.speedX = 0;
            }
        }

        return mybottom === ghighest;
    };
    this.crashWith = function (otherobj) {
        var myleft = this.x;
        var myright = this.x + (this.width);
        var mytop = this.y;
        var mybottom = this.y + (this.height);
        var otherleft = otherobj.x;
        var otherright = otherobj.x + (otherobj.width);
        var othertop = otherobj.y;
        var otherbottom = otherobj.y + (otherobj.height);
        var crash = true;
        if ((mybottom < othertop) ||
            (mytop > otherbottom) ||
            (myright < otherleft) ||
            (myleft > otherright)) {
            crash = false;
        }
        return crash;
    };
}

function ground(width, height, x) {
    this.compType = 'ground';
    this.width = width;
    this.height = height + 1;
    this.speedX = 0;
    this.speedY = 0;
    this.gravity = 0;
    this.x = x;
    this.y = HEIGHT - height - 1;
    this.update = function () {
        this.speedY += this.gravity;
        this.y += this.speedY;
        if (isCentered) {
            if (this.compType !== 'player') {
                this.x -= player.speedX;
            }
        } else {
            this.x += this.speedX;
        }
        canvasCtx.fillStyle = 'black';
        canvasCtx.fillRect(this.x, this.y, this.width, this.height);
    };
}

$('#startBtn').click(startGame);

$('#stopBtn').click(stopGame);

function startGame() {
    $('#stopBtn').show();
    $('#startBtn').hide();
    player = new component(60, 100, 'blue', 10, 0, 'player');
    enemies = [];
    grounds = [new ground(500, 10, 0), new ground(200, 30, 500), new ground(1000, 10, 800)];
    gameArea.start();
    updateGameArea();
}

function stopGame() {
    $('#stopBtn').hide();
    $('#startBtn').show();
    cancelAnimationFrame(drawVisual);
}

function visualize() {
    analyser.fftSize = 32;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {
        drawVisual = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

        var barWidth = (WIDTH / bufferLength);
        var barHeight;
        var x = 0;
        var avg = 0;

        for (var i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i];
            avg += dataArray[i];

            canvasCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
            canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }

        console.log(avg / bufferLength);
    }

    draw();
}
