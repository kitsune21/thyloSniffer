const fs = require("fs");
const path = require("path");
const userConfig = require("./thylo-config.json");

function thyloSniffer() {
  const config = { ...userConfig };
  const thresholds = config.thresholds;
  const directory = config.checkDirectory;
  const ignorePatterns = loadIgnorePatterns();
  const outputFilePath = path.join(__dirname, `${config.outputFileName}.thylo`);

  fs.writeFileSync(outputFilePath, "");

  let totalNumberOfComponents = 0;
  let totalNumberOfFailedComponents = 0;

  function analyzeComponent(filePath) {
    const fileBaseName = path.basename(filePath);

    if (shouldIgnoreFile(fileBaseName, ignorePatterns)) return;

    const content = fs.readFileSync(filePath, "utf-8");
    const componentMatches = content.match(
      /const\s([A-Z][a-zA-Z]*)\s?=\s?\([^)]*\)\s?=>\s?{/g
    );
    const lines = content.split("\n").length;
    const importMatches = content.match(/import /g);
    const fileName = path.basename(filePath, ".jsx");
    const relativePath = path.relative(directory, filePath);
    totalNumberOfComponents += componentMatches ? componentMatches.length : 0;

    if (componentMatches) {
      componentMatches.forEach((componentMatch, index) => {
        const componentNameMatch = componentMatch.match(/const\s(\w+)\s?=/);
        const componentName = componentNameMatch ? componentNameMatch[1] : "";
        const componentStartIndex = content.indexOf(componentMatch);
        const componentEndIndex =
          index < componentMatches.length - 1
            ? content.indexOf(componentMatches[index + 1])
            : content.length;

        const componentContent = content.substring(
          componentStartIndex,
          componentEndIndex
        );

        const totalNumberOfProps = analyzeProps(componentContent);

        const useStateMatches = componentContent.match(/useState\s?\(/g);

        processOutput(
          relativePath,
          componentName,
          fileName,
          lines,
          totalNumberOfProps,
          useStateMatches,
          importMatches
        );
      });
    }
  }

  function analyzeDirectory(dirPath) {
    fs.readdirSync(dirPath).forEach((file) => {
      const fullPath = path.join(dirPath, file);
      const isDirectory = fs.statSync(fullPath).isDirectory();
      const fileName = path.basename(fullPath);

      if (!shouldIgnoreFile(fileName, ignorePatterns)) {
        if (isDirectory) {
          analyzeDirectory(fullPath);
        } else if (file.endsWith(".jsx")) {
          analyzeComponent(fullPath, outputFilePath);
        }
      }
    });
  }

  function analyzeProps(componentContent) {
    const propMatches = componentContent.match(
      /(?<==\s*\({\s*)((?:(...)?\w+\s*,?\s*)*)(?=\s*}\)\s*=>\s*)/g
    );

    let totalNumberOfProps = 0;
    if (propMatches) {
      totalNumberOfProps += propMatches[0]
        .replace(/\s+/g, "")
        .split(",")
        .filter((entry) => entry.trim() !== "").length;
    } else {
      const propMatchesDeconstructedProps = componentContent.match(
        /(?<=const\s*{\s*)((?:\w+\s*,\s*)*)(?=\s*}\s*=\s*props\s*)/g
      );
      if (propMatchesDeconstructedProps) {
        totalNumberOfProps += propMatchesDeconstructedProps[0]
          .replace(/\s+/g, "")
          .split(",")
          .filter((entry) => entry.trim() !== "").length;
      }
    }

    return totalNumberOfProps;
  }

  function processOutput(
    relativePath,
    componentName,
    fileName,
    lines,
    totalNumberOfProps,
    useStateMatches,
    importMatches
  ) {
    const fileNameOutput = `#${totalNumberOfComponents} \\${relativePath} | ${componentName} ${
      fileName !== componentName
        ? `${config.thresholdExceededPrefix}File name does not match component name`
        : ""
    }\n`;

    const linesOutput = `Lines = ${lines} ${
      lines >= thresholds.lines
        ? `${config.thresholdExceededPrefix}Threshold of ${thresholds.lines} has been met or exceeded`
        : ""
    }\n`;

    const propsOutput = `Props = ${totalNumberOfProps} ${
      totalNumberOfProps >= thresholds.props
        ? `${config.thresholdExceededPrefix}Threshold of ${thresholds.props} has been met or exceeded`
        : ""
    }\n`;

    const stateHooksOutput = `State Hooks = ${countArray(useStateMatches)} ${
      useStateMatches?.length >= thresholds.stateHooks
        ? `${config.thresholdExceededPrefix}Threshold of ${thresholds.stateHooks} has been met or exceeded`
        : ""
    }\n`;

    const importsOutput = `Imports = ${countArray(importMatches)} ${
      importMatches?.length >= thresholds.imports
        ? `${config.thresholdExceededPrefix}Threshold of ${thresholds.imports} has been met or exceeded`
        : ""
    }\n`;

    const output = `${fileNameOutput}${importsOutput}${propsOutput}${stateHooksOutput}${linesOutput}\n`;

    if (
      config.onlyShowFailed &&
      (fileName !== componentName ||
        lines >= thresholds.lines ||
        totalNumberOfProps >= thresholds.props ||
        useStateMatches?.length >= thresholds.stateHooks ||
        importMatches?.length >= thresholds.imports)
    ) {
      totalNumberOfFailedComponents += 1;
      fs.appendFileSync(outputFilePath, output);
    } else if (!config.onlyShowFailed) {
      fs.appendFileSync(outputFilePath, output);
    }
  }

  analyzeDirectory(directory);

  if (config.onlyShowFailed) {
    fs.appendFileSync(
      outputFilePath,
      `\nTotal Number of Failed Components: ${totalNumberOfFailedComponents}/${totalNumberOfComponents}`
    );
  } else {
    fs.appendFileSync(
      outputFilePath,
      `\nTotal Number of Components: ${totalNumberOfComponents}`
    );
  }
}

function loadIgnorePatterns() {
  const ignoreFilePath = path.join(__dirname, ".thyloIgnore");
  try {
    const ignoreFileContent = fs.readFileSync(ignoreFilePath, "utf-8");
    return ignoreFileContent
      .split("\n")
      .filter((pattern) => pattern.trim() !== "");
  } catch (error) {
    return [];
  }
}

function shouldIgnoreFile(filePath, ignorePatterns) {
  const fileName = path.basename(filePath);
  const fullPath = path.resolve(filePath);

  return ignorePatterns.some((pattern) => {
    const regex = new RegExp(
      pattern.replace(/[*+?^${}()|[\]\\]/g, "\\$&").replace(/\//g, "/")
    );
    return regex.test(fileName) || regex.test(fullPath);
  });
}

function countArray(array) {
  return array?.length > 0 ? array.length : 0;
}

console.log("Starting to sniff around...");
thyloSniffer();
console.log("Sniffing complete!");
