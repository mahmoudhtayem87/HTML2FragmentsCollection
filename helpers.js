const {createReadStream, createWriteStream} = require("fs");
const fs = require('fs-extra');
const {pathExistsSync} = require("fs-extra");
const fse = require('fs-extra');
const path = require('path');
const parse = require('svg-parser');


const colorProps = [
    "color",
    "background",
    "background-color",
    "background-image",
   " border-color",
   " border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "outline-color",
    "text-shadow",
    "box-shadow"
];
function isValidColorProp(propName)
{
    return colorProps.filter(prop=> prop === propName).length > 0;
}

function buildPathTree(filePath) {
    var pathObj = path.parse(filePath);
    var pathDir = pathObj.dir.substring(1, pathObj.dir.length);
    var pathArray = pathDir.split('/');
    return pathArray;
}

function readFileContent(filePath) {
    if (!fs.pathExistsSync(filePath))
    {
        console.log(`Could not load file: ${filePath}`);
        return "";
    }
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
function getIconIdsList(list,el)
{

    if (el.tagName === "symbol")
    {
        list.push({value:el.properties.id, label:el.properties.id.toUpperCase()});
    }
    var index=0;
    while (index < el.children.length)
    {
        getIconIdsList(list,el.children[index++]);
    }

}

function getClayIcons()
{
    const parsed = parse.parse( readFileContent(`${__dirname}/jobs/html2fragments/resources/icons/icons.svg`));
    var icons = [];
    getIconIdsList(icons,parsed);
    return icons.sort((a, b) => (a.value > b.value) ? 1 :  -1 );
}

function removeDocumentWriteJS(source)
{
    var pattren = /document.write\([^\n]+\)/;
    return  source.replace(pattren,'');
}
function fromDir(startPath, filter) {
    if (!fs.existsSync(startPath)) {
        console.log("no dir ", startPath);
        return;
    }
    var files = fs.readdirSync(startPath);
    var htmls = [];
    for (var i = 0; i < files.length; i++) {
        var filename = path.join(startPath, files[i]);
        var stat = fs.lstatSync(filename);
        if (stat.isDirectory())
        {
            fromDir(filename, filter);
        } else if(filename.endsWith(filter)) {
            htmls.push(filename);
        }
    }
    return htmls;
}

module.exports = {
    getDate,
    saveFile,
    readFileContent,
    buildPathTree,
    fromDir,
    getFileName,
    relativePathToFullPath,
    getFileExtension,
    getClayIcons,
    removeDocumentWriteJS,
    isValidColorProp
}