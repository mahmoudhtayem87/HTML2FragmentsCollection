#!/usr/bin/env node

const html2fragments = require('./jobs/html2fragments/main.js');
const program = require('commander');


program
    .command('html2fragments')
    .alias('u')
    .description('Generate fragments collection out static html page')
    .option('-c, --collectionName [value]', 'Specify the collection name')
    .option('-f, --file [value]', 'Specify the html file path')
    .option('-s, --groupResources [value]', 'Group all of the CSS resources in one fragment')
    .option('-j, --includeJSResources [value]', 'Include javascript resources, this will create a new fragment which will include all of the js references')
    .action(function (design, args) {

        html2fragments.start(design.collectionName,design.file,design.groupResources.toLowerCase()==="yes",design.includeJSResources.toLowerCase()==="yes");
    });
program.parse(process.argv);


