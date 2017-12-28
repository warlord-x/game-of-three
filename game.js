var localData;
var remoteData;
var sendButton;
var startButton;
var peerConnection;
var peerConnectionConfig = {'iceServers': [{'url': 'stun:stun.services.mozilla.com'}, {'url': 'stun:stun.l.google.com:19302'}]};
var serverConnection;
var movesListing;
var sendChannel = null;
var receiveChannel = null;
var uuid;
var selector;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;

function updateMovesListing(moveText,color) {
    var para = document.createElement("P");
    var t = document.createTextNode(moveText);
    para.appendChild(t);                      
    para.style.color = color;
    movesListing.appendChild(para);
}

function updateSentNum(chosenNum) {

    var receivedNum = parseInt(remoteData.value, 10);
    var addNum  = parseInt(chosenNum, 10);

    if(isNaN(receivedNum) || isNaN(addNum)){
        enableChoice();
        return;
    }


    var result = receivedNum + addNum;
    if(!(result % 3)){

        var finalRes = result / 3;
        if(finalRes === 1){
            updateMovesListing("You won!!!",'green');
            sendChannel.send("game over! you lost :(");
            return;
        }
        localData.value = finalRes;
        enableSend();
        updateMovesListing("sending : "+ receivedNum + " +("+addNum+") / 3 = " + finalRes,'green');
    }
    else{
        updateMovesListing("wrong choice not divisible by 3 result: " + result / 3,'red');
        enableChoice();
    }
}

function enableChoice () {
    selector.focus();
    sendButton.disabled = true;
}

  function sendMessage() {
    var message = localData.value;
    sendChannel.send(message);
    localData.value = "";
    toggleSend();
    selector.selectedIndex = 0;
    updateMovesListing("sending : " + message,'green');
  }

  function handleReceiveMessage(event) {
    var receivedMessage = event.data;
    updateMovesListing("received : " + receivedMessage,'green');
    if(receivedMessage === 'game over! you lost :('){
        disconnectPeers();
    }
    remoteData.value=receivedMessage;
    selector.disabled = false;
    toggleSend();

  }


function init() {

    uuid = setUuid();
    localData = document.getElementById('localData');
    remoteData = document.getElementById('remoteData');
    sendButton = document.getElementById('sendButton');
    startButton = document.getElementById('start');
    selector = document.getElementById('chosenMove');
    movesListing = document.getElementById('movesListing');
    localData.value = "";
    remoteData.value = "";
    disableLocal();
    startButton.disabled = false;
    serverConnection = new WebSocket('ws://127.0.0.1:3434');
    serverConnection.onmessage = gotMessageFromServer;
    serverConnection.onerror = OnSocketError;
}

function OnSocketError(ev)
{
    updateMovesListing("Socket error: can't connect to server ",'red');
    document.getElementById('restartButtonDiv').style.display = 'block';
}

function start(isCaller) {
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = gotIceCandidate;

    sendChannel = peerConnection.createDataChannel("sendChannel");
    sendChannel.onopen = handleSendChannelStatusChange;
    sendChannel.onclose = handleSendChannelStatusChange;
    peerConnection.ondatachannel = receiveChannelCallback;

    if(isCaller) {
        peerConnection.createOffer(gotDescription, createOfferError);
        var gerNum = Math.floor(Math.random() * (100 - 0 + 1)) + 1;
        localData.value = gerNum;
        selector.disabled = true;
    } else {
        disableLocal();
    }

}

function receiveChannelCallback(event) {
    receiveChannel = event.channel;
    receiveChannel.onmessage = handleReceiveMessage;
    receiveChannel.onopen = handleReceiveChannelStatusChange;
    receiveChannel.onclose = handleReceiveChannelStatusChange;
  }

function gotDescription(description) {
    peerConnection.setLocalDescription(description, function () {
        serverConnection.send(JSON.stringify({'sdp': description}));
    }, function() {console.log('set description error')});
}

function gotIceCandidate(event) {
    if(event.candidate != null) {
        serverConnection.send(JSON.stringify({'ice': event.candidate}));
    }
}

function disableLocal(){
    localData.disabled = true;
    remoteData.disabled = true;
    sendButton.disabled = true;
    startButton.disabled = true;
    selector.disabled = true;
}

function createOfferError(error) {
    console.log(error);
}

function gotMessageFromServer(message) {
    var players = parseInt(message.data, 10);
    console.log("isNanPlayers:"+isNaN(players));
    if(!isNaN(players) && players > 1){
        console.log("player found");
        startButton.disabled = false;
        return;
    }
    if(!peerConnection) start(false);

    var signal = JSON.parse(message.data);
console.log(signal);
    updateMovesListing("received uuid:"+signal.uuid,'green');
    updateMovesListing("own uuid:"+uuid,'green');

     if(signal.uuid === uuid) return;

     if(signal.sdp) {
         updateMovesListing("inside signal.sdp if"+signal.sdp.type,'blue');
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
           if(signal.sdp.type == 'offer') {
               updateMovesListing("received message from server with signa.sdp.type==offer, logged peer connection",'green');
               console.log(peerConnection);
                peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
            }
        }).catch(errorHandler);
    } else if(signal.ice) {
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
    }


}

function createdDescription(description) {
    peerConnection.setLocalDescription(description).then(function() {
        serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
    }).catch(errorHandler);
}

function errorHandler(error) {
    console.log(error);
    updateMovesListing("waiting for other player....",'green');
    disableLocal();
}


  
  function handleSendChannelStatusChange(event) {
  }


function toggleSend(){
    sendButton.disabled = !sendButton.disabled;
}

  function handleReceiveChannelStatusChange(event) {
    if (receiveChannel) {
      var receiveChannelstate = receiveChannel.readyState;
      var sendChannelState = sendChannel.readyState;

        if (receiveChannelstate === "closed"){
            updateMovesListing("other player left game closed",'red');
            disconnectPeers();
        }
            if (receiveChannelstate === "open" && sendChannelState === "open") {
                updateMovesListing("Other player connected and ready to play !",'green');
                updateMovesListing("disconnection from webserver", 'red');

                serverConnection.close();
                serverConnection = null;
                enableSend();

            } else {
                disableLocal();
            }

    }

  }

  function enableSend(){
      remoteData.disabled = true;
      localData.disabled = true;
      localData.focus();

      startButton.disabled = true;
      selector.disabled = true;

      if(localData.value != ''){
          sendButton.disabled = false;
      }
  }

  function setUuid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function disconnectPeers() {
    updateMovesListing("disconnecting other players",'red');
    sendChannel.close();
    receiveChannel.close();
    if(serverConnection != null)
        serverConnection.close();

    sendChannel = null;
    receiveChannel = null;
    serverConnection = null;
    startButton.disabled = false;
    sendButton.disabled = true;
    document.getElementById('restartButtonDiv').style.display = 'block';


}