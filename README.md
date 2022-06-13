# HTML 2 Fragments Collection

This command line has been created to ease the process of converting pure html pages into reusable Liferay fragments collections. The ultimate goal is to split the raw HTML into separate components and then convert those components into Liferay Fragments.

# [](https://www.npmjs.com/package/html-2-fragments-collection#how-to-use)**How to Use**

- Install in the command-line using the following command:
    `npm i html-2-fragments-collection -g`
- Edit your HTML file and for each html element that you would like to convert to a Liferay Fragment add the following attributes:
- **liferay-component-type** : Set the value of this attribute to "component" or "container"
- **liferay-component-name** : Set the value of this attribute to the preferred collection title
- **liferay-tag="navigation"**: Add this attribute to the html element which will be considered as your site navigation menu and it will be replaced with a freemarker script to load the site navigation menu.
- **liferay-tag="navigation-root"**: Add this attribute to your html element which will be considered as your navigation menu template root.
- **liferay-tag="navigation-item-with-sub"**: Add this attribute to your html element which will be considered as your 2 level navigation item template.
- **liferay-tag="navigation-sub-label"**: Add this attribute to your html element which will be considered as your 2 level navigation item label.
- **liferay-tag="navigation-single-item"**: Add this attribute to your html element which will be considered as your navigation item template.
- **liferay-tag="avatar"**: Add this attribute to any div in your html template, this will be replaced with **personal bar** at the time the parser will run.
- **liferay-tag="search"**: Add this tag to any div in your html template, this will be replaced with **search bar** at the time the parser will run.
- **liferay-tag="language"**: Add this tag to any div in your html template, this will be replaced with **language bar** at the time the parser will run.
- **liferay-tag="logo"**: Add this tag to any element in your html template, this will be replaced with **Liferay Portal Logo and Home URL link**.
- **liferay-tag="skip"**: Add this tag to any element in your html template to skip parsing the selected element.
- Run the following command to generate the fragments' collection:  
    `liferay-design html2fragments`
- The tool will ask you the following questions in order to start converting your html into a Liferay Fragments Collection
  -   **Please specify the html file path "full path is required"?**
  -   **Please specify the fragment collection name?**
  -   **Would you like to group all styles referencing in a single fragment?**
    -   **Yes**: This mean that your style links will be grouped in one fragment that can be added either on the master page or the page where you would like to use your components.
    -   **No**: This mean that your styles links will be added to each fragment will be created from this tool
  -   **Would you like JavaScript resources?**
    -   **Yes**: The tool will parse the JavaScript imports and group them in one fragment which can be used where you would like to include your JavaScript.
    -   **No**: The tool will ignore JavaScript imports / inline scripting.

## **Important Note**

This command line tool has been developed to give a starting point for you in the design migration process and to ease the process of converting static HTML components into reusable Liferay Fragments. During this process the tool will be scoping your styles so that they only apply to the appropriate section of Liferay. This might change some of your styles.

Modifying your styles after they have been parsed might be required to do style tuning and fixing. For this the tool will generate a **Liferay Fragment Collection Project** where you will find all of your resources under the resources folder. Once the modification is done, you can easily trigger the following command to package the Fragment collection and prepare it for being deployed in Liferay.

`npm i`  
`npm run compress`