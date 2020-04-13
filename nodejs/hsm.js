const commonPKCSPaths = [
	'/usr/lib/softhsm/libsofthsm2.so',								// Ubuntu
	'/usr/lib/x86_64-linux-gnu/softhsm/libsofthsm2.so',				// Ubuntu  apt-get install
	'/usr/local/lib/softhsm/libsofthsm2.so'						// Ubuntu, OSX (tar ball install)
];
const fs = require('fs');
exports.availablePKCSLibs = commonPKCSPaths.filter((lib) => fs.existsSync(lib));
