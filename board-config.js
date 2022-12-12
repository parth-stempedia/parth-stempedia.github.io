const nanoBoardMenu = {
    ArduinoNano168: 'Arduino Nano(168)',
    ArduinoNanoNew: 'Arduino Nano(New)',
    ArduinoNanoOld: 'Arduino Nano(Old)'
};

const tWatchBoardMenu = {
    TWatch2019: 'T-Watch(2019)',
    TWatch2020v1: 'T-Watch(2020v1)',
    TWatch2021: 'T-Watch(2021)'
};

const boards = {
    None: 'None',
    Evive: 'evive',
    ArduinoUno: 'Arduino Uno',
    ArduinoMega: 'Arduino Mega',
    ArduinoNano: 'Arduino Nano',
    EviveJunior: 'junior',
    ESP32: 'ESP32',
    TWatch: 'T-Watch',
    Quarky: 'Quarky',
    MicroBit: 'micro:bit',
    TecBits: 'TecBits',
    Boffin: 'Boffin',
    ev3: 'LEGO EV3',
    boost: 'LEGO BOOST',
    wedo2: 'LEGO WeDo 2.0',
    gdxfor: 'Go DFA'
};

const boardMap = {
    'None': 'none',
    'evive': 'evive',
    'Arduino Uno': 'arduinoUno',
    'Arduino Nano': 'arduinoNano',
    'Arduino Mega': 'arduinoMega',
    'ESP32': 'esp32',
    'T-Watch': 'tWatch',
    'Quarky': 'quarky',
    'micro:bit': 'microbit',
    'TecBits': 'tecBits',
    'Boffin':'boffin',
    'LEGO EV3': 'ev3',
    'LEGO BOOST': 'boost',
    'LEGO WeDo 2.0': 'wedo2',
    'Go DFA': 'gdxfor'
}

const versionedBoard = {
    'T-Watch': {
      'T-Watch(2019)': 'tWatch2019',
      'T-Watch(2020v1)': 'tWatch2020v1',
      'T-Watch(2021)': 'tWatch2021'
    },
    'Arduino Nano': {
      'Arduino Nano(168)': 'arduinoNano168',
      'Arduino Nano(New)': 'arduinoNanoNew',
      'Arduino Nano(Old)': 'arduinoNanoOld'
    }
}

const versionedBoardMap = {
    'tWatch2019': 'tWatch',
    'tWatch2020v1': 'tWatch',
    'tWatch2021': 'tWatch',
    'arduinoNano168': 'arduinoNano',
    'arduinoNanoNew': 'arduinoNano',
    'arduinoNanoOld': 'arduinoNano'
}

function getBoardId(board) {
    for (let boardKey in boardMap) {
        if (boardKey === board)
            return boardMap[boardKey];
    }
}

function registerBoardSpecificExtraExtensionList(extensionName, runtime, EXTENSION_SPECIFIC_BLOCKS) {
    let boardSpecificExtraExtensionList = {};
    for (let boardIndex in boardMap) {
        let boardValue = boardMap[boardIndex];
        if(boardIndex === boards.TWatch){
            boardValue = versionedBoard[boardIndex][runtime.tWatchBoardSelected];
            // console.log('registerBoardSpecificExtraExtensionList boardValue', boardValue);
        }
        if (runtime.commonExtensionAmongBoards.hasOwnProperty(boardIndex) && !runtime.commonExtensionAmongBoards[boardIndex].includes(extensionName)) continue;
        let specificBlockDataList = EXTENSION_SPECIFIC_BLOCKS(boardValue);
        boardSpecificExtraExtensionList[boardValue] = [];
        for (let blockDataIndex in specificBlockDataList) {
            let blockData = specificBlockDataList[blockDataIndex];
            let blocks = blockData.getBlocks();
            for (let blockIndex in blocks) {
                if (!!blocks[blockIndex]['opcode'])
                    boardSpecificExtraExtensionList[boardValue].push(extensionName + "_" + blocks[blockIndex]['opcode']);
            }
        }
    }
    runtime.megerBoardSpecificExtraBlocksFromCommonExtensionDict(boardSpecificExtraExtensionList);
}

function registerBoardSpecificExtensionList(extensionName, runtime, EXTENSION_SPECIFIC_BLOCKS, info) {
    let boardSpecificExtensionList = {};
    for (let boardIndex in boardMap) {
        let boardValue = boardMap[boardIndex];
        if(boardIndex === boards.TWatch){
            boardValue = versionedBoard[boardIndex][runtime.tWatchBoardSelected];
            // console.log('registerBoardSpecificExtensionList boardValue', boardValue,boards.TWatch);
        }
        if (runtime.commonExtensionAmongBoards.hasOwnProperty(boardIndex) && !runtime.commonExtensionAmongBoards[boardIndex].includes(extensionName)) continue;
        let specificBlockDataList = EXTENSION_SPECIFIC_BLOCKS(boardValue);
        boardSpecificExtensionList[boardValue] = [];
        for (let blockDataIndex in specificBlockDataList) {
            let blockData = specificBlockDataList[blockDataIndex];
            let blocks = blockData.getBlocks();
            for (let blockIndex in blocks) {
                if (!!blocks[blockIndex]['opcode'])
                    boardSpecificExtensionList[boardValue].push(extensionName + "_" + blocks[blockIndex]['opcode']);
            }
        }
    }
    for (let boardIndex in boardSpecificExtensionList) {
        for (let blockIndex in info.blocks) {
            if (!!info.blocks[blockIndex]['opcode'])
                boardSpecificExtensionList[boardIndex].push(extensionName + "_" + info.blocks[blockIndex]['opcode']);
        }
    }
    runtime.megerBoardSpecificBlocksFromCommonExtensionDict(boardSpecificExtensionList);
}

function insertExtensionSpecificBlocks(blocks, specificBlockDataList) {
    for (let blockDataIndex in specificBlockDataList) {
        let blockData = specificBlockDataList[blockDataIndex];
        if (blockData.index == -1) {
            if (typeof blockData.getBlocks() === "object") {
                let extraBlocks = blockData.getBlocks();
                for (let blockIndex in extraBlocks) {
                    let block = extraBlocks[blockIndex];
                    blocks.push(block);
                }
            }
            else { blocks.push(blockData.getBlocks()); }
            continue;
        }
        let extraBlocks = blockData.getBlocks();
        for (let blockIndex in extraBlocks) {
            let block = extraBlocks[extraBlocks.length - blockIndex - 1];
            blocks.splice(blockData.index, 0, block);
        }
    }
    return blocks;
}

const PROJECT_MODE_TYPE = {
    STAGE: null,
    UPLOAD: null
};

export {
    boards as default,
    boardMap,
    getBoardId,
    registerBoardSpecificExtraExtensionList,
    registerBoardSpecificExtensionList,
    insertExtensionSpecificBlocks,
    PROJECT_MODE_TYPE,
    versionedBoard,
    nanoBoardMenu,
    tWatchBoardMenu,
    versionedBoardMap
};
