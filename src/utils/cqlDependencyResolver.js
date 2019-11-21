const { promises: fs } = require("fs");
const path = require('path');

/**
 * Find all CQL files that the given file is dependent on. CQL files are searched for in the same
 * directory as the given file.
 *
 * @param {string} cqlFilePath Path to the cql file.
 *
 * @returns {Promise<Array<string>>} List of dependent CQL Files.
 */
const findDependentCQLFiles = async (cqlFilePath) => {
  // enumerate all CQL files in the same directory to find their identifiers and include statements
  const cqlIdentifiers = await enumerateCQLFilesIdentifiers(path.dirname(cqlFilePath));
  
  // list all dependencies for main library and any recursive dependencies
  return Array.from(listDependentCQLFiles(cqlFilePath, cqlIdentifiers))
};

const listDependentCQLFiles = (cqlFilePath, cqlIdentifiers) => {
  const libraryInfo = cqlIdentifiers.find((id) => id.path == cqlFilePath);

  const dependentCqlFiles = new Set()
  // iterate over using statements identifiers
  libraryInfo.usingIdentifiers.forEach(usingIdentifier => {
    // find file for this identifier
    const dependentIdentifier = cqlIdentifiers.find((id) => id.name == usingIdentifier.name && id.version == usingIdentifier.version)
    if (dependentIdentifier == null) {
      throw new Error(`Could not find library ${usingIdentifier.name} version '${usingIdentifier.version}' referenced in ${path.basename(cqlFilePath)}`);
    }
    dependentCqlFiles.add(dependentIdentifier.path)
    // grab files that this identifier needs
    const dependentFiles = listDependentCQLFiles(dependentIdentifier.path, cqlIdentifiers);
    // add dependencies to overall list
    dependentFiles.forEach(dependentCqlFiles.add, dependentCqlFiles)
  });

  return dependentCqlFiles;
}

const enumerateCQLFilesIdentifiers = async (cqlDirPath) => {
  let enumeratedCQLIdentifiers = [];
  // list cql files in dir
  const cqlFiles = (await fs.readdir(cqlDirPath)).filter(f => f.endsWith('.cql'))

  // read each cql file to grab the identifiers
  for (let i = 0; i < cqlFiles.length; i++) {
    const cqlFile = (await fs.readFile(path.join(cqlDirPath,cqlFiles[i]))).toString()
    const libraryRegex = /library (.+) version '(.+)'/gm
    const libraryStatement = libraryRegex.exec(cqlFile)
    let libraryIdentifier = {name: libraryStatement[1], version: libraryStatement[2], path: path.join(cqlDirPath,cqlFiles[i])}

    const includeRegex = /include (.+) version '(.+)'/gm
    libraryIdentifier.usingIdentifiers = []
    let usingStatement;
    while (usingStatement = includeRegex.exec(cqlFile)) {
      libraryIdentifier.usingIdentifiers.push({name: usingStatement[1], version: usingStatement[2]})
    }

    enumeratedCQLIdentifiers.push(libraryIdentifier) 
  }

  return enumeratedCQLIdentifiers;
};

module.exports = {
  findDependentCQLFiles,
}