#!/usr/bin/env node

const html2fragments = require('./jobs/html2fragments/main.js');
const program = require('commander');


program
    .command('html2fragments')
    .alias('u')
    .description('Generate fragments collection out static html page')
    .option('-c, --collectionName [value]', 'Specify the collection name')
    .option('-f, --file [value]', 'Specify the html file path')
    .action(function (design, args) {
        html2fragments.start(design.collectionName,design.file);
    });
program.parse(process.argv);


