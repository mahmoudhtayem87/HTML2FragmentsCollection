const {createReadStream, createWriteStream} = require("fs");
const fs = require('fs-extra');
const {pathExistsSync} = require("fs-extra");

function getDate() {
    var date_ob = new Date();
    var day = ("0" + date_ob.getDate()).slice(-2);
    var month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    var year = date_ob.getFullYear();
    var date = year + "-" + month + "-" + day;
    var hours = date_ob.getHours();
    var minutes = date_ob.getMinutes();
    var seconds = date_ob.getSeconds();
    return `${year}-${month}-${day}__${hours}-${minutes}-${seconds}`;
}

async function saveFile(filePath, fileData) {
    var prom = new Promise((resolve, reject) => {
        fs.writeFile(`${filePath}`, fileData, function (err) {
            if (err)
                reject(false);
            resolve(true);
        });
    });
    return prom;
}


module.exports = {
    getDate,
    saveFile
}