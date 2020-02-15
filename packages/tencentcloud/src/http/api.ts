import request, { Response } from '@faasjs/request';
import * as crypto from 'crypto';

function mergeData (data: any, prefix: string = ''): { [key: string]: any } {
  const ret: any = {};
  for (const k in data) {
    if (typeof data[k] === 'undefined' || data[k] === null) 
      continue;
    
    if (data[k] instanceof Array || data[k] instanceof Object) 
      Object.assign(ret, mergeData(data[k], prefix + k + '.'));
    else 
      ret[prefix + k] = data[k];
  }
  return ret;
}

function formatSignString (params: any): string {
  const str: string[] = [];

  for (const key of Object.keys(params).sort()) 
    str.push(key + '=' + params[key]);

  return str.join('&');
}

/**
 * 发出请求
 *
 * @param logger {Logger} 日志类实例
 * @param config {object} 服务商基本参数
 * @param config.region {string} 区域
 * @param config.secretId {string} secretId
 * @param config.secretKey {string} secretKey
 * @param params {object} 请求参数
 */
export default async function (provider: any, params: any): Promise<any> {
  params = Object.assign({
    Nonce: Math.round(Math.random() * 65535),
    Region: provider.region,
    SecretId: provider.secretId,
    SignatureMethod: 'HmacSHA256',
    Timestamp: Math.round(Date.now() / 1000) - 1,
    Version: '2018-04-16',
  }, params);
  params = mergeData(params);

  const sign = 'POSTapigateway.api.qcloud.com/v2/index.php?' + formatSignString(params);

  params.Signature = crypto.createHmac('sha256', provider.secretKey).update(sign).digest('base64');

  return request('https://apigateway.api.qcloud.com/v2/index.php?', {
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  }).then(function (res: Response) {
    try {
      res.body = JSON.parse(res.body);
    } catch (error) {
      return Promise.reject(error);
    }
    if (res.body.code) {
      console.error(res.body);
      return Promise.reject(Error(JSON.stringify(res.body)));
    } else 
      return res.body;
  });
}
