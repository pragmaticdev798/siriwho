window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.lang = "en-US";
const startButton = document.getElementById("startlistening");
const stopButton = document.getElementById("stoplistening");
const statusText = document.getElementById("status");
const controlBox = document.getElementById("controlbox");  
const commandList = document.getElementById("commandlist");
const toggleHelpButton = document.getElementById("toggle-help");
const mobileHelpToggle = document.getElementById("mobile-help-toggle");
const helpPanel = document.getElementById("helppanel");
const canvasContainer = document.getElementById("canvas-container");
const synth = window.speechSynthesis;


let music = new Audio();
music.onerror = function() {
    console.error("Error loading music file:", music.error);
    statusText.innerText = "Error loading music. Check file path.";
};
music.src = "music.mp3";

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
const dataArray = new Uint8Array(analyser.frequencyBinCount);
let microphone = null;
let isHumanSpeaking = false;
let isRobotSpeaking = false;
let mouthOpenAmount = 0;
let robotMouthOpenAmount = 0;
const canvas = document.createElement('canvas');
canvasContainer.appendChild(canvas);
canvas.width = 400;
canvas.height = 200;
const ctx = canvas.getContext('2d');
const MOUTH_MAX_HEIGHT = 20;

function resizeCanvas() {
    const containerWidth = canvasContainer.clientWidth;
    const containerHeight = Math.min(window.innerHeight * 0.3, 200);
    canvas.width = Math.min(containerWidth, 800);
    canvas.height = containerHeight;
    drawAvatars();
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
toggleHelpButton.addEventListener("click", () => {
    toggleHelpPanel();
});
mobileHelpToggle.addEventListener("click", () => {
    toggleHelpPanel();
});

function toggleHelpPanel() {
    helpPanel.classList.toggle("help-open");
    if (window.innerWidth <= 768) {
        mobileHelpToggle.innerText = helpPanel.classList.contains("help-open") ? "✖️" : "❓";
    }
}

function setupHelpPanel() {
    if (window.innerWidth <= 768) {
        helpPanel.classList.remove("help-open"); 
        mobileHelpToggle.style.display = "flex";
    } else {
        helpPanel.classList.add("help-open"); 
        mobileHelpToggle.style.display = "none"; 
    }
}

setupHelpPanel();
window.addEventListener('resize', setupHelpPanel);

function drawHumanAvatar(x, y, mouthOpen, scale = 1) {
    const AVATAR_SIZE = Math.min(canvas.height * 0.8, 150) * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, AVATAR_SIZE/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000'; 
    ctx.lineWidth = 2; 
    ctx.stroke(); 
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-AVATAR_SIZE/6, -AVATAR_SIZE/15, AVATAR_SIZE/8, 0, Math.PI * 2);
    ctx.arc(AVATAR_SIZE/6, -AVATAR_SIZE/15, AVATAR_SIZE/8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = AVATAR_SIZE/25;
    ctx.ellipse(0, AVATAR_SIZE/5, AVATAR_SIZE/5, mouthOpen, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawRobotAvatar(x, y, mouthOpen, scale = 1) {
    const AVATAR_SIZE = Math.min(canvas.height * 0.8, 150) * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-AVATAR_SIZE/2, -AVATAR_SIZE/2, AVATAR_SIZE, AVATAR_SIZE);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(-AVATAR_SIZE/2, -AVATAR_SIZE/2, AVATAR_SIZE, AVATAR_SIZE);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = AVATAR_SIZE/15;
    const antennaHeight = AVATAR_SIZE/3;
    ctx.beginPath();
    ctx.moveTo(0, -AVATAR_SIZE/2);
    ctx.lineTo(0, -AVATAR_SIZE/2 - antennaHeight);
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.fillRect(-AVATAR_SIZE*0.3, -AVATAR_SIZE*0.25, AVATAR_SIZE*0.2, AVATAR_SIZE*0.2);
    ctx.fillRect(AVATAR_SIZE*0.1, -AVATAR_SIZE*0.25, AVATAR_SIZE*0.2, AVATAR_SIZE*0.2);
    ctx.fillStyle = '#000';
    const mouthWidth = AVATAR_SIZE/3;
    ctx.fillRect(-mouthWidth/2, AVATAR_SIZE/15, mouthWidth, mouthOpen);
    ctx.restore();
}

function drawAvatars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scaleFactor = canvas.height / 200;
    const scaledHumanMouth = mouthOpenAmount * scaleFactor;
    const scaledRobotMouth = robotMouthOpenAmount * scaleFactor;
    drawHumanAvatar(canvas.width/4, canvas.height/2, scaledHumanMouth, scaleFactor);
    drawRobotAvatar(3*canvas.width/4, canvas.height/2, scaledRobotMouth, scaleFactor);
}

function animate() {
    if (microphone && isHumanSpeaking) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for(let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        let avg = sum / dataArray.length;
        
        
        if (avg > 5) {
            mouthOpenAmount = (avg / 100.0) * MOUTH_MAX_HEIGHT;
        } else {
            mouthOpenAmount = Math.max(mouthOpenAmount - 1, 0);
        }
        
        
        if (Math.random() < 0.01) console.log("Mic avg:", avg, "Mouth:", mouthOpenAmount);
    } else {
        mouthOpenAmount = Math.max(mouthOpenAmount - 1, 0);
    }
    
    if (isRobotSpeaking) {
        robotMouthOpenAmount = (Math.sin(Date.now() / 100) + 1) * MOUTH_MAX_HEIGHT / 2;
    } else {
        robotMouthOpenAmount = Math.max(robotMouthOpenAmount - 1, 0);
    }
    
    drawAvatars();
    requestAnimationFrame(animate);
}

startButton.addEventListener("click", async () => {
    try {
        
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
    
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
    
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        recognition.start();
        statusText.innerText = "Listening.... Speak Now!";
        isHumanSpeaking = true;
        
        console.log("Microphone connected and listening");
    } catch (err) {
        console.error("Error accessing microphone:", err);
        statusText.innerText = "Microphone access denied: " + err.message;
    }
});

stopButton.addEventListener("click", () => {
    recognition.stop();
    statusText.innerText = "Stopped Listening!";
    isHumanSpeaking = false;
    console.log("Recognition manually stopped");
});

recognition.onresult = function(event) {
    let command = event.results[event.results.length - 1][0].transcript.toLowerCase();
    console.log("Command Heard:", command);
    statusText.innerText = `Heard: "${command}"`;
    
    executeCommand(command);
};

recognition.onerror = function(event) {
    console.error("Recognition error:", event.error);
    statusText.innerText = `Error: ${event.error}`;
    isHumanSpeaking = false;
};

recognition.onend = function() {
    if (isHumanSpeaking) {
        
        try {
            recognition.start();
            console.log("Restarted recognition after automatic end");
        } catch (err) {
            console.error("Error restarting recognition:", err);
            statusText.innerText = "Recognition stopped unexpectedly";
            isHumanSpeaking = false;
        }
    }
};

function executeCommand(command) {
    if (command.includes("bigger")) {
        controlBox.style.fontSize = "clamp(1.5rem, 6vw, 40px)";
        updateCommands("make text smaller");
        speak("Text size increased!");
    } else if (command.includes("smaller")) {
        controlBox.style.fontSize = "clamp(0.8rem, 3vw, 16px)";
        updateCommands("make text bigger");
        speak("Text size decreased");
    } else if (command.includes("red")) {
        controlBox.style.backgroundColor = "red";
        speak("Color changed to red!");
    } else if (command.includes("blue")) {
        controlBox.style.backgroundColor = "blue";
        speak("Color changed to blue!");
    } else if (command.includes("rotate")) {
        controlBox.style.transform = "rotate(360deg)";
        speak("Rotating!");
    } else if (command.includes("play music")) {
        music.play().catch(err => {
            console.error("Error playing music:", err);
            speak("Error playing music. Try again.");
        });
        updateCommands("pause music");
        speak("Playing music!");
    } else if (command.includes("pause music")) {
        music.pause();
        updateCommands("play music");
        speak("Music paused!");
    } else if (command.includes("dark mode")) {
        document.body.classList.add("dark-mode");
        updateCommands("switch to light mode");
        speak("Dark mode activated!");
    } else if (command.includes("light mode")) {
        document.body.classList.remove("dark-mode");
        updateCommands("switch to dark mode");
        speak("Light mode activated!");
    } else if (command.includes("reset")) {
        controlBox.style = "";
        controlBox.innerText = "hello, change me with your voice!";
        document.body.classList.remove("dark-mode");
        updateCommands(["make text bigger", "change color to blue", "rotate the box", "play music", "switch to dark mode", "reset"]);
        speak("Everything has been reset!");
    } else {
        speak(`Unknown command: ${command}`);
    }
}

function updateCommands(newCommands) {
    if (typeof newCommands === "string") {
        newCommands = [newCommands];
    }
    commandList.innerHTML = "";
    newCommands.forEach(command => {
        let li = document.createElement("li");
        li.innerText = `"${command}"`;
        li.onclick = () => speakCommand(command);
        commandList.appendChild(li);
    });
}

function speak(text) {
    isRobotSpeaking = true;
    let utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
        isRobotSpeaking = false;
    };
    synth.speak(utterance);
}

