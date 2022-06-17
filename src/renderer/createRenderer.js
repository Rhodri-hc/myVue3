/**
 * 渲染器的作用：把虚拟 DOM 对象渲染为真实的 DOM 元素。
 * 工作原理：递归遍历虚拟对象，并调用原生DOM API 来完成真实 DOM 的创建。
 *          更新的时候，会通过Diff算法找出变更点，并且只会更新需要更新的内容。
 * 
 */
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
    // 用于在给定的parent 下添加指定元素
    // el 要插入节点， parent 父节点，anchor 被参照的节点（即要插在该节点之前）
    insert(el, parent, anchor = null){
        parent.insertBefore(el, anchor)
    },
    // 将属性设置相关操作封装到 patchProps函数中，并作为渲染器选项传递
    patchProps(el, key, prevValue, nextValue){

        // 对class 进行特殊处理
        if (key === 'class') {
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
    const { createElement, setElementText, insert, patchProps} = options;

    /**
    * @desc 卸载元素
    * @author 张和潮
    * @date 2022年06月16日 17:35:25
    */
    function unmount(vNode) {
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
    * @author 张和潮
    * @date 2022年06月16日 15:41:55
    */
    function mountElement(vNode, container) {
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
        insert(el, container)
    }

    /**
    * @desc 挂载与更新
    * @params { Object } n1 旧vNode
    * @params { Object } n2 新vNode
    * @params { Object } container DOM节点容器
    * @author 张和潮
    * @date 2022年06月16日 15:31:32
    */
    function patch(n1, n2, container) {
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
                mountElement(n2, container)
            } 
            // n1 存在，意味着打补丁
            else{
                // patchElement(n1, n2)
            }
            
        } else if (typeof type === "object"){
            // 如果n2.type 的值的类型是对象，则它描述的是组件

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