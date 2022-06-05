var HTMLParser = require('node-html-parser');
const helpers = require('../../helpers');
const fs = require('fs');
const fse = require('fs-extra');

const componentSelectorAtt = "liferay-component-type";
const componentNameAtt = "liferay-component-name";
var _componentId = 0 ;

var componentsList = [];
var collectionFolderPath="";
var collectionName = "";
var htmlFile;

var root = null;


function elementParser(el,componentId) {
    if (el.querySelectorAll("*").length > 0) {
        el.querySelectorAll('*').forEach(sub_element => {
            if (sub_element.nodeType === 1 && sub_element.parentNode === el)
                elementParser(sub_element,componentId);
        });
    }else{

        if (el.nodeType === 1) {
            fixElement(el,componentId);
        }
    }
}
function fixElement(el,componentId)
{
    var currentComponent = componentsList.filter(com=> com.Id === componentId)[0];
    switch (el.tagName.toLowerCase())
    {
        case "img":
        {
            el.replaceWith(`
                            <lfr-editable id="Image_${currentComponent.randomIdCode++}" type="image">
                                <img src=""/>
                            </lfr-editable>
                           `);
            break;
        }
        case "a":
        {
            el.replaceWith(`
                            <lfr-editable id="link_${currentComponent.randomIdCode++}" type="link">
                                <a>Link Button</a>
                            </lfr-editable>
                           `);
            break;
        }
        case "i":
        {
            var configurationKey = "icon"+currentComponent.randomIdCode++;
            el.setAttribute("class","${configuration." +configurationKey+"}");
            var configurationEntry = {
                "name": configurationKey,
                "label": configurationKey,
                "type": "text",
                "typeOptions": {
                    "placeholder": "Placeholder"
                },
                "dataType": "string",
                "defaultValue": ""
            };
            currentComponent.configuration.push(configurationEntry);
            break;
        }
        case "p":
        {
            el.setAttribute("data-lfr-editable-id","Text_"+currentComponent.randomIdCode++);
            el.setAttribute("data-lfr-editable-type","rich-text");
            break;
        }
        default:
            el.setAttribute("data-lfr-editable-id","Text_"+currentComponent.randomIdCode++);
            el.setAttribute("data-lfr-editable-type","text");
            break;
    }
}

function processFragment(htmlElement,componentName)
{
    componentsList.push({name:componentName,randomIdCode:0,Id:_componentId,configuration:[],html:""});
    elementParser(htmlElement,_componentId);
    var currentComponent = componentsList.filter(com=> com.Id === _componentId)[0];
    currentComponent.html = htmlElement.toString();
    _componentId=_componentId+1;
}

function getFragmentDescriptionFile(component)
{
    var obj = {
        "cssPath": "styles.css",
        "configurationPath": "configuration.json",
        "htmlPath": "index.html",
        "jsPath": "main.js",
        "name": component.name,
        "type": "component"
    };
    return JSON.stringify(obj);
}

function processFragmentsFolders()
{
    componentsList.forEach(component=>{
        var componentfolder = `${collectionFolderPath}/${component.name.toLowerCase().replace(" ","-")}`;
        fse.ensureDir(componentfolder, err => {
            helpers.saveFile(`${componentfolder}/index.html`,component.html);
            helpers.saveFile(`${componentfolder}/configuration.json`,getComponentConfigurations(component));
            helpers.saveFile(`${componentfolder}/fragment.json`,getFragmentDescriptionFile(component));
            helpers.saveFile(`${componentfolder}/main.js`,"");
            helpers.saveFile(`${componentfolder}/styles.css`,"");
        });
    });
}

function getComponentConfigurations(component)
{
    var configurationObj = {
        fieldSets: [
            {
                fields: [
                ]
            }
        ]
    };
    component.configuration.forEach(config=>{
        configurationObj.fieldSets[0].fields.push(config);
    });
    return JSON.stringify(configurationObj);
}

function processComponents()
{
    const buffer = fs.readFileSync(htmlFile);
    var htmlFileContent = buffer.toString();
    root = HTMLParser.parse(htmlFileContent);
    root.querySelectorAll(`[${componentSelectorAtt} = 'component']`).forEach(element=>{
        console.log("Processing component:"+element.getAttribute(componentNameAtt));
        processFragment(element,element.getAttribute(componentNameAtt));
        console.log("Processing component:"+element.getAttribute(componentNameAtt) + " completed!");
    });
}

async function createCollectionDescriptionFile()
{
    var jsonContent ={
        description: "",
        name: collectionName
    }
    await helpers.saveFile(`${collectionFolderPath}/collection.json`,JSON.stringify(jsonContent));
}

function start(_collectionName,htmlFilePath)
{
    htmlFile = htmlFilePath;
    collectionName=_collectionName;
    collectionFolderPath = `./auto-generated-fragments/${helpers.getDate()}/${collectionName.replace(" ","-")}/`;
    fse.ensureDir(collectionFolderPath, err => {
        createCollectionDescriptionFile();
        processComponents();
        processFragmentsFolders();

    });
}

module.exports = {
    start
}

