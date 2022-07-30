#!/usr/bin/env node

const html2fragments = require('./jobs/html2fragments/main.js');
const program = require('commander');
const inquirer = require("inquirer");
const namer = require("color-namer");
const helpers = require('./helpers');
function askMe()
{
    inquirer
        .prompt([
            {
                name: 'file',
                message: 'Please specify the html folder path "full path is required"?',
                default: `${__dirname}/example/solartec-1.0.0/index.html`
            },
            {
                name: 'collectionName',
                message: 'Please specify the fragments collection name?',
                default: 'HTML2FragmentsCollection'
            },
            {
                type: 'rawlist',
                name: 'groupResources',
                message: 'Would you like to group all styles referencing in a single fragment?',
                choices: ['Yes', 'No'],
            },{
                type: 'rawlist',
                name: 'includeJSResources',
                message: 'Would you like import your JavaScript resources?',
                choices: ['Yes', 'No'],
            }
        ])
        .then( answers => {

            html2fragments.start(answers.collectionName,answers.file.toString(),
                answers.groupResources.toLowerCase()==="yes",answers.includeJSResources.toLowerCase()==="yes",true);

        });
}
program
    .command('html2fragments')
    .alias('u')
    .description('Generate fragments collection out static html page')
    .action(function (design, args) {askMe()});

program.parse(process.argv);






