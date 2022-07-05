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
    const currentNode = ast;

    
    // context.nodeTransforms 数组
    const transforms = context.nodeTransforms;
    for (let i = 0; i < transforms.length; i++) {
        // 将当前节点 currentNode 和 context 都传递给nodeTransforms 中注册的回调函数
        const element = transforms[i](currentNode, context);
        
    }

    // 如果有子节点，则递归调用 traverseNode 函数进行遍历
    const children = currentNode.children;
    if (children) {
        for (let i = 0; i < children.length; i++) {
            traverseNode(children[i], context);
            
        }
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
        // 注册nodeTransforms 数组
        nodeTransforms: [
            // 转换标签节点
            transformElement,
            // 转换文本节点
            transformText
        ]
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
function transformText(node) {
    if (node.type === 'Text') {
        node.content = node.content.repeat(2)
    }
}