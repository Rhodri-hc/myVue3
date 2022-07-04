/**
 * 完整的编译过程通常包括：
 * 源代码-> 词法分析-> 语法分析-> 语义分析-> 中间代码生成-> 优化-> 目标代码生成-> 目标代码
 * 
 * Vue.js 目标编译的目标代码其实就是渲染函数，其工作流程为：
 * 模板-> parse(str) -> 模板AST -> transform(ast) -> JavaScript AST -> generate(JSAST) -> 渲染函数
 * 
 * 
 */