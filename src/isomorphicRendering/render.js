/**
 * 同构渲染：同样一套代码即可在服务端运行也可以在客户端渲染，
 *          结合服务端渲染以及浏览器渲染的优点
 * SEO友好，白屏问题无，占用服务端资源中，用户体验好
 * 
 */

/**
* @desc 将虚拟DOM 渲染为 HTML 字符串
* @author 张和潮
* @date 2022年07月13日 11:17:39
*/
const VOID_TAGS = 'area,base,br,col,embed,hr,img,input,link,meta,param,source,track,wbr'.split(',')

function renderElementVNode(vnode) {
    // 取出标签名称 tag 和 标签属性 props，以及标签的子节点
    const { type: tag, props, children } = vnode;

    // 判断是不是 void element
    const isVoidElement = VOID_TAGS.includes(tag)

    // 开始标签的头部
    let ret = `<${tag}`

    // 处理标签属性
    if (props) {
        // for (const key in props) {
        //     // 以 key="value" 的形式拼接字符串
        //     ret += ` ${key}="${props[key]}"`
        // }

        // 调用 renderAttrs 函数进行严谨处理
        ret += renderAttrs(props)
    }


    // 开始标签的闭合
    ret += isVoidElement ? '/>' : '>'
    // 如果是 void element，则直接返回结果，无需处理children 
    if (isVoidElement) {
        return ret;
    }

    // 处理子节点
    // 如果子节点的类型是字符串，则是文本内容，直接拼接
    if (typeof children === 'string') {
       ret += children 
    } else if (Array.isArray(children)) {
        // 如果子节点的类型是数组，则递归地调用 renderElementVNode 完成渲染
        children.forEach(child => {
            ret += renderElementVNode(child)
        })
    }

    // 结束标签
    ret += `</${tag}>`

    // 返回拼接好的 html 字符串
    return ret;
}

/**
* @desc 拼接 props 属性
* @author 张和潮
* @date 2022年07月13日 12:00:28
*/
// 应该忽略的属性
const shouldIgnoreProp = ['key', 'ref']

function renderAttrs(props) {
    let ret = ''

    for (const key in props) {
        // 检测属性名称，如果是事件或应该被忽略的属性，则忽略
        if (
            shouldIgnoreProp.includes(key) || 
            /^on[^a-z]/.test(key)
        ) {
            continue;
        }
        // 以 key="value" 的形式拼接字符串
        const value = props[key]
        ret += renderDynamicAttr(key, value)
        // ret += ` ${key}="${value}"`
    }
}

// 用来判断属性是否是 boolean attribute
const isBooleanAttr = (key) => {
    (`itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly,async,autofoucus,autoplay,`+ 
    `controls,default,defer,disabled,hidden,loop,open,required,reversed,scoped,seamless,checked,muted,multiple,selected`).split(',').includes(key)
} 

