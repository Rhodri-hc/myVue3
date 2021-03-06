/** 引用对象代理
 * 
 * 这一章节一上来就介绍了常规对象与异质对象的不同，以及如何区分
 * 1.对于表列出的11个内部方法，必须使用ECMA规范10.1.x 节给出的定义实现；
 * 2.对于内部方法[[ Call ]]，必须使用ECMA 规范10.2.1 节给出的定义实现；
 * 3.对于内部方法[[ Construct ]]，必须使用ECMA 规范10.2.2 节给出的定义实现；
 * 满足以上三点为常规对象，否则为异质对象
 * 
 * 接着介绍proxy为异质对象，如果在创建代理对象时没有指定对应的拦截函数，
 * 例如没有指定get() 拦截函数, 那么但我们通过代理对象访问属性值时，代理对象的内部方法
 * [[ Get ]] 会调用原始对象的内部方法[[ Get ]]来获取属性值，这其实就是代理透明性质。
 * 
 * Proxy 对象部署的所有内部方法
 * ------------------------------------------------------
 * 内部方法               处理器函数
 * [[GetPrototypeOf]]    getPrototypeOf
 * [[SetPrototypeOf]]    setPrototypeOf
 * [[IsExtensible]]      isExtensible
 * [[PreventExtensions]] preventExtensions
 * [[GetOwnProperty]]    getOwnPropertyDescriptor
 * [[DefineOwnProperty]] defineProperty
 * [[HasProperty]]       has
 * [[Get]]               get
 * [[Set]]               set
 * [[Delete]]            deleteProperty
 * [[OwnPropertyKeys]]   ownKeys
 * [[Call]]              apply
 * [[Construct]]         construct
 * --------------------------------------------------------
 * 其中[[Call]]和[[Construct]]这两个内部方法只有当被代理的对象是函数和构造函数时才会部署。
 */

/**
* @desc 判断对象是否为Set类型  
* @author 张和潮
* @date 2022年06月13日 16:01
*/
function isSetObj(obj){
    return Object.prototype.toString.apply(obj) === '[object Set]'
}

/*
* @desc 判断对象是否为Map类型  
* @author 张和潮
* @date 2022年06月13日 16:01
*/
function isMapObj(obj){
    return Object.prototype.toString.apply(obj) === '[object Map]'
}


// ITERATE_KEY 用来追踪 for...in 依赖收集与响应
var ITERATE_KEY = Symbol();
// MAP_ITERATE_KEY 用来追踪 Map 对象的keys 响应更新
var MAP_ITERATE_KEY = Symbol(); 

// 操作类型枚举
var TriggerType = {
    SET: "SET",
    ADD: "ADD",
    DELETE: "DELETE"
}

/**
* @desc 重写数组方法
* @desc 这是因为有些时候需要在代理对象和原始对象中操作数组
* @author 张和潮
* @date 2022年06月12日 18:46
*/
const arrInstrumentations = {};
// 重定义查询方法
['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
    const originMethod = Array.prototype[method];
    arrInstrumentations[method] = function(...args){
        // this是代理对象，先在代理对象中查找，将结果存储到res中
        let res = originMethod.apply(this, args);

        if (res === false) {
            // res为false 说明在代理对象中没有找到，
            // 通过 this.raw 拿到原始数组，再去其中寻找，并更新res 值
            res = originMethod.apply(this.raw, args);
        }

        return res;
    }
})
// 一个标记变量, 代表是都进行跟踪，默认值为 true，即允许追踪
var shouldTrack = true;
// 重写数组的 push、pop、shift、unshift以及splice 方法
['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
    // 取得原始方法
    const originMethod = Array.prototype[method];
    // 重写
    arrInstrumentations[method] = function(...args){
        // 在调用原始方法时，禁止追踪
        shouldTrack = false;
        // 默认行为
        let res = originMethod.apply(this, args);
        // 在调用原始方法之后， 恢复原来的行为，即允许追踪
        shouldTrack = true;

        return res;
    }
});

