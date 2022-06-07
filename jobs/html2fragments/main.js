const compressing = require('compressing');
var HTMLParser = require('node-html-parser');
const helpers = require('../../helpers');
const fs = require('fs');
const fse = require('fs-extra');
const csstree = require('css-tree');

const componentSelectorAtt = "liferay-component-type";
const componentNameAtt = "liferay-component-name";
var _componentId = 0 ;

var groupResources = false;
var componentsList = [];
var collectionFolderPath="";
var projectFolder = "";
var projectRootFolder = "";
var collectionName = "";
var htmlFile;
var root = null;
var resources_css_list = [];
var resources_js_list = [];

function elementParser(el,componentId)
{
    //data-lfr-background-image-id="unique-id"
    if (el.getAttribute("style") && el.getAttribute("style").toString().indexOf("background-image")!=-1)
    {
            var currentComponent = componentsList.filter(com=> com.Id === componentId)[0];
            el.setAttribute("data-lfr-background-image-id",`bgImage_${currentComponent.randomIdCode++}`);
    }
    if (el.querySelectorAll("*").length > 0)
    {
        el.querySelectorAll('*').forEach(sub_element =>
        {
            if (sub_element.nodeType === 1 && sub_element.parentNode === el)
            {
                if (sub_element.tagName.toLowerCase()=== "p")
                {
                    fixElement(sub_element,componentId);
                }
                else
                {
                    elementParser(sub_element,componentId);
                }
            }
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
        case "br":case "hr":case "ol":case "ul":
        {
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
function prepareResourcesInjectionHTML()
{
    var html="";
    resources_css_list.forEach((item)=>{
        html+=`<link rel="stylesheet" href="[resources:${item}]" type="text/css">\n`;
    });
    if (groupResources)
    {
        html+=` \n[#assign isEdit=false]
            [#if themeDisplay.isSignedIn()]
            [#assign req = request.getRequest()]
            [#assign originalRequest = portalUtil.getOriginalServletRequest(req)]
            [#if originalRequest.getParameter("p_l_mode")??]
            [#assign isEdit=true]
            [/#if]
            [/#if]
            
            [#if isEdit]
            <div class="alert alert-info p-4">
              Resources "CSS" Loader Component - Header Resources Area
            </div>
            [/#if]`;
    }
    return html;
}
function processFragmentsFolders()
{
    var prom = new Promise(function (resolve, reject) {
        componentsList.forEach(component=>{
            var componentfolder = `${collectionFolderPath}/${component.name.toLowerCase().replace(" ","-")}`;
            fse.ensureDir(componentfolder, async err => {
                var resources = groupResources?"":prepareResourcesInjectionHTML();
                await helpers.saveFile(`${componentfolder}/index.html`,resources+ component.html);
                await helpers.saveFile(`${componentfolder}/configuration.json`, getComponentConfigurations(component));
                await helpers.saveFile(`${componentfolder}/fragment.json`, getFragmentDescriptionFile(component));
                await helpers.saveFile(`${componentfolder}/main.js`, "");
                await helpers.saveFile(`${componentfolder}/styles.css`, "");
                resolve(true);
            });
        });
    });
    return prom;
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
function htmlParserInit()
{
    const buffer = fs.readFileSync(htmlFile);
    var htmlFileContent = buffer.toString();
    root = HTMLParser.parse(htmlFileContent);
}
function processComponents()
{
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
async function createCollectionPackageJSON()
{
    var obj = {
        "name": collectionName,
        "description": "Auto Generated Fragments Collection",
        "version": "1.0.0",
        "keywords": [
            "liferay",
            "liferay-fragments"
        ],
        "scripts": {
            "add-collection": "yo liferay-fragments:collection",
            "add-fragment": "yo liferay-fragments:fragment",
            "add-fragment-composition": "yo liferay-fragments:fragment-composition",
            "add-page-template": "yo liferay-fragments:page-template",
            "compress": "yo liferay-fragments:compress",
            "export": "yo liferay-fragments:export",
            "import": "yo liferay-fragments:import",
            "import:watch": "yo liferay-fragments:import --watch",
            "preview": "yo liferay-fragments:preview"
        },
        "engines": {
            "node": ">= 10.0.0",
            "yarn": "^1.22.5"
        },
        "dependencies": {
            "react": "16.8.6",
            "react-dom": "16.8.6"
        },
        "devDependencies": {
            "generator-liferay-fragments": "1.10.0"
        }
    };
    await helpers.saveFile(`${projectFolder}/package.json`,JSON.stringify(obj));
}
async function createLiferayNPMBundlerConfigJS()
{
    var obj = "module.exports = require('generator-liferay-fragments').getBundlerConfig();\n";
    await helpers.saveFile(`${projectFolder}/liferay-npm-bundler.config.js`,obj);
}
async function createLiferayDeployFragmentsJSON()
{
    var obj = {"companyWebId":"liferay.com","groupKey":"Guest"};
    await helpers.saveFile(`${projectFolder}/liferay-deploy-fragments.json`,JSON.stringify(obj));
}
async function compressCollection()
{
    await compressing.zip.compressDir(projectFolder, `${projectRootFolder}/ImportPackage.zip`);

}
async function processCSSFile(_path)
{
    var path = helpers.relativePathToFullPath(htmlFile,_path);
    if (helpers.getFileExtension(path) != ".css")
        return;
    if (fse.pathExistsSync(path)) {
        var fixedCSS = getFixedCSS(path);
        var cssFileName = helpers.getFileName(path);
        resources_css_list.push(cssFileName);
        await fse.ensureDir(`${collectionFolderPath}/resources`);
        await helpers.saveFile(`${collectionFolderPath}/resources/${cssFileName}`, fixedCSS);
    } else {
        console.log(`Could not load the style file: ${path}`);
    }
}
async function fixAndSaveCSS()
{
    for (const element of root.querySelectorAll(`[rel = 'stylesheet']`)) {
        processCSSFile(element.getAttribute('href'));
    }
}
function prepareJSResourcesInjectionHTML()
{
    var html="";
    resources_js_list.forEach((item)=>{
        html+=`<script src="[resources:${item}]"></script>\n`;
    });
    html+=` \n[#assign isEdit=false]
            [#if themeDisplay.isSignedIn()]
            [#assign req = request.getRequest()]
            [#assign originalRequest = portalUtil.getOriginalServletRequest(req)]
            [#if originalRequest.getParameter("p_l_mode")??]
            [#assign isEdit=true]
            [/#if]
            [/#if]
            
            [#if isEdit]
            <div class="alert alert-info p-4">
              Java Script Loader Component - Footer Resources Area
            </div>
            [/#if]`;
    return html;
}
function getFixedCSS(filePath)
{
    var content = helpers.readFileContent(filePath);
    const ast = csstree.parse(content);
    csstree.walk(ast, (node) => {
        if (node.type === 'Selector') {
            node.children.unshift({"type":"IdSelector","loc":null,"name":"wrapper "});
        }
        else
            if (node.type === 'Url')
            {
                processCSSFile(node.value);
            }
    });
    return csstree.generate(ast);
}
async function processJSFile(_path)
{
    var path = helpers.relativePathToFullPath(htmlFile,_path);
    if (helpers.getFileExtension(path) != ".js")
        return;
    if (fse.pathExistsSync(path)) {
        var jsContent = helpers.readFileContent(path);
        var jsFileName = helpers.getFileName(path);
        resources_js_list.push(jsFileName);
        await fse.ensureDir(`${collectionFolderPath}/resources`);
        await helpers.saveFile(`${collectionFolderPath}/resources/${jsFileName}`, jsContent);
    } else {
        console.log(`Could not load the JS file: ${path}`);
    }
}
function SaveJSScripts()
{
    for (const element of root.querySelectorAll(`script`)) {
        processJSFile(element.getAttribute("src"));
    }
}
function start(_collectionName,htmlFilePath,_groupStyles,_includeJSResources)
{
    htmlFile = htmlFilePath;
    groupResources = _groupStyles;
    collectionName=_collectionName;
    var currentDate = helpers.getDate();
    collectionFolderPath = `./auto-generated-fragments/${currentDate}/${collectionName.replace(" ","-")}/src/${collectionName.replace(" ","-")}`;
    projectFolder = `./auto-generated-fragments/${currentDate}/${collectionName.replace(" ","-")}/`;
    projectRootFolder = `./auto-generated-fragments/${currentDate}/`;
    fse.ensureDir(collectionFolderPath, async err => {
        htmlParserInit();
        SaveJSScripts();
        await fixAndSaveCSS();
        await createCollectionDescriptionFile();
        await createCollectionPackageJSON();
        await createLiferayDeployFragmentsJSON();
        await createLiferayNPMBundlerConfigJS();
        if (groupResources)
        {
            componentsList.push({name:"LayoutResourcesComponent",randomIdCode:0,Id:-1,configuration:[],html:prepareResourcesInjectionHTML()});
        }
        if (_includeJSResources)
        {
            componentsList.push({name:"LayoutJavaScriptComponent",randomIdCode:0,Id:-2,configuration:[],html:prepareJSResourcesInjectionHTML()});
        }
        processComponents();
        await processFragmentsFolders();
        await compressCollection();

    });
}

module.exports = {
    start
}

