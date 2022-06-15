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

/**
* @desc 解决响应丢失问题
* @author 张和潮
* @date 2022年06月15日 09:19:57
*/
function toRef(obj, key){
    // 定义访问器属性
    const wrapper = {
        get value(){
            return obj[key];
        },

        set value(newVal){
            obj[key] = newVal
        }
    }

    // 定义_v_isRef 属性
    Object.defineProperty(wrapper, '_v_isRef', {
        value: true
    })

    return wrapper

}

/**
* @desc 批量完成响应转换
* @author 张和潮
* @date 2022年06月15日 09:24:00
*/
function toRefs(obj) {
    const ret = {}

    // 使用for...in 循环遍历对象
    for (const key in obj) {
        // 逐个调用 toRef 完成转换
        ret[key] = toRef(obj, key)
    }

    return ret;
}