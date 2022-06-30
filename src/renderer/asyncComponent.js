/**
* 在异步加载组件时，需要考虑的方面：  
* 1、如果组件加载失败或加载超时，是都要渲染Error？
* 2、组件在加载时，是否要展示占位的内容？例如渲染一个Loading 组件。
* 3、组件加载的速度可能很快，也可能很慢，是否要设置一个延迟展示 Loading 组件的时
*    间？如果组件在200ms 内没有加载成功才展示Loading 组件，这样可以避免由组件加载
*    过快所导致的闪烁。
* 4、组件加载失败后，是否需要重试？
*/


/**
* @desc 定义一个异步组件，接收一个异步组件加载器作为参数
* @author 张和潮
* @date 2022年06月30日 21:49
*/
function defineAsyncComponent(loader){
    // 用来存储异步加载的组件
    let InnerComp = null;
    // 返回一个包装组件
    return {
        name: 'AsyncComponentWrapper',
        setup(){
            // 异步组件是否加载成功
            const loaded = ref(false);

            // 执行加载器函数，返回一个 Promise 实例
            // 加载成功后，将加载成功的组件赋值给InnerComp，并将loaded 标记为true，
            // 代表加载成功
            loader().then(c => {
                InnerComp = c;
                loaded.value = true;
            })

            return () => {
                // 如果异步组件加载组件，则渲染改组件，否则渲染一个占位内容
                return loaded.value 
                            ?  { type: InnerComp } 
                            :  { type: Text, children: '' }
            }
        }
    }
}