/**
* @desc 实现属性监听选项watch
* @author 张和潮
* @date 2022年06月08日 12:23:44
*/
function watch(source, cb, options = {}){
    let getter;
    // 处理传入的资源（对象或者函数）
    if (typeof source === 'function') {
        getter = source
    } else {
        getter = () => traverse(source)
    }

    // 定义新值旧值
    let oldValue, newValue;

    const job = () => {
        // 在 scheduler 中重新执行副作用函数，得到的是新值
        newValue = effectFn();
        // 将旧值和新值作为回调函数的参数
        cb(newValue, oldValue);
        // 更新旧值，不然下一次会得到错误的旧值
        oldValue = newValue;
    }

    // 使用effect 注册副作用函数时，开启lazy 选项，并把返回值存储到effectFn 中以便后续手动调用
    const effectFn = effect(
        () => getter(),
        {
            lazy: true,
            scheduler: () => {
                // 在调度函数中判断是否为 'post', 如果是，将其放到微任务队列中执行
                if (options.flush === 'post') {
                    const p = Promise.resolve()
                    p.then(job)
                }else {
                    job();
                }
            }
        }
    );

    if (options.immediate) {
        job()
    }else {
        // 手动调用副作用函数，拿到的值就是旧值
        oldValue = effectFn();
    }
}

/**
* @desc 对资源进行递归读取
* @author 张和潮
* @date 2022年06月08日 14:27:52
*/
function traverse(value, seen = new Set()){
    // 如果要读取的数据是原始值，或者已经被读取过了，那么什么都不做
    if (typeof value !== 'object' || value === null || seen.has(value)) {
        return;
    }
    // 将数据添加到seen中，代表遍历地读取过了，避免循环引用引起的死循环
    seen.add(value);
    // 暂时不考虑数组等其他数据结构
    // 假设value 就是一个对象，使用for...in 读取对那个中的每一个值，并递归地调用traverse进行处理
    for (const k in value) {
        traverse(value[k], seen)
    }

    return value
}

