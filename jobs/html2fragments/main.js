const inquirer = require('inquirer');
const compressing = require('compressing');
var HTMLParser = require('node-html-parser');
const helpers = require('../../helpers');
const fs = require('fs');
const fse = require('fs-extra');
const csstree = require('css-tree');

const componentSelectorAtt = "liferay-component-type";
const componentNameAtt = "liferay-component-name";
var _componentId = 0;

var groupResources = false;
var componentsList = [];
var collectionFolderPath = "";
var projectFolder = "";
var projectRootFolder = "";
var collectionName = "";
var htmlFile;
var root = null;
var resources_css_list = [];
var resources_js_list = [];

const icons = helpers.getClayIcons();

function elementParser(el, componentId) {
    //data-lfr-background-image-id="unique-id"
    if (el.getAttribute("style") && el.getAttribute("style").toString().indexOf("background-image") != -1) {
        var currentComponent = componentsList.filter(com => com.Id === componentId)[0];
        el.setAttribute("data-lfr-background-image-id", `bgImage_${currentComponent.randomIdCode++}`);
    }
    if (el.querySelectorAll("*").length > 0) {
        el.querySelectorAll('*').forEach(sub_element => {
            if (sub_element.nodeType === 1 && sub_element.parentNode === el) {
                if (el.getAttribute("liferay-tag")) {
                    fixElement(el, componentId);
                } else if (sub_element.tagName.toLowerCase() === "p") {
                    fixElement(sub_element, componentId);
                } else {
                    elementParser(sub_element, componentId);
                }
            }
        });
    } else {

        if (el.nodeType === 1) {
            fixElement(el, componentId);
        }
    }
}

function containerParser(el, componentId) {
    var currentComponent = componentsList.filter(com => com.Id === componentId)[0];
    if (el.getAttribute("style") && el.getAttribute("style").toString().indexOf("background-image") != -1) {
        el.setAttribute("data-lfr-background-image-id", `bgImage_${currentComponent.randomIdCode++}`);
    }
    el.innerHTML = " <lfr-drop-zone></lfr-drop-zone>";
    currentComponent.html = el.toString();
}

