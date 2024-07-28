const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let pc;
const socket = io();
const configuration = {
    iceServers: [{
        urls: 'stun:stun.l.google.com:19302'
    }]
};

startButton.onclick = start;
callButton.onclick = call;
hangupButton.onclick = hangup;

function start() {
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    }).then(stream => {
        localVideo.srcObject = stream;
        localStream = stream;
        console.log('Local stream started');
    }).catch(error => {
        console.error('Error accessing media devices.', error);
    });
}

function call() {
    if (!localStream) {
        alert('Please start the local stream first');
        return;
    }

    pc = new RTCPeerConnection(configuration);
    pc.addStream(localStream);

    pc.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };

    pc.onaddstream = event => {
        remoteVideo.srcObject = event.stream;
    };

    pc.createOffer().then(offer => {
        return pc.setLocalDescription(offer);
    }).then(() => {
        socket.emit('offer', pc.localDescription);
        console.log('Offer sent');
    }).catch(error => {
        console.error('Error creating offer:', error);
    });
}

socket.on('offer', offer => {
    if (!pc) {
        pc = new RTCPeerConnection(configuration);
        pc.addStream(localStream);

        pc.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('candidate', event.candidate);
            }
        };

        pc.onaddstream = event => {
            remoteVideo.srcObject = event.stream;
        };
    }

    pc.setRemoteDescription(new RTCSessionDescription(offer)).then(() => {
        return pc.createAnswer();
    }).then(answer => {
        return pc.setLocalDescription(answer);
    }).then(() => {
        socket.emit('answer', pc.localDescription);
        console.log('Answer sent');
    }).catch(error => {
        console.error('Error handling offer:', error);
    });
});

socket.on('answer', answer => {
    pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(error => {
        console.error('Error setting remote description:', error);
    });
});

socket.on('candidate', candidate => {
    pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(error => {
        console.error('Error adding ICE candidate:', error);
    });
});

function hangup() {
    if (pc) {
        pc.close();
        pc = null;
        console.log('Call ended');
    }
}
