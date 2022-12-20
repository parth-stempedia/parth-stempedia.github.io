//To access web bluetooth api
const ble = navigator.bluetooth;
import boards from "./board-config.js";
// const boards = require('./board-config').default;
// const ProcessData = require('./process-data').default;

 /**
  * A time interval to wait (in milliseconds) while a block that sends a BLE message is running.
  * @type {number}
  */
const BLESendInterval = 1000;
var frameInterval;
var isServerConnected = false;
var bleInstance;
var ws = new WebSocket("ws://localhost:5000");
attachListenersToWS(ws);
var wasSocketEverActive =false;
function attachListenersToWS(ws)
{
    ws.addEventListener("open", () =>{
        console.log("Connection in Client has been opened!!");
        document.getElementById("connectionStatus").innerHTML = "<p>Connection with PictoBlox has been established..</p>"
        bleInstance = new BLEWrapper();
        isServerConnected = true;
      });
    ws.addEventListener('message', function (event) {
        console.log("Recieved message from PictoBlox");
        const messageObject = JSON.parse(event.data);
          switch(messageObject.type){
            //Here all the cases will be handled according to the event received...
            case "setBoard":
              bleInstance.setBoard(messageObject.board);
              document.getElementById("currentBoard").innerHTML = `<p>Selected Board : ${messageObject.board}</p>`;
              break;
            case "sendDataToBoard":
              bleInstance.writeDataOnBle(messageObject.data);
              break;
            case "disconnectBLE":
              bleInstance.disconnectBleConnectedPort();
              break;
      
          }
      });
      ws.addEventListener("close", function(event){
        console.log("Connection has been closed");
        clearInterval(frameInterval);
        if(bleInstance)
        bleInstance.disconnectBleConnectedPort();
        if(wasSocketEverActive)
        window.alert("Connection has been closed!!");
      })
}
function checkForServer(connectionType){
    try{
        if(ws.readyState == 0)
        {
          console.log("trying for",connectionType,ws.readyState);
          return  setTimeout(()=>{
              return checkForServer("existingSocket");
            },2000);
        }
        else if(ws.readyState == 2 || ws.readyState==3)
        {
            console.log("closing ",connectionType,ws.readyState);
            ws.close();
            ws = new WebSocket("ws://localhost:5000");
            attachListenersToWS(ws);  
            wasSocketEverActive = false;
            checkForServer("newSocket");
        }
        else
        {
            console.log("Connection with PictoBlox established");
            wasSocketEverActive = true;
        }
    }
    catch(err)
    {
        console.log(err);
        setTimeout(()=>{
            checkForServer();
        },10000);
    }
}
checkForServer("newSocket");
class BLEWrapper {
    constructor() {
        this._board = boards.None;
        this.Board2IdMapper = {
            'Quarky': {
                'service': 0xf005,
                'read': '5261da01-fa7e-42ab-850b-7c80220097cc',
                'write': '5261da02-fa7e-42ab-850b-7c80220097cc'
            },
            'evive': {
                'service': 0xffe0,
                'read': '0000ffe1-0000-1000-8000-00805f9b34fb',
                'write': '0000ffe1-0000-1000-8000-00805f9b34fb'
            },
            'tWatch': {
                'service': 0xf005,
                'read': '5261da01-fa7e-42ab-850b-7c80220097cc',
                'write': '5261da02-fa7e-42ab-850b-7c80220097cc'
            },
            'esp32': {
                'service': 0xf005,
                'read': '5261da01-fa7e-42ab-850b-7c80220097cc',
                'write': '5261da02-fa7e-42ab-850b-7c80220097cc'
            },
            'microbit': {
                'service': 0xf005,
                'read': '5261da01-fa7e-42ab-850b-7c80220097cc',
                'write': '5261da02-fa7e-42ab-850b-7c80220097cc'
            },
            'arduinoNano': {
                'service': 0xffe0,
                'read': '0000ffe1-0000-1000-8000-00805f9b34fb',
                'write': '0000ffe1-0000-1000-8000-00805f9b34fb'
            },
            'arduinoMega': {
                'service': 0xffe0,
                'read': '0000ffe1-0000-1000-8000-00805f9b34fb',
                'write': '0000ffe1-0000-1000-8000-00805f9b34fb'
            },
            'arduinoUno': {
                'service': 0xffe0,
                'read': '0000ffe1-0000-1000-8000-00805f9b34fb',
                'write': '0000ffe1-0000-1000-8000-00805f9b34fb'
            },
            'boffin': {
                'service': 0xffe0,
                'read': '0000ffe1-0000-1000-8000-00805f9b34fb',
                'write': '0000ffe1-0000-1000-8000-00805f9b34fb'
            },
        }
        this._onConnect = this._onConnect.bind(this);
        this.handleReadListener = this.handleReadListener.bind(this);
        //Not available on our side, need to implement on server
        //this.processData = new ProcessData(runtime);
        this.readCharacteristic;
        this.bleConnectedPort;
        this.service;
    }

