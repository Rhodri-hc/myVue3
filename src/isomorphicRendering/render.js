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