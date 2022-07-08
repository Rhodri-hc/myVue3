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
        mode: TextModes.DATA
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
    const element = parseTag(context, ancestors);

    if (element.isSelfClosing) {
        return element;
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
