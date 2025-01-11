// src/types/pinia.d.ts
import { Pinia } from 'pinia'

declare module 'pinia' {
    // 扩展 Pinia Store Options 类型
    export interface DefineStoreOptionsBase {
        /**
         * @description: 启用不同pinia实例的数据同步
         * @Date: 2024-10-23 15:47:49
         */
        synchronization?: boolean;
    }
}
