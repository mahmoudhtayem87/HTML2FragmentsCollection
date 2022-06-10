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