function GenerateNavigationADT(el, componentId) {
    var singleItem = el.querySelectorAll("[liferay-tag='navigation-single-item']")[0];
    singleItem.querySelectorAll("a")[0].innerHTML = "${navigationEntry.getName()}";
    singleItem.querySelectorAll("a")[0].setAttribute("href", "${navigationEntry.getURL()}");
    singleItem.classList.add("{selected}");

    var navigationItemWithSub= el.querySelectorAll("[liferay-tag='navigation-item-with-sub']")[0];
    navigationItemWithSub.querySelectorAll("[liferay-tag='navigation-sub-label']")[0].set_content("${navigationEntry.getName()}");

    var navigationRootSub = el.querySelectorAll("[liferay-tag='navigation-root-sub']")[0];
    navigationRootSub.set_content(`
     <#list navigationEntry.getChildren() as SubEntry>
         <#assign subActive="" />
             <#if SubEntry.isSelected()>
                <#assign subActive=selectedClass>
             </#if>
             ${singleItem.toString().replace("{selected}","${subActive}")}
      </#list>
    `);

    var menuRoot = el.querySelectorAll("[liferay-tag='navigation-root']")[0];
    menuRoot.set_content(`
    <#assign selectedClass = "current" />
     <#list entries as navigationEntry>
            <#if navigationEntry.hasChildren()>
                <#assign uniqueId=.now?string["HHmmssSSS"]?number />
                ${navigationItemWithSub.toString()}
                <#else>
                    <#assign active="" />
                    <#if navigationEntry.isSelected()>
                        <#assign active=selectedClass>
                    </#if>
                    ${singleItem.toString().replace("{selected}","${active}")}
                     </#if>
        </#list>
    `);
    fse.ensureDir(`${projectRootFolder}/ADT`,()=>{
        helpers.saveFile(`${projectRootFolder}/ADT/navigationMenu.ftl`,menuRoot.toString());
        console.log("Freemarker template for navigation has been created!");
    });
}
function fixElement(el, componentId) {
    var currentComponent = componentsList.filter(com => com.Id === componentId)[0];
    if (el.getAttribute("liferay-tag")) {
        console.log(el.getAttribute("liferay-tag"));
        var tag = el.getAttribute("liferay-tag");
        switch (tag) {
            case "skip":
                break;
            case "dropzone":
                el.innerHTML = "<lfr-drop-zone></lfr-drop-zone>";
                break;
            case "logo":
                el.innerHTML = '<a class="navbar-brand" href="${themeDisplay.getURLHome()}"><img src="${htmlUtil.escape(themeDisplay.getCompanyLogo())}" alt="${company.name}" class="img-fluid"> </a>';
                break;
            case "search":
                el.innerHTML = "[@liferay.search_bar /]";
                break;
            case "avatar":
                el.innerHTML = "[@liferay.user_personal_bar /]";
                break;
            case "language":
                el.innerHTML = "[@liferay.languages /]";
                break;
            case "navigation":
                GenerateNavigationADT(el, componentId);
                var currentComponent = componentsList.filter(com => com.Id === componentId)[0];
                el.innerHTML = `[#attempt]
              [#assign navMenuID = configuration.navigationMenu?number]
              [#assign templateId = configuration.navigationMenuTemplate?number]
              [#assign ddmTemplateLocalService =
              serviceLocator.findService("com.liferay.dynamic.data.mapping.service.DDMTemplateLocalService")]
              [#assign template = ddmTemplateLocalService.fetchDDMTemplate(templateId)]
              [#assign siteNavigationMenuLocalService =
              serviceLocator.findService("com.liferay.site.navigation.service.SiteNavigationMenuLocalService")]
              [#assign navigationMenu = siteNavigationMenuLocalService.fetchSiteNavigationMenu(navMenuID)]
              [@liferay_site_navigation["navigation-menu"]
              ddmTemplateGroupId=template.groupId
              ddmTemplateKey=template.templateKey
              displayDepth=1
              expandedLevels="auto"
              rootItemType="absolute"
              rootItemLevel=0
              siteNavigationMenuId=navigationMenu.siteNavigationMenuId /]
              [#recover]
              <li class="nav-item">
              <span class="nav-link">
                            <small>Menu is temporarily unavailable, please make sure to enable service locator and set a valid navigation menu id and navigation menu template in the fragment configurations</small>
                            </span>
              </li>
              [/#attempt]`;
                //adding navigation menu configuration
                currentComponent.configuration.push({
                    "name": "navigationMenu",
                    "label": "Navigation Menu ID",
                    "type": "text",
                    "typeOptions": {
                        "placeholder": "Placeholder"
                    },
                    "dataType": "string",
                    "defaultValue": ""
                });
                currentComponent.configuration.push({
                    "name": "navigationMenuTemplate",
                    "label": "Navigation Menu Template ID",
                    "type": "text",
                    "typeOptions": {
                        "placeholder": "Placeholder"
                    },
                    "dataType": "string",
                    "defaultValue": ""
                });
                break;
        }
    } else {
        switch (el.tagName.toLowerCase()) {
            case "img": {
                el.replaceWith(`
                            <lfr-editable id="Image_${currentComponent.randomIdCode++}" type="image">
                                <img src=""/>
                            </lfr-editable>
                           `);
                break;
            }
            case "a": {
                el.replaceWith(`
                            <lfr-editable id="link_${currentComponent.randomIdCode++}" type="link">
                                <a>Link Button</a>
                            </lfr-editable>
                           `);
                break;
            }
            case "i": {

                var configurationKey = "icon" + currentComponent.randomIdCode++;
                el.setAttribute("class", "${configuration." + configurationKey + "}");
                var configurationEntry = {
                    "name": configurationKey,
                    "label": configurationKey,
                    "description": "Icons list!",
                    "type": "select",
                    "dataType": "string",
                    "typeOptions": {
                        "validValues": icons
                    },
                    "defaultValue": icons[0].value
                };
                el.parentNode.classList.add("inline-flex");
                el.setAttribute("title",`${configurationKey}`);
                el.classList.add("clay-icon");
                el.tagName = "span";
                el.set_content("[@clay[\"icon\"] symbol=\"${configuration." + configurationKey + "}\" /]");
                currentComponent.configuration.push(configurationEntry);
                break;
            }
            case "p": {
                el.setAttribute("data-lfr-editable-id", "Text_" + currentComponent.randomIdCode++);
                el.setAttribute("data-lfr-editable-type", "rich-text");
                break;
            }
            case "br":
            case "hr":
            case "ol":
            case "ul": {
                break;
            }
            default:
                el.setAttribute("data-lfr-editable-id", "Text_" + currentComponent.randomIdCode++);
                el.setAttribute("data-lfr-editable-type", "text");
                break;
        }
    }

}