function speakCommand(command) {
    let utterance = new SpeechSynthesisUtterance(command);
    synth.speak(utterance);
}


document.addEventListener('DOMContentLoaded', function() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        statusText.innerText = "Speech recognition not supported in this browser!";
        startButton.disabled = true;
        stopButton.disabled = true;
        return;
    }
    

    if (!window.AudioContext && !window.webkitAudioContext) {
        statusText.innerText = "Audio processing not supported in this browser!";
    }
    
    
    checkResources();
});


function checkResources() {
    
    fetch('music.mp3')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            console.log("Music file is accessible");
        })
        .catch(error => {
            console.error("Music file may not be accessible:", error);
            statusText.innerText = "Warning: Music file may not be accessible";
        });
}


function resetRecognition() {
    
    try {
        recognition.stop();
    } catch(e) {
        console.log("Recognition wasn't running");
    }
    
    
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const newRecognition = new SpeechRecognition();
    newRecognition.continuous = true;
    newRecognition.lang = "en-US";
    
    
    newRecognition.onresult = recognition.onresult;
    newRecognition.onerror = recognition.onerror;
    newRecognition.onend = recognition.onend;
    
    
    recognition = newRecognition;
    
    isHumanSpeaking = false;
    statusText.innerText = "Recognition reset. Click Start to begin.";
}


const resetButton = document.createElement('button');
resetButton.innerText = "Reset Recognition";
resetButton.addEventListener('click', resetRecognition);

controlBox.parentNode.insertBefore(resetButton, controlBox.nextSibling);


animate();
