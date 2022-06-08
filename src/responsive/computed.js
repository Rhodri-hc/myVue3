/**
* @desc 实现计算属性
* @author 张和潮
* @date 2022年06月08日 11:35:56
*/
function computed(getter){
    // 用来储存计算值
    let value;
    // 表示计算属性是否需要重新计算，为true 表示数据为脏数据需要重新计算
    let dirty = true;

    // 把getter作为副作用函数，创建一个lazy的 effect
    const effectFn = effect(getter, {
        lazy: true,
        // 添加调度器，在调度器中奖dirty重置为true
        scheduler(){
            if (!dirty) {
                dirty = true;
                // 当计算属性依赖的响应式数据变化时，手动调用 trigger 函数触发响应
                trigger(obj, 'value')
            }
        }
    })


    const obj = {
        // 当读取value时才执行
        get value(){
            if (dirty) {
                value = effectFn()
                dirty = false;
            }
            // 当读取value时，手动调用track 函数进行追踪
            track(obj, 'value')
            return value
        }
    }

    return obj
}