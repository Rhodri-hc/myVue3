/**
 * 完整的编译过程通常包括：
 * 源代码-> 词法分析-> 语法分析-> 语义分析-> 中间代码生成-> 优化-> 目标代码生成-> 目标代码
 * 
 * Vue.js 目标编译的目标代码其实就是渲染函数，其工作流程为：
 * 模板-> parse(str) -> 模板AST -> transform(ast) -> JavaScript AST -> generate(JSAST) -> 渲染函数
 * 
 * 用来将模板字符串解析为模板AST 的 解析器(parser);
 * 用来将模板AST 转换为 JavaScript AST 的转换器(transformer);
 * 用来根据 JavaScript AST 生成渲染函数代码的生成器(generator)。
 *
 */

// 定义状态机的状态
const State = {
    initial: 1,    // 初始状态
    tagOpen: 2,    // 标签开始状态
    tagName: 3,    // 标签名称状态
    text: 4,       // 文本状态
    tagEnd: 5,     // 结束标签状态
    tagEndName: 6  // 结束标签名称状态
}

/**
* @desc 用于判断是否是字母
* @author 张和潮
* @date 2022年07月04日 23:08
*/
function isAlpha(char){
    return char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z';
}

/**
* @desc 接受模板字符串作为参数，并将模板切割为 Token 返回
* @author 张和潮
* @date 2022年07月04日 23:10
*/
function tokenzie(str) {
    
}