    static sendEvent(type, data=null) {
        // let event = new CustomEvent(type, {detail:data});
        // window.dispatchEvent(event);
        //Here every event will be sent to server...
        try{
            if(ws.readyState!=1)
                return checkForServer("newSocket");
            ws.send(JSON.stringify({type:type,data:data}));
        }
        catch(e){
            console.log("Disconnected from PictoBlox");
            return checkForServer("existingSocket");
        }
        
    }

    /**
     * Set the board for this BLEWrapper
     * @param {string} boardId board id of the selected board
     */
    setBoard(boardId) {
        console.log("Board Changed",boardId)
        this._board = boardId;
    }

    /**
     * Scan for all the matching BLE peripheral
     * @param {Array} serviceIDList - List of available service ID for the peripheral
    */
    scan() {
        if(this._board == "None")
        {
            window.alert("Please Select the board first in PictoBlox");
            return;
        }
        this._onConnect();
    }

    /**
     * Starts reading data from peripheral after BLE has connected to it.
     * @private
     */
    _onConnect() {
        const serviceId = this.Board2IdMapper[this._board]['service'];
        ble.requestDevice({
            filters: [{
                services: [serviceId],
              }]
          })
        .then(device => {
            this.bleConnectedPort = device;
            device.addEventListener('gattserverdisconnected', BLEWrapper.handleOnDisconnectBLEPort);
            return device.gatt.connect()
        })
        .then(server => {
            BLEWrapper.sendEvent('BLUETOOTH_PORT_CONNECTED')
            document.getElementById("boardconnectionStatus").innerHTML =  `<p>Board Connection Status : Connected</p>`
            return server.getPrimaryService(serviceId)
        })
        .then(service => {
            this.service = service;
            this.readDataOnBle();
        })
        .catch(err => { 
            if(err instanceof TypeError || err instanceof DOMException){
                console.error("E1 BLE:",err);
                BLEWrapper.sendEvent('BLUETOOTH_PORT_DISCONNECTED');
                BLEWrapper.sendEvent('BLUETOOTH_PORT_REQUEST_ERROR');
            }
        }); 
    }

    /**
     * @name disconnectBleConnectedPort
     * disconnects from current connected port and remove listener for reading data
     */
    disconnectBleConnectedPort() {
        this.readCharacteristic.removeEventListener('characteristicvaluechanged',this.handleReadListener);
        this.bleConnectedPort.gatt.disconnect();
        document.getElementById("boardconnectionStatus").innerHTML =  `<p>Board Connection Status : Not Connected</p>`
        if(ws)
        BLEWrapper.sendEvent('BLUETOOTH_PORT_DISCONNECTED');
    }

    static handleOnDisconnectBLEPort() {
        console.log('handleOnDisconnectBLEPort');
        BLEWrapper.sendEvent('BLUETOOTH_PORT_DISCONNECTED');
    }
    
