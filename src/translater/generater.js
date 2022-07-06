/**
 * 用来根据 JavaScript AST 生成渲染函数代码的生成器(generator)。
 * 
 */
/**
* @desc 代码生成
* @author 张和潮
* @date 2022年07月06日 14:52:45
*/
function generate(node) {
    const context = {
        // 存储最终生成的渲染函数代码
        code: '',
        // 在生成代码时，通过调用 push 函数完成代码的拼接
        push(code){
            context.code += code
        },
        // 当前缩进的级别，初始值为 0，即没有缩进
        currentIndent: 0,
        // 该函数用来换行，即在代码字符串的后面追加 \n 字符，
        // 另外，换行是应该保留缩进，所以我们还要追加 currentIndent * 2 个空格字符
        newline(){
            context.code += '\n' + '  '.repeat(context.currentIndent);
        },
        // 用来缩进，即让currentIndent 自增后，调用换行函数
        indent(){
            context.currentIndent++;
            context.newline()
        },
        // 取消缩进
        deIndent(){
            context.currentIndent--;
            context.newline()
        }

    }

    // 调用genNode 函数完成代码生成的工作
    genNode(node, context);

    // 返回渲染函数代码
    return context.code
}

/**
* @desc 完成代码生成的工作
* @author 张和潮
* @date 2022年07月06日 14:58:34
*/
function genNode(node, context) {
    switch (node.type) {
        case 'FunctionDecl':
            genFunctionDecl(node, context)
            break;

        case 'ReturnStatement':
            genReturnStatement(node, context)
            break;

        case 'CallExpression':
            genCallExpression(node, context)
            break;

        case 'StringLiteral':
            genStringLiteral(node, context)
            break;

        case 'ArrayExpression':
            genArrayExpression(node, context)
            break;
    
    }
}


/**
* @desc 函数参数生成
* @author 张和潮
* @date 2022年07月06日 15:14:54
*/
function genNodeList(nodes, context) {
    const { push } = context
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        genNode(node, context)
        if (i < nodes.length - 1) {
            push(', ')
        }
    }
}

/**
* @desc 实现函数声明语句的代码生成
* @author 张和潮
* @date 2022年07月06日 15:08:48
*/
function genFunctionDecl(node, context) {
    // 从 context 对象中取出工具函数
    const {push, indent, deIndent} = context;
    // node.id 是一个标识符，用来描述函数的名称， 即node.id.name
    push(`function ${node.id.name}`);
    push(`(`)
    
    // 调用 genNodeList 为函数的参数生成代码
    genNodeList(node.params, context);

    push(`)`)
    push(`{`)
    // 缩进
    indent()
    // 为函数体生成代码，这里递归调用 genNode 函数
    node.body.forEach(n => {
        genNode(n, context)
    });
    // 取消缩进
    deIndent()
    push(`}`)
}

/**
* @desc 数组表达式代码生成
* @author 张和潮
* @date 2022年07月06日 15:22:27
*/
function genArrayExpression(node, context) {
    const { push } = context;
    // 追加方括号
    push('[')
    genNodeList(node.elements, context);
    // 补全方括号
    push(']')
}

/**
* @desc 生成返回代码
* @author 张和潮
* @date 2022年07月06日 15:25:18
*/
function genReturnStatement(node, context) {
    const { push } = context;
    // 追加关键字和空格
    push(`return `)

    genNode(node.return, context)
}

/**
* @desc 生成字符串代码
* @author 张和潮
* @date 2022年07月06日 15:25:18
*/
function genStringLiteral(node, context) {
    const { push } = context;
    
    push(`'${node.value}'`)

}

/**
* @desc 生成调用函数代码
* @author 张和潮
* @date 2022年07月06日 15:30:02
*/
function genCallExpression(node, context){
    const { push } = context;
    // 取得被调用函数名称和参数列表
    const { callee, arguments: args } = node;
    // 生成函数调用代码
    push(`${callee.name}(`)

    genNodeList(args, context);

    // 补全括号
    push(`)`)
}