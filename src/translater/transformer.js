/**
 * 用来将模板AST 转换为 JavaScript AST 的转换器(transformer);
 * 
 */

/**
* @desc 用来打印当前AST节点的信息
* @author 张和潮
* @date 2022年07月05日 21:35
*/
function dump(node, indent = 0) {
    const type = node.type;

    // 节点描述，如果是根基诶单，则没有描述
    // 如果是 Element 类型的节点，则使用 node.tag 作为节点的描述
    // 如果是 Text 类型的节点，则使用 node.content 作为节点的描述
    
    const desc = node.type === 'Root'
                ? ''
                : node.type === 'Element'
                    ? node.tag
                    : node.content

    console.log(`${'-'.repeat(indent)}${type}: ${desc}`);

    // 递归打印
    if (node.children) {
        node.children.forEach(n => {
            dump(n, indent + 2)
        });
    }
}

/**
* @desc 访问节点, 进行转换
* @author 张和潮
* @date 2022年07月05日 22:27
*/
function traverseNode(ast, context) {
    // 当前节点，ast 本身就是 Root 节点
    context.currentNode  = ast;

    // 增加退出阶段的回调函数数据
    const exitFns = [];
    
    // context.nodeTransforms 数组
    const transforms = context.nodeTransforms;
    for (let i = 0; i < transforms.length; i++) {
        // 将当前节点 currentNode 和 context 都传递给nodeTransforms 中注册的回调函数
        // 转换函数可以返回另一个函数，该函数即作为退出阶段的回调函数
        const onExit = transforms[i](context.currentNode, context);

        if (onExit) {
            // 将退出阶段的回调函数添加到 exitFns 数组中
            exitFns.push(onExit)
        }
        
        // 检查当前节点是否已经被移除，被移除直接返回
        if (!context.currentNode) {
            return;
        }
    }

    // 如果有子节点，则递归调用 traverseNode 函数进行遍历
    const children = context.currentNode.children;
    if (children) {
        for (let i = 0; i < children.length; i++) {
            // 递归调用 traverseNode 转换子节点之前，将当前节点设置为父节点
            context.parent = context.currentNode
            // 设置位置索引
            context.childIndex = i;
            traverseNode(children[i], context);
            
        }
    }

    // 在节点处理的最后阶段执行缓存到exitFns 中的回调函数
    let i = exitFns.length
    while(i--){
        exitFns[i]()
    }
}

/**
* @desc 将模板AST 转换为 JavaScript AST 
* @author 张和潮
* @date 2022年07月05日 22:31
*/
function transform(ast) {
    // 创建context 对象
    const context = {
        // 存储当前正在转换的节点
        currentNode: null,
        // 存储当前节点在父节点的 children 中的位置索引
        childIndex: 0,
        // 存储当前转换节点的父节点
        parent: null,
        // 注册nodeTransforms 数组
        nodeTransforms: [
            // 转换标签节点
            transformElement,
            // 转换文本节点
            transformText,
            // 转换为根节点
            transformRoot
        ],
        // 用来替换节点
        replaceNode(node){
            context.parent.children[context.childIndex] = node;

            context.currentNode = node;
        },
        // 删除当前节点
        removeNode(){
            if (context.parent) {
                context.parent.children.splice(context.childIndex, 1)

                context.currentNode = null;
            }
        }
    }

    // 完成转换
    traverseNode(ast, context)

    // 打印ast 信息
    // console.log(dump(ast));
}

/**
* @desc 转换标签节点
* @author 张和潮
* @date 2022年07月05日 22:42
*/
function transformElement(node) {
    // 将转换代码编写在退出阶段的回调函数中，
    // 这样可以保证该标签节点的子节点全部被处理完毕
    return () => {
        // 如果被转换的节点不是元素节点，则什么都不做
        if (node.type !== 'Element') {
            return;
        }

        // 1. 创建 h 函数调用语句，
        //    h 函数调用第一个参数是标签名称，因此我们以 node.tag 来创建一个字符串字面量节点
        //    作为第一个参数
        const callExp = createCallExpression('h', [
            createStringLiteral(node.tag)
        ])
        // 2. 处理 h 函数调用的参数
        node.children.length === 1
            // 如果当前标签节点只有一个子节点，则直接使用子节点的jsNode 作为参数
            ? callExp.arguments.push(node.children[0].jsNode)
            // 如果当前标签节点有多个子节点，则创建一个 ArrayExpression 节点作为参数
            : callExp.arguments.push(
                // 数组的每个元素都是子节点的 jsNode
                createArrayExpression(node.children.map(c => c.jsNode))
            )
        // 3. 将当前标签节点对应的 JavaScript AST 添加到jsNode 属性下
        node.jsNode = callExp;
    }
}
/**
* @desc 转换文本节点
* @author 张和潮
* @date 2022年07月05日 22:42
*/
function transformText(node, context) {
    if (node.type !== 'Text') {
        return;
    }

    // 文本节点对应的 JavaScript AST 节点其实就是一个字符创字面量，
    // 因此只需要使用 node.content 创建一个 StringLiteral 类型的节点即可
    // 最后将文本节点对应的 JavaScript AST 节点添加到 node.jsNode 属性下
    node.jsNode = createStringLiteral(node.content);
}

/**
* @desc 转换Root 根节点
* @author 张和潮
* @date 2022年07月06日 14:14:46
*/
function transformRoot(node) {
    // 将逻辑编写在退出阶段的回调函数中，保证自己诶单全部被处理完毕
    return ()=> {
        // 如果不是根节点，则什么都不做
        if (node.type !== 'Root') {
            return;
        }

        // node 是根节点，根节点的第一个子节点就是模板的根节点，
        // 当然，这里我们暂时不考虑模板存在多个根节点的情况
        const vnodeJSAST = node.children[0].jsNode
        // 创建 render 函数的声明语句节点，将vnodeJSAST 作为render 函数体返回语句
        node.jsNode = {
            type: 'FunctionDecl',
            id: { type: 'Identifier', name: 'render' },
            params: [],
            body:[
                {
                    type: 'ReturnStatement',
                    return: vnodeJSAST
                }
            ]
        }
    }
}

/***************************************** 以下函数用于创建 对应JavaScript AST节点 *************************************/

/**
* @desc 用来创建 StringLiteral 节点
* @author 张和潮
* @date 2022年07月06日 10:07:59
*/
function createStringLiteral(value) {
    return {
        type: 'StringLiteral',
        value
    }
}

/**
* @desc 用来创建 Identifier 节点
* @author 张和潮
* @date 2022年07月06日 11:51:04
*/
function createIdentifier(name) {
    return {
        type: 'Identifier',
        name
    }
}

/**
* @desc 用来创建 ArrayExpression 节点
* @author 张和潮
* @date 2022年07月06日 11:53:43
*/
function createArrayExpression(elements) {
    return {
        type: 'ArrayExpression',
        elements
    }
}

/**
* @desc 用来创建 CallExpression 节点
* @author 张和潮
* @date 2022年07月06日 11:57:07
*/
function createCallExpression(callee, arguments) {
    return{
        type: 'CallExpression',
        callee: createIdentifier(callee),
        arguments
    }
}