import { type PiniaPluginContext } from 'pinia'
/**
 * @description: 不同pinia实例的数据同步
 * @Date: 2024-10-23 15:47:49
 */

export default function storageSyncPlugin(params: PiniaPluginContext) {
    const { store, options } = params
    // 检查是否启用同步（synchronization）
    if (!options.synchronization) return
    const syncKey = `pinia_${store.$id}` // 使用 store 的 id 作为 localStorage 的键名
    const sourceKey = `pinia_${store.$id}_sourceWindow` // 标记当前更改源窗口
    const acceptorKey = `pinia_${store.$id}_acceptorWindow` // 标记接受源窗口
    let debounceTimer: null | NodeJS.Timeout = null // 用于防抖的定时器

    // 检查是否已经有更改源存在，如果没有设置为当前窗口
    const isSourceWindow = () => {
        return localStorage.getItem(sourceKey) === window.location.href
    }

    // 标记当前窗口为更改源
    const markAsSource = () => {
        // 只有在没有更改源时才设置当前窗口为更改源
        if (!localStorage.getItem(sourceKey)) {
            localStorage.setItem(sourceKey, window.location.href) // 使用窗口的 URL 来唯一标识
            localStorage.setItem(acceptorKey, 'false') // 标记为接受源
        }
    }

    // 标记当前窗口为接受源
    const markAsAcceptor = () => {
        // 如果当前是更改源窗口，则不进行接受源的操作
        if (isSourceWindow()) return

        localStorage.setItem(acceptorKey, 'true') // 当前窗口是接受源
        localStorage.removeItem(sourceKey) // 清除更改源标记
    }

    // 监听 storage 事件来更新其他窗口的数据
    window.addEventListener('storage', (event) => {
        if (event.key === syncKey && event.newValue) {
            // 如果当前窗口是更改源，忽略同步
            if (isSourceWindow()) return

            // 如果当前窗口是接受源，进行同步
            const newState = JSON.parse(event.newValue)
            // 更新 Pinia 状态前，确保新旧状态有所不同，避免无意义的更新
            if (JSON.stringify(store.$state) !== JSON.stringify(newState)) {
                store.$patch(newState) // 更新 Pinia 状态
            }
        }
    })

    // 将 Pinia 状态存储到 localStorage 中，避免每次都存储
    store.$subscribe((mutation: any, state: any) => {
        // 使用防抖机制，避免每次状态变化都立刻触发存储
        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }

        debounceTimer = setTimeout(() => {
            // 标记当前窗口为更改源
            markAsSource()

            const newState = JSON.stringify(state)
            localStorage.setItem(syncKey, newState) // 存储到 localStorage 中

            // 清除更改源标记，其他窗口就会变为接受源
            markAsAcceptor()
        }, 300) // 设置防抖时间间隔（例如 300 毫秒）
    })

    // 如果 localStorage 中有存储的数据，初始化状态
    const storedState = localStorage.getItem(syncKey)
    if (storedState) {
        store.$patch(JSON.parse(storedState))
    }

    // 初始时标记当前窗口为接受源（除非它已经是更改源）
    if (!isSourceWindow()) {
        markAsAcceptor()
    }
}
