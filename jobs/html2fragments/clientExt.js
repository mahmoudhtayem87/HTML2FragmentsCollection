const fs = require('fs-extra');
const path = require('path');
const helpers = require('../../helpers');
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
async function build(projectFolder, jsClientExt, cssClientExt) {

    console.log("Generating Client Extensions...");
    await fs.ensureDir(`${projectFolder}/client-extensions`);
    await helpers.saveFile(`${projectFolder}/client-extensions/scripts.js`,
        jsClientExt);
    await helpers.saveFile(`${projectFolder}/client-extensions/styles.css`,
        cssClientExt);
    console.log("Client Extensions Generated Successfully!");

}

async function start(projectFolder, jsClientExt, cssClientExt) {
    build(projectFolder, jsClientExt, cssClientExt)
}

module.exports = {
    start
}


