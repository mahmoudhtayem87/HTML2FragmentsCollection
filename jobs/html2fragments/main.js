const inquirer = require('inquirer');
const compressing = require('compressing');
var HTMLParser = require('node-html-parser');
const helpers = require('../../helpers');
const clientExt = require('./clientExt');
const fs = require('fs');
const fse = require('fs-extra');
const csstree = require('css-tree');
const { saveFile } = require("../../helpers");
const namer = require('color-namer');
const _ = require('lodash');
const resolve = require('path').resolve;
const PATH = require('path');
const request = require('request');
const URL = require("url");

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

var colorsArray = [];
var cssfiles = [];
const icons = helpers.getClayIcons();

var jsClientExt = "";
var cssClientExt = "";
var scriptSeperator = "\n /* Script Seperator */ \n";
var cssSeperator = "\n /* Style Sheet Seperator */ \n";
function tryGetColorName(code) {
    try {
        return namer(`#${code}`, { pick: ['x11'], distance: 'deltaE' });

    } catch (e) {
        console.log("could not find a name for color code: " + code);
        var color = {
            x11: [{ distance: 0, name: "color" + code.replaceAll("/", "").replaceAll("\\", ""), hex: `#{code}` }]
        }
        return color;
    }
}

function createStyleBook() {
    var configs = [];
    try {
        colorsArray = _.uniqBy(colorsArray, 'css_original_code');
        var grouped = _.mapValues(_.groupBy(colorsArray, 'name'),
            clist => clist.map(color => _.omit(color, 'name')));
        colorsArr = [];
        for (const key in grouped) {
            if (grouped.hasOwnProperty(key)) {
                colorsArr.push({ color: key, items: grouped[key] });
            }
        }
        colorsArr = colorsArr.sort((a, b) => (a.items.length < b.items.length) ? 1 : ((b.items.length < a.items.length) ? -1 : 0));
        colorsArr[0].color = "primary";
        colorsArr[1].color = "secondary";
        var colorsObject = {};
        for (var index = 0; index < colorsArr.length; index++) {
            colorsObject[colorsArr[index].color] = colorsArr[index].items;
        }
        grouped = colorsObject;
        for (const color in grouped) {
            var colors = grouped[color][0];
            configs.push({
                name: `${color}`,
                label: `${color.toUpperCase()}`,
                type: "colorPalette",
                dataType: "object",
                defaultValue: {
                    cssClass: `${color}`,
                    rgbValue: `${colors.code}`
                }
            });
        }
    }catch (e) {
        console.log(`Error while fixing style book: ${e.message}`)
    }
    return configs;

}

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

function GenerateLanguageADT() {
    var template =
        `<script>
        function onChange(event)
        {
            e = event || window.event;
            var target = e.target || e.srcElement;
            document.location = target.value;
        }
    </script>` + `
    <div class="input-group-icon languageSelector">
            <div class="icon">
            <@clay["icon"] symbol="globe" /></div>
            <div class="form-select" id="default-select">
                <select class="languageSelectorDropDown" onChange="onChange(event)">` + `
                    <#list entries as curLanguage>
                        <#if !curLanguage.isSelected() >` +
        " <option value='${curLanguage.getURL()!''}'>" + `
                        </#if>
                        <#if curLanguage.isSelected() >` +
        " <option selected value='${curLanguage.getURL()!''}'  >" +
        " </#if>" +
        "  ${curLanguage.longDisplayName}" + `
                        </option>
                    </#list>
                </select>
            </div>
        </div>`;
    fse.ensureDir(`${projectRootFolder}/ADT`, () => {
        helpers.saveFile(`${projectRootFolder}/ADT/languageSelector.ftl`, template.toString());
        console.log("Freemarker template for language selector has been created!");
    });
}

