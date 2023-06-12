const axios = require('axios');

module.exports = class Apis {

    static async post(url, data,headers = {'content-type': 'application/json'}) {
        try {
            const payload = {
                url,
                data,
                method : 'post',
                headers
            };
            let result = await axios(payload);
            return result.data;
        } catch (error) {
            throw error
        }
    }

    static async put(url, data,headers = {'content-type': 'application/json'}) {
        try {
            const payload = {
                url,
                data,
                method : 'put',
                headers
            };
            let result = await axios(payload);
            return result.data;
        } catch (error) {
            throw error
        }
    }

    static async get(url, params = '', headers = {'content-type': 'application/json'}) {
        try {
            const qs = params;
            const payload = {
                params : qs,
                method : 'get',
                headers
            };
            let result = await axios.get(url, payload);
            return result.data;
        } catch (error) {
            throw error;
        }
    }
};
