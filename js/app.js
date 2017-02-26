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
analyser.minDecibels = -80;
analyser.maxDecibels = -0;
analyser.smoothingTimeConstant = 0;

// set up canvas context for visualizer
var canvas = $('#canvas');
var canvasCtx = document.getElementById("canvas").getContext("2d");
var appWidth = canvas.parent().width();
canvas.attr('width', appWidth);
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

            visualize();
        },

        // Error callback
        function (err) {
            console.log('The following gUM error occured: ' + err);
        }
    );
} else {
    console.log('getUserMedia not supported on your browser!');
}

function visualize() {
    WIDTH = canvas.width();
    HEIGHT = canvas.height();
    analyser.fftSize = 32;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    function draw() {
        drawVisual = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

        var barWidth = (WIDTH / bufferLength) * 2.5;
        var barHeight;
        var x = 0;
        var avg = 0;

        for (var i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i];
            avg += dataArray[i];

            canvasCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
            canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2);

            x += barWidth + 1;
        }

        console.log(avg / bufferLength);
    }

    draw();
}
