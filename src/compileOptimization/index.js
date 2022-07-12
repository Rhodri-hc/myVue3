/**
 * 编译优化：
 * 1、动态节点
 * 2、静态提升
 * 3、预字符串化
 * 4、缓存内联事件处理函数
 * 5、v-once
 * 
 */

/********* 动态节点收集***********/
// 定义不定标志
const PatchFlags = {
    TEXT: 1, // 代表节点有动态的textContent
    CLASS: 2, // 代表元素有动态的 class 绑定
    STYLE: 3
    // 其他
};
// 在虚拟节点的创建阶段，把它的动态节点提取出来，并将其存储到该
// 虚拟节点的 dynamicChildren 数组内
const vnode = {
    tag: 'div',
    children: [
        { tag: 'div', children: "foo" },
        { tag: 'p', children: ctx.bar, patchFlag: PatchFlags.TEXT }, // 动态节点
    ],
    // 将children 中的动态节点提取到 dynamicChildren 数组中
    dynamicChildren: [
        // p 标签具有patchFlag 属性，因此它是动态节点
        { tag: 'p', children: ctx.bar, patchFlag: PatchFlags.TEXT }
    ]
};
// 收集动态节点
const v = {
    render(){
        return (openBlock(), createBlock('div', null, [
            createVNode('div', { class: 'foo' }, null, 1),
            createVNode('div', { class: 'bar' }, null)
        ]))
    }
}
function createBlock(tag, props, children) {
    // block 本质上也是一个vnode
    const block = createVNode(tag, props, children);
    // 将当前动态节点集合作为 block.dynamicChildren
    block.dynamicChildren = currentDynamicChildren

    // 关闭block
    closeBlock();
    // 返回
    return block;
}


function createVNode(tag, props, children, flags) {
    const key = props && props.key
    props && delete props.key

    const vnode = {
        tag,
        props,
        children,
        key,
        patchFlag: flags
    }

    if (typeof flags !== 'undefined' && currentDynamicChildren) {
        // 动态节点，将其添加到当前动态节点集合中
        currentDynamicChildren.push(vnode)
    }

    return vnode
}

// 动态节点栈
const dynamicChildrenStack = [];
// 当前动态节点集合
let currentDynamicChildren = null;
/**
* @desc 用来创建一个新的动态节点集合，并将该集合压在栈中
* @author 张和潮
* @date 2022年07月12日 15:30:09
*/
function openBlock() {
    dynamicChildrenStack.push(currentDynamicChildren = [])
}
/**
* @desc 用来将通过 openBlock 创建的动态节点集合从栈中弹出
* @author 张和潮
* @date 2022年07月12日 15:32:38
*/
function closeBlock() {
    currentDynamicChildren = dynamicChildrenStack.pop()
}

/********* 动态节点收集***********/


/********* 静态提升  ***********
 * 
 对于纯静态节点，将其提升到渲染函数外，在渲染函数内只会持有对静态节点的引用。
 当响应式数据变化，并使得渲染函数重新渲染时，并不会重新创建静态的虚拟节点，从而
 避免了额外的性能开销。

******** 静态提升  ************/

/********* 缓存内联事件处理函数 ***********/

const cache = []
function render(ctx, cache) {
    return h(Comp, {
        // 将内联时间处理函数缓存到 cache 数组中
        onchange: cache[0] || (cache[0] = ($event) => {
            return ctx.a + ctx.b
        })
    })
}

/********* 缓存内联事件处理函数 ***********/


/********* v-once ***********/
// <div>
//   <div v-once>{{ foo }}</div>
// </div>

function render(ctx, cache) {
    return (openBlock(), createBlock('div', null, [
        cache[1] || (
            setBlockTracking(-1), // 阻止这段VNode 被Block 收集
            cache[1] = h('div', null, ctx.foo, 1),
            setBlockTracking(1),  // 恢复
            cache[1] // 整个表达式的值
        )
    ]))
}

/********* v-once ***********/
