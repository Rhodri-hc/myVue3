/**
* @desc keepAlive组件实现
* @author 张和潮
* @date 2022年07月01日 11:53:25
*/
const KeepAlive = {
    // KeepAlive 组件独有的属性，用作标识
    __isKeepAlive: true,
    // 定义 include 和 exclude
    props:{
        include: RegExp,
        exclude: RegExp
    },
    setup(props, { slots }){
        // 创建一个缓存对象
        // key: vnode.type
        // value: vnode
        const cache = new Map()

        // 当前 KeepAlive 组件的实例
        const instance = currentInstance

        // 对于 KeepAlive 组件来说，他的实例上存在特殊的 keepAliveCtx 对象，该对象有渲染器注入
        // 该对象会暴露渲染器的一些内部方法，其中 move 函数用来将一段 dom 移动到另一个容器中
        const { move, createElement } = instance.keepAliveCtx

        // 创建隐藏容器
        const storageContainer = createElement('div');

        // KeepAlive 组件的实力上会被添加两个内部函数，分别是 _deActivate 和 _activate
        // 这两个函数会在渲染器中被调用
        instance._deActivate = ( vnode ) => {
            move(vnode, storageContainer)
        }
        instance._activate = (vnode, container, anchor) => {
            move(vnode, container, anchor)
        }

        return () => {
            // KeepAlive 的默认插槽就是要被KeepAlive 的组件
            let rawVNode = slots.default()
            // 如果不是组件，直接渲染即可，因为非组件的虚拟节点无法被 KeepAlive
            if (typeof rawVNode.type !== 'object') {
                return rawVNode
            }

            // 获取 “内部组件” 的name
            const name = rawVNode.type.name;
            // 对 name 进行匹配
            if (
                name &&
                (
                    // 如果name无法被include 匹配
                    (props.include && !props.include.test(name)) || 
                    // 或者被exclude 匹配
                    (props.exclude && props.exclude.test(name))
                )
            ) {
                // 则直接渲染 “内部组件”，不对其进行后续的缓存操作
                return rawVNode
            }

            // 在挂载时先获取缓存的组件 vnode
            const cacheVNode = cache.get(rawVNode.type)
            if (cacheVNode) {
                // 如果有缓存内容，则说明不应该执行挂载，而应该被执行激活
                // 继承组件实例
                rawVNode.component = cacheVNode.component
                
                // 在vnode 上添加 keptAlive 属性，标记为 true，避免渲染器重新挂载他
                rawVNode.keptAlive = true;
            } else {
                // 如果没有缓存，则将其添加到缓存中，这样下去激活组件是就不会执行新的挂载动作了
                cache.set(rawVNode.type, rawVNode)
            }

            // 在组件 vnode 上添加 shouldKeepAlive 属性，并编辑为true，避免渲染器真的将组件卸载
            rawVNode.shouldKeepAlive = true;
            // 将 KeepAlive 组件的实例也添加到 vnode 上，以便在渲染器中访问
            rawVNode.keepAliveInstance = instance;

            // 渲染组件
            return rawVNode;
        } 
    }
}