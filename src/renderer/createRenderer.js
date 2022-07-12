/**
 * 渲染器的作用：把虚拟 DOM 对象渲染为真实的 DOM 元素。
 * 工作原理：递归遍历虚拟对象，并调用原生DOM API 来完成真实 DOM 的创建。
 *          更新的时候，会通过Diff算法找出变更点，并且只会更新需要更新的内容。
 * 
 */
// 文本节点的 type 标识
var Text = Symbol();
// 注释节点的 type 标识
var Comment = Symbol();
// Fragment 片段的 type 标识
var Fragment = Symbol();

// 定义全局变量，存储当前正在被初始化的组件实例
let currentInstance = null;
// 该方法接收组件实例作为参数，并将该实例设置为 currentInstance
function setCurrentInstance(instance){
    currentInstance = instance;
}

/**
* @desc 挂载函数
* @author 张和潮
* @date 2022年06月29日 23:08
*/
function onMounted(fn) {
    if (currentInstance) {
        // 将生命周期函数添加到 instance.mounted 数组
        currentInstance.mounted.push(fn);
    } else {
        console.error('onMounted 函数只能在 setup 中调用');
    }
}

// 定义一个组件
const MyComponent = {
    name: 'MyComponent',
    props: {
        title: String,

    },
    // 用data 函数来定义组件自身的状态
    data() {
        return {
            foo: 'hello world'
        }
    },
    created: function() {
      console.log(this.title);  
    },
    setup: function(props, { emit }){
        
        emit('change', 1, 2);

        return {
            
        }
    },
    // 组件渲染函数，其返回值必须为虚拟DOM
    render(){
      
        // 返回虚拟DOM
        // return [
        //     {
        //         type: 'header',
        //         children: [this.$slots.header()]
        //     },
        //     {
        //         type: 'div',
        //         children: [this.$slots.body()]
        //     },
        //     {
        //         type: 'footer',
        //         children: [this.$slots.footer()]
        //     },
        // ]
        return {
            type: 'div',
            children: `foo 的值是：${this.foo}`
        }
    }
}



// 浏览器渲染配置
const BROWSER_RENDER_CONFIG = {
    // 用于创建元素
    createElement(tag){
        return document.createElement(tag);
    },
    // 用于设置元素的文本节点
    setElementText(el, text){
        el.textContent = text;
    },
    // 创建文本节点
    createText(text){
        return document.createTextNode(text);
    },
    // 设置文本节点的文本
    setText(el, text){
        el.nodeValue = text;
    },
    // 用于在给定的parent 下添加指定元素
    // el 要插入节点， parent 父节点，anchor 被参照的节点（即要插在该节点之前）
    insert(el, parent, anchor = null){
        parent.insertBefore(el, anchor)
    },
    // 将属性设置相关操作封装到 patchProps函数中，并作为渲染器选项传递
    patchProps(el, key, prevValue, nextValue){
        // 事件处理
        if(/^on/.test(key)){
            // 获取未改元素伪造的事件处理函数 invoker
            // 定义 el._vei 为一个对象，存在事件名称到事件处理函数的映射
            const invokers = el._vei || (el._vei = {})
            // 根据事件名称获取 invoker
            let invoker = invokers[key]
            const name = key.slice(2).toLowerCase();

            if (nextValue) {
                if (!invoker) {
                    // 如果没有 invoker，则将一个伪造的invoker 缓存到 el._vei 中
                    // vei 是 vue event invoker的首字母缩写
                    // 将事件处理函数缓存到 el._vei[key]下，避免覆盖
                    invoker = el._vei[key] = (e) => {
                        // e.timeStamp 是事件发生的时间
                        // 如果事件发生的时间早于事件处理绑定的时间，则不执行时间处理函数
                        if (e.timeStamp < invoker.attached) {
                            return;
                        }

                        // 如果 invoker.value是数组，则遍历它，并逐个调用处理函数
                        if (Array.isArray(invoker.value)) {
                            invoker.value.forEach(fn => fn(e))
                        } else {
                            // 当伪造的时间处理函数执行时，会执行真正的事件处理函数
                            invoker.value(e)
                        }
                    }
                    // 将真正的事件处理函数赋值给 invoker.value
                    invoker.value = nextValue
                    // 添加invoker.attached 属性，存储事件处理函数被绑定的时间
                    invoker.attached = performance.now()
                    // 绑定 invoker 作为事件处理函数
                    el.addEventListener(name, invoker)
                }else {
                    // 如果 invoker 存在，意味着更新，并且只需要更新 invoker.value 的值即可
                    invoker.value = nextValue
                }
            } else if (invoker) {
                // 新的事件绑定函数不存在，且之前绑定的 invoker 存在，则移除绑定
                el.removeEventListener(name, invoker);
            }

        }
        // 对class 进行特殊处理
        else if (key === 'class') {
            // 在el.className setAttribute el.classList 中 el.className性能最好
            el.className = nextValue || '';
        }
        // 用 in 操作符判断key 是否存在对应的 DOM Properties
        else if (shouldSetAsProps(el, key, nextValue)) {
            // 获取该 DOM Properties 的类型
            const type = typeof el[key]

            // 如果是布尔类型，并且value 是空字符串，则将值矫正为true
            if (type === 'boolean' && nextValue === '') {
                el[key] = true;
            } else {
                el[key] = nextValue;
            }  
        }
        // 如果要设置的属性没有对应的 DOM Properties，则使用setAttribute 函数设置属性
        else {
            el.setAttribute(key, nextValue)
        }
    }
}

