[@faasjs/cloud_function](../README.md) / CloudFunction

# Class: CloudFunction

## Implements

- `Plugin`

## Constructors

### Constructor

> **new CloudFunction**(`config?`): `CloudFunction`

创建云函数配置

#### Parameters

##### config?

[`CloudFunctionConfig`](../type-aliases/CloudFunctionConfig.md)

{object} 配置项，这些配置将强制覆盖默认配置

#### Returns

`CloudFunction`

## Methods

### invoke()

> **invoke**\<`TData`\>(`name`, `data?`, `options?`): `Promise`\<`void`\>

异步触发云函数

#### Type Parameters

##### TData

`TData` = `any`

#### Parameters

##### name

`string`

{string} 云函数文件名或云函数名

##### data?

`TData`

{any} 参数

##### options?

`Record`\<`string`, `any`\>

{object} 额外配置项

#### Returns

`Promise`\<`void`\>

### invokeSync()

> **invokeSync**\<`TResult`, `TData`\>(`name`, `data?`, `options?`): `Promise`\<`TResult`\>

同步调用云函数

#### Type Parameters

##### TResult

`TResult` = `any`

##### TData

`TData` = `any`

#### Parameters

##### name

`string`

{string} 云函数文件名或云函数名

##### data?

`TData`

{any} 参数

##### options?

`Record`\<`string`, `any`\>

{object} 额外配置项

#### Returns

`Promise`\<`TResult`\>

### onInvoke()

> **onInvoke**(`data`, `next`): `Promise`\<`void`\>

#### Parameters

##### data

`InvokeData`

##### next

`Next`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`Plugin.onInvoke`

### onMount()

> **onMount**(`data`, `next`): `Promise`\<`void`\>

#### Parameters

##### data

`MountData`

##### next

`Next`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`Plugin.onMount`

## Properties

### config

> **config**: `object`

#### Index Signature

\[`key`: `string`\]: `any`

#### memorySize?

> `optional` **memorySize**: `number`

#### name?

> `optional` **name**: `string`

#### timeout?

> `optional` **timeout**: `number`

#### triggers?

> `optional` **triggers**: `object`[]

### context

> **context**: `any`

### event

> **event**: `any`

### name

> `readonly` **name**: `string` = `Name`

#### Implementation of

`Plugin.name`

### type

> `readonly` **type**: `string` = `Name`

#### Implementation of

`Plugin.type`
