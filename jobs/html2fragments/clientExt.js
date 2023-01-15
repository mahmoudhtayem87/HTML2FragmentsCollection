const fs = require('fs-extra');
const concat = require('concat');
const path = require('path');

function fromDir(startPath, filter) {

    var Files = [];
    if (!fs.existsSync(startPath)) {
        console.log("no dir ", startPath);
        return;
    }

    var files = fs.readdirSync(startPath);
    for (var i = 0; i < files.length; i++) {
        var filename = path.join(startPath, files[i]);
        var stat = fs.lstatSync(filename);
        if (stat.isDirectory()) {
            fromDir(filename, filter); //recurse
        } else if (filename.endsWith(filter)) {
            Files.push(filename);
        };
    };
    return Files;
};
async function build(projectFolder, collectionFolder) {

    console.log("Generating Client Extensions...");
    await fs.ensureDir(`${projectFolder}/client-extensions`);

    await concat(fromDir(`${collectionFolder}/resources`,'.js'),
        `${projectFolder}/client-extensions/scripts.js`);

    await concat(fromDir(`${collectionFolder}/resources`,'.css'),
        `${projectFolder}/client-extensions/styles.css`);

    console.log("Client Extensions Generated Successfully!");

}

async function start(projectFolder,collectionFolder)
{
    build(projectFolder,collectionFolder)
}

module.exports = {
    start
}