function GenerateNavigationADT(el, componentId) {
    var singleItem = el.querySelectorAll("[liferay-tag='navigation-single-item']")[0];
    console.log(singleItem.tagName);
    if (singleItem.tagName === "A") {
        singleItem.innerHTML = "${navigationEntry.getName()}";
        singleItem.setAttribute("href", "${navigationEntry.getURL()}");
    } else {
        singleItem.querySelectorAll("a")[0].innerHTML = "${navigationEntry.getName()}";
        singleItem.querySelectorAll("a")[0].setAttribute("href", "${navigationEntry.getURL()}");
    }

    singleItem.classList.add("{selected}");

    var navigationItemWithSub = el.querySelectorAll("[liferay-tag='navigation-item-with-sub']")[0];
    navigationItemWithSub.querySelectorAll("[liferay-tag='navigation-sub-label']")[0].set_content("${navigationEntry.getName()}");

    var navigationRootSub = navigationItemWithSub.querySelectorAll("*")[1];
    navigationRootSub.set_content(`
     <#list navigationEntry.getChildren() as SubEntry>
         <#assign subActive="" />
             <#if SubEntry.isSelected()>
                <#assign subActive=selectedClass>
             </#if>
             ${singleItem.toString().replace("{selected}", "${subActive}").replaceAll('navigationEntry','SubEntry')}
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
                    ${singleItem.toString().replace("{selected}", "${active}")}
                     </#if>
        </#list>
    `);
    fse.ensureDir(`${projectRootFolder}/ADT`, () => {
        helpers.saveFile(`${projectRootFolder}/ADT/navigationMenu.ftl`, menuRoot.toString());
        console.log("Freemarker template for navigation has been created!");
    });
}

