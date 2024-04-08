/*
 使用内存存储最近的代码补全结果
*/

type CacheItem = {
    value: any;
    timestamp: number;
};

class MemoryCacheManager {
    private static maxCapacity: number = 5;
    private cache: Map<string, CacheItem>;

    constructor() {
        this.cache = new Map<string, CacheItem>();
    }

    /**
     * 添加或更新缓存
     */
    set(key: string, value: any): void {
        // 首先检查缓存中是否已经有了该键值对，若有，则更新；若没有，则添加
        if (this.cache.has(key)) {
            this.cache.set(key, { value, timestamp: Date.now() });
        } else {
            // 先确保缓存没有超出最大容量
            if (this.cache.size >= MemoryCacheManager.maxCapacity) {
                this.evict();
            }
            this.cache.set(key, { value, timestamp: Date.now() });
        }
    }

    /**
     * 获取缓存
     */
    get(key: string): any | undefined {
        const item = this.cache.get(key);
        if (item) {
            // 更新timestamp以反映最近一次访问
            item.timestamp = Date.now();
            return item.value;
        }
        return undefined;
    }

    /**
     * 删除指定的缓存项
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * 依据时间顺序（最久未使用）删除缓存项
     */
    private evict(): void {
        let oldestKey: string | null = null;
        let oldestTimestamp: number = Infinity;

        for (const [key, item] of this.cache.entries()) {
            if (item.timestamp < oldestTimestamp) {
                oldestTimestamp = item.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey !== null) {
            this.cache.delete(oldestKey);
        }
    }
}

export default MemoryCacheManager;
