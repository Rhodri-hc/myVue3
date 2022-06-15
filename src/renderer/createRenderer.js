/**
 * 渲染器的作用：把虚拟 DOM 对象渲染为真实的 DOM 元素。
 * 工作原理：递归遍历虚拟对象，并调用原生DOM API 来完成真实 DOM 的创建。
 *          更新的时候，会通过Diff算法找出变更点，并且只会更新需要更新的内容。
 * 
 */
/**
* @desc 创建渲染器
* @author 张和潮
* @date 2022年06月15日 22:03
*/
function createRenderer() {
    // 渲染（虚拟节点，容器）
    function render(domString, container) {
        container.innerHTML = domString
    }

    function hydrate(domString, container) {
        console.log(domString, container);
    }

    return {
        render,
        hydrate
    }
}