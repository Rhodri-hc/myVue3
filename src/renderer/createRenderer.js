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
        }


        // 获取 el 的父元素
        const parent = vNode.el.parentNode
        // 调用 removeChild 移除元素
        if (parent) {
            parent.removeChild(vNode.el)
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

        // 调用 insert 函数将元素插入到容器内
        insert(el, container, anchor);
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

        // 第二步：更新children
        patchChildren(n1, n2, el)
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
                easyDiff(n1, n2, container);
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
            
        } else if (typeof type === "object"){
            // 如果n2.type 的值的类型是对象，则它描述的是组件

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