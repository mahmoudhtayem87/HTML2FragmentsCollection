# HTML 2 Fragments Collection

This command line has been created to ease the process of converting pure html page into a reusable Liferay fragments collection.
The ultimate goal is to split the raw HTML into separate component and then convert those component into Liferay Fragments.

# **How to use**
- Install the command-line using the following command <br/>`npm i html-2-fragments-collection -g`
- Edit your HTML file and for each html component you would like to convert to Liferay Fragment add the following attributes
  - **liferay-component-type** : Set the value of this attribute to "component"
  - **liferay-component-name** : Set the value of this attribute to the preferred collection title
- Run the following command to generate the fragments' collection <br/> `liferay-design html2fragments -c "<colelction-name>" -f "<html-file-path>" -s "<yes/no>"` <br/>
### **Command Parameters**
- **c**: Use this param to specify your auto generated fragment collection
- **f**: Use this param to specify the html template file path "full path is required"
- **s**: Use this param to specify if you would like to create one fragment which will include all of the styles so you will be able to use it once in the master page, "no" will include the styles in each fragment.
  `