function fixElement(el, componentId) {
    var currentComponent = componentsList.filter(com => com.Id === componentId)[0];
    if (el.getAttribute("liferay-tag")) {
        var tag = el.getAttribute("liferay-tag");
        switch (tag) {
            case "skip":
                break;
            case "dropzone":
                el.classList.add("w-100");
                el.innerHTML = "<lfr-drop-zone class='w-100'></lfr-drop-zone>";
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
                el.innerHTML = `[@liferay.navigation_menu /]`;
                break;
            case "slider":
                var currentComponent = componentsList.filter(com => com.Id === componentId)[0];
                //adding collection selector configuration
                currentComponent.configuration.push(
                    {
                        "name": "collection",
                        "type": "collectionSelector"
                    }
                );
                var attributes = el.querySelectorAll("[liferay-slide-tag]");
                var slide = el.querySelectorAll('[liferay-tag="slide"]');
                slide.forEach(element=>{
                    element.setAttribute('class',element.getAttribute('class') + ' ${active}');
                });
                for (var index = 0; index < attributes.length; index++) {
                    if (attributes[index].getAttribute("liferay-slide-type").toLowerCase() === "friendlyurl")
                    {
                        el.querySelector("a").setAttribute("href", "${getDisplayURL (item)}");
                        continue;
                    }
                    currentComponent.configuration.push({
                        "name": attributes[index].getAttribute("liferay-slide-tag"),
                        "label": attributes[index].getAttribute("liferay-slide-tag-label") ? attributes[index].getAttribute("liferay-slide-tag-label") :
                            attributes[index].getAttribute("liferay-slide-tag"),
                        "type": "text",
                        "typeOptions": {
                            "placeholder": "Placeholder"
                        },
                        "dataType": "string",
                        "defaultValue": ""
                    });
                    switch (attributes[index].getAttribute("liferay-slide-type")) {
                        case "bg-image":
                            attributes[index].setAttribute("style", "background-image:url('${getArticleValue(rootElement,configuration." +
                                attributes[index].getAttribute("liferay-slide-tag") + ",'image')!''}')")
                            break;
                        case "text":
                            attributes[index].set_content('${getArticleValue(rootElement,configuration.' +
                                attributes[index].getAttribute("liferay-slide-tag") + ',"text")!""}');
                            break;
                        case "image":
                            attributes[index].setAttribute("src", "${getArticleValue(rootElement,configuration." +
                                attributes[index].getAttribute("liferay-slide-tag") + ",'image')!''}")
                            break;
                        case "video":
                            attributes[index].setAttribute("src", "${getArticleValue(rootElement,configuration." +
                                attributes[index].getAttribute("liferay-slide-tag") + ",'video')!''}")
                            break;
                    }
                }
                var newHtml = `

                [#function getDisplayURL entry]
                [#assign  groupLocalService = serviceLocator.findService("com.liferay.portal.kernel.service.GroupLocalService")]
                    [#assign group = groupLocalService.getGroup(entry.groupId?number)]
                    [#assign url =themeDisplay.getPortalURL()  + '/w/' + entry.urlTitle ]
                    [#return url]
                [/#function]
                [#function getArticleDocument groupId articleId]
                    [#assign srv = serviceLocator.findService("com.liferay.journal.service.JournalArticleLocalService")]
                    [#assign article = srv.getArticle(groupId,articleId)]
                    [#assign document = saxReaderUtil.read(article.getContent())]
                    [#return document.getRootElement()]
                [/#function]

                [#function getArticleValue rootElement name type]
                    [#attempt]
                        [#list rootElement.elements() as dynamicElement ]
                            [#if type == "image"]
                                [#if dynamicElement.attributeValue("field-reference") == name]
                                    [#assign image = dynamicElement.element("dynamic-content").getStringValue()?replace("\\\\/","/")]
                                    [#assign imageObj = image?eval]
                                    [#return imageObj.url]
                                [/#if]
                            [/#if]
                            [#if type == "video"]
                        [#if dynamicElement.attributeValue("field-reference") == name]
                            [#assign video = dynamicElement.element("dynamic-content").getStringValue()?replace("\\\\/","/")]
                            [#assign videoObj = video?eval]
                            [#assign str = videoObj.html ]
                            [#assign srcPattern = r'src="(.*?)".*?']
                            [#assign srcValue = '']
                            [#assign matches = str?matches(srcPattern)!'dd']
                            [#if matches?has_content]
                              [#assign srcValue = matches[0]?substring(matches[0]?index_of('=')+1)?replace('"','')?replace('&videoEmbed=true','')]
                            [/#if]
                            [#return srcValue]
                        [/#if]
                    [/#if]
                            [#if type == "text"]
                            [#if dynamicElement.attributeValue("field-reference") == name]
                                [#assign text = dynamicElement.element("dynamic-content").getText()]
                                [#return text]
                            [/#if]
                        [/#if]
                        [/#list]
                        [#recover]
                    [/#attempt]
                [/#function]
                [#if collectionObjectList??]
                [#list collectionObjectList as item]
                [#assign active='']
                [#if item?index == 0]
                    [#assign active='active']
                [/#if]
                [#assign rootElement = getArticleDocument(getterUtil.getLong(item.groupId),item.articleId?string)]
                    ${el.querySelectorAll("[liferay-tag='slide']").toString()}
                [/#list]
                [/#if]
                `;
                el.parentNode.insertAdjacentHTML('afterbegin', `
                       [#assign isEdit=false]
                [#if themeDisplay.isSignedIn()]
                [#assign req = request.getRequest()]
                [#assign originalRequest = portalUtil.getOriginalServletRequest(req)]
                [#if originalRequest.getParameter("p_l_mode")??]
                [#assign isEdit=true]
                [/#if]
                [/#if]

                [#if isEdit]
                <div class="alert alert-info p-4">
                  Auto Generated Slider Area
                </div>
                [/#if]
                `);
                el.innerHTML = newHtml;

                break;
        }
    } else {
        switch (el.tagName.toLowerCase()) {
            case "img": {
                el.replaceWith(`
                            <lfr-editable class="${el.getAttribute("class")}" id="Image_${currentComponent.randomIdCode++}" type="image">
                                <img src=""/>
                            </lfr-editable>
                           `);
                break;
            }
            case "a": {

                el.replaceWith(`
                            <lfr-editable class="${el.getAttribute("class")}" id="link_${currentComponent.randomIdCode++}" type="link">
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

                el.setAttribute("title", `${configurationKey}`);
                el.className = "";
                el.setAttribute("class", "clay-icon");
                el.tagName = "i";
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
    componentsList.push({ name: componentName, randomIdCode: 0, Id: _componentId, configuration: [], html: "" });
    elementParser(htmlElement, _componentId);
    var currentComponent = componentsList.filter(com => com.Id === _componentId)[0];
    currentComponent.html = helpers.removeDocumentWriteJS(htmlElement.toString());
    _componentId = _componentId + 1;
}

function processContainerFragment(htmlElement, componentName) {

    componentsList.push({ name: componentName, randomIdCode: 0, Id: _componentId, configuration: [], html: "" });
    containerParser(htmlElement, _componentId);
    var currentComponent = componentsList.filter(com => com.Id === _componentId)[0];
    currentComponent.html = helpers.removeDocumentWriteJS(htmlElement.toString());
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

function prepareStyleBookInjectionHTML() {
    var html = "";
    var configuration = createStyleBook();

    var rootStyles = "";
    configuration.forEach(config => {
        rootStyles +=
            "--" +
            config.name +
            ":" +
            "${configuration." +
            config.name +
            ".rgbValue};\n";
    });
    rootStyles = `:root\n{ ${rootStyles} \n}`;
    html += `<style>\n${rootStyles}\n</style>`;
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
              Fragmented Theme Style Book - Header Area
            </div>
            [/#if]`;
    return html;
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
    var obj = { "companyWebId": "liferay.com", "groupKey": "Guest" };
    await helpers.saveFile(`${projectFolder}/liferay-deploy-fragments.json`, JSON.stringify(obj));
}

async function compressCollection() {
    await compressing.zip.compressDir(projectFolder, `${projectRootFolder}/ImportPackage.zip`);

}

async function processCSSFile(_path) {
    var isRemote = false;
    var pathName = '';
    var body = '';
    if (_path.startsWith('http'))
    {
        isRemote = true;
        var parsed = URL.parse(_path);
        pathName = PATH.basename(parsed.pathname);
        console.log(`Loading remote style sheet from: ${_path}`);
        body = await getRemoteFile(_path);
    }
    var directory = helpers.getFileDirectory(htmlFile);
    var path = resolve(directory, _path);
    if (helpers.getFileExtension(path) != ".css")
        return;
    if (fse.pathExistsSync(path)) {
        var fixedCSS = getFixedCSS(path);
        cssClientExt += cssSeperator + fixedCSS;
        var cssFileName = helpers.getFileName(path);
        resources_css_list.push(cssFileName);
        cssfiles.push({
            filePath: `${collectionFolderPath}/resources/${cssFileName}`,
            content: fixedCSS
        });
    } else if (_path.startsWith('http')) {
        console.log(`Processing remote style sheet from: ${_path}`);
        var fixedCSS = getFixedCSSByContent(body);
        cssClientExt += cssSeperator + fixedCSS;
        var cssFileName = pathName;
        resources_css_list.push(cssFileName);
        cssfiles.push({
            filePath: `${collectionFolderPath}/resources/${cssFileName}`,
            content: fixedCSS
        });
    } else {
        console.log(`Could not load the style file: ${path}`);
    }


}

async function processCSSInlineStyle(Content, styleTagIndex) {
    var fixedCSS = getFixedCSSFromString(Content);
    cssClientExt += cssSeperator + fixedCSS;
    var cssFileName = `inline_style_${styleTagIndex}.css`;
    resources_css_list.push(cssFileName);
    cssfiles.push({
        filePath: `${collectionFolderPath}/resources/${cssFileName}`,
        content: fixedCSS
    });
}

async function fixAndSaveCSS() {
    for (const element of root.querySelectorAll(`[rel = 'stylesheet']`)) {
        await processCSSFile(element.getAttribute('href'));
    }
    var index = 0;
    for (const element of root.querySelectorAll(`style`)) {
        processCSSInlineStyle(element.innerHTML.toString(), index++);
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
    var colors = [];
    csstree.walk(ast, {
        enter: function (node, item, list) {
            if (
                this.atrule &&
                csstree.keyword(this.atrule.name).basename === 'keyframes'
            ) {
                return;
            }
            if (node.type === 'Declaration' && helpers.isValidColorProp(node.property) && node.value.type === "Value" && node.value.children.head.data.type === "Hash") {
                if (colorsArray.filter(color => color.code === node.value.children.head.data.value).length === 0) {
                    var color_name = tryGetColorName(`${node.value.children.head.data.value}`);
                    color_name = color_name.x11.sort((a, b) => (a.distance > b.distance) ? 1 : ((b.distance > a.distance) ? -1 : 0))[0];
                    if (color_name) {
                        colorsArray.push({
                            css_original_code: node.value.children.head.data.value,
                            name: color_name.name,
                            code: color_name.hex
                        });
                    }
                }
            }
            if (node.type === 'Selector') {
                node.children.unshift({ "type": "IdSelector", "loc": null, "name": "wrapper " });
            } else if (node.type === 'Url') {
                processCSSFile(node.value);
            }
        }
    });
    return (csstree.generate(ast)).replaceAll("#wrapper", "#wrapper *:not(.excluded-area *) >  ");
}
function getFixedCSSByContent(Content) {
    var content = Content;
    const ast = csstree.parse(content);
    var colors = [];
    csstree.walk(ast, {
        enter: function (node, item, list) {
            if (
                this.atrule &&
                csstree.keyword(this.atrule.name).basename === 'keyframes'
            ) {
                return;
            }
            if (node.type === 'Declaration' && helpers.isValidColorProp(node.property) && node.value.type === "Value" && node.value.children.head.data.type === "Hash") {
                if (colorsArray.filter(color => color.code === node.value.children.head.data.value).length === 0) {
                    var color_name = tryGetColorName(`${node.value.children.head.data.value}`);
                    color_name = color_name.x11.sort((a, b) => (a.distance > b.distance) ? 1 : ((b.distance > a.distance) ? -1 : 0))[0];
                    if (color_name) {
                        colorsArray.push({
                            css_original_code: node.value.children.head.data.value,
                            name: color_name.name,
                            code: color_name.hex
                        });
                    }
                }
            }
            if (node.type === 'Selector') {
                node.children.unshift({ "type": "IdSelector", "loc": null, "name": "wrapper " });
            } else if (node.type === 'Url') {
                processCSSFile(node.value);
            }
        }
    });
    return csstree.generate(ast);
}

function getFixedCSSFromString(content) {
    const ast = csstree.parse(content);
    var colors = [];
    csstree.walk(ast, {
        enter: function (node, item, list) {
            if (
                this.atrule &&
                csstree.keyword(this.atrule.name).basename === 'keyframes'
            ) {
                return;
            }

            if (node.type === 'Declaration' && helpers.isValidColorProp(node.property) && node.value.type === "Value" && node.value.children.head.data.type === "Hash") {
                if (colorsArray.filter(color => color.code === node.value.children.head.data.value).length === 0) {
                    var color_name = tryGetColorName(`${node.value.children.head.data.value}`);
                    color_name = color_name.x11.sort((a, b) => (a.distance > b.distance) ? 1 : ((b.distance > a.distance) ? -1 : 0))[0];
                    if (color_name) {
                        colorsArray.push({
                            css_original_code: node.value.children.head.data.value,
                            name: color_name.name,
                            code: color_name.hex
                        });
                    }
                }
            }
            if (node.type === 'Selector') {
                node.children.unshift({ "type": "IdSelector", "loc": null, "name": "wrapper " });
            } else if (node.type === 'Url') {
                processCSSFile(node.value);
            }
        }
    });
    return csstree.generate(ast);
}

async function getRemoteFile(url)
{
    var prom = new Promise((resolve,reject)=>{
        request(url, function(err, response, body){
            const fileContent = body;
            resolve(fileContent);
        });
    });
    return prom;

}

async function processJSFile(_path) {

    var isRemote = false;
    var pathName = '';
    var body = '';
    if (_path.startsWith('http'))
    {
        isRemote = true;
        var parsed = URL.parse(_path);
        pathName = PATH.basename(parsed.pathname);
        console.log(`Loading remote script from: ${_path}`);
        body = await getRemoteFile(_path);
    }
    if (!isRemote)
    {
        var directory = helpers.getFileDirectory(htmlFile);
        var path = resolve(directory, _path);
        if (helpers.getFileExtension(path) != ".js")
            return;
        if (fse.pathExistsSync(path)) {
            var jsContent = helpers.readFileContent(path);
            var jsFileName = helpers.getFileName(path);
            resources_js_list.push(jsFileName);
            await fse.ensureDir(`${collectionFolderPath}/resources`);
            let cleanScript = helpers.removeDocumentWriteJS(jsContent)
            jsClientExt += scriptSeperator + cleanScript;
            await helpers.saveFile(`${collectionFolderPath}/resources/${jsFileName}`, cleanScript);
        } else {
            console.log(`Could not load the JS file: ${path}`);
        }
    }else
    {
        var jsContent = body;
        var jsFileName = pathName;
        resources_js_list.push(jsFileName);
        await fse.ensureDir(`${collectionFolderPath}/resources`);
        let cleanScript = helpers.removeDocumentWriteJS(jsContent);
        jsClientExt += scriptSeperator + cleanScript;
        try {
            await helpers.saveFile(`${collectionFolderPath}/resources/${jsFileName}`,cleanScript);
        }catch (exp)
        {
            console.log(`error while writing file ${jsFileName}`);
        }

    }

}

async function SaveJSScripts() {
    var index = 0;
    for (const element of root.querySelectorAll(`script`)) {
        if (element.getAttribute("src")) {
            await processJSFile(element.getAttribute("src"));
        } else {
            await fse.ensureDir(`${collectionFolderPath}/resources`);
            resources_js_list.push(`page_script_${index}.js`);
            jsClientExt += scriptSeperator + helpers.removeDocumentWriteJS(element.innerHTML.toString());
            await helpers.saveFile(`${collectionFolderPath}/resources/page_script_${index}.js`,
                helpers.removeDocumentWriteJS(element.innerHTML.toString()));
            index += 1;
        }
    }
}

async function createCustomJSFile() {
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

async function createCustomCSSFile() {
    var style = `
    .w-100
        {
            width:100%!important;
        }
    .w-100 > div
        {
            width:100%!important;
        }
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
    .languageSelector .icon {
        position: unset!important;
        left: unset!important;
        top: unset!important;
        line-height: unset!important;
        z-index: 3;
        display: inline-flex!important;
        }
    .languageSelector .form-select {
        height: unset!important;
        left: unset!important;
        top: unset!important;
        line-height: unset!important;
        z-index: 3;
        display: inline-flex!important;
        width:unset!important;
        }
    .languageSelector select
        {
        background: transparent;
        border: none!important;
        text-transform: uppercase;
        max-width: 90px;
        font-size: 13px;
        color: #919191;
        }
    .languageSelector select:focus
        {
            outline:none!important;
        }
    .languageSelectorDropDown
        {
            text-transform: uppercase!important;
        }
    .container
        {
            margin:auto!important;
        }
    `;
    resources_css_list.push("lr_custom.css");
    await fse.ensureDir(`${collectionFolderPath}/resources`);
    await helpers.saveFile(`${collectionFolderPath}/resources/lr_custom.css`, style);
}

async function FixCSSAddVars() {
    try {
        colorsArray = _.uniqBy(colorsArray, 'css_original_code');
        var grouped = _.mapValues(_.groupBy(colorsArray, 'name'),
            clist => clist.map(color => _.omit(color, 'name')));
        colorsArr = [];
        for (const key in grouped) {
            if (grouped.hasOwnProperty(key)) {
                colorsArr.push({ color: key, items: grouped[key] });
            }
        }
        colorsArr = colorsArr.sort((a, b) => (a.items.length < b.items.length) ? 1 : ((b.items.length < a.items.length) ? -1 : 0));
        colorsArr[0].color = "primary";
        colorsArr[1].color = "secondary";
        var colorsObject = {};
        for (var index = 0; index < colorsArr.length; index++) {
            colorsObject[colorsArr[index].color] = colorsArr[index].items;
        }
        grouped = colorsObject;
        for (const color in grouped) {
            var colors = grouped[color];
            for (const origianl of colors) {
                for (var index = 0; index < cssfiles.length; index++) {
                    var fileContent = cssfiles[index].content.replaceAll(`#${origianl.css_original_code};`, `var(--${color});`);
                    cssfiles[index].content = fileContent;
                }
            }
            ;
        }
        await fse.ensureDir(`${collectionFolderPath}/resources`);

        var selector = "#wrapper :root";
        var pattern = new RegExp(selector.replace(/\./g, "\\.") + "\\s*{[^}]*?}", "gim");
        for (var index = 0; index < cssfiles.length; index++) {
            await helpers.saveFile(`${cssfiles[index].filePath}`, cssfiles[index].content.replace(pattern, ''));
        }
    }catch (e)
    {
     console.log(`Error while parsing colors: ${e.message}`);
    }
}

function start(_collectionName, htmlFilePath, _groupStyles, _includeJSResources, compress) {
    htmlFile = htmlFilePath;
    groupResources = _groupStyles;
    collectionName = _collectionName;
    var currentDate = helpers.getDate();
    collectionFolderPath = `./auto-generated-fragments/${currentDate}/${collectionName.replace(" ", "-")}/src/${collectionName.replace(" ", "-")}`;
    projectFolder = `./auto-generated-fragments/${currentDate}/${collectionName.replace(" ", "-")}/`;
    projectRootFolder = `./auto-generated-fragments/${currentDate}/`;
    fse.ensureDir(collectionFolderPath, async err => {
        htmlParserInit();
        await SaveJSScripts();
        await fixAndSaveCSS();
        await FixCSSAddVars();
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
        componentsList.push({
            name: "StyleBook",
            randomIdCode: -1,
            Id: -2,
            configuration: createStyleBook(),
            html: prepareStyleBookInjectionHTML()
        });
        if (_includeJSResources) {
            componentsList.push({
                name: "LayoutJavaScriptComponent",
                randomIdCode: 0,
                Id: -2,
                configuration: [],
                html: prepareJSResourcesInjectionHTML()
            });
        }
        GenerateLanguageADT();
        processComponents();
        processContainers();
        await processFragmentsFolders();
        if (compress)
            await compressCollection();
        await clientExt.start(projectRootFolder, jsClientExt, cssClientExt);
    });
}

module.exports = {
    start
}

