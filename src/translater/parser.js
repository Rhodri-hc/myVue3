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
    // 状态机的当前状态：初始状态
    let currentState = State.initial;
    // 用于缓存字符
    const chars = [];
    // 生成的Token 会存储到tokens 数组中，并作为函数的返回值返回
    const tokens = [];

    // 使用while 循环开启自动机，只要模板字符串没有被消费尽，自动机就会一直运行
    while (str) {
        // 查看第一个字符
        const char = str[0];
        // switch 匹配当前状态
        switch (currentState) {
            // 状态机当前处于初始状态
            case State.initial:
                // 遇到字符<
                if (char === '<') {
                    // 1. 状态机切换到标签开始状态
                    currentState = State.tagOpen
                    // 2. 消费字符<
                    str = str.slice(1);
                } else if(isAlpha(char)){
                    // 1. 遇到字母，切换到文本状态
                    currentState = State.text;
                    // 2. 将当前字母缓存到chars 数组
                    chars.push(char);
                    // 3. 消费当前字符
                    str = str.slice(1);
                }
                
                break;
        
            // 状态机当前处于标签开始状态
            case State.tagOpen:
                if(isAlpha(char)){
                    // 1. 遇到字母，切换到标签名称状态
                    currentState = State.tagName;
                    // 2. 将当前字符缓存到chars 数组
                    chars.push(char);
                    // 3. 消费当前字符
                    str = str.slice(1);
                } else if(char === '/'){
                    // 1. 遇到字符 '/' , 切换到结束标签状态
                    currentState = State.tagEnd;
                    // 2. 消费字符 /
                    str = str.slice(1);
                }
                
                break;

            // 状态机当前处于标签名称状态
            case State.tagName:
                if(isAlpha(char)){
                    // 1. 遇到字母，由于当前处于标签名称状态，所以不需要切换状态，
                    //    需要将当前字符缓存到chars 数组
                    chars.push(char);
                    // 2. 消费当前字符
                    str = str.slice(1);
                } else if(char === '>'){
                    // 1. 遇到字符 > , 切换到初始状态
                    currentState = State.initial;
                    // 2. 同时创建一个标签 Token，并添加到token 数组中
                    //    注意，此时 chars 数组中缓存的字符就是标签名称
                    tokens.push({
                        type: 'tag',
                        name: chars.join('')
                    })
                    // 3. chars 数组的内容已经被消费，清空它
                    chars.length = 0;
                    // 4. 消费字符 >  
                    str = str.slice(1);
                }
                
                break;

            // 状态机当前处于文本状态
            case State.text:
                if(isAlpha(char)){
                    // 1. 遇到字母，状态保持不变，
                    //    需要将当前字符缓存到chars 数组
                    chars.push(char);
                    // 2. 消费当前字符
                    str = str.slice(1);
                } else if(char === '<'){
                    // 1. 遇到字符 < , 切换到标签开始状态
                    currentState = State.tagOpen;
                    // 2. 同时创建一个标签 Token，并添加到token 数组中
                    //    注意，此时 chars 数组中缓存的字符就是文本内容
                    tokens.push({
                        type: 'text',
                        content: chars.join('')
                    })
                    // 3. chars 数组的内容已经被消费，清空它
                    chars.length = 0;
                    // 4. 消费字符 >  
                    str = str.slice(1);
                }
                
                break;

            // 状态机当前处于标签结束状态
            case State.tagEnd:
                if(isAlpha(char)){
                    // 1. 遇到字母，状态切换为 结束标签名称状态，
                    currentState = State.tagEndName;
                    // 2. 需要将当前字符缓存到chars 数组
                    chars.push(char);
                    // 2. 消费当前字符
                    str = str.slice(1);
                }
                
                break;

            // 状态机当前处于结束标签名称状态
            case State.tagEndName:
                if(isAlpha(char)){
                    // 1. 遇到字母，状态保持不变，
                    //    需要将当前字符缓存到chars 数组
                    chars.push(char);
                    // 2. 消费当前字符
                    str = str.slice(1);
                } else if(char === '>'){
                    // 1. 遇到字符 > , 切换到初始状态
                    currentState = State.initial;
                    // 2. 同时创建一个标签 Token，并添加到token 数组中
                    //    注意，此时 chars 数组中缓存的字符就是标签名称
                    tokens.push({
                        type: 'tagEnd',
                        name: chars.join('')
                    })
                    // 3. chars 数组的内容已经被消费，清空它
                    chars.length = 0;
                    // 4. 消费字符   
                    str = str.slice(1);
                }
                
                break;

        }
    }

    // 返回tokens
    return tokens;
}


/**
* @desc parser 函数接收模板作为参数，解析为模板AST
* @author 张和潮
* @date 2022年07月05日 21:05
*/
function parse(str) {
    // 首先对模板进行标记化，得到toekns
    const tokens = tokenzie(str);

    // 创建 Root根节点
    const root = {
        type: 'Root',
        children: []
    }

    // 创建elementStack 栈，起初只有Root 根节点
    const elementStack = [root];

    // 循环扫描tokens 
    while(tokens.length){
        // 获取当前站定节点作为父节点parent
        const parent = elementStack[elementStack.length - 1];

        // 获取当前token
        const t = tokens[0];

        switch (t.type) {
            case 'tag':
                // 开始标签，创建 Element 类型的AST 节点
                const elementNode = {
                    type: 'Element',
                    tag: t.name,
                    children: []
                }
                // 将其添加到父级节点的children 中
                parent.children.push(elementNode);
                // 将当前节点压入栈
                elementStack.push(elementNode);
                
                break;
    
            case 'text':
                // 文本，创建 Text 类型的AST 节点
                const textNode = {
                    type: 'Text',
                    content: t.content,
                    
                }
                // 将其添加到父级节点的children 中
                parent.children.push(textNode);
                
                break;

            case 'tagEnd':
                // 遇到结束标签，将栈顶节点弹出
                elementStack.pop()
                
                break;   
        }

        tokens.shift()
    }

    // 返回AST
    return root;
}