# Create a markdown file with the content

md_content = """

# 使用 Pinia 实现多窗口数据同步

在现代 Web 开发中，许多应用程序需要支持多窗口之间的数据同步。这种需求在多个标签页或者浏览器窗口中更新相同的状态时尤为重要，尤其是对于需要实时共享数据的应用（例如，聊天应用、协作编辑工具等）。

本文将介绍如何通过 Pinia 实现跨窗口的数据同步，而不依赖于 `window.addEventListener` 来监听 `storage` 事件。我们将创建一个 Pinia 插件，使得不同窗口或标签页中的 Pinia store 能够自动同步它们的状态。

## 1. 需求背景

在多窗口或标签页场景下，我们希望以下行为：

- **跨窗口同步**：当某一个窗口修改了 Pinia store 的数据，其他窗口能自动同步到最新状态。
- **避免重复操作**：在同一个窗口内避免多次更新状态，提高性能。
- **防抖机制**：避免过于频繁的状态同步操作。

## 2. 实现思路

我们通过以下几个步骤实现跨窗口数据同步：

- **状态存储到 `localStorage`**：每个窗口的 Pinia store 状态会存储到 `localStorage` 中，因为 `localStorage` 会在不同窗口/标签页之间共享。
- **防抖机制**：通过防抖机制避免频繁的状态更新操作，提高性能。
- **标记源窗口和接受窗口**：我们通过标记当前窗口是“源窗口”（正在修改数据的窗口）还是“接受窗口”（接收其他窗口数据的窗口），避免一个窗口触发自己进行同步。
- **Pinia 插件机制**：使用 Pinia 插件扩展每个 store，自动处理状态同步。

## 3. 代码实现

### 3.1 插件代码

首先，我们需要创建一个 Pinia 插件来实现状态同步功能。插件会监听 store 状态的变化并将其同步到 `localStorage`，同时从 `localStorage` 获取状态更新其他窗口中的 store。

````ts
import { type PiniaPluginContext } from 'pinia';

/**
 * @description: 不同 Pinia 实例的数据同步插件
 * @Date: 2024-10-23 15:47:49
 */
export default function storageSyncPlugin(params: PiniaPluginContext) {
    const { store, options } = params;
    // 检查是否启用同步（synchronization）
    if (!options.synchronization) return;

    const syncKey = `pinia_${store.$id}`; // 使用 store 的 id 作为 localStorage 的键名
    const sourceKey = `pinia_${store.$id}_sourceWindow`; // 标记当前更改源窗口
    const acceptorKey = `pinia_${store.$id}_acceptorWindow`; // 标记接受源窗口
    let debounceTimer: NodeJS.Timeout | null = null; // 用于防抖的定时器

    // 检查是否已经有更改源存在，如果没有设置为当前窗口
    const isSourceWindow = () => {
        return localStorage.getItem(sourceKey) === window.location.href;
    };

    // 标记当前窗口为更改源
    const markAsSource = () => {
        if (!localStorage.getItem(sourceKey)) {
            localStorage.setItem(sourceKey, window.location.href);
            localStorage.setItem(acceptorKey, 'false'); // 标记为接受源
        }
    };

    // 标记当前窗口为接受源
    const markAsAcceptor = () => {
        if (isSourceWindow()) return;
        localStorage.setItem(acceptorKey, 'true'); // 当前窗口是接受源
        localStorage.removeItem(sourceKey); // 清除更改源标记
    };

    // 将 Pinia 状态存储到 localStorage 中
    const syncStateToStorage = (state: any) => {
        const newState = JSON.stringify(state);
        localStorage.setItem(syncKey, newState);
    };

    // 监听 store 状态变化并同步到 localStorage
    store.$subscribe((mutation, state) => {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
            markAsSource(); // 标记为更改源
            syncStateToStorage(state); // 同步状态到 localStorage
            markAsAcceptor(); // 其他窗口会成为接受源
        }, 300); // 设置防抖延迟（单位：毫秒）
    });

    // 如果 localStorage 中有存储的数据，初始化状态
    const storedState = localStorage.getItem(syncKey);
    if (storedState) {
        store.$patch(JSON.parse(storedState));
    }

    // 初始时标记当前窗口为接受源
    if (!isSourceWindow()) {
        markAsAcceptor();
    }
}


# Pinia Sync Plugin

This plugin synchronizes the state of different Pinia stores across multiple windows.

## Installation

You can install this plugin using npm:

```bash
npm install pinia-sync-plugin
pnpm add pinia-sync-plugin
yarn add pinia-sync-plugin
```
````
