// 为了规范 effect副作用函数的命名，因为依赖的函数命名很多种，用activeEffect接收effect中的依赖函数
let activeEffect;
// effect 栈 : 解决的是effect函数嵌套的情况，activeEffect指向不对
const effectStack = [];
// 用来收集对应的对象
let objWeakMap = new WeakMap()

/**  $nextTick 的类似实现   */
// 定义一个任务队列
const jobQueue = new Set();
// 使用Promise.resolve() 创建一个promise 实例，我们用它将一个任务添加到微任务队列
const p = Promise.resolve()

// 一个标志代表是否正在刷新队列
let isFlushing = false;
/**
* @desc 刷新队列
* @author 张和潮
* @date 2022年06月07日 22:30
*/
function flushJob(){
    // 如果队列正在刷新，则什么都不做
    if (isFlushing) {
        return;
    }
    // 设置为 true 代表正在刷新
    isFlushing  = true;
    // 在微任务队列中刷新jobQueue队列
    p.then(() => {
        jobQueue.forEach(job => job())
    }).finally(() => {
        // 结束后重置 isFlushing
        isFlushing = false
    })

}

/**  $nextTick 的类似实现   */

/**
* @desc 副作用函数，用来接收执行依赖函数
* @params { Function } fn 副作用函数
* @params { Object } options 调度执行选项
* @author 张和潮
* @date 2022年06月06日 09:59:48
*/
function effect(fn, options = {}) {
    const effectFn = () => {
        // 调用 cleanup 函数完成清除工作
        cleanup(effectFn)

        // 当调用 effect 注册副作用函数时，将副作用函数复制给 activeEffect
        activeEffect = effectFn;
        // 在调用副作用函数之前将当前副作用函数压入栈中
        effectStack.push(effectFn)
        fn()
        // 在当前副作用函数执行完毕后，将当前副作用函数弹出栈，并把activeEffect 还原为之前的值
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]
    }

    // 将 options 挂载到 effectFn 上
    effectFn.options = options;
    // activeEffect.deps 用来存储所有与该副作用函数相关的依赖集合
    effectFn.deps = []
    // 执行副作用函数
    effectFn()
}

/**
* @desc 将副作用函数的每一项依赖集合移除
* @author 张和潮
* @date 2022年06月07日 09:42:35
*/
function cleanup(effectFn){
    // 遍历effectFn.deps 数组
    for (let i = 0; i < effectFn.deps.length; i++) {
        // deps 是依赖集合
        const deps = effectFn.deps[i];
        // 将effectFn 从依赖集合中移除
        deps.delete(effectFn)
    }
    // 最后需要重置 effectFn.deps 数组
    effectFn.deps.length = 0;
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

    // deps 就是一个与当前副作用函数存在联系的依赖集合
    // 将其添加到 activeEffect.deps 数组中
    activeEffect.deps.push(deps)
}

/**
* @desc 触发副作用函数重新执行，在 set拦截函数内调用trigger 函数触发变化
* @author 张和潮
* @date 2022年06月07日 09:27:57
*/
function trigger(target,key){
       // 获取桶里 target 对应的对象
       const bucketObjMap = objWeakMap.get(target)

       if (!bucketObjMap) {
           return;
       }
       // 获取target桶里的 key 对象
       const effects = bucketObjMap.get(key)
       
       // 构造另一 Set集合遍历他，避免无限执行
       const effectsToRun = new Set()
       effects && effects.forEach(effectFn => {
           // 如果trigger 触发执行的副作用函数与当前只在执行的 副作用函数相同，则不粗发执行
           if(effectFn !== activeEffect){
               effectsToRun.add(effectFn)
           }
       })
       // 执行key值中对应的 依赖函数
       effectsToRun && effectsToRun.forEach(fn => {
           // 如果副作用函数存在调度器，则调用该调度器，并将副作用函数函数作为参数传递
           if (fn.options.scheduler) {
               fn.options.scheduler(fn)
           } else{
               fn()
           }
       });
}