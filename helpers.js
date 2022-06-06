const {createReadStream, createWriteStream} = require("fs");
const fs = require('fs-extra');
const {pathExistsSync} = require("fs-extra");
const fse = require('fs-extra');
const path = require('path');

function buildPathTree(filePath) {
    var pathObj = path.parse(filePath);
    var pathDir = pathObj.dir.substring(1, pathObj.dir.length);
    var pathArray = pathDir.split('/');
    return pathArray;
}

function readFileContent(filePath) {
    const buffer = fs.readFileSync(filePath);
    var fileContent = buffer.toString();
    return fileContent;
}

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
function getFileName(fileFullPath)
{
    var pathObj = path.parse(fileFullPath);
    return pathObj.base;
}
function getFileExtension(fileFullPath)
{
    var pathObj = path.parse(fileFullPath);
    return pathObj.ext;
}
function relativePathToFullPath(filePath, relativePath) {
    var _dirTree = buildPathTree(filePath);
    var dirTree = JSON.parse(JSON.stringify(_dirTree));
    var path = `/${dirTree.join('/')}/${relativePath.replace('./', "")}`;
    if (relativePath.startsWith('./')) {
        path = `/${dirTree.join('/')}/${relativePath.replace('./', "")}`;
    } else if (relativePath.startsWith('../')) {
        var numberOfPops = (relativePath.match(new RegExp("../", "g")) || []).length;
        for (var index = 0; index < numberOfPops; index++) {
            dirTree.pop();
        }
        path = `/${dirTree.join('/')}/${relativePath.replaceAll('../', "")}`;
    }else if(relativePath.startsWith('/'))
    {
        path = `/${dirTree.join('/')}${relativePath}`;
    }else
    {
        path = `/${dirTree.join('/')}/${relativePath}`;
    }
    return path;
}



module.exports = {
    getDate,
    saveFile,
    readFileContent,
    buildPathTree,
    getFileName,
    relativePathToFullPath,
    getFileExtension
}