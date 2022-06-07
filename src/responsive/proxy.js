// 为了规范 effect副作用函数的命名，因为依赖的函数命名很多种，用activeEffect接收effect中的依赖函数
let activeEffect;
// 用来收集对应的对象
let objWeakMap = new WeakMap()

/**
* @desc 副作用函数，用来接收执行依赖函数
* @author 张和潮
* @date 2022年06月06日 09:59:48
*/
function effect(fn) {
    activeEffect = fn;
    fn()
}


/**
* @desc 建立一个响应式系统的代理
* @author 张和潮
* @date 2022年06月06日 09:30:12
*/
function buildResponsiveProxy(data){
    let proxy = new Proxy(data, {
        // 依赖收集
        get(target, key){
            // 将副作用函数 activeEffect 添加到存储副作用函数的桶中
            track(target, key)
         
            // 返回值
            return target[key]
        },

        // 依赖响应更新
        set(target, key, newVal){
            // 设置属性值
            target[key] = newVal;

            trigger(target, key)
        }
    })

    return proxy;
}

/**
* @desc 追踪依赖,在get函数内调用track 函数追踪变化
* @author 张和潮
* @date 2022年06月07日 09:23:12
*/
function track(target, key){
    // 不存在当前响应的依赖函数则返回
    if (!activeEffect) {
        return;
    }
    
    // 获取桶里的对象
    let bucketObjMap = objWeakMap.get(target)
    // 如果在桶里不存在对应的target对象则添加
    if (!bucketObjMap) {
        objWeakMap.set(target, bucketObjMap = new Map())
    }

    // 获取对象桶里对应的key值map
    let deps = bucketObjMap.get(key)
    // 如果在桶里不存在对应的key键值则添加
    if (!deps) {
        bucketObjMap.set(key, deps = new Set())
    }

    // 往key值对应的依赖桶中添加当前的依赖函数
    deps.add(activeEffect)

}

/**
* @desc 触发副作用函数重新执行，在 set拦截函数内调用trigger 函数触发变化
* @author 张和潮
* @date 2022年06月07日 09:27:57
*/
function trigger(target,key){
       // 获取桶里 target 对应的对象
       let bucketObjMap = objWeakMap.get(target)

       if (!bucketObjMap) {
           return;
       }
       // 获取target桶里的 key 对象
       let effects = bucketObjMap.get(key)

       // 执行key值中对应的 依赖函数
       effects && effects.forEach(fn => fn());
}