    /**
     * @name writeDataOnBle
     * write data to hardware on bluetooth connectivity
     * @param {Array} message 
     * @returns {Promise}
     */
    writeDataOnBle(message) {
        if (!this.isConnected()) return;
        // Set a busy flag so that while we are sending a message and waiting for
        // the response, additional messages are ignored.
        this._busy = true;
        // Set a timeout after which to reset the busy flag. This is used in case
        // a BLE message was sent for which we never received a response, because
        // e.g. the peripheral was turned off after the message was sent. We reset
        // the busy flag after a while so that it is possible to try again later.
        this._busyTimeoutID = window.setTimeout(() => {
            this._busy = false;
        }, BLESendInterval);
        const writeServiceUuid = this.Board2IdMapper[this._board]['write'];
        this.service.getCharacteristic(writeServiceUuid).then((writeCharacteristic) => {
            //const data = Buffer.from(message);
            const view = new Uint8Array(message.length);
            for(var i=0;i<message.length;i++)
            view[i] = message[i];
            console.log(view);
            return writeCharacteristic.writeValue(view)
            .then(() => {
                this._busy = false;
                window.clearTimeout(this._busyTimeoutID);
            })
        }).catch(err => {
            console.error("Err!!",err);
            BLEWrapper.sendEvent('BLUETOOTH_PORT_REQUEST_ERROR');
        })
    }
    
    /**
     * @name handleReadListener
     * Helper function to read and process the upcoming data from hardware to user interface
     * @param {*} event 
     */
    handleReadListener (event) {
        let value = event.target.value;
        let arr = [];
        for (let i = 0; i < value.byteLength; i++) {
            arr.push(value.getUint8(i));
        };
        if (this._board === 'microbit'){
            BLEWrapper.sendEvent('microBitData',arr);
        }
        BLEWrapper.sendEvent("SEND_DATA_TO_PICTOBLOX",arr);
        //Processing of data will happen on PictoBlox side
       // this.processData.build(arr);
    }
    
    /**
     * @name readDataOnBle
     * Called when service is started and reads data from connected hardware
     * @returns {Event} - listening to characteristic value
     */
    readDataOnBle () {
        if (!this.isConnected()) return;
        const readServiceUuid = this.Board2IdMapper[this._board]['read'];
        this.service.getCharacteristic(readServiceUuid).then((readCharacteristic) => {
            this.readCharacteristic = readCharacteristic;
            return this.readCharacteristic.startNotifications().then(() => {
                this.readCharacteristic.addEventListener('characteristicvaluechanged',this.handleReadListener);
            })
        })
        .catch((err) => {
            console.error("ERR:",err);
            BLEWrapper.sendEvent('BLUETOOTH_PORT_REQUEST_ERROR');
        })
    }

    /**
     * @name isConnected
     * Called by the runtime to detect whether the peripheral is connected.
     * @return {boolean} - the connected state.
     */
    isConnected() {
        let connected = false;
        if (this.bleConnectedPort) {
            connected = this.bleConnectedPort.gatt.connected;
        }
        return connected;
    }

    /**
     * @name checkFirmwareUploaded
    * Checks if the firmware is uploaded or not
    */
    checkFirmwareUploaded() {
        const checkForFirmware = [255, 85, 3, 0, 1, 130];
        this.writeDataOnBle(checkForFirmware);
    }
}
window.startScanning = function startScanning() {
    if(ws.readyState!=1)
    {
        window.alert("PictoBlox has not yet been connected!!");
        return;
    }
    console.log("The client wants to connect to a device. Start Scanning");
    bleInstance.scan();
  }
  const getFrame = () => {
    var video = document.querySelector('video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    console.log(video.width,video.videoHeight)
    canvas.getContext('2d').drawImage(video, 0, 0);
    const data = canvas.toDataURL('image/png');
    return data;
}
  window.startCamera = function startCamera(){
    var video = document.querySelector('video'); 
    navigator.mediaDevices.getUserMedia({video: {width: 426, height: 240}}).then((stream) => video.srcObject = stream);
}
window.sendFrames = ()=>{
    try{
        if(ws.readyState!=1)
        {
            clearInterval(frameInterval);
            return checkForServer("newSocket");
        }
        frameInterval = setInterval(()=>{
                console.log("Sending Frame to PictoBlox");
                ws.send(JSON.stringify({type:"SEND_FRAMES_TO_PICTOBLOX",data:getFrame()}));
            },(1000/30))
    }
    catch(e){
        console.log("Disconnected from PictoBlox");
        return checkForServer("existingSocket");
    }
}
window.stopSendingFrames = ()=>{
    clearInterval(frameInterval);
}
// function myfunction2(event){
//     if(isServerConnected)
//       ws.send(event.target.value);
//     else
//       console.log("server not connected !!");
//   }