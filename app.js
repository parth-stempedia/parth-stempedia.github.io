function myfunction() {
    let filters = [];
     filters.push({services: [parseInt('0xf005')]});
  
     let options = {};
     options.filters = filters;
    console.log(navigator);
    navigator.bluetooth.requestDevice(options)
    .then(device => {
      console.log(device.name,device.id);
      return device.gatt.connect();
    }).then(server=>{
      return server.getPrimaryService(parseInt('0xf005'))
    }).then(service =>{
      service.getCharacteristic("5261da01-fa7e-42ab-850b-7c80220097cc").then((readCharacteristic) =>{
        readCharacteristic.startNotifications().then(()=>{
          readCharacteristic.addEventListener("characteristicvaluechanged",myfunction2)
        })
      })
    })
    .catch(error => {
      console.log('Argh! ' + error);
    });
  }
  function myfunction2(event){
    if(isServerConnected)
      ws.send(event.target.value);
    else
      console.log("server not connected !!");
  }
var isServerConnected = false;
const ws = new WebSocket("ws://localhost:8080");
ws.addEventListener("open", () =>{
  console.log("Connection in Client has been opened!!");
  isServerConnected = true;
});
ws.addEventListener('message', function (event) {
  console.log(event.data);
});