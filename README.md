# HTML 2 Fragments Collection

This command line has been created to ease the process of converting pure html page into a reusable Liferay fragments collection.
The ultimate goal is to split the raw HTML into separate component and then convert those component into Liferay Fragments.

# **How to use**
- Install the command-line using the following command <br/>`npm i html-2-fragments-collection -g`
- Edit your HTML file and for each html component you would like to convert to Liferay Fragment add the following attributes
  - **liferay-component-type** : Set the value of this attribute to "component" or "container"
  - **liferay-component-name** : Set the value of this attribute to the preferred collection title
  - **liferay-tag="navigation"**: Add this tag to the html element which will be considered as your site navigation menu and it will be replaced with a freemarker script to load site navigation menu.
  - **liferay-tag="navigation-root"**: Add this tag to your html element which will be considered as your navigation menu template root.
  - **liferay-tag="navigation-item-with-sub"**: Add this tag to your html element which will be considered as your 2 level navigation item template.
  - **liferay-tag="navigation-sub-label"**: Add this tag to your html element which will be considered as your 2 level navigation item label.
  - **liferay-tag="navigation-single-item"**: Add this tag to your html element which will be considered as your navigation item template.
  - **liferay-tag="avatar"**: Add this tag to any div in your html template, this will be replaced with **personal bar** at the time the parser will run.
  - **liferay-tag="search"**: Add this tag to any div in your html template, this will be replaced with **search bar** at the time the parser will run.
  - **liferay-tag="language"**: Add this tag to any div in your html template, this will be replaced with **language bar** at the time the parser will run.
- Run the following command to generate the fragments' collection <br/> `liferay-design html2fragments` <br/>
  - the tool will ask you the following question in order to start converting your html into Liferay Fragments Collection
    - **Please specify the html file path "full path is required"?**
    - **Please specify the fragment collection name?**
    - **Would you like to group all styles referencing in a single fragment?**
      - **Yes**: This mean that your style links will be grouped in one fragment that can be added either on the master page or the page where you would like to use your components.
      - **No**: This mean that your styles links will be added to each fragment will be created from this tool
    - **Would you like JavaScript resources?**
      - **Yes**: The tool will parse the java script imports and group them in one fragment which can be used where you would like to include your java scripts in.
      - **No**: The tool will ignore java script imports / inline scripting.

## **Important Note**
This command line tools has been developed to give a starting point for you in the design migration process and to ease the process of converting static HTML components into a reusable Liferay Fragment, during this process the tool will be scoping your style to be used only the appropriate section at Liferay, this might change some of your style.

A modification of the styles after its being parsed might be required to do style tuning and fixing, for that the tool will generate a **Liferay Fragment Collection Project** where you will find all of your resources under the resources folder, once the modification is done, you can easily trigger the following command to package the Fragment collection and prepare it to be deployed in Liferay.

`Npm i` <br/>
`Npm run compress`