/**
* @desc 设置属性特殊处理
* @author 张和潮
* @date 2022年06月16日 16:41:56
*/
function shouldSetAsProps(el, key, value) {
    // 特殊处理
    if (key === 'form' && el.tagName === 'INPUT') {
        return false;
    }

    // 兜底
    return key in el
}

/**
* @desc 用于解析组件 props 和 attrs 数据
* @author 张和潮
* @date 2022年06月28日 21:40
*/
function resolveProps(options, propsData){
    const props = {};
    const attrs = {};

    // 遍历为组件传递的 props 数据
    for (const key in propsData) {
        // 以字符串 on 开头的props 无论受显示地声明，都将其添加到props 中
        if (key in options || key.startsWith('on')) {
            // 如果为组件传递的props 数据在组件自身的 props 选项中有定义，则将其视为合法的props
            props[key] = propsData[key];
        } else {
            // 否则将其作为 attrs
            attrs[key] = propsData[key];
        }
    }

    return [props, attrs];
}
/**
* @desc 判断props 是否发生改变
* @author 张和潮
* @date 2022年06月29日 23:35
*/
function hasPropsChange(prevProps, nextProps){
    const nextKeys = Object.keys(nextProps);
    // 如果新旧 props 的数量变了，则说明有变化
    if (nextKey.length !== Object.keys(prevProps).length) {
        return true;
    }

    for (let i = 0; i < nextKey.length; i++) {
        const key = nextKey[i];
        
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }

    return false
}


