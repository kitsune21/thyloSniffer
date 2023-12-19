const fs = require('fs')
const path = require('path')
const userConfig = require('./thylo-config.json')

function thyloSniffer() {
  console.log('Starting to sniff around...')
  const config = { ...defaultConfig, ...userConfig }
  const thresholds = config.thresholds
  const directory = config.checkDirectory
  let totalNumberOfComponents = 0
  let totalNumberOfFailedComponents = 0
  const outputFilePath = path.join(__dirname, `${config.outputFileName}.thylo`)
  fs.writeFileSync(outputFilePath, '')

  const ignorePatterns = loadIgnorePatterns()

  function analyzeComponent(filePath, outputFilePath) {
    const fileName = path.basename(filePath)

    if (!shouldIgnoreFile(fileName, ignorePatterns)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const componentNameMatches = content.match(/const\s(\w+)\s?=/)
      const propMatches = content.match(/\(\s?{([^}]*)}\s?\)/)
      const lines = content.split('\n').length
      const useStateMatches = content.match(/useState\s?\(/g)
      const importMatches = content.match(/import /g)
      const fileName = path.basename(filePath, '.jsx')
      const relativePath = path.relative(directory, filePath)
      totalNumberOfComponents += 1

      if (componentNameMatches && componentNameMatches[1]) {
        const componentName = componentNameMatches[1]
        const props =
          propMatches?.length > 0
            ? propMatches[1].split(',').map((prop) => prop.trim())
            : 0

        const output = `#${totalNumberOfComponents} \\${relativePath} | ${componentName} ${
          fileName !== componentName
            ? '>>>> File name does not match component name'
            : ''
        }  
        Lines = ${lines} ${
          lines >= thresholds.lines
            ? '>>>> ' + thresholds.lines + ' or more lines'
            : ''
        }
        Props = ${countArray(props)} ${
          props?.length >= thresholds.props
            ? '>>>> ' + thresholds.props + ' or more props'
            : ''
        }
        State Hooks = ${countArray(useStateMatches)} ${
          useStateMatches?.length >= thresholds.stateHooks
            ? '>>>> ' + thresholds.stateHooks + ' or more useState hooks'
            : ''
        } 
        Imports = ${countArray(importMatches)} ${
          importMatches?.length >= thresholds.imports
            ? '>>>> ' + thresholds.imports + ' or more imports'
            : ''
        }\n`

        if (
          config.onlyShowFailed &&
          (fileName !== componentName ||
            lines >= thresholds.lines ||
            props?.length >= thresholds.props ||
            useStateMatches?.length >= thresholds.stateHooks ||
            importMatches?.length >= thresholds.imports)
        ) {
          totalNumberOfFailedComponents += 1
          fs.appendFileSync(outputFilePath, output)
        } else if (!config.onlyShowFailed) {
          fs.appendFileSync(outputFilePath, output)
        }
      }
    }
  }

  function analyzeDirectory(dirPath) {
    fs.readdirSync(dirPath).forEach((file) => {
      const fullPath = path.join(dirPath, file)
      const isDirectory = fs.statSync(fullPath).isDirectory()
      const fileName = path.basename(fullPath)

      if (!shouldIgnoreFile(fileName, ignorePatterns)) {
        if (isDirectory) {
          analyzeDirectory(fullPath)
        } else if (file.endsWith('.jsx')) {
          analyzeComponent(fullPath, outputFilePath)
        }
      }
    })
  }

  analyzeDirectory(directory)

  if (config.onlyShowFailed) {
    fs.appendFileSync(
      outputFilePath,
      `\nTotal Number of Failed Components: ${totalNumberOfFailedComponents}/${totalNumberOfComponents}`,
    )
  } else {
    fs.appendFileSync(
      outputFilePath,
      `\nTotal Number of Components: ${totalNumberOfComponents}`,
    )
  }
}

function loadIgnorePatterns() {
  const ignoreFilePath = path.join(__dirname, '.thyloIgnore')
  try {
    const ignoreFileContent = fs.readFileSync(ignoreFilePath, 'utf-8')
    return ignoreFileContent
      .split('\n')
      .filter((pattern) => pattern.trim() !== '')
  } catch (error) {
    // Handle errors or return an empty array if the file doesn't exist
    return []
  }
}

function shouldIgnoreFile(filePath, ignorePatterns) {
  const fileName = path.basename(filePath)
  const fullPath = path.resolve(filePath)

  return ignorePatterns.some((pattern) => {
    const regex = new RegExp(
      pattern.replace(/[*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '/'),
    )
    return regex.test(fileName) || regex.test(fullPath)
  })
}

function countArray(array) {
  return array?.length > 0 ? array.length : 0
}

const defaultConfig = {
  thresholds: { props: 4, stateHooks: 5, imports: 5, lines: 200 },
  outputFileName: 'Thylo-Sniff-Test-Results.thylo',
  checkDirectory: './src/',
  onlyShowFailed: true,
}

thyloSniffer()
console.log('Sniffing complete!')