/**
* @desc set & map 的自定义的方法
* @author 张和潮
* @date 2022年06月13日 16:17
*/
// 定义一个对象，将自定义的 add 方法定义到该对象下
const mutableInstrumentations = {
    // add (Set)
    add(key){
        // this 仍然指向的是代理对象，通过 raw 属性获取原始数据对象
        const target = this.raw;

        // 先判断值是否已经存在
        const hadKey = target.has(key);
        // 通过原始数据对象执行 add 方法删除具体的值，
        // 注意，这里不再需要 .bind 了，因为是直接通过 target 调用并执行的
        const res = target.add(key);
        // 只有在值不存在的情况下，才需要触发响应
        if (!hadKey) {
            // 调用 trigger 函数触发响应，并指定操作类型为 ADD
            trigger(target, key, TriggerType.ADD);
        }
        // 返回操作结果
        return res;
    },
    // delete
    delete(key){
        // this 仍然指向的是代理对象，通过 raw 属性获取原始数据对象
        const target = this.raw;

        // 先判断值是否已经存在
        const hadKey = target.has(key);
        // 通过原始数据对象执行 DELETE 方法删除具体的值，
        // 注意，这里不再需要 .bind 了，因为是直接通过 target 调用并执行的
        const res = target.add(key);
        // 当要删除的值存在的情况下，才需要触发响应
        if (hadKey) {
            // 调用 trigger 函数触发响应，并指定操作类型为 ADD
            trigger(target, key, TriggerType.DELETE);
        }
        // 返回操作结果
        return res;
    },
    // get
    get(key){
        // 获取原始对象
        const target = this.raw;
        // 判断读取的key 是否存在
        const had = target.has(key);
        // 追踪依赖，建立响应联系
        track(target, key);
        // 如果存在，则返回结果，这里要注意的是，如果得到的结果 res 仍然是可代理数据，
        // 则要返回使用 reactive 包装后的响应式数据
        if (had) {
            const res = target.get(key);
            return typeof res === 'object' ? reactive(res) : res;
        }
    },
    // set 
    set(key, value){
        const target = this.raw;
        const had = target.has(key);
        // 获取旧值
        const oldValue = target.get(key);

        // 获取原始数据，由于value 本身可能已经是原始数据，所以此时value.raw 不存在，则直接使用value
        const rawValue = value.raw || value;
        // 设置新值
        target.set(key, rawValue);
        // 如果不存在，则说明是ADD类型的操作，意味着新增
        if (!had) {
            trigger(target, key, TriggerType.ADD);
        } else if(oldValue !== value || (oldValue === oldValue && value === value)){
            // 如果存在，并且值变了，则是 SET 类型的操作，意味着修改
            trigger(target, key, TriggerType.SET);
        }
    },
    // forEach
    forEach(callBack, thisVal){
        // 定义 wrap 函数将可代理对象转换为可响应式数据
        const wrap = (val) => typeof val === 'object' ? reactive(val) : val;

        // 获取原始对象
        const target = this.raw;
        // 追踪依赖, ITERATE_KEY 用于影响 Set 与 Map 的size 追踪
        track(target, ITERATE_KEY);
        // 原始对象遍历
        target.forEach((v, k)=> {
            callBack.call(thisVal, wrap(v), wrap(k), this);
        })
    },
    // 迭代器协议，可迭代协议
    [Symbol.iterator]: iterationMethod,
    entries: iterationMethod,
    values: valuesIterationsMethod,
    keys: keysIterationsMethod
}
/**
* @desc 迭代共用方法(value, key)
* @author 张和潮
* @date 2022年06月13日 22:23
*/
function iterationMethod(){
    // 获取原始对象
    const target = this.raw;
    // 调用原始对象的迭代方法
    const itr = target[Symbol.iterator]();
    
    const wrap = (val) => typeof val === 'object' ? reactive(val) : val;

    // 依赖追踪
    track(target, ITERATE_KEY);

    return {
        // 迭代器协议
        next(){
            const {value, done} = itr.next()
            return {
                value: value ? [wrap(value[0]), wrap(value[1])] : value,
                done
            }
        },
        // 可迭代协议
        [Symbol.iterator](){
            return this;
        }
    }
}

/**
* @desc 迭代方法(values)
* @author 张和潮
* @date 2022年06月13日 22:48
*/
function valuesIterationsMethod() {
    // 获取原始对象
    const target = this.raw;
    // 调用原始对象的迭代方法
    const itr = target.values();
    
    const wrap = (val) => typeof val === 'object' ? reactive(val) : val;

    // 依赖追踪
    track(target, ITERATE_KEY);

    return {
        // 迭代器协议
        next(){
            const {value, done} = itr.next()
            return {
                value: value ? wrap(value) : value,
                done
            }
        },
        // 可迭代协议
        [Symbol.iterator](){
            return this;
        }
    }
}

/**
* @desc 迭代方法(keys)
* @author 张和潮
* @date 2022年06月13日 22:48
*/
function keysIterationsMethod() {
    // 获取原始对象
    const target = this.raw;
    // 调用原始对象的迭代方法
    const itr = target.keys();
    
    const wrap = (val) => typeof val === 'object' ? reactive(val) : val;

    // 依赖追踪, 使用新的 Symbol key值更新
    track(target, MAP_ITERATE_KEY);

    return {
        // 迭代器协议
        next(){
            const {value, done} = itr.next()
            return {
                value: value ? wrap(value) : value,
                done
            }
        },
        // 可迭代协议
        [Symbol.iterator](){
            return this;
        }
    }
}


