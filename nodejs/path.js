const path = require('path');
const fsExtra = require('fs-extra');
const {findKeyFiles} = require('khala-fabric-formatter/path');
const {ECDSA_PrvKey, ECDSA_Key} = require('khala-fabric-formatter/key');

/**
 * @class
 */
class CryptoPath {
	constructor(rootPath, {orderer, peer, user, password} = {}) {
		this.password = password;
		if (orderer) {
			this.ordererOrgName = orderer.org;
			this.ordererName = orderer.name;
			if (orderer.name && orderer.org) {
				this.ordererHostName = `${orderer.name}.${orderer.org}`;
			}
		}
		if (peer) {
			this.peerOrgName = peer.org;
			this.peerName = peer.name;
			if (peer.name && peer.org) {
				this.peerHostName = `${peer.name}.${peer.org}`;
			}
		}
		if (user) {
			this.userName = user.name;
			if (this.ordererOrgName) {
				this.ordererUserHostName = `${this.userName}@${this.ordererOrgName}`;
			}
			if (this.peerOrgName) {
				this.peerUserHostName = `${this.userName}@${this.peerOrgName}`;
			}
		}

		this.root = rootPath;
	}

	setReact(react) {
		this.react = react;
		return this;
	}

	resolve(...tokens) {
		const result = path.resolve(...tokens);
		const dir = path.dirname(result);
		switch (this.react) {
			case 'throw':
				if (!fsExtra.pathExistsSync(dir)) {
					throw new Error(`${dir} not exist`);
				}
				break;
			case 'mkdir':
				fsExtra.ensureDirSync(dir);
				break;
			default:
		}
		return result;
	}

	ordererOrg() {
		return this.resolve(this.root, 'ordererOrganizations', this.ordererOrgName);
	}

	/**
	 * used in generate configtxgen config yaml
	 * @return {string}
	 */
	ordererOrgMSP() {
		return this.resolve(this.ordererOrg(), 'msp');
	}

	peerOrg() {
		return this.resolve(this.root, 'peerOrganizations', this.peerOrgName);
	}

	/**
	 * reply on functions {@link peerOrg}, {@link ordererOrg}
	 * reply on properties {@link peerOrgName}, {@link ordererOrgName}
	 * @param {NodeType} nodeType
	 */
	OrgFile(nodeType) {
		const dir = this[`${nodeType}Org`]();
		const mspDir = this.resolve(dir, 'msp');
		const caCertBaseName = `ca.${this[`${nodeType}OrgName`]}-cert.pem`;
		const tlscaCertBaseName = `tls${caCertBaseName}`;
		return {
			ca: this.resolve(dir, 'ca', caCertBaseName),
			msp: {
				admincerts: this.resolve(mspDir, 'admincerts', `${this[`${nodeType}UserHostName`]}-cert.pem`),
				cacerts: this.resolve(mspDir, 'cacerts', caCertBaseName),
				tlscacerts: this.resolve(mspDir, 'tlscacerts', tlscaCertBaseName)
			},
			peers: this.resolve(dir, 'peers'),
			tlsca: this.resolve(dir, 'tlsca', tlscaCertBaseName),
			users: this.resolve(dir, 'users')
		};
	}

	/**
	 *
	 * @param {MSPType} type
	 * @return {string}
	 */
	static getNodeType(type) {
		return type.includes('orderer') ? 'orderer' : 'peer';
	}

	/**
	 * reply on {@link MSP}
	 * @param {MSPType} type
	 */
	MSPFile(type) {
		const nodeType = CryptoPath.getNodeType(type);
		const mspDir = this.MSP(type);
		const caCertBaseName = `ca.${this[`${nodeType}OrgName`]}-cert.pem`;
		const tlscaCertBaseName = `tls${caCertBaseName}`;

		return {
			admincerts: this.resolve(mspDir, 'admincerts', `${this[`${nodeType}UserHostName`]}-cert.pem`),
			cacerts: this.resolve(mspDir, 'cacerts', caCertBaseName),
			tlscacerts: this.resolve(mspDir, 'tlscacerts', tlscaCertBaseName),
			keystore: this.resolve(mspDir, 'keystore'),
			signcerts: this.resolve(mspDir, 'signcerts', `${this[`${type}HostName`]}-cert.pem`)
		};
	}

