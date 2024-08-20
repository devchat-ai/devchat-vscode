import { logger } from './logger';
import { ApiKeyManager } from './apiKey';
import axios from "axios";
import * as fs from 'fs'



class WebappUtil {
	private static instance: WebappUtil;
	private baseUrl: string | undefined;
	private accessKey: string | undefined;
	private webappUrl: string | undefined;
	private devchatIconUrl: string | undefined;

	constructor() {
	}

	public static getInstance(): WebappUtil {
		if (!WebappUtil.instance) {
		WebappUtil.instance = new WebappUtil();
		}
		return WebappUtil.instance;
	}

	async fetchWebappUrl() {
		try {
			if (!this.baseUrl || !this.accessKey) {
				const llmModelData = await ApiKeyManager.llmModel()
				this.baseUrl = llmModelData.api_base;
				this.accessKey = llmModelData.api_key;
			}
			const res = await axios.get(
			`${this.baseUrl}/addresses/webapp`,
			{ headers: { 'Authorization': `Bearer ${this.accessKey}` }}
			)
			const urlOrPath = res?.data;
			if (!urlOrPath) {
			throw new Error("No webapp url found");
			}
			let href = "";
			if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
			href = urlOrPath;
			} else {
			href = new URL(urlOrPath, this.baseUrl).href
			}
			if (href.endsWith('/')) {
			href = href.slice(0, -1);
			}
			if (href.endsWith('/api')) {
			href = href.slice(0, -4);
			}
			console.log('Webapp url: ', href)
			return href;
		} catch (err) {
			throw(`Error fetch webapp url: ${err}`)
		}
	}

	async fetchIconUrl(prefix: string) {
		if (this.devchatIconUrl) return this.devchatIconUrl
		try {
			if (!this.webappUrl) this.webappUrl = await this.fetchWebappUrl();
			const res = await axios.get(
				`${this.webappUrl}/api/v1/plugin/icons/filename/${prefix}`,
				{headers: { Authorization: `Bearer ${this.accessKey}` }}
			)
			this.devchatIconUrl = `${this.webappUrl}/api/v1/plugin/icons/${res?.data?.filename}`
		} catch(err) {
			console.error(err);
			return "unknown";
		}
		return this.devchatIconUrl
	}

	async updateIcon(prefix: string, outfile: string) {
		try {
			const iconUrl = await this.fetchIconUrl(prefix)
			const res = await axios.get(iconUrl, {responseType: 'stream'})
			const writer = fs.createWriteStream(outfile);
			await res.data.pipe(writer);
		} catch (error: any) {
			logger.channel()?.error(`Error occurred while fetching devchat icon: ${error.message}`);
		}
	}

}

export default WebappUtil.getInstance();
