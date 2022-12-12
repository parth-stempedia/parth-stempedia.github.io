// //To access web bluetooth api
const ble = navigator.bluetooth;
import boards from "./board-config.js";
// const boards = require('./board-config').default;
// const ProcessData = require('./process-data').default;

// /**
//  * A time interval to wait (in milliseconds) while a block that sends a BLE message is running.
//  * @type {number}
//  */
const BLESendInterval = 1000;

var isServerConnected = false;
var bleInstance;
const ws = new WebSocket("ws://localhost");
ws.addEventListener("open", () =>{
  console.log("Connection in Client has been opened!!");
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

    }
});
class BLEWrapper {
    constructor() {
        this._board = boards.None;
        this.Board2IdMapper = {
            'quarky': {
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
        this._onConnect();
    }

    /**
     * Starts reading data from peripheral after BLE has connected to it.
     * @private
     */
    _onConnect() {
        const serviceId = this.Board2IdMapper["quarky"]['service'];
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
        console.log(message);
        // Set a timeout after which to reset the busy flag. This is used in case
        // a BLE message was sent for which we never received a response, because
        // e.g. the peripheral was turned off after the message was sent. We reset
        // the busy flag after a while so that it is possible to try again later.
        this._busyTimeoutID = window.setTimeout(() => {
            this._busy = false;
        }, BLESendInterval);
        const writeServiceUuid = this.Board2IdMapper[this._board]['write'];
        this.service.getCharacteristic(writeServiceUuid).then((writeCharacteristic) => {
            const data = Buffer.from(message);
            return writeCharacteristic.writeValue(data)
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
    console.log("The client wants to connect to a device. Start Scanning");
   bleInstance.scan();
  }
// function myfunction2(event){
//     if(isServerConnected)
//       ws.send(event.target.value);
//     else
//       console.log("server not connected !!");
//   }