/**
* @desc 创建渲染器
* @params {Object} options 渲染配置
* @author 张和潮
* @date 2022年06月15日 22:03
*/
function createRenderer(options) {
    const { 
        createElement, 
        setElementText, 
        insert, 
        patchProps, 
        createText, 
        setText
    } = options;

    /**
    * @desc 卸载元素
    * @author 张和潮
    * @date 2022年06月16日 17:35:25
    */
    function unmount(vNode) {
        // 在卸载时，如果卸载的 vNode 类型为 Fragment, 则需要卸载其 children
        if (vNode.type === Fragment) {
            vNode.children.forEach(c => unmount(c));
            return;
        } else if(typeof vNode.type === 'object'){
            // vNode.shouldKeepAlive 是一个布尔值，用来表示该组件是否应该被 KeepAlive
            if (vNode.shouldKeepAlive) {
                // 对于需要被 KeepAlive 的组件，应调用该组件的父组件，
                // 即 KeepAlive 组件的 _deActivate 函数使其失活
                vNode.keepAliveInstance._deActivate(vNode)
            } else{
                // 对于组件的卸载，本质上市要卸载组件所渲染的内容，即 subTree
                unmount(vNode.component.subTree);
            }
            return;
        }


        // 获取 el 的父元素
        const parent = vNode.el.parentNode
        // 调用 removeChild 移除元素
        if (parent) {
            // 将卸载动作封装到 performRemove 函数中
           const performRemove = () => parent.removeChild(vNode.el);

           // 判断 vNode 是否需要过渡效果
           const needTransition = vNode.transition
           if (needTransition) {
             // 如果需要过渡处理，则调用 transition.leave 钩子
             // 同时将DOM 元素和 preformRemove 函数作为参数传递
             vNode.transition.leave(vNode.el, performRemove)
           } else {
             performRemove()
           }
        }
    }

    /**
    * @desc 挂载组件
    * @params { object } vnode 组件虚拟DOM
    * @params { object } container 挂载节点
    * @params { object } anchor 锚点
    * @author 张和潮
    * @date 2022年06月27日 23:28
    */
    function mountComponent(vnode, container, anchor){
        // 检查是否是函数式组件
        const isFunctional = typeof vnode.type === 'function'

        // 通过vnode 获取组件的选项对象，即 vnode.type
        const componentOptions = vnode.type;

        if (isFunctional) {
            // 如果是函数式组件，则将vnode.type 作为渲染函数，将 vnode.type.props 作为 props 选项定义即可
            componentOptions = {
                render: vnode.type,
                props: vnode.type.props
            }
        }

        // 获取组件中的渲染函数render
        // 从组件选项对象中取得组件的生命周期函数
        const { 
            render, data, props: propsOption, setup,
            beforeCreate, created, beforeMount, mounted, beforeUpdate, updated
        } = componentOptions;

        beforeCreate && beforeCreate()

        // 调用data 函数得到原始数据，并调用reactive() 函数将其包装为响应式数据
        const state = data ? reactive(data()) : null;
        // 调用 resolveProps 函数解析出最终的 props数据与 attrs 数据
        const [props, attrs] = resolveProps(propsOption, vnode.props);

        
        // 直接使用编译好的 vnode.children 对象作为slots 对象即可
        const slots = vnode.children || {}

        // 定义组件实例，一个组件实例本质上就是一个对象，他包含与组件有关的状态信息
        const instance = {
            // 组件自身的状态数据，即 data
            state,
            // 将解析出的 props 数据包装为shalloReactive 并定义到组件实例上
            props: shallowReactive(props),
            // 一个布尔值，用来表示组件是否已经被挂载，初始值为false 
            isMounted: false,
            // 组件所渲染的内容，即子树（subTree）
            subTree: null,
            // 插槽
            slots,
            // 在组件实例中添加mounted 数组，用来存储通过onMounted 函数注册的生命周期钩子函数
            mounted:[],
            // 只有 KeepAlive 组件的实例下会有 keepAliveCtx 对象
            keepAliveCtx: null
        }

        // 检查当前要挂载组件是否是 KeepAlive 组件
        const isKeepAlive = vnode.type.__isKeepAlive
        if (isKeepAlive) {
            // 在 KeepAlive 组件实例上添加 keepAliveCtx 对象
            instance.keepAliveCtx = {
                // move
                move(vnode, container, anchor){
                    // 本质上是将组件渲染的内容移动到指定容器中，即隐藏容器中
                    insert(vnode.component.subTree.el, container, anchor)
                },
                createElement
            }
        }

        // 定义 emit 函数，它接收两个参数
        // event：事件名称，
        // payload：传递给时间处理函数的参数
        function emit(event, ...payload){
            // 根据约定对时间名称进行处理，例如 change --> onChange
            const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;
            // 根据处理后的事件名称去props 中寻找对应的事件处理函数
            const handler = instance.props[eventName];
            if (handler) {
                // 调用时间处理函数并传递参数
                handler(...payload);
            } else{
                console.error('事件不存在');
            }
        }

        


        // setupContext, { emit, slots, attrs, expose} 
        const setupContext = { attrs, emit, slots };
        // 调用 setup 函数，将只读版本的 props 作为第一个参数传递，避免用户意外地修改props 的值
        // 将setupContext 作为第二个参数传递
        // 调用 setup 之前，设置当前组件实例
        setCurrentInstance(instance);
        const setupResult = setup(shallowReactive(instance.props), setupContext)
        // 在setup函数执行完毕之后，重置当前组件实例
        setCurrentInstance(null);
        // setupState 用来存储由setup 返回的数据
        let setupState = null;
        // 如果 setup 函数的返回值是函数，则将其作为渲染函数
        if (typeof setupResult === 'function') {
            // 报告冲突
            if (render) {
                console.error('setup 函数返回渲染函数，render 选项将被忽略');
            }

            // 将 setupResult 作为渲染函数
            render = setupResult;
        } else {
            // 如果 setup 的返回值不是函数，则作为数据状态赋值给 setupState
            setupState = setupResult;
        }


        // 将组件实例设置到 vnode 上，用于后续更新
        vnode.component = instance

        // 创建渲染上下文对象，本质上市组件实例的代理
        const renderContext = new Proxy(instance, {
            get(t, k, r){
                // 取得组件自身状态与 props数据
                const {state, props, slots} = t;
              
                if (k === '$slots') {
                    return slots;
                }

                // 先尝试读取自身状态数据
                if (state && k in state) {
                    return state[k]
                } else if (k in props){
                    // 如果组件自身没有该数据，则尝试从props 中读取
                    return props[k];
                } else if (setupState && k in setupState) {
                    return setupState[k];
                } else {
                    console.error('不存在');
                }
            },
            set(t, k, v, r){
                const {state, props} = t;
                if (state && k in state) {
                    state[k] = v;
                } else if (k in props){
                    props[k] = v;
                } else if (setupState && k in setupState) {
                    setupState[k] = v;
                } else {
                    console.error('不存在');
                }
            }
        })

        // 生命周期函数调用时要绑定渲染上下文对象
        created && created.call(renderContext);

        effect(() => {
            // 执行渲染函数你，获取组件要渲染的内容，即render 函数返回的虚拟DOM
            const subTree = render.call(renderContext, state);
            // 检查组件是否已经被挂载
            if (!instance.isMounted) {
                beforeMount && beforeMount();

                // 初次挂载
                patch(null, subTree, container, anchor);

                instance.mounted && instance.mounted.forEach(hook => hook.call(renderContext));

                // 将组件实例的 isMounted 设置为true，这样但更新发生时，就不会再次进行挂载操作，
                // 而是会执行更新
                instance.isMounted = true;
            } else {
                beforeUpdate && beforeUpdate()
                // 当 isMounted为true 时，说明组件已经被挂载，只需要完成自更新即可，
                // 所以在调用patch 函数时，第一个参数为组件上一次渲染的子树。
                // 意思是，使用新的子树与上一次渲染的子树进行打补丁操作
                // 挂载
                patch(instance.subTree, subTree, container, anchor);
                updated && updated()
            }
            // 更新组件实例的子树
            instance.subTree = subTree;
        }, {
            scheduler: queueJob
        })
    }

    /**
    * @desc 更新组件
    * @params { object } n1 旧节点
    * @params { object } n2 新节点
    * @params { object } anchor 锚点
    * @author 张和潮
    * @date 2022年06月27日 23:28
    */
    function patchComponent(n1, n2, anchor){
        // 获取组件实例
        const instace = (n2.component = n1.component);
        // 获取当前的 props 数据
        const { props } = instance;
        // 调用 hasPropsChange 检测子组件传递的 props 是否发生变化，如果没有变化，则不需要更新
        if (hasPropsChange(n1.props, n2.props)) {
            // 调用resolveProps 函数重新获取props 数据
            const [nextProps] = resolveProps(n2.type.props, n2.props);
            // 更新props 
            for( const k in nextProps) {
                props[k] = nextProps[k];
            }

            // 删除不存在的 props 
            for(const k in props){
                if (!(k in nextProps)) {
                    delete props[k]
                }
            }
        }
    }

    /**
    * @desc 挂载元素
    * @params { Object } vNode 虚拟节点
    * @params { Object } container DOM节点容器
    * @params { Object } anchor 挂载锚点
    * @author 张和潮
    * @date 2022年06月16日 15:41:55
    */
    function mountElement(vNode, container, anchor) {
        // 调用createElement 创建元素
        // 让vNode.el 引用真实DOM 元素
        const el = vNode.el = createElement(vNode.type);

        // 处理子节点，如果子节点是字符串，代表元素具有文本节点
        if (typeof vNode.children === 'string') {
            // 调用setElementText 创建文本节点
            setElementText(el, vNode.children);
        } else if(Array.isArray(vNode.children)){
            // 如果 children 是数组，则遍历每一个子节点，并调用patch函数挂载他们
            vNode.children.forEach(child => {
                patch(null, child, el);
            })
        }

        // 如果vNode.props 存在才处理
        if (vNode.props) {
            // 遍历 vNode.props
            for(const key in vNode.props){
                const value = vNode.props[key];
                // 调用 patchProps 函数即可
                patchProps(el, key, null, value);
            }
        }

        // 判断一个VNode 是否需要过渡
        const needTransition = vNode.transition;
        if (needTransition) {
            // 调用 transition.beforeEnter 钩子，并将DOM 元素作为参数传递
            vNode.transition.beforeEnter(el)
        }

        // 调用 insert 函数将元素插入到容器内
        insert(el, container, anchor);

        if (needTransition) {
            // 调用 transition.enter 钩子，并将DOM 元素作为参数传递
            vNode.transition.enter(el)
        }
    }

    /**
    * @desc 更新元素
    * @params { Object } n1 旧vNode
    * @params { Object } n2 新vNode
    * @author 张和潮
    * @date 2022年06月17日 18:02:31
    */
    function patchElement(n1, n2){
        // 保存el DOM 到 n2 vNode上
        const el = n2.el = n1.el;

        const oldProps = n1.props;
        const newProps = n2.props;

        // 此处需要进行判断更新是否存在动态节点

        // 第一步：更新props
        for (const key in newProps) {
            if (newProps[key] !== oldProps[key]) {
                patchProps(el, key, oldProps[key], newProps[key]);
            }
        }
        for (const key in oldProps) {
            if (!(key in newProps)) {
                patchProps(el, key, oldProps[key], null);
            }
        }

        // 存在动态节点
        if (n2.dynamicChildren) {
            // 只更新动态节点
            patchBlockChildren(n1, n2)
        } else {
            // 第二步：更新children
            patchChildren(n1, n2, el)
        }

    }

    /**
    * @desc 更新动态节点
    * @author 张和潮
    * @date 2022年07月12日 15:49:36
    */
    function patchBlockChildren(n1, n2) {
        // 只更新动态节点
        for (let i = 0; i < n2.dynamicChildren.length; i++) {
            patchElement(n1.dynamicChildren[i], n2.dynamicChildren[i])
        }
    }

    /**
    * @desc 更新子节点
    * @author 张和潮
    * @date 2022年06月17日 18:11:38
    */
    function patchChildren(n1, n2, container){
        // 判断新子节点的类型是否是文本节点
        if (typeof n2.children === 'string') {
            // 旧子节点的类型有三种可能，没有子节点、文本子节点以及一组子节点
            // 只有当旧子节点为一组子节点时，才需要逐个卸载，其他情况下什么都不需要做
            if (Array.isArray(n1.children)) {
                n1.children.forEach(c => unmount(c))
            }
            // 最后将新的文本节点内容设置容器元素
            setElementText(container, n2.children)
        } else if(Array.isArray(n2.children)){
            // 说明新子节点是一组子节点
            // 判断旧子节点是否也是一组子节点
            if(Array.isArray(n1.children)){
                // 粗暴解法
                // // 将旧的一组子节点全部卸载
                // n1.children.forEach(c => unmount(c));
                // // 再将新的一组子节点全部挂载到容器中
                // n2.children.forEach(c => patch(null, c, container));

                // 简单diff 算法
                // easyDiff(n1, n2, container);

                // 双端diff 算法
                // doubleEndDiff(n1, n2, container);

                // 快速diff 算法
                quickDiff(n1, n2, container)
            } else {
                // 旧子节点要么是文本节点，要么不存在
                // 无论那种情况，我们都只需要将容器清空，然后将新的一组子节点逐个卸载
                setElementText(container, '');
                n2.children.forEach(c => patch(null, c, container));
            }
        } else {
            // 说明新子节点不存在
            // 旧子节点是一组子节点，只需逐个卸载即可
            if (Array.isArray(n1.children)) {
                n1.children.forEach(c => unmount(c));
            }else if (typeof n1.children === 'string') {
                // 旧子节点是文本子节点，清空内容即可
                setElementText(container, '')
            }
        }
    }


    /**
     * diff 算法：新旧两组子节点的对比算法
     */

    /**
    * @desc 快速 Diff 算法
    * @params { Object } n1 旧vNode
    * @params { Object } n2 新vNode
    * @params { Object } container dom
    * @author 张和潮
    * @date 2022年06月25日 16:39:29
    */
   function quickDiff(n1, n2, container) {
        const newChildren = n2.children;
        const oldChildren = n1.children;

        // 更新相同的前置节点
        // 索引 j 指向新旧两组子节点的开头
        let j = 0;
        let oldVNode = oldChildren[j];
        let newVNode = newChildren[j];

        // while 循环向后遍历，直到遇到拥有不同的key值的节点为止
        while(oldVNode.key === newVNode.key){
            // 调用patch 函数进行更新
            patch(oldVNode, newVNode, container);
            // 更新索引j，让其递增
            j++;
            oldVNode = oldChildren[j];
            newVNode = newChildren[j];
        }

        // 更新相同的后置节点
        // 索引 oldEnd 指向旧的一组子节点的最后一个节点
        let oldEnd = oldChildren.length - 1;
        // 索引 newEnd 指向新的一组子节点的最后一个节点
        let newEnd = newChildren.length - 1;

        oldVNode = oldChildren[oldEnd];
        newVNode = newChildren[newEnd];

        // while 循环从后向前遍历，直到遇到拥有不同key值的节点为止
        while (oldVNode.key === newVNode.key) {
            // 调用patch 函数进行更新
            patch(oldVNode, newVNode, container);
            // 递减 oldEnd 和 newEnd
            oldEnd--;
            newEnd--;
            oldVNode = oldChildren[oldEnd];
            newVNode = newChildren[newEnd];
        }

        // 预处理完毕后，如果满足条件 j --> newEnd 之间的节点应作为新节点插入
        if (j > oldEnd && j < newEnd) {
            // 锚点索引
            const anchorIndex = newEnd + 1;
            // 锚点元素
            const anchor = anchorIndex < newChildren.length ? newChildren[anchorIndex].el : null;
            // 采用 while 循环，调用 patch 函数逐个挂载新增节点
            while(j <= newEnd){
                patch(null, newChildren[j++], container, anchor);
            }
        } else if (j > newEnd && j <= oldEnd) {
            // j -> oldEnd 之间的节点应该被卸载
            while (j <= oldEnd) {
                unmount(oldChildren[j++])
            } 
        } else {
            // 处理非理想情况
            // 构造 source 数组
            // 新的一组子节点中剩余未处理节点的数量
            const count = newEnd - j + 1;
            const source = new Array(count);
            source.fill(-1);

            // oldStart 和 newStart 分别为其实索引，即 j
            const oldStart = j;
            const newStart = j;
            // 新增两个变量，moved 和 pos
            let moved = false;
            let pos = 0;

            // 构建索引表
            const keyIndex = {};
            for (let i = newStart; i <= newEnd; i++) {
                keyIndex[newChildren[i].key] = i;
            }

            // 新增patched 变量，代表更新过的节点数量
            let patched = 0;
            // 遍历旧的一组子节点中剩余未处理的节点
            for (let i = oldStart; i <= oldEnd; i++) {
                oldVNode = oldChildren[i];

                // 如果更新过的节点数量小于等于需要更新的节点数量，则执行更新
                if (patched <= count) {        
                    // 通过索引表快速找到新的一组子节点中具有相同 key 值的节点位置
                    const k = keyIndex[oldVNode.key];
                    
                    if (typeof k !== 'undefined') {
                        newVNode = newChildren[k];
                        
                        // 调用 patch 函数完成更新
                        patch(oldVNode, newVNode, container);
                        // 填充source 数组
                        source[k - newStart] = i;
                        
                        // 判断节点是都需要移动
                        if(k < pos){
                            moved = true;
                        }else {
                            pos = k;
                        }
                    } else {
                        // 没找到
                        unmount(oldVNode);
                    }
                } else {
                    // 如果更新节过的节点数量大于需要更新的节点数量，则卸载多余的节点
                    unmount(oldVNode);
                }
            }
            
            if (moved) {
                // 如果moved 为真，则需要进行DOM 移动操作
                // 计算最长递增子序列
                const seq = getSequence(source);

                // s 指向最长递增子序列的最后一个元素
                let s = seq.length - 1;
                // i 指向新的一组子节点的最后一个元素
                let i = count - 1;
                for(i; i >= 0; i--){
                    if (source[i] === -1) {
                        // 说明索引为 i 的节点是全新的节点，应该将其挂载
                        // 该节点在新 children 中的真实索引位置
                        const pos = i + newStart;
                        const newVNode = newChildren[pos];

                        // 该节点的下一个节点的位置索引
                        const nextPos = pos + 1;
                        // 锚点
                        const anchor = nextPos < newChildren.length
                                        ? newChildren[nextPos].el
                                        : null;

                        patch(null, newVNode, container, anchor);
                    } else if (i !== seq[s]) {
                        // 如果节点的索引i不等于 seq[s]的值，说明该节点需要移动
                        // 该节点在新 children 中的真实索引位置
                        const pos = i + newStart;
                        const newVNode = newChildren[pos];

                        // 该节点的下一个节点的位置索引
                        const nextPos = pos + 1;
                        // 锚点
                        const anchor = nextPos < newChildren.length
                                        ? newChildren[nextPos].el
                                        : null;

                        // 移动
                        insert(newVNode.el, container, anchor);
                    } else {
                        // 当 i === seq[s] 时，说明该位置的节点不需要移动
                        // 只需要让s指向下一个位置 
                        s--;
                    }
                }
            }
        }

    }



    /**
    * @desc 双端 diff 算法
    * @params { Object } n1 旧vNode
    * @params { Object } n2 新vNode
    * @params { Object } container dom
    * @author 张和潮
    * @date 2022年06月24日 21:50
    */
   function doubleEndDiff(n1, n2, container) {
        const oldChildren = n1.children;
        const newChildren = n2.children;

        // 四个索引值
        let oldStartIdx = 0;
        let oldEndIdx = oldChildren.length - 1;
        let newStartIdx = 0;
        let newEndIdx = newChildren.length - 1;

        // 四个索引指向的vNode 节点
        let oldStartVNode = oldChildren[oldStartIdx];
        let oldEndVNode = oldChildren[oldEndIdx];
        let newStartVNode = newChildren[newStartIdx];
        let newEndVNode = newChildren[newEndIdx];

        while (oldStartIdx <= oldEndIdx &&  newStartIdx <= newEndIdx) {
            if (!oldStartVNode) {
                oldStartVNode = oldChildren[++oldStartIdx]
            } else if (!oldEndVNode) {
                oldEndVNode = oldChildren[--oldEndIdx]
            } else if (oldStartVNode.key === newStartVNode.key) {
                // 第一步：oldStartVNode 和 newStartVNode 比较
                // 节点在新的顺序中仍然处于头部，不需要移动，但仍需打补丁
                patch(oldStartVNode, newStartVNode, container);
                // 更新索引和头尾部节点变量
                oldStartVNode = oldChildren[++oldStartIdx];
                newStartVNode = newChildren[++newStartIdx];
            } else if (oldEndVNode.key === newEndVNode.key) {
                // 第二步：oldEndVNode 和 newEndVNode 比较
                // 节点在新的顺序中仍然处于尾部，不需要移动，但仍需打补丁
                patch(oldEndVNode, newEndVNode, container);
                // 更新索引和头尾部节点变量
                oldEndVNode = oldChildren[--oldEndIdx];
                newEndVNode = newChildren[--newEndIdx];
            } else if (oldStartVNode.key === newEndVNode.key) {
                // 第三步：oldStartVNode 和 newEndVNode 比较
                // 调用patch 打补丁
                patch(oldStartVNode, newEndVNode, container);
                // 将旧的一组子节点的头部节点对应的额真实DOM 节点 oldStartVNode.el 移动到
                // 旧的一组子节点的尾部节点对应的真实DOM 节点后面
                insert(oldStartVNode.el, container, oldEndVNode.el.nextSibling)

                // 更新索引以及位置
                oldStartVNode = oldChildren[++oldStartIdx];
                newEndVNode = newChildren[--newEndIdx];
            } else if (oldEndVNode.key === newStartVNode.key) {
                // 第四步：oldEndVNode 和 newStartVNode 比较
                // 仍然需要调用patch 函数进行打补丁
                patch(oldEndVNode, newStartVNode, container);

                // 移动DOM 操作
                // oldEndVNode.el 移动到 oldStartVNode.el 前面
                insert(oldEndVNode.el, container, oldStartVNode.el);

                // 移动DOM 完成后，更新索引值，并指向下一个位置
                oldEndVNode = oldChildren[--oldEndIdx];
                newStartVNode = newChildren[++newStartIdx];
            } else{
                // 遍历旧的一组子节点，试图寻找与 newstartVNode 拥有相同的key 值的节点
                // idxInOld 就是新的一组子节点的头部节点在旧的一组子节点中的索引
                const idxInOld = oldChildren.findIndex(
                    node => node.key === newStartVNode.key
                );

                // idxInOld 大于 0 说明找到了可复用的节点，并且需要将其对应的真实DOM 移动到头部
                if (idxInOld > 0) {
                    // 需要移动的节点
                    const vNodeToMove = oldChildren[idxInOld];
                    // 打补丁
                    patch(vNodeToMove, newStartVNode, container);
                    // 将 vNodeToMove.el 移动到头部节点 newStartVNode.el 之前
                    insert(vNodeToMove.el, container, oldStartVNode.el);

                    oldChildren[idxInOld] = undefined;

                } else{
                    // 将newStartVNode 作为新节点挂载到头部，使用当前头部节点 oldStartVNode.el 作为锚点
                    patch(null, newStartVNode, container, oldStartVNode.el)
                }
                // 更新newStarVNode 到下一个位置
                newStartVNode = newChildren[++newStartIdx];
            }
        }

        // 循环结束后检查索引值的情况
        if (oldEndIdx < oldStartIdx && newStartIdx <= newEndIdx) {
            // 如果满足条件，则说明有新的节点遗留，需要挂载它们
            for (let i = newStartIdx; i <= newEndIdx; i++) {
                patch(null, newChildren[i], container, oldStartVNode.el) 
            }
        } else if (newEndIdx < newStartIdx && oldStartIdx <= oldEndIdx) {
             // 移除操作
             for (let i = oldStartIdx; i <= oldEndIdx; i++) {
                unmount(oldChildren[i])
            }
        }
   }


    /**
    * @desc 简单diff算法
    * @params { Object } n1 旧vNode
    * @params { Object } n2 新vNode
    * @params { Object } container dom
    * @author 张和潮
    * @date 2022年06月21日 22:44
    */
    function easyDiff(n1, n2, container){
        const oldChildren = n1.children;
        const newChildren = n2.children;

        // 用来存储寻找过程中遇到的最大索引值
        let lastIndex = 0;

        // 遍历新的子节点
        for (let i = 0; i < newChildren.length; i++) {
            const newVNode = newChildren[i];
            let j = 0;
            
            // 在第一层循环中定义变量find，代表是都在旧的一组子节点中找到可复用的节点
            // 初始值为false，代表没找到
            let find = false;

            // 遍历旧的子节点
            for ( j ; j < oldChildren.length; j++) {
                const oldVNode = oldChildren[j];
                // 如果找到了具有相同 key 值的两个节点，说明可以复用，但仍然需要调用patch 函数更新
                if (newVNode.key === oldVNode.key) {
                    // 一旦找到可复用的节点，则将变量find的值设为true
                    find = true;

                    patch(oldVNode, newVNode, container)

                    if (j < lastIndex) {
                        // 如果当前找到的节点在旧children 中的索引小于最大索引值 lastIndex，
                        // 说明该节点对应的真实DOM 需要移动
                        // 先获取 newVnode 的前一个 vnode, 即 prevVNode
                        const prevVNode = newChildren[i - 1];
                        // 如果 prevVNode 不存在，则说明当前 newVNode 是第一个节点，它不需要移动
                        if (prevVNode) {
                            // 由于我们要将 newVNode 对应的真实DOM 移动到 preVNode 所对应的真实的DOM 后面
                            // 所以我们需要获取 preVNode 所对应真实DOM 的下一个兄弟节点，并将其作为锚点
                            const anchor = prevVNode.el.nextSibling;
                            // 调用 insert 方法将newVNode 对应真实DOM  插入到锚点元素前面
                            // 也就是 preVnode 对应的真实DOM 后面
                            insert(newVNode.el, container, anchor);
                        }
                    } else {
                        // 如果当前找到的节点在旧children 中的索引不小于最大索引值 lastIndex，
                        // 则更新lastIndex 的值
                        lastIndex = j
                    }

                    break;
                }
            }
            // 如果代码运行到这里，find 仍然为false
            // 说明当前 newVNode 没有在旧的一组子节点中找到可复用的节点
            // 也就是说，当前 newVNode 是新增节点，需要挂载
            if (!find) {
                // 为了将节点挂载到正确位置，我们需要先获取锚点元素
                // 首先获取当前 newVNode 的前一个 vNode 节点
                const prevVNode = newChildren[i - 1];
                let anchor = null;

                if (prevVNode) {
                    // 如果有迁移vNode节点， 则使用它的下一个兄弟节点作为锚点元素
                    anchor = prevVNode.el.nextSibling;
                } else {
                    // 如果没有前一个 vNode 节点，说明即将挂载的新节点是第一个子节点
                    // 这时我们使用容器元素的 firstChild 作为锚点
                    anchor = container.firstChild;
                }

                // 挂载newVNode
                patch(null, newVNode, container, anchor)
            }


        }


        // 上一步的更新操作完成后
        // 遍历旧的一组子节点
        for (let i = 0; i < oldChildren.length; i++) {
            const oldVNode = oldChildren[i];
            
            // 拿旧子节点 oldVNode 去新的一组子节点中寻找具有相同key 值的节点
            const has = newChildren.find(vNode => vNode.key === oldVNode.key)

            if (!has) {
                // 如果没有找到具有相同的key值的节点，则说明需要删除该节点
                // 调用 unmount 函数将其卸载
                unmount(oldVNode);
            }
        }
    }

    /**
    * @desc 挂载与更新
    * @params { Object } n1 旧vNode
    * @params { Object } n2 新vNode
    * @params { Object } container DOM节点容器
    * @params { Object } anchor 挂载锚点
    * @author 张和潮
    * @date 2022年06月16日 15:31:32
    */
    function patch(n1, n2, container, anchor) {
        // 如果n1 存在，则对比 n1 和 n2 的类型
        if (n1 && n1.type !== n2.type) {
            // 如果新旧 vNode 的类型不同，直接将旧vNode 卸载
            unmount(n1);
            n1 = null;
        }
        
        // 代码运行到这里，证明 n1 和 n2 所描述的内容相同
        const { type } = n2;
        // 如果 n2.type 的值是字符串类型，则它描述的是普通标签元素
        if (typeof type === "string") {
            // 如果n1 不存在，意味着挂载，则调用 mountElement 函数完成挂载
            if (!n1) {
                mountElement(n2, container, anchor)
            } 
            // n1 存在，意味着打补丁
            else{
                patchElement(n1, n2)
            }
            
        } 
        else if ( typeof type === 'object' && type.__isTeleport ) {
            // 组件选项中如果存在__isTeleport，则它是 Teleport 组件，
            // 调用Teleport 组件选项中的 process 函数将控制权交接出去
            // 传递给 process 函数的第五个参数是渲染器的一些内部方法
            type.process(n1, n2, container, anchor, {
                patch,
                patchChildren,
                unmount,
                move(vnode, container, anchor){
                    insert(vnode.component ? vnode.component.subTree.el : vnode.el, container, anchor)
                }
            })
        }
        // type 是对象 --> 有状态组件
        // type 是函数 --> 函数式组件
        else if (typeof type === "object" || typeof type === 'function'){
            // 如果n2.type 的值的类型是对象，则它描述的是组件
            if (!n1) {
                // 如果该组件已经被KeepAlive，则不会重新挂载它，而是会调用 _activate 来激活
                if (n2.keptAlive) {
                    n2.keepAliveInstance._activate(n2, container, anchor)
                } else{
                    // 挂载组件
                    mountComponent(n2, container, anchor);
                }
            } else {
                // 更新组件
                patchComponent(n1, n2, anchor);
            }

        } else if(type === Text){
            // 处理文本节点
            if (!n1) {
                // 调用 createText 函数创建文本节点
                const el = n2.el = createText(n2.children);
                // 将文本节点插入容器中
                insert(el, container);
            } else{
                // 如果旧 vNode 存在，只需要使用新文本节点的文本内容更新旧文本节点即可
                const el = n2.el = n1.el;
                if (n1.children !== n2.children) {
                    // 调用setText 函数更新文本节点的内容
                    setText(el, n2.children);
                }
            }
        } else if(type === Fragment){
            // 处理 Fragment 类型的 vNode
            if(!n1){
                // 如果旧 vNode 不存在，则只需要将 Fragmnet 的children 逐个挂载即可
                n2.children.forEach(c => patch(null, c, container));
            } else {
                // 如果旧 vNode 存在，则只需要更新 Fragment 的 children 即可
                patchChildren(n1, n2, container);
            }
        }
        // ...处理其他类型的node
    }


    /**
    * @desc 渲染（虚拟节点，容器）
    * @params { Object } vNode 虚拟节点
    * @params { Object } container DOM节点
    * @author 张和潮
    * @date 2022年06月16日 15:23:01
    */
    function render(vNode, container) {
        if (vNode) {
            // 新vNode 存在，将其与旧vNode 一起传送给 patch 函数，进行打补丁
            patch(container._vNode, vNode, container)
        }else{
            if (container._vNode) {
                // 旧vNode 存在，且新 vNode 不存在，说明是卸载 （unmount）操作
                // 只需要将container 内的DOM 清空即可，但是这样做的话不严谨，三点原因：
                /**
                 * 1、如果是组件需要触发组件的beforeUnmount、unMounted 等生命周期函数
                 * 2、如果存在自定义指令，在卸载操作发生时正确执行对应的指令钩子函数
                 * 3、使用innerHTML清空，不会溢出绑定在DOM元素上的事件处理函数
                 */
                // container.innerHTML = "" ××

                // 根据 vNode获取要卸载的真实 DOM 元素
                // 调用 unmount 函数卸载 vNode
                unmount(container._vNode)
            }
        }
        // 把 vNode 存储到 container._vNode 下，即后续渲染中的 vNode
        container._vNode = vNode
    
    }

    function hydrate(vNode, container) {
   
    }

    return {
        render,
        hydrate
    }
}


/**
* @desc 求给定序列的最长递增子序列的代码 
* @author 张和潮
* @date 2022年06月26日 22:29
*/
function getSequence(arr) {
    const p = arr.slice()
    const result = [0]
    let i, j, u, v, c
    const len = arr.length
    for (i = 0; i < len; i++) {
      const arrI = arr[i]
      if (arrI !== 0) {
        j = result[result.length - 1]
        if (arr[j] < arrI) {
          p[i] = j
          result.push(i)
          continue
        }
        u = 0
        v = result.length - 1
        while (u < v) {
          c = (u + v) >> 1
          if (arr[result[c]] < arrI) {
            u = c + 1
          } else {
            v = c
          }
        }
        if (arrI < arr[result[u]]) {
          if (u > 0) {
            p[i] = result[u - 1]
          }
          result[u] = i
        }
      }
    }
    u = result.length
    v = result[u - 1]
    while (u-- > 0) {
      result[u] = v
      v = p[v]
    }
    return result
  }