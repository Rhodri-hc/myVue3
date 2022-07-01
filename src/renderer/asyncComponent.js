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
function defineAsyncComponent(options){
    // options 可以是配置项，也可以是加载器
    if(typeof options === 'function'){
        // 如果options 是加载器，则将其格式化为配置项形式
        options = {
            loader: options
        }
    }

    const { loader } = options;

    // 用来存储异步加载的组件
    let InnerComp = null;

    // 记录重试次数
    let retries = 0;

    // 封装 load 函数用来加载异步组件
    function load() {
        return loader()
        // 捕获加载器的错误
        .catch((err) => {
            // 如果用户指定了 onError 回调，则将控制权交给用户
            if (options.onError) {
                // 返回一个新的Promise 实例
                return new Promise((resolve, reject) => {
                    // 重试
                    const retry = () => {
                        resolve(load())
                        retries++; 
                    }
                    // 失败
                    const fail = () => reject(err)
                    // 作为 onError 回调函数的参数，让用户来决定下一步该怎么做
                    options.onError(retry, fail)
                })
            } else{
               throw err;
            }
        })
    }


    // 返回一个包装组件
    return {
        name: 'AsyncComponentWrapper',
        setup(){
            // 异步组件是否加载成功
            const loaded = ref(false);
            // // 代表是否超时，默认为 false，即没有超时
            // const timeout = ref(false);
            // 定义 error ，当错误发生时，用来存储错误对象
            const error = shallowRef(null);
            // 代表是否正在加载，默认为false
            const loading = ref(false);

            let loadingTimer = null;
            // 如果配置项中存在delay，则开启一个定时器计时，
            if (options.delay) {
                loadingTimer = setTimeout(() => {
                    loading.value = true;
                }, options.delay)
            } else {
                // 如果配置项中没有delay ，则直接标记为加载中
                loading.value = true;
            }


            // 执行加载器函数，返回一个 Promise 实例
            // 加载成功后，将加载成功的组件赋值给InnerComp，并将loaded 标记为true，
            // 代表加载成功

            // 调用load 加载函数
            load()
                .then(c => {
                    InnerComp = c;
                    loaded.value = true;
                })
                .catch((err)=>{
                    error.value = err
                })
                .finally(() => {
                    loading.value = false;
                    // 加载完毕后，无论成功与否都要清除延迟定时器
                    clearTimeout(loadingTimer);
                })
         
        

            let timer = null;
            if (options.timeout) {
                // 如果指定了超时时长，则开启一个定时器计时
                timer = setTimeout(() => {
                    // // 超时后将timeout 设置我true
                    // timeout.value = true;
                    // 超时后创建一个错误对象，并复制给 error.value
                    const err = new Error(`Async component timed out after ${options.timeout}ms.`)

                    error.value = err;
                }, options.timeout)
            }
            // 包装组件被卸载时清除定时器
            onUmounted(() => { clearTimeout(timer) });

            // 占位内容
            const placeholder = { type: Text, children: '' }


            return () => {
                if (loaded.value) {
                    // 如果组件加载成功，则渲染被加载的组件
                    return { type: InnerComp }
                } else if(error.value  && options.errorComponent){
                    // 如果加载超时，或者加载错误，并且用户指定了Error 组件，则渲染该组件
                    return { type: options.errorComponent, props: { error: error.value } }
                } else if(loading.value && options.loadingComponent){
                    // 如果异步组件正在加载，并且用户指定了 Loading 组件，则渲染 Loading 组件
                    return { type: options.loadingComponent }
                }

                return placeholder;
            //     // 如果异步组件加载组件，则渲染改组件，否则渲染一个占位内容
            //     return loaded.value 
            //                 ?  { type: InnerComp } 
            //                 :  { type: Text, children: '' }
            }
        }
    }
}
