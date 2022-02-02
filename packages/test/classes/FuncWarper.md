# Class: FuncWarper

自动化测试用的云函数实例

## Indexable

▪ [key: `string`]: `any`

## Table of contents

### Constructors

- [constructor](FuncWarper.md#constructor)

### Properties

- [config](FuncWarper.md#config)
- [file](FuncWarper.md#file)
- [func](FuncWarper.md#func)
- [logger](FuncWarper.md#logger)
- [plugins](FuncWarper.md#plugins)
- [staging](FuncWarper.md#staging)

### Methods

- [JSONhandler](FuncWarper.md#jsonhandler)
- [handler](FuncWarper.md#handler)
- [mount](FuncWarper.md#mount)

## Constructors

### constructor

• **new FuncWarper**(`initBy`)

创建测试实例

**`example`** new TestCase(require.resolve('../demo.flow.ts'))

#### Parameters

| Name | Type |
| :------ | :------ |
| `initBy` | [`Func`](Func.md)<`any`, `any`, `any`\> |

• **new FuncWarper**(`initBy`)

创建测试实例

**`example`** new TestCase(require.resolve('../demo.flow.ts'))

#### Parameters

| Name | Type |
| :------ | :------ |
| `initBy` | `string` |

## Properties

### config

• `Readonly` **config**: [`Config`](../modules.md#config)

___

### file

• `Readonly` **file**: `string`

___

### func

• `Readonly` **func**: [`Func`](Func.md)<`any`, `any`, `any`\>

___

### logger

• `Readonly` **logger**: `Logger`

___

### plugins

• `Readonly` **plugins**: [`Plugin`](../modules.md#plugin)[]

___

### staging

• `Readonly` **staging**: `string`

## Methods

### JSONhandler

▸ **JSONhandler**<`TData`\>(`body?`, `options?`): `Promise`<{ `body`: `any` ; `data?`: `TData` ; `error?`: { `message`: `string`  } ; `headers`: { [key: string]: `string`;  } ; `statusCode`: `number`  }\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TData` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `body?` | `Object` |
| `options` | `Object` |
| `options.cookie?` | `Object` |
| `options.headers?` | `Object` |
| `options.session?` | `Object` |

#### Returns

`Promise`<{ `body`: `any` ; `data?`: `TData` ; `error?`: { `message`: `string`  } ; `headers`: { [key: string]: `string`;  } ; `statusCode`: `number`  }\>

___

### handler

▸ **handler**<`TResult`\>(`event?`, `context?`): `Promise`<`TResult`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TResult` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `any` |
| `context` | `any` |

#### Returns

`Promise`<`TResult`\>

___

### mount

▸ **mount**(`handler?`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `handler?` | (`func`: [`FuncWarper`](FuncWarper.md)) => `void` \| `Promise`<`void`\> |

#### Returns

`Promise`<`void`\>