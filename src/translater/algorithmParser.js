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