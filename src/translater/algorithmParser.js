/**
 * 递归下降算法构造模板AST
 * 
 */

// 定义文本模式，作为一个状态表
const TextModes = {
    DATA: 'DATA',
    RCDATA: 'RCDATA',
    RAWTEXT: 'RAWTEXT',
    CDATA: 'CDATA'
}

/**
* @desc 解析器函数，接收模板作为参数
* @author 张和潮
* @date 2022年07月07日 23:13
*/
function algoParse(str) {
    // 定义上下文对象
    const context = {
        // source 是模板内容，用于在解析过程中进行消费
        source: str,
        // 解析器当前处于文本模式，初始模式为DATA
        mode: TextModes.DATA,
        // advanceBy 函数用来消费置顶数量的字符，他接收一个数字作为参数
        advanceBy(num){
            // 根据给定字符数num，截取位置 num 后的模板内容，并替换当前模板内容
            context.source = context.source.slice(num)
        },
        // 无论开始标签还是结束标签，都有可能存在无用的空白字符。例如<div     >
        advanceSpaces(){
            // 匹配空白字符
            const match = /^[\t\r\n\f ]+/.exec(context.source)
            if (match) {
                // 调用 advanceBy 函数消费空白字符
                context.advanceBy(match[0].length)
            }
        }

    }

    // 调用 parseChildren 函数开始进行解析，它返回解析后得到的子节点
    // parseChildren 函数接收两个参数：
    //   第一个参数是上下文对象context
    //   第二个参数是由父代节点构成的节点栈，初始时栈为空
    const nodes = parseChildren(context, [])

    // 解析器返回Root 根节点
    return {
        type: 'Root',
        // 使用 nodes 作为根节点的 children
        children: nodes
    }
}

/**
* @desc 结束循环
* @author 张和潮
* @date 2022年07月08日 22:55
*/
function isEnd(context, ancestors) {
    // 当模板内容解析完毕后，停止
    if (!context.source) {
        return true;
    }

    // 获取父级节点栈内所有节点做比较
    for (let i = ancestors.length - 1; i >= 0; --i) {
        // 如果遇到结束标签，并且该标签与父级标签节点同名，则停止
        if (context.source.startsWith(`</${ancestors[i].tag}`)) {
            return true
        }
        
    }
}

/**
* @desc 解析函数
* @author 张和潮
* @date 2022年07月08日 21:56
*/
function parseChildren(context, ancestors){
    // 定义 nodes 数组存储子节点，它将作为最终的返回值
    let nodes = [];
    // 从上下文对象化中取得当前状态，包括模式 mode 和模板内容source
    const { mode, source } = context;
    // 开启while 循环，只要满足条件就会一直对字符串进行解析
    while (!isEnd(context, ancestors)) {
        let node;
        // 只有 DATA模式 和 RCDATA 模式下才支持插值节点的解析
        if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
            // 只有DATA 模式才支持标签节点的解析
            if (mode === TextModes.DATA && source[0] === '<') {
                if (source[1] === '!') {
                    if (source.startsWith('<!--')) {
                        // 注释
                        node = parseComment(context);
                    } else if(source.startsWith('<![CDATA[')){
                        // CDATA
                        node = parseCDATA(context, ancestors)
                    } 

                } else if (source[1] === '/') {
                    // 结束标签
                    // 状态机遭遇了闭合标签，此时应该抛出错误，因为他缺少与之对应的开始标签
                    console.error('无效的结束标签');
                    continue;
                } else if (/[a-z]/i.test(source[1])){
                    // 标签
                    node = parseElement(context, ancestors)
                }

            } else if (source.startsWith('{{')) {
                // 解析插值
                node = parseInterpolation(context)
            }
        }

        // node 不存在，说明处于其他模式，即非 DATA 且非 RCDATA 模式
        // 当做文本处理
        if (!node) {
            // 解析文本节点
            node = parseText(context)
        }


        // 将节点添加到 nodes 数组中
        nodes.push(node);
    }

    // 循环结束后，说明子节点解析完毕，返回子节点
    return nodes;
}

/**
* @desc 解析标签
* @author 张和潮
* @date 2022年07月08日 22:35
*/
function parseElement(context, ancestors) {
    // 解析开始标签
    const element = parseTag(context);

    if (element.isSelfClosing) {
        return element;
    }

    // 切换到正确的文本模式
    if (element.tag === 'textarea' || element.tag === 'title') {
        // 如果标签是<textarea> 或者 <title> 则切换到RCDATA 模式
        context.mode = TextModes.RCDATA
    } else if (/style|xmp|iframe|noembed|noframes|noscript/.test(element.tag)) {
        // 如果是 <style> <xmp> <iframe> <noembed> <noframes> <noscript>
        // 则切换到 RAWTEXT 模式
        context.mode = TextModes.RAWTEXT
    } else {
        context.mode = TextModes.DATA
    }

    ancestors.push(element)

    // 递归调用parseChildren 函数进行 <div> 标签子节点的解析
    element.children = parseChildren(context, ancestors)

    ancestors.pop()

    if (context.source.startsWith(`</${element.tag}`)) {
        // 解析结束标签
        parseTag(context, 'end')
    }else {
        // 缺少闭合标签
        console.error(`${element.tag} 标签缺少闭合标签`);
    }


    return element;
}


/**
* @desc 解析标签
* @author 张和潮
* @date 2022年07月09日 14:08:33
*/
function parseTag(context, type = 'start') {
    // 从上下文对象中拿到 advanceBy 函数
    const { advanceBy, advanceSpaces } = context

    // 处理开始标签和结束标签的正则表达式不同
    const match = type === 'start'
        // 匹配开始标签
        ? /^<([a-z][^\t\r\n\f />]*)/i.exec(context.source)
        // 匹配结束标签
        : /^<\/([a-z][^\t\r\n\f />]*)/i.exec(context.source)

    // 匹配成功后，正则表达式的第一个捕获择的值就是标签名称
    const tag = match[1]
    // 消费正则表达式匹配的全部内容，例如 '<div' 这段内容
    advanceBy(match[0].length);
    // 消费标签中无用的空白字符
    advanceSpaces();

    // 在消费匹配的内容后，如果字符串以 '/>' 开头，这说明这是一个自闭合标签
    const isSelfClosing = context.source.startsWith('/>')

    // 如果是自闭合标签，则消费 '/>' 否则消费 '>'
    advanceBy(isSelfClosing ? 2 : 1)

    // 返回标签节点
    return {
        type: 'Element',
        // 标签名称
        tag,
        // 标签的属性
        props:[],
        // 子节点留空
        children:[],
        // 是否自闭合
        isSelfClosing
    }
}