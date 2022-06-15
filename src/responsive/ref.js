/**
 * 原始类型的响应方案
 * 
 * 用一个对象去包裹原始值
 *
 */
/**
* @desc 封装一个 ref 函数
* @author 张和潮
* @date 2022年06月15日 09:07:31
*/
function ref(val) {
    // 函数内部创建包裹对象
    const wrapper = {
        value: val
    }

    // 使用 Object.defineProperty 在 wrapper 对象上定义一个不可枚举的属性_v_isRef, 并且值为true
    Object.defineProperty(wrapper, '_v_isRef', {
        value: true
    })

    // 将包裹对象变成响应式数据
    return reactive(wrapper);
}