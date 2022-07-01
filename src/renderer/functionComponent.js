/**
 * 函数式组件
 * 
 * 一个函数式组件就是一个返回虚拟 DOM 的函数
 * 
 * 没有自身状态，可以接收外部传入的 props 
 * 需要在组件函数上添加静态的 props 属性
 */

/**
* @desc 定义一个函数式组件
* @author 张和潮
* @date 2022年07月01日 11:23:11
*/
function MyFuncComp(props){
    return { type: 'h1', children: props.title }
}

// 定义props 
MyFuncComp.props = {
    title: String
}