function processFragment(htmlElement, componentName) {
    componentsList.push({name: componentName, randomIdCode: 0, Id: _componentId, configuration: [], html: ""});
    elementParser(htmlElement, _componentId);
    var currentComponent = componentsList.filter(com => com.Id === _componentId)[0];
    currentComponent.html = htmlElement.toString();
    _componentId = _componentId + 1;
}

function processContainerFragment(htmlElement, componentName) {

    componentsList.push({name: componentName, randomIdCode: 0, Id: _componentId, configuration: [], html: ""});
    containerParser(htmlElement, _componentId);
    var currentComponent = componentsList.filter(com => com.Id === _componentId)[0];
    currentComponent.html = htmlElement.toString();
    _componentId = _componentId + 1;
}

function getFragmentDescriptionFile(component) {
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

function prepareResourcesInjectionHTML() {
    var html = "";
    resources_css_list.forEach((item) => {
        html += `<link rel="stylesheet" href="[resources:${item}]" type="text/css">\n`;
    });
    if (groupResources) {
        html += ` \n[#assign isEdit=false]
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

function processFragmentsFolders() {
    var prom = new Promise(function (resolve, reject) {
        componentsList.forEach(component => {
            var componentfolder = `${collectionFolderPath}/${component.name.toLowerCase().replace(" ", "-")}`;
            fse.ensureDir(componentfolder, async err => {
                var resources = groupResources ? "" : prepareResourcesInjectionHTML();
                await helpers.saveFile(`${componentfolder}/index.html`, resources + component.html);
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

function getComponentConfigurations(component) {
    var configurationObj = {
        fieldSets: [
            {
                fields: []
            }
        ]
    };
    component.configuration.forEach(config => {
        configurationObj.fieldSets[0].fields.push(config);
    });
    return JSON.stringify(configurationObj);
}

function htmlParserInit() {
    const buffer = fs.readFileSync(htmlFile);
    var htmlFileContent = buffer.toString();
    root = HTMLParser.parse(htmlFileContent);
}

function processComponents() {
    root.querySelectorAll(`[${componentSelectorAtt} = 'component']`).forEach(element => {
        console.log("Processing component:" + element.getAttribute(componentNameAtt));
        processFragment(element, element.getAttribute(componentNameAtt));
        console.log("Processing component:" + element.getAttribute(componentNameAtt) + " completed!");
    });
}

function processContainers() {
    root.querySelectorAll(`[${componentSelectorAtt} = 'container']`).forEach(element => {
        console.log("Processing container:" + element.getAttribute(componentNameAtt));
        processContainerFragment(element, element.getAttribute(componentNameAtt));
        console.log("Processing container:" + element.getAttribute(componentNameAtt) + " completed!");
    });
}

async function createCollectionDescriptionFile() {
    var jsonContent = {
        description: "",
        name: collectionName
    }
    await helpers.saveFile(`${collectionFolderPath}/collection.json`, JSON.stringify(jsonContent));
}

async function createCollectionPackageJSON() {
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
        "author": "Mahmoud Hussein Tayem",
        "license": "ISC",
        "devDependencies": {
            "generator-liferay-fragments": "1.10.0"
        }
    };
    await helpers.saveFile(`${projectFolder}/package.json`, JSON.stringify(obj));
}

async function createLiferayNPMBundlerConfigJS() {
    var obj = "module.exports = require('generator-liferay-fragments').getBundlerConfig();\n";
    await helpers.saveFile(`${projectFolder}/liferay-npm-bundler.config.js`, obj);
}

async function createLiferayDeployFragmentsJSON() {
    var obj = {"companyWebId": "liferay.com", "groupKey": "Guest"};
    await helpers.saveFile(`${projectFolder}/liferay-deploy-fragments.json`, JSON.stringify(obj));
}

async function compressCollection() {
    await compressing.zip.compressDir(projectFolder, `${projectRootFolder}/ImportPackage.zip`);

}

async function processCSSFile(_path) {
    var path = helpers.relativePathToFullPath(htmlFile, _path);
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

async function fixAndSaveCSS() {
    for (const element of root.querySelectorAll(`[rel = 'stylesheet']`)) {
        processCSSFile(element.getAttribute('href'));
    }
}

function prepareJSResourcesInjectionHTML() {
    var html = "";
    resources_js_list.forEach((item) => {
        html += `<script src="[resources:${item}]"></script>\n`;
    });
    html += ` \n[#assign isEdit=false]
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

function getFixedCSS(filePath) {
    var content = helpers.readFileContent(filePath);
    const ast = csstree.parse(content);
    csstree.walk(ast, (node) => {
        if (node.type === 'Selector') {
            node.children.unshift({"type": "IdSelector", "loc": null, "name": "wrapper "});
        } else if (node.type === 'Url') {
            processCSSFile(node.value);
        }
    });
    return csstree.generate(ast);
}

async function processJSFile(_path) {
    var path = helpers.relativePathToFullPath(htmlFile, _path);
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

async function SaveJSScripts() {
    var index = 0;
    for (const element of root.querySelectorAll(`script`)) {
        if (element.getAttribute("src")) {
            processJSFile(element.getAttribute("src"));
        } else {
            await fse.ensureDir(`${collectionFolderPath}/resources`);
            resources_js_list.push(`page_script_${index}.js`);
            await helpers.saveFile(`${collectionFolderPath}/resources/page_script_${index}.js`, element.innerHTML.toString());
            index += 1;
        }
    }
}
async function createCustomJSFile()
{
    var script =
        `function onLanguageChange(event)
        {
            e = event || window.event;
            var target = e.target || e.srcElement;
            document.location = target.value;
        }`;
    resources_js_list.push("lr_custom.js");
    await fse.ensureDir(`${collectionFolderPath}/resources`);
    await helpers.saveFile(`${collectionFolderPath}/resources/lr_custom.js`, script);
}
async function createCustomCSSFile()
{
    var style = `
    .tbar
        {
            z-index : 999!important;
        }
    .clay-icon
        {
            display:inline-flex;
            margin:auto!important;
            
        }
    .inline-flex
        {
            display:inline-flex!important;
        }
    .inline-flex *
        {
            margin:auto!important;
        }
    `;
    resources_css_list.push("lr_custom.css");
    await fse.ensureDir(`${collectionFolderPath}/resources`);
    await helpers.saveFile(`${collectionFolderPath}/resources/lr_custom.css`, style);
}
function start(_collectionName, htmlFilePath, _groupStyles, _includeJSResources) {
    htmlFile = htmlFilePath;
    groupResources = _groupStyles;
    collectionName = _collectionName;
    var currentDate = helpers.getDate();
    collectionFolderPath = `./auto-generated-fragments/${currentDate}/${collectionName.replace(" ", "-")}/src/${collectionName.replace(" ", "-")}`;
    projectFolder = `./auto-generated-fragments/${currentDate}/${collectionName.replace(" ", "-")}/`;
    projectRootFolder = `./auto-generated-fragments/${currentDate}/`;
    fse.ensureDir(collectionFolderPath, async err => {
        htmlParserInit();
        SaveJSScripts();
        await fixAndSaveCSS();
        await createCollectionDescriptionFile();
        await createCollectionPackageJSON();
        await createLiferayDeployFragmentsJSON();
        await createLiferayNPMBundlerConfigJS();
        await createCustomCSSFile();
        await createCustomJSFile();
        if (groupResources) {
            componentsList.push({
                name: "LayoutResourcesComponent",
                randomIdCode: 0,
                Id: -1,
                configuration: [],
                html: prepareResourcesInjectionHTML()
            });
        }
        if (_includeJSResources) {
            componentsList.push({
                name: "LayoutJavaScriptComponent",
                randomIdCode: 0,
                Id: -2,
                configuration: [],
                html: prepareJSResourcesInjectionHTML()
            });
        }
        processComponents();
        processContainers();
        await processFragmentsFolders();
        await compressCollection();
    });
}

module.exports = {
    start
}