/**
* @desc 封装 createReactive 函数
* @param { Boolean } isShallow 接收一个参数 isShallow, 代表为浅响应，默认为false，即非浅响应
* @param { Boolean } isReadonly 接收一个参数 isReadonly, 代表为浅只读，默认为false，即只读
* @author 张和潮
* @date 2022年06月10日 11:34:14
*/
function createReactive(obj, isShallow = false, isReadonly = false) {
    return new Proxy(obj, {
        // 读取属性，依赖收集
        get(target, key, receiver){
            // 代理对象可以通过 raw 属性访问原始数据
            if (key === 'raw') {
                return target;
            }

            // Set & Map
            if(isSetObj(target) || isMapObj(target)){
                if (key === 'size') {
                    // 调用 track 函数建立响应联系
                    track(target, ITERATE_KEY);

                    return Reflect.get(target, key, target)
                }

                // 返回定义在 mutableInstrumentations 对象上的方法
                return mutableInstrumentations[key];
            }
         
            // 如果操作目标是数组，并且 key 存在于arrInstrumentations 上，
            // 那么返回定义在arrInstrumentations 上的值
            if (Array.isArray(target) && arrInstrumentations.hasOwnProperty(key)) {
                return Reflect.get(arrInstrumentations, key, receiver)
            }

            // 添加判断，如果 key 的类型是 symbol ，则不进行追踪
            // 非只读的时候才需要建立响应联系
            if (!isReadonly && typeof key !== 'symbol') {
                // 建立联系
                track(target, key);
            }

            // 得到原始值结果
            const res =  Reflect.get(target, key, receiver)

            // 如果是浅响应，直接返回原始值
            if (isShallow) {
                return res;
            }


            if (typeof res === 'object' && res !== null) {
                // 调用reactive 将结果包装成响应式数据并返回
                // 如果数据为只读，则调用readonly 对值进行包装
                return isReadonly ? readonly(res) : reactive(res)
            }

            // 返回res
            return res;
        },

        // has 拦截函数实现对in 操作符的代理
        has(target,key){
            // 依赖收集
            track(target, key);
            // 返回是否具有给定的key
            return Reflect.has(target, key);
        },

        // ownKeys拦截函数实现对 for...in代理
        ownKeys(target){
            // 依赖收集
            // 如果操作目标 target 是数组，则使用 length 属性作为 key 并建立响应联系
            track(target, Array.isArray(target) ? 'length' : ITERATE_KEY);
            
            return Reflect.ownKeys(target)
        },

        // deleteProperty 拦截对delete的代理
        deleteProperty(target, key){
             // 只读属性的话，打印错误信息并返回
             if (isReadonly) {
                console.warn(`属性${key} 为只读属性`);
                return;
            }

            // 检查被操作的属性是否是对象自己的属性
            const hasKey = Object.prototype.hasOwnProperty.call(target, key)

            // 使用Reflect.deleteProperty 完成属性的删除
            const res = Reflect.deleteProperty(target, key);

            if (res && hasKey) {
                // 只要当被删除的属性时对象自己的属性并且成功删除时，才触发更新
                trigger(target, key, TriggerType.DELETE)
            }

            return res;
        },

        // 拦截设置操作
        // target 是原始对象 obj
        // receiver 是代理对象 child
        set(target, key, newVal, receiver){
            // 只读属性的话，打印错误信息并返回
            if (isReadonly) {
                console.warn(`属性${key} 为只读属性`);
                return;
            }

            // 获取旧值
            const oldVal = target[key]

            // 如果属性不存在，这说明是在添加新属性，否则是设置已有属性
            const type = Array.isArray(target)
                         // 如果代理是数组，则检测被设置的索引值是否小于数组长度
                         // 如果是，则视作 SET 操作，否则是 ADD 操作
                           ? Number(key) < target.length ? TriggerType.SET : TriggerType.ADD
                           : Object.prototype.hasOwnProperty.call(target, key) 
                                ? TriggerType.SET 
                                : TriggerType.ADD;

            // 设置属性值
            const res = Reflect.set(target, key, newVal, receiver);
            
            // target === receiver.raw 说明 receiver 就是 target 的代理对象
            if (target === receiver.raw) {
                // 比较新值与旧值，只有当他们不全等，并且都不是NaN 的时候才触发响应
                if (oldVal !== newVal && (oldVal === oldVal || newVal === newVal)) {
                    // 把副作用函数从桶里拿出来执行
                    // type 用来管理触发的时候是否触发for...in 对应的依赖
                    // 数组: 增加第四个参数，即触发响应的新值
                    trigger(target, key, type, newVal);
                }
            }
            
            return res;
        }
    })
    
}


/**
* @desc 引用对象的深响应
* @author 张和潮
* @date 2022年06月10日 16:50:45
*/
// 定义一个 Map 实例，存储原始对象到代理对象的映射
const reactiveMap = new Map()

function reactive(obj){
    // 优先通过原始对象obj 寻找之前创建的代理对象，如果找到了，直接返回已有的代理对象
    const existionProxy = reactiveMap.get(obj)
    if (existionProxy) {
        return existionProxy;
    }

    // 否则，创建新的代理对象
    const proxy = createReactive(obj);
    // 存储到 Map 中，从而帮助重复创建
    reactiveMap.set(obj, proxy)

    return proxy
}

/**
* @desc 引用对象的浅响应
* @author 张和潮
* @date 2022年06月10日 16:50:45
*/
function shallowReactive(obj){
    return createReactive(obj, true)
}

/**
* @desc 浅只读
* @author 张和潮
* @date 2022年06月10日 17:22:23
*/
function shallowReadonly(obj) {
    return createReactive(obj, true, true)
}

/**
* @desc 只读
* @author 张和潮
* @date 2022年06月10日 17:37:09
*/
function readonly(obj) {
    return createReactive(obj, false, true)
}
