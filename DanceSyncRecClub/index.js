const app = require('./app');

// 云函数入口
exports.main = async (event, context) => {
    // 构建 Express 请求对象
    const req = {
        method: event.method || 'GET',
        url: event.path || '/',
        query: event.queryStringParameters || {},
        body: event.body || {},
        headers: event.headers || {},
        params: event.pathParameters || {}
    };
    
    // 构建 Express 响应对象
    let response = {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: ''
    };
    
    const res = {
        status: (code) => {
            response.statusCode = code;
            return res;
        },
        json: (data) => {
            response.body = JSON.stringify(data);
            response.headers['Content-Type'] = 'application/json';
            return response;
        },
        send: (data) => {
            response.body = data;
            return response;
        }
    };

    // 调用 Express 应用
    try {
        await new Promise((resolve) => {
            app(req, res, resolve);
        });
    } catch (err) {
        response.statusCode = 500;
        response.body = JSON.stringify({ error: err.message });
    }
    
    return response;
};