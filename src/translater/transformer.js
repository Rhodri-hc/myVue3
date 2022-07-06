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
            transformText
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
    console.log(dump(ast));
}

/**
* @desc 转换标签节点
* @author 张和潮
* @date 2022年07月05日 22:42
*/
function transformElement(node) {
    if (node.type === 'Element' && node.tag === 'p') {
        node.tag = 'h1'
    }
}
/**
* @desc 转换文本节点
* @author 张和潮
* @date 2022年07月05日 22:42
*/
function transformText(node, context) {
    if (node.type === 'Text') {
        context.removeNode()
    }
}