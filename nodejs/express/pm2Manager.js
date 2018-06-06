const pm2 = require('pm2');
const logger = require('../logger').new('pm2 Manager');
exports.PM2 = class {
	constructor() {

	}

	async connect() {
		await new Promise((resolve, reject) => {
			pm2.connect(err => {
				if (err) reject(err);
				resolve();
			});
		});
		return this;
	}

	disconnect() {
		pm2.disconnect();
	}

	async run({name, script, env}) {
		let process = await this.get({name});
		if (process) {
			logger.warn(`process ${name} exist`);
		} else {
			process = await new Promise((resolve, reject) => {
				pm2.start({name, script, env}, (err, process) => {
					if (err) {
						logger.error(err);
						reject(err);
					}
					resolve(process);
				});
			});
			logger.info(`process ${name} started`);
		}
		return process;
	}

	async delete({name}) {
		const process = await this.get({name});
		if (!process) {
			logger.warn(`process ${name} not exist, delete skipped`);
		} else {
			await new Promise((resolve, reject) => {
				pm2.delete(name, (err) => {
					if (err) reject(err);
					resolve();
				});
			});
		}
		return process;
	}

	async list() {
		return await new Promise((resolve, reject) => {
			pm2.list((err, list) => {
				if (err) reject(err);
				resolve(list);
			});
		});
	}

	async get({name}) {
		const list = await this.list();
		return list.find(({name: pName}) => pName === name);
	}
};
