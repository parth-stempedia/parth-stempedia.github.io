const boardIDMapping = {
    'evive': '1',
    'Arduino Uno': '3',
    'Arduino Mega': '2',
    'Arduino Nano': '4',
    'ESP32': '5',
    'T-Watch': '6',
    'Quarky': '5',
    'TecBits': '9'
};

let lastTouch = [0, 0, 0, 0, 0];

const readFloat = (arr, position) => {
    const f = new Uint8Array([arr[position], arr[position + 1], arr[position + 2], arr[position + 3]]).buffer;
    return new Float32Array(f)[0];
};

const readInt = (arr, position, count) => {
    let result = 0;
    for (let i = 0; i < count; ++i) {
        result |= arr[position + i] << (i << 3);
    }
    return result;
};

const readDouble = (arr, position) => readFloat(arr, position);

const readString = (arr, position, len) => {
    let value = '';
    for (let ii = 0; ii < len; ii++) {
        value += String.fromCharCode(arr[ii + position]);
    }
    return value;
};

const readSensor = (arr, position, len) => {
    let value = {
        irL_digital: 0,
        irR_digital: 0,
        buttonL: 0,
        buttonR: 0,
        buttonB: 0,
        irL_analog: 0,
        irR_analog: 0,
        touch: [0, 0, 0, 0, 0],
        digital: [0, 0, 0],
        analog1: 0,
        analog2: 0,
        analog3: 0,
        ultrasonic1: 0,
        ultrasonic2: 0,
    }

    value.irL_digital = (arr[position] & 8) >> 3;
    value.irR_digital = (arr[position] & 16) >> 4;
    value.buttonB = (arr[position] & 4) >> 2;
    value.buttonL = arr[position] & 1;
    value.buttonR = (arr[position] & 2) >> 1;

    value.irL_analog = readInt(arr, position + 1, 2);
    value.irR_analog = readInt(arr, position + 3, 2);

    value.touch[0] = arr[position + 5] & 1;
    value.touch[1] = (arr[position + 5] & 2) >> 1;
    value.touch[2] = (arr[position + 5] & 4) >> 2;
    value.touch[3] = (arr[position + 5] & 8) >> 3;
    value.touch[4] = (arr[position + 5] & 16) >> 4;
    value.digital[0] = (arr[position + 5] & 32) >> 5;
    value.digital[1] = (arr[position + 5] & 64) >> 6;
    value.digital[2] = (arr[position + 5] & 128) >> 7;

    for (let i = 0; i < 5; i++) {
        if (value.touch[i] && lastTouch[i]) {
            lastTouch[i] = value.touch[i];
            value.touch[i] = 1;
        }
        else {
            lastTouch[i] = value.touch[i];
            value.touch[i] = 0;
        }
    }

    value.analog1 = readInt(arr, position + 6, 2);
    value.analog2 = readInt(arr, position + 8, 2);
    value.analog3 = readInt(arr, position + 10, 2);
    value.ultrasonic1 = readInt(arr, position + 12, 2);
    value.ultrasonic2 = readInt(arr, position + 14, 2);
    
    return value;
};

class ProcessData {
    constructor(runtime) {
        this._runtime = runtime;
    }

    build(bytes) {
        const _rxBuf = bytes;
        // console.log(_rxBuf)
        if (_rxBuf[0] === 0xff && _rxBuf[1] === 0x55) {
            // console.log(`_rxBuf recieved: ${_rxBuf}`);
            let position = 3;
            const type = _rxBuf[position];
            position++;
            let value = 0;
            // 1 byte 2 float 3 short 4 len+string 5 double
            switch (type) {
                // eslint-disable-next-line no-lone-blocks
                case 1: {
                    value = _rxBuf[position];
                    position++;
                    this._runtime.readFromPeripheral(value);
                }
                    break;
                // eslint-disable-next-line no-lone-blocks
                case 2: {
                    value = readFloat(_rxBuf, position);
                    this._runtime.readFromPeripheral(value);
                    // position += 4;
                    // if (value < -255 || value > 1023) {
                    //     value = 0;
                    // }
                }
                    break;
                // eslint-disable-next-line no-lone-blocks
                case 3: {
                    value = readInt(_rxBuf, position, 2);
                    position += 2;
                    this._runtime.readFromPeripheral(value);
                }
                    break;
                case 4:
                    // eslint-disable-next-line no-lone-blocks
                    {
                        const l = _rxBuf[position];
                        position++;
                        value = readString(_rxBuf, position, l);
                        // console.log("value case 4", value)
                        this._runtime.readFromPeripheral(value);
                    }
                    break;
                // eslint-disable-next-line no-lone-blocks
                case 5: {
                    value = readDouble(_rxBuf, position);
                    position += 4;
                    this._runtime.readFromPeripheral(value);
                }
                    break;
                // eslint-disable-next-line no-lone-blocks
                case 6: {
                    value = readInt(_rxBuf, position, 4);
                    position += 4;
                    this._runtime.readFromPeripheral(value);
                }
                    break;
                case 8: {
                    value = readSensor(_rxBuf, position);
                    position += 15;
                    this._runtime.storeProcedure.readForVMPreStore(value);
                    // console.log(`Sensor _rxBuf: ${_rxBuf}`);
                }
            }
        }
        if (typeof value === 'string' && value.startsWith('FI#')) {
            // this needs to be modified for better scalibility
            const FI = value.match(/\d+/g);
            const firmware = FI.length < 3 ? FI[0] : `${FI[0]}.${FI[1]}`;
            const boardID = FI.length < 3 ? FI[1] : FI[2];
            if (firmware === '4.1') {
                // console.log("boardIdSelected", this._runtime.boardSelected, firmwareInfo.boardId);
                if (boardID === boardIDMapping[this._runtime.boardSelected]) {
                    // console.log(`sendFirmwareReportFromProcessData: ${sendFirmwareReportFromProcessData}`);
                    this._runtime.sendFirmwareReportFromProcessData(true);
                } else {
                    this._runtime.sendFirmwareReportFromProcessData(false);
                }
            }
        }  
    }
}


export default ProcessData;
