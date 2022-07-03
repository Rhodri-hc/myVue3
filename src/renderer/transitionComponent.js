/**
 * transition 组件
 * 在不同阶段执行不同的操作，即可完成整个进场过渡的实现
 * beforeEnter阶段：添加 enter-from 和 enter-active 类
 * enter 阶段：在下一帧中移除enter-from 类，添加 enter-to
 * 进场动效结束：移除enter-to 和 enter-active 类
 * 
 */

/**
 * .enter-from{
 *      transform: translateX(200px)
 * }
 * 
 * .enter-to {
 *      transform: translateX(0)
 * }
 * 
 * .enter-active{
 *      transition: transform 1s ease-in-out
 * }
 * 
 * // 初始状态
 * .leave-from{
 *      transform: translateX(0)
 * }
 * 
 * // 结束状态
 * .leave-to{
 *      transform: translateX(200px)
 * }
 * 
 * // 过渡状态
 * .leave-active{
 *      transition: transform 2s ease-out
 * }
 * 
 */

const Transition = {
    name: 'Transition',
    setup(props, { slots }){
        return {
            // 通过默认插槽获取需要过渡的元素
            const innerVNode = slots.default()

            // 在过渡元素的 VNode 对象上添加transition 相应的钩子函数
            innerVNode.transition = {
                beforeEnter(el){
                    // 设置初始状态：添加enter-from 和 enter-active 类
                    el.classList.add('enter-from');
                    el.classList.add('enter-active');
                },
                enter(el){
                    // 在下一帧切换到结束状态
                    nextFrame(() => {
                        // 移除enter-from 类 添加enter-to类
                        el.classList.remove('enter-from');
                        el.classList.add('enter-to');

                        // 监听 transitioned 事件完成收尾工作
                        el.addEventListener('transitionend' () =>{
                            el.classList.remove('enter-active');
                            el.classList.remove('enter-to');
                        })
                    })
                },
                leave(el, performRemove){
                    // 设置离场过渡的初始状态：添加leave-from 和 leave-active 类
                    el.classList.add('leave-from');
                    el.classList.add('leave-active');

                    // 强制 reflow ，使得初始状态生效
                    document.body.offsetHeight
                    // 在下一帧修改状态
                    nextFrame(() => {
                        // 移除leave-from 类 添加leave-to类
                        el.classList.remove('leave-from');
                        el.classList.add('leave-to');

                        // 监听 transitioned 事件完成收尾工作
                        el.addEventListener('transitionend' () =>{
                            el.classList.remove('leave-to');
                            el.classList.remove('leave-active');

                            // 卸载 dom 元素
                            performRemove()
                        })
                    })
                }
            }

            // 渲染需要过渡的元素
            return innerVNode
        }
    }
}

function nextFrame(fn){
    requestAnimationFrame(() => {
        requestAnimationFrame(fn)
    })
}

function render(){
    return {
        type: Transition,
        children:{
            default(){
                return { type: 'div', children: '我是需要过渡的元素' }
            }
        }
    }
}