// 用来判断属性名称是否合法且安全
const isSSRSafeAttrName = (key) => /[>/="'\u0009\u000a\u000c\u0020]/.test(key)

function renderDynamicAttr(key, value) {
    if(isBooleanAttr(key)){
        // 如果值是false ，则什么都不需要渲染，否守则只需要渲染key即可
        return value === false ? `` : ` ${key}`
    }else if (isSSRSafeAttrName(key)) {
        // 对于其他安全属性，执行完整的渲染
        // 注意：对于属性值，我们需要对他执行 html 转义操作
        return value === '' ? ` ${key}` : ` ${key}=${escapeHtml(value)}`
    } else {
        console.error('不安全');
        return ``
    }
}

/**
* @desc 转义属性值 value
* @author 张和潮
* @date 2022年07月13日 12:21:05
*/
const escapeRE = /["'&<>]/

function escapeHtml(string) {
    const str = '' + string;
    const match = escapeRE.exec(str);

    if (!match) {
        return str;
    }

    let html = '';
    let escaped;
    let index;
    let lastIndex = 0;

    for (index = match.index; index < str.length; index++) {
        switch (str.charCodeAt(index)) {
            case 34: // "
                escaped = '&quot;'
                break;
            case 38: // &
                escaped = '&amp;'
                break;
            case 39: // '
                escaped = '&#39;'
                break;
            case 60: // <
                escaped = '&lt;'
                break;
            case 62: // >
                escaped = '&gt;'
                break;
        
            default:
                continue;
        }

        if (lastIndex !== index) { 
            html += str.substring(lastIndex, index)
        }

        lastIndex = index + 1
        html += escaped
        
    }

    return lastIndex !== index ? html + str.substring(lastIndex, index) : html
}

/*************组件 ***************/
/**
* @desc 同构渲染组件
* @author 张和潮
* @date 2022年07月14日 21:16
*/
// function renderComponentVNode(vnode){
//     let { type: { setup } } = vnode;
//     const render = setup();
//     const subTree = render();

//     // 使用 renderVNode 完成对 subTree 的渲染
//     return renderVNode(subTree);
// }

function renderVNode(vnode){
    const type = typeof vnode.type;
    if (type === 'string') {
        return renderElementVNode(vnode);
    } else if (type === 'object' || type === 'function') {
        return renderComponentVNode(vnode);
    } else if (vnode.type === Text){
        // 处理文本
    }
    // ...
}

// 定义全局变量，存储当前正在被初始化的组件实例
let currentInstance = null;
// 该方法接收组件实例作为参数，并将该实例设置为 currentInstance
function setCurrentInstance(instance){
    currentInstance = instance;
}

/**
* @desc 用于解析组件 props 和 attrs 数据
* @author 张和潮
* @date 2022年06月28日 21:40
*/
function resolveProps(options, propsData){
    const props = {};
    const attrs = {};

    // 遍历为组件传递的 props 数据
    for (const key in propsData) {
        // 以字符串 on 开头的props 无论受显示地声明，都将其添加到props 中
        if (key in options || key.startsWith('on')) {
            // 如果为组件传递的props 数据在组件自身的 props 选项中有定义，则将其视为合法的props
            props[key] = propsData[key];
        } else {
            // 否则将其作为 attrs
            attrs[key] = propsData[key];
        }
    }

    return [props, attrs];
}

function renderComponentVNode(vnode) {
    // 检查是否是函数式组件
    const isFunctional = typeof vnode.type === 'function'

    // 通过vnode 获取组件的选项对象，即 vnode.type
    const componentOptions = vnode.type;

    if (isFunctional) {
        // 如果是函数式组件，则将vnode.type 作为渲染函数，将 vnode.type.props 作为 props 选项定义即可
        componentOptions = {
            render: vnode.type,
            props: vnode.type.props
        }
    }

    // 获取组件中的渲染函数render
    // 从组件选项对象中取得组件的生命周期函数
    let { 
        render, data, props: propsOption, setup,
        beforeCreate, created
    } = componentOptions;

    beforeCreate && beforeCreate()

    // 调用data 函数得到原始数据，无须使用reactive() 函数将其包装为响应式数据
    const state = data ? data() : null;
    // 调用 resolveProps 函数解析出最终的 props数据与 attrs 数据
    const [props, attrs] = resolveProps(propsOption, vnode.props);

    
    // 直接使用编译好的 vnode.children 对象作为slots 对象即可
    const slots = vnode.children || {}

    // 定义组件实例，一个组件实例本质上就是一个对象，他包含与组件有关的状态信息
    const instance = {
        // 组件自身的状态数据，即 data
        state,
        // 将解析出的 props 无须shalloReactive 并定义到组件实例上
        props,
        // 一个布尔值，用来表示组件是否已经被挂载，初始值为false 
        isMounted: false,
        // 组件所渲染的内容，即子树（subTree）
        subTree: null,
        // 插槽
        slots,
        // 在组件实例中添加mounted 数组，用来存储通过onMounted 函数注册的生命周期钩子函数
        mounted:[]
    }



    // 定义 emit 函数，它接收两个参数
    // event：事件名称，
    // payload：传递给时间处理函数的参数
    function emit(event, ...payload){
        // 根据约定对时间名称进行处理，例如 change --> onChange
        const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;
        // 根据处理后的事件名称去props 中寻找对应的事件处理函数
        const handler = instance.props[eventName];
        if (handler) {
            // 调用时间处理函数并传递参数
            handler(...payload);
        } else{
            console.error('事件不存在');
        }
    }

    

    // setupState 用来存储由setup 返回的数据
    let setupState = null;
    if (setup) {
        // setupContext, { emit, slots, attrs, expose} 
        const setupContext = { attrs, emit, slots };
        // 调用 setup 函数，将只读版本的 props 作为第一个参数传递，避免用户意外地修改props 的值
        // 将setupContext 作为第二个参数传递
        // 调用 setup 之前，设置当前组件实例
        setCurrentInstance(instance);
        const setupResult = setup(instance.props, setupContext)
        // 在setup函数执行完毕之后，重置当前组件实例
        setCurrentInstance(null);
        // 如果 setup 函数的返回值是函数，则将其作为渲染函数
        if (typeof setupResult === 'function') {
            // 报告冲突
            if (render) {
                console.error('setup 函数返回渲染函数，render 选项将被忽略');
            }
    
            // 将 setupResult 作为渲染函数
            render = setupResult;
        } else {
            // 如果 setup 的返回值不是函数，则作为数据状态赋值给 setupState
            setupState = setupResult;
        }
        
    }



    // 将组件实例设置到 vnode 上，用于后续更新
    vnode.component = instance

    // 创建渲染上下文对象，本质上市组件实例的代理
    const renderContext = new Proxy(instance, {
        get(t, k, r){
            // 取得组件自身状态与 props数据
            const {state, props, slots} = t;
          
            if (k === '$slots') {
                return slots;
            }

            // 先尝试读取自身状态数据
            if (state && k in state) {
                return state[k]
            } else if (k in props){
                // 如果组件自身没有该数据，则尝试从props 中读取
                return props[k];
            } else if (setupState && k in setupState) {
                return setupState[k];
            } else {
                console.error('不存在');
            }
        },
        set(t, k, v, r){
            const {state, props} = t;
            if (state && k in state) {
                state[k] = v;
            } else if (k in props){
                props[k] = v;
            } else if (setupState && k in setupState) {
                setupState[k] = v;
            } else {
                console.error('不存在');
            }
        }
    })

    // 生命周期函数调用时要绑定渲染上下文对象
    created && created.call(renderContext);

    // 执行渲染函数你，获取组件要渲染的内容，即render 函数返回的虚拟DOM
    const subTree = render.call(renderContext, renderContext);

    return renderVNode(subTree)
}