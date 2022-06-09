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