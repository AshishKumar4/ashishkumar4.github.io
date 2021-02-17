const video = document.getElementById('webcam');
const predView = document.getElementById('prediction');
const frameDisplay = document.getElementById('frames')

const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');

// Check if webcam access is supported.
function getUserMediaSupported() {
    return !!(navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it to call enableCam function which we will 
// define in the next step.
if (getUserMediaSupported()) {
    enableWebcamButton.addEventListener('click', enableCam);
} else {
    console.warn('getUserMedia() is not supported by your browser');
}

// Enable the live webcam view and start classification.
async function enableCam(event) {
    // // Hide the button once clicked.
    event.target.classList.add('removed');

    // // getUsermedia parameters to force video but not audio.
    const constraints = {
        video: true
    };

    // // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        // video.srcObject = stream;
        video.addEventListener('loadeddata', predictWebcam);
    });
    webcam = await tf.data.webcam(video);
}

var model = undefined;
var modelInputShape = undefined;
var webcam = undefined;
var predictions = undefined;
var frames = 0;

function timer() {
    frameDisplay.innerHTML = frames.toString()
    frames = 0;
}

async function init() {
    // Store the resulting model in the global scope of our app.
    model = await tf.loadGraphModel('model.json');
    modelInputShape = model.inputs[0].shape;
    modelInputShape = [modelInputShape[1], modelInputShape[2]]
    demosSection.classList.remove('invisible');
    setInterval(timer, 1000);
}

var children = [];
var tf_time = 0;
var tf_profile = 0;

async function predictWebcam() {
    console.log("Here");
    while (true) {
        // Capture the frame from the webcam.
        const [raw, img] = await getImage();
        // Only Render on alternate frames
        if (frames % 1 == 0)
        {
            tf_profile = tf.profile(() => {
                tf_time = await tf.time(() => {
                    // Make a prediction through our newly-trained model using the embeddings
                    // from mobilenet as input.
                    await tf.tidy(() => {
                        predictions = model.predict(img);
                        let [background, person] = predictions.resizeNearestNeighbor([480, 640]).split(2, 3);
                        pmin = person.min();
                        pmax = person.max();
                        person = person.sub(pmin).div(pmax.sub(pmin)).squeeze();
                        tf.browser.toPixels(person, predView);
                    })
                })
            })
        }
        frames += 1;
        await tf.nextFrame();
    }
}

/**
 * Captures a frame from the webcam and normalizes it between -1 and 1.
 * Returns a batched image (1-element batch) of shape [1, w, h, c].
 */
async function getImage() {
    const img = await webcam.capture();
    const rawProcessed = tf.tidy(() => img.div(255).expandDims(0).toFloat());
    const finalProcessed = rawProcessed.resizeNearestNeighbor(modelInputShape)
    img.dispose();
    return [rawProcessed, finalProcessed];
}

init();