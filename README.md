# Thylo Sniffer

Thylo Sniffer is a tool for React developers that examines all the components and checks for some code smells.
Including:
- File name and component name match
- Total number of lines
- How many props are being passed
- How many state hooks are being used
- How many import statements

This is all output into a file breaking down what was found.

## Background

Thylo is my dog! And she is super duper cute. Whenever we go for walks she has to sniff as many things as she can find, hence my naming this project Thylo Sniffer.

## Configuration 

Users are able to configure Thylo Sniffer to better suit their own project needs.

### thylo-config.json

Modify the `thresholds` values to set your project thresholds. These values are inclusive.
- `props`: Is for the number of properties a component is passed
- `stateHooks`: For the number of `useState()` state hooks are being used inside of a component
- `imports`: For the number of `import` statements are present in a component file
- `lines`: For the number of lines in a component file

Change the `outputFileName` to modify the name of the file that is output after running thyloSniffer.

Change the `checkDirectory` to point to where your components are held in your project folder.

Change the `onlyShowFailed` flag to `true` and it will only output the components that have failed any of the tests. Setting it to `false` will output all of the components.

### .thyloIgnore

Add any files or directories that you want ignored to the `.thyloIgnore` file.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