	/**
	 * used in generate configtxgen config yaml
	 * @return {string}
	 */
	peerOrgMSP() {
		return this.resolve(this.peerOrg(), 'msp');
	}

	orderers() {
		return this.resolve(this.ordererOrg(), 'orderers');
	}

	ordererUsers() {
		return this.resolve(this.ordererOrg(), 'users');
	}

	peers() {
		return this.resolve(this.peerOrg(), 'peers');
	}

	peerUsers() {
		return this.resolve(this.peerOrg(), 'users');
	}

	/**
	 * @param {MSPType} type
	 */
	tlsDir(type) {
		return this.resolve(this[`${type}s`](), this[`${type}HostName`], 'tls');
	}

	/**
	 *
	 * @param {MSPType} type
	 */
	TLSFile(type) {
		const tlsDIR = this.tlsDir(type);
		return {
			caCert: this.resolve(tlsDIR, 'ca.crt'),
			cert: this.resolve(tlsDIR, 'server.crt'),
			key: this.resolve(tlsDIR, 'server.key')
		};
	}

	/**
	 *
	 * @param {MSPType} type
	 */
	MSPKeystore(type) {
		const dir = this.MSPFile(type).keystore;
		const files = findKeyFiles(dir);
		if (files.length > 0) {
			return files[0];
		}
	}

	/**
	 *
	 * reply on {@link ordererUsers}, {@link peerUsers}, {@link orderers}, {@link peers}
	 * @param {MSPType} type
	 */
	MSP(type) {
		return this.resolve(this[`${type}s`](), this[`${type}HostName`], 'msp');
	}

	/**
	 *
	 * @param {MSPType} type
	 */
	cryptoExistLocal(type) {
		const signcerts = this.MSPFile(type).signcerts;
		if (!fsExtra.pathExistsSync(signcerts)) {
			return;
		}
		const keystore = this.MSPKeystore(type);
		if (!fsExtra.pathExistsSync(keystore)) {
			return;
		}
		return {keystore, signcerts};
	}

	toAdminCerts({certificate}, type) {
		const {admincerts} = this.MSPFile(type);
		fsExtra.outputFileSync(admincerts, certificate);
	}

	toMSP({key, certificate, rootCertificate}, type) {
		const {cacerts, keystore, signcerts} = this.MSPFile(type);
		fsExtra.outputFileSync(signcerts, certificate);
		const ecdsaPrvKey = new ECDSA_PrvKey(key, fsExtra);
		ecdsaPrvKey.toKeystore(keystore);
		fsExtra.outputFileSync(cacerts, rootCertificate);
	}

	toTLS({key, certificate, rootCertificate}, type) {
		const {caCert, cert, key: serverKey} = this.TLSFile(type);
		const {tlscacerts} = this.MSPFile(type);// TLS in msp folder
		const ecdsaKey = new ECDSA_Key(key, fsExtra);
		ecdsaKey.save(serverKey);
		fsExtra.outputFileSync(cert, certificate);
		fsExtra.outputFileSync(caCert, rootCertificate);
		fsExtra.outputFileSync(tlscacerts, rootCertificate);
	}

	toOrgAdmin({certificate, rootCertificate}, nodeType) {
		const {ca, msp: {admincerts, cacerts}} = this.OrgFile(nodeType);

		fsExtra.outputFileSync(cacerts, rootCertificate);
		fsExtra.outputFileSync(ca, rootCertificate);
		fsExtra.outputFileSync(admincerts, certificate);
	}

	toOrgTLS({rootCertificate}, nodeType) {
		const {msp: {tlscacerts}, tlsca} = this.OrgFile(nodeType);
		fsExtra.outputFileSync(tlsca, rootCertificate);
		fsExtra.outputFileSync(tlscacerts, rootCertificate);
	}

}

exports.CryptoPath = CryptoPath;
