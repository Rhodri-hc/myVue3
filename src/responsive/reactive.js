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

// ITERATE_KEY 用来追踪 for...in 依赖收集与响应
var ITERATE_KEY = Symbol()
// 操作类型枚举
var TriggerType = {
    SET: "SET",
    ADD: "ADD",
    DELETE: "DELETE"
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

            // 非只读的时候才需要建立响应联系
            if (!isReadonly) {
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
            track(target, ITERATE_KEY);
            
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
            const type = Object.prototype.hasOwnProperty.call(target, key) 
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
                    trigger(target, key, type);
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
function reactive(obj){
    return createReactive(obj)
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
